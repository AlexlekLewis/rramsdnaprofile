// ═══ ADMIN DATA ACCESS LAYER ═══
// All Supabase operations for the admin dashboard.
import { supabase } from '../supabaseClient';

// ──────────────────────────────────
// ENGINE CONSTANTS
// ──────────────────────────────────
export async function loadEngineConstants() {
    const { data, error } = await supabase.from('engine_constants').select('*');
    if (error) throw error;
    return data;
}

export async function updateEngineConstant(constantKey, newValue) {
    const { error } = await supabase
        .from('engine_constants')
        .update({ value: String(newValue) })
        .eq('constant_key', constantKey);
    if (error) throw error;
}

// ──────────────────────────────────
// DOMAIN WEIGHTS
// ──────────────────────────────────
export async function loadDomainWeights() {
    const { data, error } = await supabase.from('domain_weights').select('*');
    if (error) throw error;
    return data;
}

export async function updateDomainWeights(roleId, weights) {
    // weights: { technical_weight, game_iq_weight, mental_weight, physical_weight, phase_weight }
    const { error } = await supabase
        .from('domain_weights')
        .update(weights)
        .eq('role_id', roleId);
    if (error) throw error;
}

// ──────────────────────────────────
// COMPETITION TIERS
// ──────────────────────────────────
export async function loadCompetitionTiers() {
    const { data, error } = await supabase
        .from('competition_tiers')
        .select('*')
        .order('cti_value', { ascending: false });
    if (error) throw error;
    return data;
}

export async function updateCompetitionTier(code, updates) {
    const { error } = await supabase
        .from('competition_tiers')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('code', code);
    if (error) throw error;
}

// ──────────────────────────────────
// SQUAD GROUPS
// ──────────────────────────────────
export async function loadSquadGroups() {
    const { data, error } = await supabase
        .from('squad_groups')
        .select(`
            *,
            coach_squad_access ( id, coach_id, role )
        `)
        .order('sort_order');
    if (error) throw error;
    return data;
}

export async function createSquadGroup(name, description, targetSize) {
    const { data, error } = await supabase
        .from('squad_groups')
        .insert({ name, description, target_size: targetSize })
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function updateSquadGroup(id, updates) {
    const { error } = await supabase
        .from('squad_groups')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);
    if (error) throw error;
}

export async function deleteSquadGroup(id) {
    const { error } = await supabase.from('squad_groups').delete().eq('id', id);
    if (error) throw error;
}

// ──────────────────────────────────
// SQUAD ALLOCATIONS
// ──────────────────────────────────
export async function loadSquadAllocations() {
    const { data, error } = await supabase.from('squad_allocations').select('*');
    if (error) throw error;
    return data;
}

export async function allocatePlayerToSquad(squadId, playerId, allocatedBy, notes) {
    // Remove from any existing squad first, then assign
    await supabase.from('squad_allocations').delete().eq('player_id', playerId);
    const { data, error } = await supabase
        .from('squad_allocations')
        .insert({ squad_id: squadId, player_id: playerId, allocated_by: allocatedBy, notes })
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function removePlayerFromSquad(playerId) {
    const { error } = await supabase.from('squad_allocations').delete().eq('player_id', playerId);
    if (error) throw error;
}

export async function assignCoachToSquad(squadId, coachId, role = 'squad_coach') {
    const { data, error } = await supabase
        .from('coach_squad_access')
        .upsert({ squad_id: squadId, coach_id: coachId, role }, { onConflict: 'squad_id, coach_id' })
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function removeCoachFromSquad(squadId, coachId) {
    const { error } = await supabase
        .from('coach_squad_access')
        .delete()
        .match({ squad_id: squadId, coach_id: coachId });
    if (error) throw error;
}

// ──────────────────────────────────
// ANALYTICS QUERIES
// ──────────────────────────────────
export async function loadAnalyticsEvents(daysBack = 30) {
    const since = new Date(Date.now() - daysBack * 86400000).toISOString();
    const { data, error } = await supabase
        .from('analytics_events')
        .select('*')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(5000);
    if (error) throw error;
    return data || [];
}

export async function loadLoginHistory(daysBack = 30) {
    const since = new Date(Date.now() - daysBack * 86400000).toISOString();
    const { data, error } = await supabase
        .from('analytics_events')
        .select('*')
        .eq('event_type', 'login')
        .gte('created_at', since)
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
}

// ──────────────────────────────────
// PROGRAM MEMBERS (read for admin)
// ──────────────────────────────────
export async function loadProgramMembers() {
    const { data, error } = await supabase
        .from('program_members')
        .select('*')
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
}

export async function updateProgramMember(id, updates) {
    const { error } = await supabase
        .from('program_members')
        .update(updates)
        .eq('id', id);
    if (error) throw error;
}

// ──────────────────────────────────
// ADMIN PASSWORD RESET (via Edge Function)
// ──────────────────────────────────
export async function resetUserPassword(authUserId, username) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Not authenticated');

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const res = await fetch(`${supabaseUrl}/functions/v1/admin-reset-password`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ auth_user_id: authUserId, username }),
    });

    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Password reset failed');
    return result;
}

