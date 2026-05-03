import { supabase } from '../supabaseClient';

// ─── FITNESS TRACKING ─────────────────────────────────────────────────────
//
// 5 tables:
//   fitness_programs           — top-level program metadata + activation block
//   fitness_program_blocks     — session templates (Day 1, Day 2, etc.)
//   fitness_program_enrolment  — one row per player per program (Phase 3+)
//   fitness_session_logs       — per-player per-session log (Phase 3+)
//   fitness_badges_awarded     — badge events (Phase 5+)
//
// Cohort gate: row-level security blocks any insert into fitness_session_logs
// unless the player has players.submitted = true. Enforced in the database.
//
// PROGRAM ACTIVATION_BLOCK shape (jsonb on fitness_programs.activation_block):
//   [
//     { id: "hip_bridges", category: "Lower Body Activation", name: "Hip Bridges", prescription: "12 reps" },
//     ...
//   ]
//
// BLOCK EXERCISES shape (jsonb on fitness_program_blocks.exercises):
//   [
//     { id: "jumping_squats", category: "Lower Body Power", name: "Jumping Squats",
//       prescription: "4x8", prescribed_sets: 4, prescribed_reps: "8", tip: "..." },
//     ...
//   ]

// ═══════════════════════════════════════════════════════════════════════
// READ
// ═══════════════════════════════════════════════════════════════════════

export async function loadActivePrograms() {
    const { data, error } = await supabase
        .from('fitness_programs')
        .select('*')
        .order('created_at', { ascending: true });
    if (error) { console.error('loadActivePrograms error:', error.message); return []; }
    return data || [];
}

export async function loadProgramById(programId) {
    if (!programId) return null;
    const { data, error } = await supabase
        .from('fitness_programs')
        .select('*')
        .eq('id', programId)
        .maybeSingle();
    if (error) { console.error('loadProgramById error:', error.message); return null; }
    return data;
}

export async function loadProgramBlocks(programId) {
    if (!programId) return [];
    const { data, error } = await supabase
        .from('fitness_program_blocks')
        .select('*')
        .eq('program_id', programId)
        .order('day_number', { ascending: true });
    if (error) { console.error('loadProgramBlocks error:', error.message); return []; }
    return data || [];
}

// ═══════════════════════════════════════════════════════════════════════
// WRITE — Coach/admin only (RLS enforces this)
// ═══════════════════════════════════════════════════════════════════════

export async function updateProgram(id, patch) {
    if (!id) throw new Error('updateProgram: id is required');
    const { data, error } = await supabase
        .from('fitness_programs')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
    if (error) throw new Error(`Update program failed: ${error.message}`);
    return data;
}

export async function updateBlock(id, patch) {
    if (!id) throw new Error('updateBlock: id is required');
    const { data, error } = await supabase
        .from('fitness_program_blocks')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
    if (error) throw new Error(`Update block failed: ${error.message}`);
    return data;
}

// ═══════════════════════════════════════════════════════════════════════
// VALIDATION & HELPERS
// ═══════════════════════════════════════════════════════════════════════

const SUGGESTED_CATEGORIES = [
    'Lower Body Power',
    'Lower Body Strength',
    'Upper Body Power',
    'Upper Body Strength',
    'Core Power',
    'Core Strength',
];

const SUGGESTED_ACTIVATION_CATEGORIES = [
    'Lower Body Activation',
    'Upper Body Activation',
    'Warm Up',
];

export function listExerciseCategories() {
    return [...SUGGESTED_CATEGORIES];
}

export function listActivationCategories() {
    return [...SUGGESTED_ACTIVATION_CATEGORIES];
}

/**
 * Validate an exercises array (used on a block) before save.
 * Rules:
 *   - 1 to 12 exercises per block.
 *   - Each has a non-empty id, name, and prescription.
 *   - Ids are unique within the block.
 *   - prescribed_sets, when present, is a positive integer ≤ 10.
 */
export function validateExercises(exercises) {
    if (!Array.isArray(exercises)) return { ok: false, error: 'Exercises must be an array' };
    if (exercises.length < 1) return { ok: false, error: 'At least 1 exercise is required' };
    if (exercises.length > 12) return { ok: false, error: 'Max 12 exercises per session' };

    const seenIds = new Set();
    for (let i = 0; i < exercises.length; i++) {
        const e = exercises[i];
        if (!e || typeof e !== 'object') return { ok: false, error: `Exercise ${i + 1} is malformed` };
        const id = String(e.id || '').trim();
        if (!id) return { ok: false, error: `Exercise ${i + 1} is missing an id` };
        if (seenIds.has(id)) return { ok: false, error: `Exercise id "${id}" appears more than once` };
        seenIds.add(id);
        if (!e.name || !String(e.name).trim()) return { ok: false, error: `Exercise "${id}" has no name` };
        if (!e.prescription || !String(e.prescription).trim()) return { ok: false, error: `Exercise "${id}" has no prescription (e.g. "4x8")` };
        if (e.prescribed_sets != null) {
            const n = Number(e.prescribed_sets);
            if (!Number.isInteger(n) || n < 1 || n > 10) {
                return { ok: false, error: `Exercise "${id}" has invalid prescribed_sets (1-10 expected)` };
            }
        }
    }
    return { ok: true };
}

