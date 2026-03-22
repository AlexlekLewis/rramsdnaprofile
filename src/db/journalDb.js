import { supabase } from '../supabaseClient';

// ─── JOURNAL ENTRIES ───

/**
 * Translate DB row → frontend shape.
 * DB stores { responses: { answers: [{q,a}], mood } }
 * Frontend expects { answers: [{q,a}], mood, ...rest }
 */
function normaliseJournalEntry(row) {
    if (!row) return row;
    const { responses, ...rest } = row;
    return {
        ...rest,
        answers: responses?.answers || [],
        mood: responses?.mood || null,
    };
}

export async function loadRecentSessionsForPlayer(playerId) {
    // 1. Get the player's season from program_members (no program_id column — link is via season)
    const { data: members, error: memErr } = await supabase
        .from('program_members')
        .select('season')
        .eq('auth_user_id', playerId)
        .eq('active', true);

    if (memErr) throw memErr;
    if (!members || members.length === 0) return [];

    const seasons = [...new Set(members.map(m => m.season).filter(Boolean))];
    if (seasons.length === 0) return [];

    // 2. Get program IDs for those seasons
    const { data: programs, error: progErr } = await supabase
        .from('programs')
        .select('id')
        .in('season', seasons);

    if (progErr) throw progErr;
    if (!programs || programs.length === 0) return [];

    const programIds = programs.map(p => p.id);

    // 3. Fetch past sessions for those programs
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
    // Map frontend fields → DB columns
    // DB has: player_id, program_id, session_id, entry_type, responses (jsonb), week_number
    // Frontend sends: answers [{q,a}], mood, session_id, program_id (optional)
    const payload = {
        player_id: userId,
        session_id: entry.session_id || null,
        program_id: entry.program_id || null,
        entry_type: entry.session_id ? 'session' : 'freeform',
        responses: { answers: entry.answers || [], mood: entry.mood || null },
        updated_at: new Date().toISOString(),
    };

    if (entry.id) {
        const { data, error } = await supabase
            .from('journal_entries')
            .update(payload)
            .eq('id', entry.id)
            .select()
            .single();
        if (error) throw error;
        return normaliseJournalEntry(data);
    } else {
        const { data, error } = await supabase
            .from('journal_entries')
            .insert(payload)
            .select()
            .single();
        if (error) throw error;
        return normaliseJournalEntry(data);
    }
}

export async function updateJournalEntry(id, updates) {
    // Map frontend fields → DB columns
    const payload = { updated_at: new Date().toISOString() };
    if ('answers' in updates || 'mood' in updates) {
        payload.responses = {
            answers: updates.answers || [],
            mood: updates.mood ?? null,
        };
    }
    const { data, error } = await supabase
        .from('journal_entries')
        .update(payload)
        .eq('id', id)
        .select()
        .single();
    if (error) throw error;
    return normaliseJournalEntry(data);
}

export async function loadJournalForSession(playerId, sessionId) {
    const { data, error } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('player_id', playerId)
        .eq('session_id', sessionId)
        .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 is no rows returned
    return normaliseJournalEntry(data);
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
    return (data || []).map(normaliseJournalEntry);
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