// ──────────────────────────────────
// USER PROFILES (for admin listing)
// ──────────────────────────────────
export async function loadAllUserProfiles() {
    const { data, error } = await supabase.from('user_profiles').select('*');
    if (error) throw error;
    return data || [];
}

// ──────────────────────────────────
// DELETED MEMBERS (30-day recovery)
// ──────────────────────────────────
export async function loadDeletedMembers() {
    const { data, error } = await supabase
        .from('deleted_members')
        .select('*')
        .order('deleted_at', { ascending: false });
    if (error) throw error;
    return data || [];
}

// ──────────────────────────────────
// MEMBER ENGAGEMENT (player onboarding + profile data)
// ──────────────────────────────────
export async function loadMemberEngagement() {
    const { data, error } = await supabase
        .from('players')
        .select('id, name, submitted, profile_version, onboarding_progress, created_at')
        .order('name');
    if (error) throw error;
    return (data || []).map(p => ({
        id: p.id,
        name: p.name,
        submitted: !!p.submitted,
        profileVersion: p.profile_version || 1,
        onboardingPct: (() => {
            const prog = p.onboarding_progress;
            if (!prog) return p.submitted ? 100 : 0;
            // percentComplete is pre-calculated by advanceStep; fall back to counting steps
            if (prog.percentComplete != null) return prog.percentComplete;
            const steps = prog.steps ? Object.keys(prog.steps) : [];
            return Math.round((steps.length / 7) * 100);
        })(),
        totalOnboardingTime: (() => {
            const prog = p.onboarding_progress;
            if (!prog) return null;
            // totalTimeMs is pre-accumulated by advanceStep; fall back to summing step durations
            if (prog.totalTimeMs != null) return prog.totalTimeMs;
            const steps = prog.steps ? Object.values(prog.steps) : [];
            return steps.reduce((sum, s) => sum + (s?.durationMs || 0), 0);
        })(),
        joinDate: p.created_at,
    }));
}

// ──────────────────────────────────
// PLAYER MANAGEMENT (admin actions)
// ──────────────────────────────────

export async function updatePlayer(playerId, updates) {
    const { data, error } = await supabase
        .from('players')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', playerId)
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function archivePlayer(playerId) {
    // Set submitted = false to hide from active roster, keep data for recovery
    const { error } = await supabase
        .from('players')
        .update({ submitted: false, updated_at: new Date().toISOString() })
        .eq('id', playerId);
    if (error) throw error;
    // Also deactivate their program membership if exists
    const { data: member } = await supabase
        .from('program_members')
        .select('id')
        .eq('auth_user_id', (await supabase.from('players').select('auth_user_id').eq('id', playerId).maybeSingle()).data?.auth_user_id)
        .maybeSingle();
    if (member) {
        await supabase.from('program_members').update({ active: false }).eq('id', member.id);
    }
}

export async function restorePlayer(playerId) {
    const { error } = await supabase
        .from('players')
        .update({ submitted: true, updated_at: new Date().toISOString() })
        .eq('id', playerId);
    if (error) throw error;
}

export async function deletePlayer(playerId) {
    // Remove related data first
    await supabase.from('coach_assessments').delete().eq('player_id', playerId);
    await supabase.from('competition_grades').delete().eq('player_id', playerId);
    await supabase.from('squad_allocations').delete().eq('player_id', playerId);
    await supabase.from('idp_goals').delete().eq('player_id', playerId);
    await supabase.from('idp_focus_areas').delete().eq('player_id', playerId);
    await supabase.from('idp_notes').delete().eq('player_id', playerId);
    await supabase.from('journal_entries').delete().eq('player_id', playerId);
    // Then delete the player
    const { error } = await supabase.from('players').delete().eq('id', playerId);
    if (error) throw error;
}

export async function bulkArchivePlayers(playerIds) {
    const { error } = await supabase
        .from('players')
        .update({ submitted: false, updated_at: new Date().toISOString() })
        .in('id', playerIds);
    if (error) throw error;
}

export async function bulkDeletePlayers(playerIds) {
    for (const id of playerIds) {
        await deletePlayer(id);
    }
}

export async function updateCohortPlayer(cohortId, updates) {
    const { data, error } = await supabase
        .from('official_cohort_2026')
        .update(updates)
        .eq('id', cohortId)
        .select()
        .single();
    if (error) throw error;
    return data;
}