/**
 * Validate the program-level activation block.
 * Rules:
 *   - 0 to 6 movements.
 *   - Each has a non-empty id, name, and prescription.
 *   - Ids are unique.
 */
export function validateActivationBlock(activation) {
    if (!Array.isArray(activation)) return { ok: false, error: 'Activation must be an array' };
    if (activation.length > 6) return { ok: false, error: 'Max 6 activation movements' };

    const seenIds = new Set();
    for (let i = 0; i < activation.length; i++) {
        const a = activation[i];
        if (!a || typeof a !== 'object') return { ok: false, error: `Activation movement ${i + 1} is malformed` };
        const id = String(a.id || '').trim();
        if (!id) return { ok: false, error: `Activation movement ${i + 1} is missing an id` };
        if (seenIds.has(id)) return { ok: false, error: `Activation movement id "${id}" appears more than once` };
        seenIds.add(id);
        if (!a.name || !String(a.name).trim()) return { ok: false, error: `Activation movement "${id}" has no name` };
        if (!a.prescription || !String(a.prescription).trim()) return { ok: false, error: `Activation movement "${id}" has no prescription` };
    }
    return { ok: true };
}

/**
 * Generate a slug-style id from a name. "Bulgarian Split Squat" → "bulgarian_split_squat".
 * Falls back to a short random suffix if the name is empty.
 */
