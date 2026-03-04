import { supabase } from '../supabaseClient';

// ─── JOURNAL ENTRIES ───

export async function loadRecentSessionsForPlayer(playerId) {
    // 1. Get programs the player is part of
    const { data: members, error: memErr } = await supabase
        .from('program_members')
        .select('program_id')
        .eq('auth_user_id', playerId)
        .eq('active', true);

    if (memErr) throw memErr;
    if (!members || members.length === 0) return [];

    const programIds = [...new Set(members.map(m => m.program_id))];

    // 2. Fetch past sessions for those programs
    const { data: sessions, error: sessErr } = await supabase
        .from('sessions')
        .select('id, program_id, session_date, title, journal_questions, programs(name)')
        .in('program_id', programIds)
        .lte('session_date', new Date().toISOString().split('T')[0]) // past or today
        .order('session_date', { ascending: false })
        .limit(10); // last 10 sessions

    if (sessErr) throw sessErr;
    return sessions || [];
}

export async function saveJournalEntry(entry, userId) {
    const payload = { ...entry, player_id: userId, updated_at: new Date().toISOString() };

    // Check if this is an update vs insert
    if (payload.id) {
        const { data, error } = await supabase
            .from('journal_entries')
            .update(payload)
            .eq('id', payload.id)
            .select()
            .single();
        if (error) throw error;
        return data;
    } else {
        const { data, error } = await supabase
            .from('journal_entries')
            .insert(payload)
            .select()
            .single();
        if (error) throw error;
        return data;
    }
}

export async function loadJournalForSession(playerId, sessionId) {
    const { data, error } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('player_id', playerId)
        .eq('session_id', sessionId)
        .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 is no rows returned
    return data;
}

export async function loadJournalHistory(playerId) {
    const { data, error } = await supabase
        .from('journal_entries')
        .select(`
            *,
            sessions (title, session_date),
            programs (name)
        `)
        .eq('player_id', playerId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
}

// ─── JOURNAL PROMPTS (COACH ONLY) ───

export async function loadPromptsForSession(sessionId) {
    const { data, error } = await supabase
        .from('journal_prompts')
        .select('*')
        .eq('session_id', sessionId)
        .order('sort_order', { ascending: true });

    if (error) throw error;
    return data || [];
}

export async function saveJournalPrompt(prompt, userId) {
    const payload = { ...prompt };

    if (payload.id) {
        const { data, error } = await supabase
            .from('journal_prompts')
            .update(payload)
            .eq('id', payload.id)
            .select()
            .single();
        if (error) throw error;
        return data;
    } else {
        payload.created_by = userId;
        const { data, error } = await supabase
            .from('journal_prompts')
            .insert(payload)
            .select()
            .single();
        if (error) throw error;
        return data;
    }
}

export async function deleteJournalPrompt(id) {
    const { error } = await supabase
        .from('journal_prompts')
        .delete()
        .eq('id', id);
    if (error) throw error;
}
