import { supabase } from '../supabaseClient';

// ─── WEEKLY REFLECTION (text + multiple-choice, category-grouped) ───
//
// QUESTIONS shape (jsonb on weekly_reflections.questions):
//   [
//     { id: "sb1", category: "Short Ball", type: "text",  question: "..." },
//     { id: "sb2", category: "Short Ball", type: "choice", question: "...",
//       options: [ { id: "a", label: "Option A" }, { id: "b", label: "Option B" } ] }
//   ]
//   `type` defaults to "text" when missing (legacy Week 1 rows).
//
// ANSWERS shape (jsonb on weekly_reflection_responses.answers):
//   { "sb1": "free text answer", "sb2": "a" }   // text → string, choice → option id

// ═══════════════════════════════════════════════════════════════════════
// PLAYER-FACING
// ═══════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════
// COACH / ADMIN-FACING
// ═══════════════════════════════════════════════════════════════════════

export async function loadAllReflections(programId = null) {
    let q = supabase.from('weekly_reflections').select('*').order('week_number', { ascending: false });
    if (programId) q = q.eq('program_id', programId);
    const { data, error } = await q;
    if (error) { console.error('loadAllReflections error:', error.message); return []; }
    return data || [];
}

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

export async function updateReflection(id, patch) {
    const { data, error } = await supabase.from('weekly_reflections').update(patch).eq('id', id).select().single();
    if (error) throw new Error(`Update reflection failed: ${error.message}`);
    return data;
}

export async function publishReflection(id) {
    const { data, error } = await supabase
        .from('weekly_reflections')
        .update({ published_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
    if (error) throw new Error(`Publish reflection failed: ${error.message}`);
    return data;
}

export async function unpublishReflection(id) {
    const { data, error } = await supabase
        .from('weekly_reflections')
        .update({ published_at: null })
        .eq('id', id)
        .select()
        .single();
    if (error) throw new Error(`Unpublish reflection failed: ${error.message}`);
    return data;
}

export async function deleteReflection(id) {
    const { error } = await supabase.from('weekly_reflections').delete().eq('id', id);
    if (error) throw new Error(`Delete reflection failed: ${error.message}`);
    return true;
}

/**
 * Admin: load all responses for a single reflection (used by the response viewer).
 * The join to players is best-effort — responses from auth_user_ids that don't
 * have a corresponding players row still come back, just without the name.
 */
export async function loadResponsesForReflection(reflectionId) {
    const { data, error } = await supabase
        .from('weekly_reflection_responses')
        .select('*, player:player_id(id, name)')
        .eq('reflection_id', reflectionId)
        .order('submitted_at', { ascending: false });
    if (error) { console.error('loadResponsesForReflection error:', error.message); return []; }
    return data || [];
}

// ═══════════════════════════════════════════════════════════════════════
// VALIDATION & HELPERS
// ═══════════════════════════════════════════════════════════════════════

/**
 * Returns the question's effective type, defaulting to "text" for legacy
 * questions that don't have the field.
 */
export function questionType(q) {
    return q?.type === 'choice' ? 'choice' : 'text';
}

/**
 * Validate a questions array before save. Returns { ok, error }.
 * Rules:
 *   - At least 1 question, at most 20.
 *   - Every question has a non-empty `id` and `question` text.
 *   - Question ids must be unique within the reflection.
 *   - Choice questions must have ≥ 2 options, each with non-empty id and label,
 *     and unique option ids within the question.
 */
export function validateQuestions(questions) {
    if (!Array.isArray(questions)) return { ok: false, error: 'Questions must be an array' };
    if (questions.length === 0) return { ok: false, error: 'At least 1 question is required' };
    if (questions.length > 20) return { ok: false, error: 'Max 20 questions per week' };

    const seenIds = new Set();
    for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        if (!q || typeof q !== 'object') return { ok: false, error: `Question ${i + 1} is malformed` };
        const id = (q.id || '').trim();
        if (!id) return { ok: false, error: `Question ${i + 1} is missing an id` };
        if (seenIds.has(id)) return { ok: false, error: `Question id "${id}" is used more than once` };
        seenIds.add(id);
        if (!q.question || !String(q.question).trim()) return { ok: false, error: `Question ${i + 1} ("${id}") has no question text` };

        const t = questionType(q);
        if (t === 'choice') {
            const opts = q.options;
            if (!Array.isArray(opts) || opts.length < 2) return { ok: false, error: `Choice question "${id}" needs at least 2 options` };
            if (opts.length > 8) return { ok: false, error: `Choice question "${id}" has too many options (max 8)` };
            const seenOptIds = new Set();
            for (let j = 0; j < opts.length; j++) {
                const o = opts[j];
                if (!o || typeof o !== 'object') return { ok: false, error: `Option ${j + 1} of "${id}" is malformed` };
                const oid = (o.id || '').trim();
                const olabel = (o.label || '').trim();
                if (!oid) return { ok: false, error: `Option ${j + 1} of "${id}" is missing an id` };
                if (!olabel) return { ok: false, error: `Option "${oid}" of "${id}" has no label` };
                if (seenOptIds.has(oid)) return { ok: false, error: `Option id "${oid}" appears twice in "${id}"` };
                seenOptIds.add(oid);
            }
        }
    }
    return { ok: true };
}

/**
 * Group an array of questions into [{ category, questions }] preserving the
 * order each category first appears. Used by both player and admin UIs.
 */
export function groupQuestionsByCategory(questions) {
    const order = [];
    const groups = {};
    (questions || []).forEach(q => {
        const cat = q.category || 'Other';
        if (!groups[cat]) { groups[cat] = []; order.push(cat); }
        groups[cat].push(q);
    });
    return order.map(cat => ({ category: cat, questions: groups[cat] }));
}