export function slugifyExerciseName(name) {
    const base = String(name || '').trim().toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
    if (base) return base;
    return `ex_${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * Group exercises by category, preserving the order each category first appears.
 * Used by the admin UI for visual grouping.
 */
export function groupExercisesByCategory(exercises) {
    const order = [];
    const groups = {};
    (exercises || []).forEach(e => {
        const cat = e.category || 'Other';
        if (!groups[cat]) { groups[cat] = []; order.push(cat); }
        groups[cat].push(e);
    });
    return order.map(cat => ({ category: cat, exercises: groups[cat] }));
}

// ═══════════════════════════════════════════════════════════════════════
// PLAYER-FACING — enrolment, session logs, badges
// ═══════════════════════════════════════════════════════════════════════

/**
 * Compute current week number (1-indexed) for an enrolment given today's date.
 * Caps at program.total_weeks. Returns 1 for any date before start_date.
 */
export function computeCurrentWeek(startDateISO, totalWeeks = 10, now = new Date()) {
    if (!startDateISO) return 1;
    const start = new Date(startDateISO + 'T00:00:00');
    const diffDays = Math.floor((now.getTime() - start.getTime()) / 86400000);
    if (diffDays < 0) return 1;
    const week = Math.floor(diffDays / 7) + 1;
    return Math.max(1, Math.min(week, totalWeeks));
}

/**
 * Load the player's enrolment in the active program. Returns null if none.
 */
export async function loadActiveEnrolment(authUserId) {
    if (!authUserId) return null;
    const { data, error } = await supabase
        .from('fitness_program_enrolment')
        .select('*, program:program_id(*)')
        .eq('auth_user_id', authUserId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
    if (error) { console.error('loadActiveEnrolment error:', error.message); return null; }
    return data;
}

/**
 * Idempotent: if the player already has an enrolment in this program return it,
 * otherwise create one with start_date = today (UTC).
 *
 * Note: insert is performed by an admin/coach context server-side — for player
 * self-enrolment we rely on the row-level security policy + a Supabase RPC
 * (NOT YET CREATED). Until the RPC exists, this function ONLY reads. If no
 * enrolment row exists, returns null and the UI shows "Ask coach to enrol you".
 *
 * For Phase 6 cohort flip we will bulk-create enrolments via a SQL UPDATE.
 */
export async function loadOrCreateEnrolment({ authUserId, playerId, programId, startDate }) {
    if (!authUserId) return null;
    // Try read first.
    const existing = await loadActiveEnrolment(authUserId);
    if (existing) return existing;

    // Try create (will succeed only if RLS permits — currently coach/admin only).
    if (!playerId || !programId) return null;
    const row = {
        program_id: programId,
        auth_user_id: authUserId,
        player_id: playerId,
        start_date: startDate || new Date().toISOString().slice(0, 10),
        status: 'active',
    };
    const { data, error } = await supabase
        .from('fitness_program_enrolment')
        .insert(row)
        .select('*, program:program_id(*)')
        .maybeSingle();
    if (error) { console.warn('loadOrCreateEnrolment insert failed (likely RLS):', error.message); return null; }
    return data;
}

/**
 * Load all session logs for an enrolment. Used for badge compute, history view,
 * and progress dashboard.
 */
export async function loadSessionLogsForEnrolment(enrolmentId) {
    if (!enrolmentId) return [];
    const { data, error } = await supabase
        .from('fitness_session_logs')
        .select('*')
        .eq('enrolment_id', enrolmentId)
        .order('completed_at', { ascending: false });
    if (error) { console.error('loadSessionLogsForEnrolment error:', error.message); return []; }
    return data || [];
}

/**
 * Load a single existing log for (enrolment, block, week_number) — used to
 * pre-fill the session view when a player re-opens a previously-saved session.
 */
export async function loadSessionLogForBlockWeek({ enrolmentId, blockId, weekNumber }) {
    if (!enrolmentId || !blockId || !weekNumber) return null;
    const { data, error } = await supabase
        .from('fitness_session_logs')
        .select('*')
        .eq('enrolment_id', enrolmentId)
        .eq('block_id', blockId)
        .eq('week_number', weekNumber)
        .maybeSingle();
    if (error) { console.error('loadSessionLogForBlockWeek error:', error.message); return null; }
    return data;
}

/**
 * Save a session log via the SECURITY DEFINER RPC fitness_log_session_for_self.
 *
 * The RPC owns derivation of every trust-sensitive field (logged_on_time,
 * catch_up_for_week, prescription_snapshot, logged_by_role, logged_by_user_id,
 * player_id, day_number) — the client cannot tamper with them.
 *
 * Inputs:
 *   - enrolmentId, blockId, weekNumber
 *   - exerciseLogs: [{ exercise_id, sets: [{ set_number, completed, actual_reps? }] }, ...]
 *   - activationDone: { activation_id: true, ... }
 *   - notes, modificationNotes
 *   - existingLogId: optional UI hint (the unique key is the real authority)
 *
 * Returns the saved fitness_session_logs row.
 */
export async function saveSessionLog({
    enrolmentId, blockId, weekNumber,
    exerciseLogs, activationDone,
    notes, modificationNotes,
    existingLogId,
}) {
    if (!enrolmentId || !blockId || !weekNumber) {
        throw new Error('saveSessionLog: enrolmentId, blockId and weekNumber are required');
    }
    const { data, error } = await supabase.rpc('fitness_log_session_for_self', {
        p_enrolment_id: enrolmentId,
        p_block_id: blockId,
        p_week_number: weekNumber,
        p_exercise_logs: exerciseLogs || [],
        p_activation_done: activationDone || {},
        p_notes: notes ?? null,
        p_modification_notes: modificationNotes ?? null,
        p_existing_log_id: existingLogId || null,
    });
    if (error) throw new Error(`Save session log failed: ${error.message}`);
    return data;
}

/**
 * Load all award rows for an enrolment. Used by the badge panel.
 */
export async function loadAwardedBadges(enrolmentId) {
    if (!enrolmentId) return [];
    const { data, error } = await supabase
        .from('fitness_badges_awarded')
        .select('*')
        .eq('enrolment_id', enrolmentId)
        .order('awarded_at', { ascending: false });
    if (error) { console.error('loadAwardedBadges error:', error.message); return []; }
    return data || [];
}

/**
 * Insert award rows. Best-effort — failures are logged but don't block save.
 * RLS currently restricts writes to coach/admin; in Phase 5b we'll add a
 * SECURITY DEFINER RPC so players can self-award via verified compute.
 */
export async function awardBadges(enrolmentId, authUserId, playerId, awards) {
    if (!enrolmentId || !awards?.length) return [];
    const rows = awards.map(a => ({
        enrolment_id: enrolmentId,
        auth_user_id: authUserId,
        player_id: playerId,
        badge_key: a.badge_key,
        metadata: a.metadata || {},
    }));
    const { data, error } = await supabase
        .from('fitness_badges_awarded')
        .insert(rows)
        .select();
    if (error) {
        // Player context can't currently insert badges; that's fine — Phase 5b
        // will move this to a SECURITY DEFINER RPC. Don't surface as a fatal error.
        console.warn('awardBadges (insert blocked, expected for player role):', error.message);
        return [];
    }
    return data || [];
}

// ═══════════════════════════════════════════════════════════════════════
// COACH/ADMIN ANALYTICS — Phase 5
// ═══════════════════════════════════════════════════════════════════════

/**
 * Coach view: load every active player's enrolment + their session log count,
 * latest log date, and at-risk flag (no logs in past 10 days).
 *
 * Uses two queries (enrolments + logs) and merges client-side. Cohort sizes
 * around 100 keep this trivially fast.
 */
export async function loadCohortFitnessSummary(programId) {
    if (!programId) return [];
    const { data: enrolments, error: e1 } = await supabase
        .from('fitness_program_enrolment')
        .select('id, player_id, auth_user_id, start_date, status, canary_enabled, player:player_id(id, name, headshot_url)')
        .eq('program_id', programId)
        .eq('status', 'active');
    if (e1) { console.error('loadCohortFitnessSummary enrolments:', e1.message); return []; }

    const enrolmentIds = (enrolments || []).map(e => e.id);
    if (enrolmentIds.length === 0) return [];

    const { data: logs, error: e2 } = await supabase
        .from('fitness_session_logs')
        .select('enrolment_id, completed_at, week_number, day_number, logged_on_time')
        .in('enrolment_id', enrolmentIds)
        .order('completed_at', { ascending: false });
    if (e2) { console.error('loadCohortFitnessSummary logs:', e2.message); return []; }

    const logsByEnrolment = {};
    (logs || []).forEach(l => {
        if (!logsByEnrolment[l.enrolment_id]) logsByEnrolment[l.enrolment_id] = [];
        logsByEnrolment[l.enrolment_id].push(l);
    });

    const now = new Date();
    return (enrolments || []).map(en => {
        const myLogs = logsByEnrolment[en.id] || [];
        const sessionsCount = myLogs.length;
        const lastLogAt = myLogs[0] ? new Date(myLogs[0].completed_at) : null;
        const daysSinceLast = lastLogAt ? Math.floor((now - lastLogAt) / 86400000) : null;
        const atRisk = sessionsCount === 0 || (daysSinceLast !== null && daysSinceLast >= 10);
        return {
            enrolment_id: en.id,
            player_id: en.player_id,
            auth_user_id: en.auth_user_id,
            start_date: en.start_date,
            canary_enabled: en.canary_enabled,
            player: en.player,
            sessionsCount,
            lastLogAt,
            daysSinceLast,
            atRisk,
        };
    });
}

/**
 * Bulk-enrol every submitted player into a program who isn't already enrolled.
 * Returns the count of new rows inserted. Admin-only via RLS.
 */
export async function bulkEnrolSubmittedPlayers({ programId, startDate, enrolledBy }) {
    if (!programId) throw new Error('bulkEnrolSubmittedPlayers: programId is required');
    // Pull all submitted players.
    const { data: players, error: e1 } = await supabase
        .from('players')
        .select('id, auth_user_id')
        .eq('submitted', true)
        .not('auth_user_id', 'is', null);
    if (e1) throw new Error(`Load players failed: ${e1.message}`);

    // Pull existing enrolments to skip dupes.
    const { data: existing, error: e2 } = await supabase
        .from('fitness_program_enrolment')
        .select('auth_user_id')
        .eq('program_id', programId);
    if (e2) throw new Error(`Load existing enrolments failed: ${e2.message}`);

    const existingSet = new Set((existing || []).map(e => e.auth_user_id));
    const toEnrol = (players || []).filter(p => !existingSet.has(p.auth_user_id));

    if (toEnrol.length === 0) return { inserted: 0, alreadyEnrolled: existingSet.size };

    const today = startDate || new Date().toISOString().slice(0, 10);
    const rows = toEnrol.map(p => ({
        program_id: programId,
        auth_user_id: p.auth_user_id,
        player_id: p.id,
        start_date: today,
        status: 'active',
        canary_enabled: true,
        enrolled_by: enrolledBy || null,
    }));

    // Use upsert with ignoreDuplicates against the (program_id, auth_user_id)
    // unique constraint so concurrent admins don't blow up the whole batch
    // if a row was inserted between our SELECT and INSERT.
    const { data, error } = await supabase
        .from('fitness_program_enrolment')
        .upsert(rows, { onConflict: 'program_id,auth_user_id', ignoreDuplicates: true })
        .select('id');
    if (error) throw new Error(`Bulk upsert enrolments failed: ${error.message}`);
    return { inserted: data?.length || 0, alreadyEnrolled: existingSet.size };
}
