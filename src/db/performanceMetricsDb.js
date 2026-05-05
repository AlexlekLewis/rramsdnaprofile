// ─── PLAYER PERFORMANCE METRICS ──────────────────────────────────────
//
// Event-sourced per-player test results (table: player_performance_metrics).
// One row per attempt. Group by (player_id, metric_type, recorded_at) to
// reconstruct a "test session". Best / average computed in app.
//
// Used by:
//   - Coach Profile drill-in (Exit Velocity card)
//   - Player IDPView (read-only Exit Velocity summary)
//   - Bulk import from spreadsheet
//
// RLS:
//   - Coaches/admins read & write all rows.
//   - Players SELECT their own rows only.

import { supabase } from '../supabaseClient';

// Canonical metric_type strings — extend as we add tests.
export const METRIC_TYPES = {
    EXIT_VELOCITY: 'exit_velocity',
};

export const METRIC_LABELS = {
    [METRIC_TYPES.EXIT_VELOCITY]: { label: 'Exit Velocity', unit: 'kmh', unitDisplay: 'km/h', attempts: 3 },
};

// ═════════════════════════════════════════════════════════════════════
// READ
// ═════════════════════════════════════════════════════════════════════

/**
 * Load all rows for a player + metric, newest first.
 * Returns flat row list — caller groups by recorded_at to form sessions.
 */
export async function loadMetricRows(playerId, metricType) {
    if (!playerId || !metricType) return [];
    const { data, error } = await supabase
        .from('player_performance_metrics')
        .select('id, player_id, metric_type, value, unit, recorded_at, recorded_by, recorded_by_role, attempt_number, notes, created_at')
        .eq('player_id', playerId)
        .eq('metric_type', metricType)
        .order('recorded_at', { ascending: false })
        .order('attempt_number', { ascending: true });
    if (error) {
        console.error('loadMetricRows error:', error.message);
        return [];
    }
    return data || [];
}

/**
 * Group flat rows into sessions: one entry per (recorded_at).
 *   { date, attempts: [{number, value}, ...], best, avg, notes, recordedBy, ids }
 */
export function groupIntoSessions(rows) {
    if (!rows || rows.length === 0) return [];
    const byDate = new Map();
    for (const r of rows) {
        const key = r.recorded_at;
        if (!byDate.has(key)) {
            byDate.set(key, {
                date: key,
                attempts: [],
                notes: r.notes || null,
                recordedBy: r.recorded_by,
                recordedByRole: r.recorded_by_role,
                unit: r.unit,
                ids: [],
            });
        }
        const s = byDate.get(key);
        s.attempts.push({ number: r.attempt_number, value: Number(r.value) });
        s.ids.push(r.id);
        // Notes: take first non-null encountered; rows in a session share notes typically.
        if (!s.notes && r.notes) s.notes = r.notes;
    }

    return Array.from(byDate.values())
        .map(s => {
            const vals = s.attempts.map(a => a.value).filter(v => !isNaN(v));
            const best = vals.length ? Math.max(...vals) : null;
            const avg = vals.length ? +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2) : null;
            // Sort attempts by number for stable display (1, 2, 3)
            s.attempts.sort((a, b) => (a.number ?? 0) - (b.number ?? 0));
            return { ...s, best, avg };
        })
        .sort((a, b) => (a.date < b.date ? 1 : -1)); // newest first
}

/** Convenience: load + group sessions for one (player, metric). */
export async function loadSessionsFor(playerId, metricType) {
    const rows = await loadMetricRows(playerId, metricType);
    return groupIntoSessions(rows);
}

// ═════════════════════════════════════════════════════════════════════
// WRITE — Coach/admin only (enforced by RLS)
// ═════════════════════════════════════════════════════════════════════

/**
 * Save an Exit Velocity test session for a player.
 * Inserts up to 3 rows (one per attempt) sharing the same recorded_at, notes.
 *
 * @param {object} args
 * @param {string} args.playerId  players.id (UUID)
 * @param {Date|string} args.recordedAt  YYYY-MM-DD or Date
 * @param {Array<number|null>} args.attempts  e.g. [95.2, 96.8, null] — nulls are skipped
 * @param {string|null} args.notes  optional shared notes for the session
 * @param {string} args.recordedBy  auth.users.id of the recording coach
 * @param {string} [args.recordedByRole='coach']
 * @returns {Promise<Array>} inserted rows
 */
