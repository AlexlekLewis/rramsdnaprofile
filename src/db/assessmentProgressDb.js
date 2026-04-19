// ═══ ASSESSMENT PROGRESS LOADER ═══
// Builds a structured view of which coaches have assessed which players,
// tying together sp_coaches, sp_session_coaches, sp_sessions, sp_squads,
// sp_squad_players, and coach_assessments.

import { supabase } from '../supabaseClient';

const norm = (s) => (s || '').toLowerCase().trim().replace(/\s+/g, ' ');

/**
 * Load everything needed to render the assessment progress view.
 * Returns { coaches, squads, coachSquadMap, totalProgress }.
 *
 * coaches:       [{ id, name, role, squadIds: [...], players: [{name, assessed}], assessedCount, totalCount }]
 * squads:        [{ id, name, label, type: 'WD'|'WE', color, players: [{name, assessed, assessedBy}],
 *                   coachIds: [...], coachNames: [...], assessedCount, totalCount }]
 * totalProgress: { done, total, pct }
 */
export async function loadAssessmentProgress() {
    const [
        { data: coaches },
        { data: sessionCoaches },
        { data: sessions },
        { data: squads },
        { data: squadPlayers },
        { data: assessments },
        { data: players },
    ] = await Promise.all([
        supabase.from('sp_coaches').select('id, user_id, name, role').eq('is_active', true),
        supabase.from('sp_session_coaches').select('session_id, coach_id, coach_role'),
        supabase.from('sp_sessions').select('id, squad_ids, date'),
        supabase.from('sp_squads').select('id, name, colour').order('name'),
        supabase.from('sp_squad_players').select('squad_id, player_name, gender'),
        supabase.from('coach_assessments').select('player_id, coach_id, status, updated_at'),
        supabase.from('players').select('id, name').eq('submitted', true),
    ]);

    const parseSquadName = (name) => {
        const m = (name || '').match(/^(WD|WE)\d+\s*[—-]\s*(.+)$/);
        return m ? { type: m[1], label: m[2].trim() } : { type: null, label: name };
    };

    // Build a map: squadId → list of player names
    const squadToPlayers = new Map();
    (squadPlayers || []).forEach(sp => {
        if (!squadToPlayers.has(sp.squad_id)) squadToPlayers.set(sp.squad_id, []);
        squadToPlayers.get(sp.squad_id).push({ name: sp.player_name, normName: norm(sp.player_name), gender: sp.gender });
    });

    // Build a map: normalised player name → players.id (for assessment matching)
    const nameToPlayerId = new Map();
    (players || []).forEach(p => { nameToPlayerId.set(norm(p.name), p.id); });
    // Also add first+last partial matches
    const partialLookup = (squadPlayerName) => {
        const n = norm(squadPlayerName);
        if (nameToPlayerId.has(n)) return nameToPlayerId.get(n);
        const parts = n.split(' ');
        if (parts.length >= 2) {
            for (const [pn, pid] of nameToPlayerId) {
                const pparts = pn.split(' ');
                if (pparts.length >= 2 && pparts[0] === parts[0] && pparts[pparts.length - 1] === parts[parts.length - 1]) {
                    return pid;
                }
            }
        }
        return null;
    };

    // Build a map: playerId → { assessed: bool, coach_id }
    const playerAssessments = new Map();
    (assessments || []).forEach(a => {
        // Consider any assessment with status='complete' or non-draft as "done"
        const done = a.status === 'complete';
        playerAssessments.set(a.player_id, { assessed: done, coachId: a.coach_id, updatedAt: a.updated_at });
    });

    // Build a map: coach.user_id → sp_coaches.id (for matching assessments via sp_coaches)
    const userIdToCoachId = new Map();
    (coaches || []).forEach(c => { if (c.user_id) userIdToCoachId.set(c.user_id, c.id); });

    // Build: sessionId → { squadIds, coachIds, coachUserIds }
    const sessionInfo = new Map();
    (sessions || []).forEach(s => {
        sessionInfo.set(s.id, { squadIds: s.squad_ids || [], coachIds: [], coachUserIds: [] });
    });
    (sessionCoaches || []).forEach(sc => {
        const info = sessionInfo.get(sc.session_id);
        if (info) {
            info.coachIds.push(sc.coach_id);
            const coach = (coaches || []).find(c => c.id === sc.coach_id);
            if (coach?.user_id) info.coachUserIds.push(coach.user_id);
        }
    });

    // For each squad, aggregate which coaches have sessions with that squad
    const squadToCoaches = new Map(); // squadId → Set of coachId
    for (const [, info] of sessionInfo) {
        info.squadIds.forEach(sqId => {
            if (!squadToCoaches.has(sqId)) squadToCoaches.set(sqId, new Set());
            info.coachIds.forEach(cid => squadToCoaches.get(sqId).add(cid));
        });
    }

    // Build squads output
    const squadsOut = (squads || []).map(s => {
        const parsed = parseSquadName(s.name);
        const members = squadToPlayers.get(s.id) || [];
        const enriched = members.map(m => {
            const pid = partialLookup(m.name);
            const asmt = pid ? playerAssessments.get(pid) : null;
            return { name: m.name, gender: m.gender, playerId: pid, assessed: !!asmt?.assessed, assessedBy: asmt?.coachId || null };
        });
        const coachSet = squadToCoaches.get(s.id) || new Set();
        const coachList = Array.from(coachSet).map(cid => (coaches || []).find(c => c.id === cid)).filter(Boolean);
        const assessedCount = enriched.filter(p => p.assessed).length;
        return {
            id: s.id,
            name: s.name,
            type: parsed.type,
            label: parsed.label,
            color: s.colour || '#6366F1',
            players: enriched,
            coachIds: coachList.map(c => c.id),
            coachNames: coachList.map(c => c.name),
            assessedCount,
            totalCount: enriched.length,
        };
    });

    // Build per-coach output (aggregate across their squads)
    const coachesOut = (coaches || []).map(c => {
        const squadsForCoach = squadsOut.filter(s => s.coachIds.includes(c.id));
        // De-dupe players across multiple squads for this coach
        const seen = new Set();
        const combinedPlayers = [];
        squadsForCoach.forEach(sq => {
            sq.players.forEach(p => {
                const key = p.name + '|' + sq.type; // skill (WD) vs game-sense (WE) count separately
                if (!seen.has(key)) {
                    seen.add(key);
                    combinedPlayers.push({ ...p, squadType: sq.type, squadLabel: sq.label });
                }
            });
        });
        // Also count assessments this coach has personally authored (by coach_id match on user_id)
        const authoredCount = (assessments || []).filter(a => a.coach_id === c.user_id && a.status === 'complete').length;
        return {
            id: c.id,
            userId: c.user_id,
            name: c.name,
            role: c.role,
            squadIds: squadsForCoach.map(s => s.id),
            squadLabels: squadsForCoach.map(s => `${s.type}: ${s.label}`),
            players: combinedPlayers,
            assessedCount: combinedPlayers.filter(p => p.assessed).length,
            totalCount: combinedPlayers.length,
            authoredCount,
        };
    }).sort((a, b) => a.name.localeCompare(b.name));

    // Total progress = sum of (assessments needed = 1 per player per week × 2 weeks, so 86 × 2 = 172)
    const totalNeeded = squadsOut.reduce((sum, s) => sum + s.totalCount, 0);
    const totalDone = squadsOut.reduce((sum, s) => sum + s.assessedCount, 0);

    return {
        coaches: coachesOut,
        squads: squadsOut,
        totalProgress: {
            done: totalDone,
            total: totalNeeded,
            pct: totalNeeded > 0 ? Math.round((totalDone / totalNeeded) * 100) : 0,
        },
    };
}
