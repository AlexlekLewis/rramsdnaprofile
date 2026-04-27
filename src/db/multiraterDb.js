// ═══ MULTI-RATER ASSESSMENT — DATA ACCESS LAYER ═══
// Phase 1+2+4+6: assessment_item_definitions, coach_assessment_items, report_coach_allocation
// All tables additive. Never modifies existing coach_assessments.
import { supabase } from '../supabaseClient';

// ── Item definitions (the questions + 5 statements per item) ──
export async function loadAssessmentItems() {
    const { data, error } = await supabase
        .from('assessment_item_definitions')
        .select('*')
        .eq('active', true)
        .order('display_order', { ascending: true });
    if (error) { console.error('loadAssessmentItems error:', error.message); return []; }
    return (data || []).map(row => ({
        key: row.item_key,
        section: row.section,
        category: row.category,
        order: row.display_order,
        prompt: row.prompt,
        statements: [row.statement_1, row.statement_2, row.statement_3, row.statement_4, row.statement_5],
        appliesToRole: row.applies_to_role,
        appliesToSession: row.applies_to_session,
    }));
}

// ── Allocations (the screenshot, persisted) ──
export async function loadCoachAllocations(coachId, allocationContext = 'assessment_week_2026') {
    if (!coachId) return [];
    const { data, error } = await supabase
        .from('report_coach_allocation')
        .select('player_id, primary_coach_id, allocation_context')
        .eq('primary_coach_id', coachId)
        .eq('allocation_context', allocationContext);
    if (error) { console.error('loadCoachAllocations error:', error.message); return []; }
    return (data || []).map(r => r.player_id);
}

export async function loadAllAllocations(allocationContext = 'assessment_week_2026') {
    const { data, error } = await supabase
        .from('report_coach_allocation')
        .select('player_id, primary_coach_id, allocation_context, notes')
        .eq('allocation_context', allocationContext);
    if (error) { console.error('loadAllAllocations error:', error.message); return []; }
    return data || [];
}

// ── Per-coach ratings ──
export async function loadCoachItemRatings({ playerId, coachId, sessionType = 'both', sessionContext = 'assessment_week_2026' }) {
    if (!playerId || !coachId) return [];
    const { data, error } = await supabase
        .from('coach_assessment_items')
        .select('*')
        .eq('player_id', playerId)
        .eq('coach_id', coachId)
        .eq('session_context', sessionContext)
        .in('session_type', [sessionType, 'both']);
    if (error) { console.error('loadCoachItemRatings error:', error.message); return []; }
    return data || [];
}

export async function saveItemRating({
    playerId, coachId, itemKey, score, statement,
    sessionType = 'both', sessionContext = 'assessment_week_2026', notes = null,
}) {
    if (!playerId || !coachId || !itemKey) {
        return { ok: false, error: 'missing required fields' };
    }
    if (score < 1 || score > 5) {
        return { ok: false, error: 'score must be between 1 and 5' };
    }

    // Pre-save token refresh — adopting pattern from commit 038718b (journal & reflection fix)
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) await supabase.auth.refreshSession();
    } catch (e) {
        console.warn('saveItemRating: token refresh failed, continuing:', e?.message);
    }

    const payload = {
        player_id: playerId,
        coach_id: coachId,
        item_key: itemKey,
        score,
        statement,
        session_type: sessionType,
        session_context: sessionContext,
        notes,
        updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
        .from('coach_assessment_items')
        .upsert(payload, { onConflict: 'player_id,coach_id,item_key,session_type,session_context' })
        .select()
        .single();

    if (error) {
        console.error('saveItemRating error:', error.message);
        return { ok: false, error: error.message };
    }
    return { ok: true, row: data };
}

export async function deleteItemRating({ playerId, coachId, itemKey, sessionType = 'both', sessionContext = 'assessment_week_2026' }) {
    if (!playerId || !coachId || !itemKey) return { ok: false };
    const { error } = await supabase
        .from('coach_assessment_items')
        .delete()
        .eq('player_id', playerId)
        .eq('coach_id', coachId)
        .eq('item_key', itemKey)
        .eq('session_type', sessionType)
        .eq('session_context', sessionContext);
    if (error) { console.error('deleteItemRating error:', error.message); return { ok: false, error: error.message }; }
    return { ok: true };
}

// ── Aggregates for player IDP / DNA profile ──
export async function loadPlayerAggregates(playerId, sessionContext = 'assessment_week_2026') {
    if (!playerId) return [];
    const { data, error } = await supabase
        .from('v_player_item_aggregates')
        .select('*')
        .eq('player_id', playerId)
        .eq('session_context', sessionContext);
    if (error) { console.error('loadPlayerAggregates error:', error.message); return []; }
    return data || [];
}

// ── All ratings for a player (multi-rater detail view) ──
export async function loadPlayerAllRatings(playerId, sessionContext = 'assessment_week_2026') {
    if (!playerId) return [];
    const { data, error } = await supabase
        .from('coach_assessment_items')
        .select('*')
        .eq('player_id', playerId)
        .eq('session_context', sessionContext)
        .order('updated_at', { ascending: false });
    if (error) { console.error('loadPlayerAllRatings error:', error.message); return []; }
    return data || [];
}

// ── Helper: completion summary for a coach across their allocated players ──
export async function loadCoachCompletionSummary(coachId, sessionContext = 'assessment_week_2026') {
    if (!coachId) return {};
    const { data, error } = await supabase
        .from('coach_assessment_items')
        .select('player_id, item_key, session_type')
        .eq('coach_id', coachId)
        .eq('session_context', sessionContext);
    if (error) { console.error('loadCoachCompletionSummary error:', error.message); return {}; }
    const byPlayer = {};
    (data || []).forEach(r => {
        if (!byPlayer[r.player_id]) byPlayer[r.player_id] = { count: 0, items: new Set() };
        byPlayer[r.player_id].count += 1;
        byPlayer[r.player_id].items.add(r.item_key);
    });
    Object.keys(byPlayer).forEach(k => { byPlayer[k].items = [...byPlayer[k].items]; });
    return byPlayer;
}

// ── Admin: set/update an allocation row ──
export async function setReportAllocation({ playerId, primaryCoachId, allocationContext = 'assessment_week_2026', notes = null }) {
    if (!playerId || !primaryCoachId) return { ok: false, error: 'missing required fields' };
    const { data, error } = await supabase
        .from('report_coach_allocation')
        .upsert({
            player_id: playerId,
            primary_coach_id: primaryCoachId,
            allocation_context: allocationContext,
            notes,
            updated_at: new Date().toISOString(),
        }, { onConflict: 'player_id,allocation_context' })
        .select()
        .single();
    if (error) { console.error('setReportAllocation error:', error.message); return { ok: false, error: error.message }; }
    return { ok: true, row: data };
}
