// ═══ WEEKLY REFLECTIONS DATA ACCESS LAYER ═══
// Admin authors a weekly reflection (up to 3 multi-choice questions).
// Players see the currently-published reflection and submit one response each.

import { supabase } from '../supabaseClient';

/**
 * Load all reflections (admin view — includes drafts).
 * Returns an array sorted by week_number desc.
 */
export async function loadAllReflections(programId = null) {
    let q = supabase.from('weekly_reflections').select('*').order('week_number', { ascending: false });
    if (programId) q = q.eq('program_id', programId);
    const { data, error } = await q;
    if (error) { console.error('loadAllReflections error:', error.message); return []; }
    return data || [];
}

/**
 * Load the currently-published reflections that a player should answer
 * (any that are published and the player hasn't yet answered).
 */
export async function loadPendingReflectionsForPlayer(authUserId, programId = null) {
    if (!authUserId) return [];
    let q = supabase.from('weekly_reflections').select('*').not('published_at', 'is', null).order('week_number', { ascending: false });
    if (programId) q = q.eq('program_id', programId);
    const { data: reflections, error: rErr } = await q;
    if (rErr) { console.error('load reflections error:', rErr.message); return []; }

    const { data: responses, error: resErr } = await supabase
        .from('weekly_reflection_responses')
        .select('reflection_id')
        .eq('auth_user_id', authUserId);
    if (resErr) { console.error('load responses error:', resErr.message); }
    const answered = new Set((responses || []).map(r => r.reflection_id));

    return (reflections || []).filter(r => !answered.has(r.id));
}

/**
 * Load the player's previous responses with the underlying reflection details.
 */
export async function loadPlayerResponseHistory(authUserId) {
    if (!authUserId) return [];
    const { data, error } = await supabase
        .from('weekly_reflection_responses')
        .select('*, reflection:reflection_id(id, week_number, week_label, questions, published_at)')
        .eq('auth_user_id', authUserId)
        .order('submitted_at', { ascending: false });
    if (error) { console.error('load response history error:', error.message); return []; }
    return data || [];
}

/**
 * Admin: create a new reflection template (starts as draft — published_at NULL).
 * questions = [{text, options: []}, ...] max 3.
 */
export async function createReflection({ weekNumber, weekLabel, questions, programId, createdBy }) {
    const row = {
        week_number: weekNumber,
        week_label: weekLabel || null,
        program_id: programId || null,
        questions: questions || [],
        published_at: null,
        created_by: createdBy || null,
    };
    const { data, error } = await supabase.from('weekly_reflections').insert(row).select().single();
    if (error) throw new Error(`Create reflection failed: ${error.message}`);
    return data;
}

/**
 * Admin: update a reflection (edit questions, label, etc). Does NOT publish.
 */
export async function updateReflection(id, patch) {
    const { data, error } = await supabase.from('weekly_reflections').update(patch).eq('id', id).select().single();
    if (error) throw new Error(`Update reflection failed: ${error.message}`);
    return data;
}

/**
 * Admin: publish a reflection (sets published_at = NOW).
 */
export async function publishReflection(id) {
    const { data, error } = await supabase.from('weekly_reflections').update({ published_at: new Date().toISOString() }).eq('id', id).select().single();
    if (error) throw new Error(`Publish reflection failed: ${error.message}`);
    return data;
}

/**
 * Admin: unpublish (roll back to draft).
 */
export async function unpublishReflection(id) {
    const { data, error } = await supabase.from('weekly_reflections').update({ published_at: null }).eq('id', id).select().single();
    if (error) throw new Error(`Unpublish reflection failed: ${error.message}`);
    return data;
}

/**
 * Admin: delete a reflection (responses cascade).
 */
export async function deleteReflection(id) {
    const { error } = await supabase.from('weekly_reflections').delete().eq('id', id);
    if (error) throw new Error(`Delete reflection failed: ${error.message}`);
    return true;
}

/**
 * Player: submit a response to a reflection.
 * answers = [{question_index, option_index, option_text}, ...]
 */
export async function submitReflectionResponse({ reflectionId, playerId, authUserId, answers }) {
    const row = {
        reflection_id: reflectionId,
        player_id: playerId || null,
        auth_user_id: authUserId,
        answers: answers || [],
        submitted_at: new Date().toISOString(),
    };
    // Use upsert so players can edit their response (but unique (reflection_id, auth_user_id))
    const { data, error } = await supabase.from('weekly_reflection_responses')
        .upsert(row, { onConflict: 'reflection_id,auth_user_id' })
        .select()
        .single();
    if (error) throw new Error(`Submit response failed: ${error.message}`);
    return data;
}

/**
 * Admin: load responses for a specific reflection (for analysis).
 */
export async function loadResponsesForReflection(reflectionId) {
    const { data, error } = await supabase
        .from('weekly_reflection_responses')
        .select('*, player:player_id(name)')
        .eq('reflection_id', reflectionId)
        .order('submitted_at', { ascending: false });
    if (error) { console.error('load responses error:', error.message); return []; }
    return data || [];
}

/**
 * Helper: basic validation of a questions array before save.
 * Returns { ok: bool, error: string }.
 */
export function validateQuestions(questions) {
    if (!Array.isArray(questions)) return { ok: false, error: 'Questions must be an array' };
    if (questions.length === 0) return { ok: false, error: 'At least 1 question required' };
    if (questions.length > 3) return { ok: false, error: 'Max 3 questions' };
    for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        if (!q.text || !q.text.trim()) return { ok: false, error: `Question ${i + 1} text is empty` };
        if (!Array.isArray(q.options) || q.options.length < 2) return { ok: false, error: `Question ${i + 1} needs at least 2 options` };
        if (q.options.length > 5) return { ok: false, error: `Question ${i + 1} has too many options (max 5)` };
        if (q.options.some(o => !o || !o.trim())) return { ok: false, error: `Question ${i + 1} has an empty option` };
    }
    return { ok: true };
}
