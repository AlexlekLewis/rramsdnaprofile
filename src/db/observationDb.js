import { supabase } from '../supabaseClient';

// ═══ OBSERVATIONS ═══

/**
 * Save an observation note for a player.
 */
export async function saveObservation(observationData) {
    const { data, error } = await supabase
        .from('observation_notes')
        .insert(observationData)
        .select()
        .single();
    if (error) throw error;
    return data;
}

/**
 * Load observations for a player.
 */
export async function loadObservationsForPlayer(playerId) {
    const { data, error } = await supabase
        .from('observation_notes')
        .select('*')
        .eq('player_id', playerId)
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
}

// ═══ ATTENDANCE ═══

/**
 * Mark attendance for a player in a session.
 */
export async function markAttendance({ playerId, sessionId, status, markedBy, source = 'manual' }) {
    const { data, error } = await supabase
        .from('attendance')
        .upsert(
            { player_id: playerId, session_id: sessionId, status, marked_by: markedBy, source },
            { onConflict: 'player_id, session_id' }
        )
        .select()
        .single();
    if (error) throw error;
    return data;
}

/**
 * Load attendance for a specific session for a list of players.
 */
export async function loadAttendanceForSession(sessionId, playerIds) {
    if (!playerIds || playerIds.length === 0) return [];
    const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('session_id', sessionId)
        .in('player_id', playerIds);
    if (error) throw error;
    return data || [];
}

/**
 * Load attendance for a specific player across all sessions.
 */
export async function loadAttendanceForPlayer(playerId) {
    const { data, error } = await supabase
        .from('attendance')
        .select(`*, sessions(title, session_date)`)
        .eq('player_id', playerId)
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
}
