// ═══ COACH SCHEDULER — Data Access ═══
// Reads/writes coach assignments, availability, and staffing rules.
// Tables: sp_session_coaches (assignments), sp_coach_availability (per-session yes/no),
//         sp_session_staffing_rules (min coaches per role per program/squad).
// RPC:    public.get_staffing_status(start, end, program_id) — admin/head_coach only.

import { supabase } from '../supabaseClient';

// Default program: RRA Melbourne T20 Elite Program 2026.
// Single active program today; matches sp_programs.id seeded in the live DB.
export const DEFAULT_PROGRAM_ID = 'a0000000-0000-0000-0000-000000000001';

const COACH_ROLES = [
    { id: 'squad_coach', label: 'Squad Coach', color: '#0075C9' },
    { id: 'assistant',   label: 'Assistant',   color: '#10B981' },
    { id: 'specialist',  label: 'Specialist',  color: '#8B5CF6' },
    { id: 'guest_coach', label: 'Guest',       color: '#F59E0B' },
    { id: 'head_coach',  label: 'Head Coach',  color: '#E96BB0' },
];

export function coachRoleLabel(roleId) {
    return COACH_ROLES.find(r => r.id === roleId)?.label || roleId;
}
export function coachRoleColor(roleId) {
    return COACH_ROLES.find(r => r.id === roleId)?.color || '#9CA3AF';
}
export function listCoachRoles() { return COACH_ROLES.slice(); }

// ─── Coach roster ────────────────────────────────────────────────────────
/** Active coaches in sp_coaches, sorted by name. */
export async function loadActiveCoaches() {
    const { data, error } = await supabase
        .from('sp_coaches')
        .select('id, user_id, name, email, role, speciality, is_active')
        .eq('is_active', true)
        .order('name');
    if (error) throw error;
    return data || [];
}

