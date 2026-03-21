import { supabase } from '../supabaseClient';

// ─── GOALS (PLAYER OWNED) ───

export async function loadGoalsForPlayer(playerId, programId) {
    let q = supabase
        .from('idp_goals')
        .select('*')
        .eq('player_id', playerId)
        .order('created_at', { ascending: false });

    if (programId) q = q.eq('program_id', programId);

    const { data, error } = await q;
    if (error) throw error;
    return data || [];
}

export async function addGoal(goal, userId) {
    const payload = { ...goal, player_id: userId };
    const { data, error } = await supabase
        .from('idp_goals')
        .insert(payload)
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function updateGoalProgress(id, progress) {
    const { data, error } = await supabase
        .from('idp_goals')
        .update({ progress, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function updateGoal(id, updates) {
    const { data, error } = await supabase
        .from('idp_goals')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function completeGoal(id, reflectionNote) {
    const { data, error } = await supabase
        .from('idp_goals')
        .update({ status: 'completed', progress: 100, reflection: reflectionNote || null, completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function deleteGoal(id) {
    const { error } = await supabase
        .from('idp_goals')
        .delete()
        .eq('id', id);
    if (error) throw error;
}

// ─── FOCUS AREAS (COACH ASSIGNED) ───

export async function loadFocusAreas(playerId, programId) {
    let q = supabase
        .from('idp_focus_areas')
        .select('*')
        .eq('player_id', playerId)
        .order('created_at', { ascending: false });

    if (programId) q = q.eq('program_id', programId);

    const { data, error } = await q;
    if (error) throw error;
    return data || [];
}

export async function addFocusArea(focus, coachId) {
    const payload = { ...focus, set_by: coachId };
    const { data, error } = await supabase
        .from('idp_focus_areas')
        .insert(payload)
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function deleteFocusArea(id) {
    const { error } = await supabase
        .from('idp_focus_areas')
        .delete()
        .eq('id', id);
    if (error) throw error;
}

// ─── NOTES (SHARED) ───

export async function loadNotes(playerId, programId) {
    let q = supabase
        .from('idp_notes')
        .select('*')
        .eq('player_id', playerId)
        .order('created_at', { ascending: false });

    if (programId) q = q.eq('program_id', programId);

    const { data, error } = await q;
    if (error) throw error;
    return data || [];
}

export async function addNote(note, authorId, authorRole) {
    const payload = { ...note, author_id: authorId, author_role: authorRole };
    const { data, error } = await supabase
        .from('idp_notes')
        .insert(payload)
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function deleteNote(id) {
    const { error } = await supabase
        .from('idp_notes')
        .delete()
        .eq('id', id);
    if (error) throw error;
}