export async function saveExitVelocitySession({
    playerId,
    recordedAt,
    attempts,
    notes = null,
    recordedBy,
    recordedByRole = 'coach',
}) {
    if (!playerId) throw new Error('saveExitVelocitySession: playerId required');
    if (!recordedBy) throw new Error('saveExitVelocitySession: recordedBy required');

    // Normalise date to YYYY-MM-DD
    const dateStr = recordedAt instanceof Date
        ? recordedAt.toISOString().slice(0, 10)
        : String(recordedAt).slice(0, 10);

    // Build rows — one per non-empty attempt
    const rows = (attempts || [])
        .map((v, i) => ({ number: i + 1, value: v }))
        .filter(a => a.value !== null && a.value !== '' && !isNaN(Number(a.value)))
        .map(a => ({
            player_id: playerId,
            metric_type: METRIC_TYPES.EXIT_VELOCITY,
            value: Number(a.value),
            unit: 'kmh',
            recorded_at: dateStr,
            recorded_by: recordedBy,
            recorded_by_role: recordedByRole,
            attempt_number: a.number,
            notes: notes || null,
        }));

    if (rows.length === 0) throw new Error('No valid attempts to save');

    const { data, error } = await supabase
        .from('player_performance_metrics')
        .insert(rows)
        .select();

    if (error) throw new Error(`Save Exit Velocity failed: ${error.message}`);
    return data || [];
}

/**
 * Replace an existing test session: delete all rows for the (player, metric, date),
 * then insert new ones. Use when a coach edits a previously saved session.
 *
 * Validates inputs BEFORE deleting so a blanked-out edit can't wipe existing data.
 */
export async function replaceExitVelocitySession({
    playerId,
    recordedAt,
    attempts,
    notes = null,
    recordedBy,
    recordedByRole = 'coach',
}) {
    if (!playerId) throw new Error('replaceExitVelocitySession: playerId required');
    if (!recordedBy) throw new Error('replaceExitVelocitySession: recordedBy required');

    // Validate FIRST — refuse to delete an existing session unless the new payload is valid.
    const validAttempts = (attempts || []).filter(v =>
        v !== null && v !== '' && !isNaN(Number(v))
    );
    if (validAttempts.length === 0) {
        throw new Error('No valid attempts to save — refusing to wipe existing session');
    }

    const dateStr = recordedAt instanceof Date
        ? recordedAt.toISOString().slice(0, 10)
        : String(recordedAt).slice(0, 10);

    const { error: delErr } = await supabase
        .from('player_performance_metrics')
        .delete()
        .eq('player_id', playerId)
        .eq('metric_type', METRIC_TYPES.EXIT_VELOCITY)
        .eq('recorded_at', dateStr);
    if (delErr) throw new Error(`Replace failed at delete: ${delErr.message}`);

    return saveExitVelocitySession({ playerId, recordedAt: dateStr, attempts, notes, recordedBy, recordedByRole });
}

/**
 * Delete a whole test session for a player on a given date.
 */
export async function deleteSession(playerId, metricType, recordedAt) {
    if (!playerId) throw new Error('deleteSession: playerId required');
    const dateStr = recordedAt instanceof Date
        ? recordedAt.toISOString().slice(0, 10)
        : String(recordedAt).slice(0, 10);

    const { error } = await supabase
        .from('player_performance_metrics')
        .delete()
        .eq('player_id', playerId)
        .eq('metric_type', metricType)
        .eq('recorded_at', dateStr);
    if (error) throw new Error(`Delete session failed: ${error.message}`);
    return true;
}

// ═════════════════════════════════════════════════════════════════════
// BULK IMPORT — admin tool
// ═════════════════════════════════════════════════════════════════════

/**
 * Bulk insert Exit Velocity rows. Each entry = one player's session.
 *
 * @param {Array<object>} entries  [{ playerId, recordedAt, attempts, notes? }]
 * @param {string} recordedBy  auth.users.id
 * @returns {Promise<{inserted: number, errors: Array}>}
 */
export async function bulkSaveExitVelocity(entries, recordedBy, recordedByRole = 'coach') {
    if (!recordedBy) throw new Error('bulkSaveExitVelocity: recordedBy required');

    const errors = [];
    let inserted = 0;

    for (const entry of entries || []) {
        try {
            const rows = await saveExitVelocitySession({
                playerId: entry.playerId,
                recordedAt: entry.recordedAt,
                attempts: entry.attempts,
                notes: entry.notes || null,
                recordedBy,
                recordedByRole,
            });
            inserted += rows.length;
        } catch (e) {
            errors.push({ playerId: entry.playerId, error: e.message });
        }
    }

    return { inserted, errors };
}
