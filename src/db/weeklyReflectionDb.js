import { supabase } from '../supabaseClient';

// ─── WEEKLY REFLECTION (text-answer, category-grouped) ───
// Coach publishes one reflection per week. `questions` is a flat array of
// { id, category, question } objects; player answers are stored as a flat
// object keyed by question id, e.g. { sb1: "their answer", sw1: "..." }.

/**
 * Latest published reflection where published_at <= now.
 * Returns the row or null if none published yet.
 */
export async function loadCurrentReflection() {
    const { data, error } = await supabase
        .from('weekly_reflections')
        .select('*')
        .not('published_at', 'is', null)
        .lte('published_at', new Date().toISOString())
        .order('week_number', { ascending: false })
        .limit(1)
        .maybeSingle();
    if (error) { console.error('loadCurrentReflection error:', error.message); return null; }
    return data;
}

/**
 * The current player's response for a given reflection (or null if not yet submitted).
 */
export async function loadPlayerResponse(reflectionId, authUserId) {
    if (!reflectionId || !authUserId) return null;
    const { data, error } = await supabase
        .from('weekly_reflection_responses')
        .select('*')
        .eq('reflection_id', reflectionId)
        .eq('auth_user_id', authUserId)
        .maybeSingle();
    if (error) { console.error('loadPlayerResponse error:', error.message); return null; }
    return data;
}

/**
 * Insert a new response. `answers` is a flat object keyed by question id.
 */
export async function submitResponse(reflectionId, playerId, authUserId, answers) {
    const row = {
        reflection_id: reflectionId,
        player_id: playerId || null,
        auth_user_id: authUserId,
        answers: answers || {},
        submitted_at: new Date().toISOString(),
    };
    const { data, error } = await supabase
        .from('weekly_reflection_responses')
        .insert(row)
        .select()
        .single();
    if (error) throw new Error(`Submit response failed: ${error.message}`);
    return data;
}

/**
 * Update an existing response's answers.
 */
export async function updateResponse(responseId, answers) {
    const { data, error } = await supabase
        .from('weekly_reflection_responses')
        .update({ answers: answers || {}, submitted_at: new Date().toISOString() })
        .eq('id', responseId)
        .select()
        .single();
    if (error) throw new Error(`Update response failed: ${error.message}`);
    return data;
}

/**
 * All past responses for the player, joined with their reflection (week_number,
 * week_label, questions). Most recent submissions first.
 */
export async function loadResponseHistory(authUserId) {
    if (!authUserId) return [];
    const { data, error } = await supabase
        .from('weekly_reflection_responses')
        .select('*, reflection:reflection_id(id, week_number, week_label, questions, published_at)')
        .eq('auth_user_id', authUserId)
        .order('submitted_at', { ascending: false });
    if (error) { console.error('loadResponseHistory error:', error.message); return []; }
    return data || [];
}