// ─── Sessions ────────────────────────────────────────────────────────────
/** Sessions in a date range for the program — for the availability page. */
export async function loadSessionsInRange(startDate, endDate, programId = DEFAULT_PROGRAM_ID) {
    const { data, error } = await supabase
        .from('sp_sessions')
        .select('id, date, start_time, end_time, squad_ids, theme, status, program_id')
        .eq('program_id', programId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date')
        .order('start_time');
    if (error) throw error;
    return data || [];
}

// ─── Staffing status (admin RPC) ─────────────────────────────────────────
/** Returns rows for each session in range with assigned/unavailable/gaps. */
export async function loadStaffingStatus(startDate, endDate, programId = DEFAULT_PROGRAM_ID) {
    const { data, error } = await supabase.rpc('get_staffing_status', {
        p_start_date: startDate,
        p_end_date: endDate,
        p_program_id: programId,
    });
    if (error) throw error;
    return data || [];
}

// ─── Assignments (admin write) ───────────────────────────────────────────
/** Assign a coach to a session in a given role. */
export async function assignCoachToSession(sessionId, coachId, coachRole, hour = null) {
    const { data, error } = await supabase
        .from('sp_session_coaches')
        .insert({
            session_id: sessionId,
            coach_id: coachId,
            coach_role: coachRole,
            confirmed: false,
            hour,
        })
        .select()
        .single();
    if (error) {
        // Unique constraint hit = already assigned — surface a friendlier message
        if (error.code === '23505') throw new Error('That coach is already assigned to this session in that role.');
        throw error;
    }
    return data;
}

/** Toggle confirmed flag on an existing assignment. */
export async function setAssignmentConfirmed(assignmentId, confirmed) {
    const { data, error } = await supabase
        .from('sp_session_coaches')
        .update({ confirmed })
        .eq('id', assignmentId)
        .select()
        .single();
    if (error) throw error;
    return data;
}

/** Remove a coach from a session. */
export async function removeAssignment(assignmentId) {
    const { error } = await supabase
        .from('sp_session_coaches')
        .delete()
        .eq('id', assignmentId);
    if (error) throw error;
}

// ─── Availability (per-session, per-coach) ───────────────────────────────
/**
 * Load my availability rows for sessions in the given date range.
 * Returns a map keyed by session_id → { status, notes, id }.
 */
export async function loadMyAvailability(userId, startDate, endDate) {
    // Two-step: fetch session ids in range first, then availability for those.
    const sessions = await loadSessionsInRange(startDate, endDate);
    const sessionIds = sessions.map(s => s.id);
    if (sessionIds.length === 0) return { sessions: [], byId: {} };
    const { data, error } = await supabase
        .from('sp_coach_availability')
        .select('id, session_id, date, status, notes, updated_at')
        .eq('user_id', userId)
        .in('session_id', sessionIds);
    if (error) throw error;
    const byId = {};
    (data || []).forEach(r => { byId[r.session_id] = r; });
    return { sessions, byId };
}

/**
 * Set availability for a single session. Upserts into sp_coach_availability.
 * Status: 'available' | 'unavailable' | 'tentative'.
 * If status === 'available' and no notes, we DELETE the row instead so the
 * default ("no row" === "available") stays clean.
 */
export async function setAvailability({ userId, programId = DEFAULT_PROGRAM_ID, sessionId, date, status, notes = null }) {
    if (!userId || !sessionId || !date) throw new Error('Missing required args for setAvailability');
    const validStatuses = ['available', 'unavailable', 'tentative'];
    if (!validStatuses.includes(status)) throw new Error(`Invalid status: ${status}`);

    if (status === 'available' && !notes) {
        // Default state — remove any explicit row so the table doesn't grow unboundedly.
        const { error } = await supabase
            .from('sp_coach_availability')
            .delete()
            .eq('user_id', userId)
            .eq('session_id', sessionId);
        if (error) throw error;
        return null;
    }

    const { data, error } = await supabase
        .from('sp_coach_availability')
        .upsert(
            { user_id: userId, program_id: programId, session_id: sessionId, date, status, notes, updated_at: new Date().toISOString() },
            { onConflict: 'session_id, user_id' }
        )
        .select()
        .single();
    if (error) throw error;
    return data;
}

/**
 * Bulk set availability across many sessions at once (e.g. "I'm out 14–28 June").
 * Each entry is { sessionId, date }.
 */
export async function bulkSetAvailability({ userId, programId = DEFAULT_PROGRAM_ID, entries, status, notes = null }) {
    if (!Array.isArray(entries) || entries.length === 0) return { ok: 0, failed: 0 };
    let ok = 0, failed = 0;
    // Sequential to keep error messages clear; volume is low (≤60 sessions).
    for (const e of entries) {
        try {
            await setAvailability({ userId, programId, sessionId: e.sessionId, date: e.date, status, notes });
            ok++;
        } catch (err) {
            console.error('bulkSetAvailability failed for session', e.sessionId, err.message);
            failed++;
        }
    }
    return { ok, failed };
}

// ─── Staffing rules (admin customisation) ────────────────────────────────
export async function loadStaffingRules(programId = DEFAULT_PROGRAM_ID) {
    const { data, error } = await supabase
        .from('sp_session_staffing_rules')
        .select('id, program_id, squad_id, coach_role, min_count, notes, updated_at')
        .eq('program_id', programId)
        .order('coach_role');
    if (error) throw error;
    return data || [];
}

export async function upsertStaffingRule({ programId = DEFAULT_PROGRAM_ID, squadId = null, coachRole, minCount, notes = null }) {
    // The DB unique key is (program_id, COALESCE(squad_id, sentinel), coach_role).
    // Supabase JS can't target an expression-index for onConflict, so manually find-then-upsert.
    let q = supabase
        .from('sp_session_staffing_rules')
        .select('id')
        .eq('program_id', programId)
        .eq('coach_role', coachRole);
    q = squadId === null ? q.is('squad_id', null) : q.eq('squad_id', squadId);
    const { data: existing, error: selErr } = await q.maybeSingle();
    if (selErr) throw selErr;

    const payload = {
        program_id: programId, squad_id: squadId, coach_role: coachRole,
        min_count: minCount, notes, updated_at: new Date().toISOString(),
    };
    if (existing?.id) {
        const { data, error } = await supabase
            .from('sp_session_staffing_rules')
            .update(payload).eq('id', existing.id).select().single();
        if (error) throw error;
        return data;
    }
    const { data, error } = await supabase
        .from('sp_session_staffing_rules')
        .insert(payload).select().single();
    if (error) throw error;
    return data;
}

export async function deleteStaffingRule(ruleId) {
    const { error } = await supabase
        .from('sp_session_staffing_rules')
        .delete()
        .eq('id', ruleId);
    if (error) throw error;
}

// ─── Squad name helpers (used in calendar rendering) ─────────────────────
let squadCache = null;
let squadCachePromise = null;
export async function loadSquadsCached() {
    if (squadCache) return squadCache;
    if (squadCachePromise) return squadCachePromise;
    squadCachePromise = supabase
        .from('sp_squads')
        .select('id, name, colour, program_id')
        .order('name')
        .then(({ data, error }) => {
            squadCachePromise = null;
            if (error) throw error;
            squadCache = data || [];
            return squadCache;
        });
    return squadCachePromise;
}
