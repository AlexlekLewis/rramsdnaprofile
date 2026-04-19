// ═══ ASSESSMENT WEEK SESSION ROSTER LOADER ═══
// Reads the live session allocations from sp_squads / sp_squad_players.
// Source of truth = the database (8 squads: 4 weekday WD*, 4 weekend WE*).
// Returns structured rosters grouped by "Skill Week" (WD) and "Game Sense Week" (WE).

import { supabase } from '../supabaseClient';

// Normalise a name for fuzzy matching (lowercase, trimmed, single-spaced)
const norm = (s) => (s || '').toLowerCase().trim().replace(/\s+/g, ' ');

/**
 * Load assessment rosters from the database.
 * Returns { skillWeek: [...groups], gameSenseWeek: [...groups] } where each
 * group is { id, name, label, color, playerNames: [{name, normName, gender}] }.
 * Players are stored as names because sp_squad_players.player_id is not
 * populated — matching to live players must be done by name.
 */
export async function loadAssessmentRosters() {
    const [{ data: squads, error: sqErr }, { data: assignments, error: asErr }] = await Promise.all([
        supabase.from('sp_squads').select('id, name, colour').order('name'),
        supabase.from('sp_squad_players').select('squad_id, player_name, gender, position_number').order('position_number'),
    ]);

    if (sqErr) { console.error('sp_squads load failed:', sqErr.message); return { skillWeek: [], gameSenseWeek: [] }; }
    if (asErr) { console.error('sp_squad_players load failed:', asErr.message); return { skillWeek: [], gameSenseWeek: [] }; }

    // Squad name format: "WD1 — Tue 5-7pm" or "WE3 — Sat 4-6pm"
    const parseSquadName = (name) => {
        const m = (name || '').match(/^(WD|WE)\d+\s*[—-]\s*(.+)$/);
        return m ? { category: m[1], label: m[2].trim() } : null;
    };

    const buildCategory = (wantCategory) => {
        return (squads || [])
            .map(s => ({ raw: s, parsed: parseSquadName(s.name) }))
            .filter(x => x.parsed && x.parsed.category === wantCategory)
            .map(x => {
                const members = (assignments || [])
                    .filter(a => a.squad_id === x.raw.id)
                    .map(a => ({ name: a.player_name, normName: norm(a.player_name), gender: a.gender }));
                return {
                    id: x.raw.id,
                    name: x.raw.name,
                    label: x.parsed.label,
                    color: x.raw.colour || '#6366F1',
                    playerNames: members,
                };
            });
    };

    return {
        skillWeek: buildCategory('WD'),
        gameSenseWeek: buildCategory('WE'),
    };
}

/**
 * Build a fast lookup from a roster structure. Returns a Map of normalised
 * player-name → squadId. Handles middle-name variants via partial match.
 */
export function buildRosterLookup(roster) {
    const lookup = new Map();
    roster.forEach(group => {
        group.playerNames.forEach(pn => {
            lookup.set(pn.normName, group.id);
        });
    });
    return lookup;
}

/**
 * Match a live player (from the players table) to a squad group in a roster.
 * Mirrors the original sessionGroups.js matcher so the behaviour is identical.
 */
export function matchPlayerToSquad(lookup, roster, dbName) {
    const n = norm(dbName);
    // 1. Exact match
    if (lookup.has(n)) return lookup.get(n);
    // 2. First + last name match (handles middle names)
    const dbParts = n.split(' ');
    if (dbParts.length >= 2) {
        for (const [sheetNorm, groupId] of lookup) {
            const sheetParts = sheetNorm.split(' ');
            if (sheetParts.length >= 2 && dbParts[0] === sheetParts[0] && dbParts[dbParts.length - 1] === sheetParts[sheetParts.length - 1]) {
                return groupId;
            }
        }
    }
    // 3. Starts-with match for truncated DB names
    if (dbParts.length === 1) {
        for (const [sheetNorm, groupId] of lookup) {
            if (sheetNorm.startsWith(n)) return groupId;
        }
    }
    return null;
}
