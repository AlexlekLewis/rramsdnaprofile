// ═══ SQUAD ALLOCATION ENGINE — RRA Framework v1.0 ═══
// Permanent, season-agnostic algorithm. Rules apply identically regardless of
// cohort size, gender split, or number of seasons delivered.

// ── Constants ──
const MAX_SQUAD_SIZE = 12;
const MAX_AGE_SPREAD = 2.5;
const CCM_OVERRIDE_THRESHOLD = 1.30; // 30% above squad average
const ROLE_TARGETS = {
    pace: { min: 4, surplus: 5 },
    spin: { min: 2, surplus: 3 },
    keeper: { min: 2, surplus: 2 },
    batter: { min: 0, surplus: 5 },
    allrounder: { min: 0, surplus: 4 },
};
const MIN_TOTAL_BOWLERS = 6;

// SPS weights
const SPS_WEEKDAY_HIT = 0.35;
const SPS_WEEKEND_HIT = 0.35;
const SPS_TRAVEL_ALIGN = 0.20;
const SPS_PREF_COVERAGE = 0.10;

// Composite weights
const COMPOSITE_CCM_WEIGHT = 0.60;
const COMPOSITE_SPS_WEIGHT = 0.40;

// Role adjustment scoring
const ROLE_BONUS_UNDERSTOCKED = 0.15;
const ROLE_PENALTY_SURPLUS = -0.20;

// Available session slots
export const WEEKDAY_SLOTS = ['Tue 5-7pm', 'Tue 7-9pm', 'Thu 5-7pm', 'Thu 7-9pm'];
export const WEEKEND_BLOCKS = ['Sat 2-6pm', 'Sun 2-6pm'];

// ── Helpers ──

export function getPlayerAge(dob) {
    if (!dob) return null;
    const d = typeof dob === 'string' ? new Date(dob) : dob;
    if (isNaN(d.getTime())) return null;
    return Math.floor((Date.now() - d.getTime()) / 31557600000);
}

function getGenderPool(gender) {
    if (!gender) return 'male';
    const g = gender.toLowerCase();
    if (g.includes('female') || g.includes('girl') || g.includes('women')) return 'female';
    return 'male';
}

function getRoleCategory(role, bowlingType) {
    if (!role) return 'batter';
    const r = role.toLowerCase();
    if (r.includes('pace') || r === 'pace') return 'pace';
    if (r.includes('spin') || r === 'spin') return 'spin';
    if (r.includes('keep') || r === 'keeper') return 'keeper';
    if (r.includes('allround') || r === 'allrounder') {
        // Count allrounders toward pace or spin based on bowling type
        if (bowlingType && (bowlingType.toLowerCase().includes('spin') || bowlingType.toLowerCase().includes('off') || bowlingType.toLowerCase().includes('leg'))) return 'spin';
        return 'pace'; // Default allrounder to pace
    }
    return 'batter';
}

export function parseSessionPrefs(selectedSessions) {
    if (!selectedSessions) return { weekday: [], weekend: [] };
    const parts = selectedSessions.split('|').map(s => s.trim()).filter(Boolean);
    const weekday = [];
    const weekend = [];

    parts.forEach(p => {
        // Normalize session strings
        if (p.includes('Tuesday') && p.includes('5:00')) weekday.push('Tue 5-7pm');
        else if (p.includes('Tuesday') && p.includes('7:00')) weekday.push('Tue 7-9pm');
        else if (p.includes('Thursday') && p.includes('5:00')) weekday.push('Thu 5-7pm');
        else if (p.includes('Thursday') && p.includes('7:00')) weekday.push('Thu 7-9pm');
        // Combined Tue & Thu
        else if (p.includes('Tuesday & Thursday') && p.includes('5:00')) { weekday.push('Tue 5-7pm'); weekday.push('Thu 5-7pm'); }
        else if (p.includes('Tuesday & Thursday') && p.includes('7:00')) { weekday.push('Tue 7-9pm'); weekday.push('Thu 7-9pm'); }

        // Weekend — exclude Saturday 8-10am (Rule 8)
        if (p.includes('Saturday') && p.includes('2:00')) weekend.push('Sat 2-4pm');
        else if (p.includes('Saturday') && p.includes('4:00')) weekend.push('Sat 4-6pm');
        else if (p.includes('Sunday') && p.includes('2:00')) weekend.push('Sun 2-4pm');
        else if (p.includes('Sunday') && p.includes('4:00')) weekend.push('Sun 4-6pm');
        // Combined Sat & Sun
        else if (p.includes('Saturday & Sunday') && p.includes('2:00')) { weekend.push('Sat 2-4pm'); weekend.push('Sun 2-4pm'); }
        else if (p.includes('Saturday & Sunday') && p.includes('4:00')) { weekend.push('Sat 4-6pm'); weekend.push('Sun 4-6pm'); }
        else if (p.includes('Saturday & Sunday') && p.includes('8:00')) { weekend.push('Sun 8-10am'); } // Sat 8-10am excluded
        else if (p.includes('Sunday') && p.includes('8:00')) weekend.push('Sun 8-10am');
        // Note: Sat 8-10am deliberately excluded per Rule 8
    });

    return { weekday: [...new Set(weekday)], weekend: [...new Set(weekend)] };
}

// ── Rule 7: Session Preference Score ──

// Estimated distances from training venue (Plenty Rd, Bundoora area)
// Grouped by approximate km bands for squad allocation
const TRAVEL_DISTANCE_60PLUS = [
    'traralgon', 'warragul', 'drouin', 'geelong', 'ballarat', 'bendigo',
    'kilmore', 'wallan', 'mornington', 'rosebud', 'bacchus marsh',
    'gisborne', 'healesville', 'yarra glen', 'riddells creek', "murphy's creek",
    'strathtulloh', 'mambourin', 'melton', 'botanic ridge',
    'clyde north', 'clyde', 'officer', 'pakenham',
    'cranbourne', 'cranbourne north', 'cranbourne west',
    'narre warren', 'narre warren south', 'berwick',
];
const TRAVEL_DISTANCE_30_60 = [
    'werribee', 'point cook', 'tarneit', 'truganina', 'williams landing',
    'west footscray', 'footscray', 'seddon', 'yarraville',
    'frankston', 'cheltenham', 'bentleigh', 'bentleigh east', 'brighton',
    'brighton east', 'beaumaris', 'glen waverley', 'mount waverley',
    'rowville', 'scoresby', 'ferntree gully', 'ringwood', 'wantirna',
    'dandenong', 'dandenong north', 'noble park', 'bangholme',
    'docklands', 'melbourne', 'richmond', 'south yarra', 'prahran',
    'st kilda', 'port melbourne', 'south melbourne', 'albert park',
    'chadstone', 'ashwood', 'blackburn', 'mitcham', 'nunawading',
    'vermont south', 'glen huntly', 'malvern', 'east malvern',
    'hawthorn', 'hawthorn east', 'camberwell', 'canterbury', 'balwyn',
    'kew', 'toorak', 'armadale', 'ascot vale',
    'craigieburn', 'mickleham',
];
const TRAVEL_DISTANCE_CLOSE = [
    'bundoora', 'plenty', 'south morang', 'mill park', 'epping',
    'thomastown', 'lalor', 'reservoir', 'preston', 'northcote',
    'ivanhoe', 'heidelberg', 'bulleen', 'doncaster', 'eltham',
    'montmorency', 'hurstbridge', 'north warrandyte',
    'doreen', 'donnybrook', 'mernda', 'wollert', 'whittlesea',
    'fawkner', 'coburg', 'brunswick', 'fitzroy', 'collingwood', 'carlton',
];

const TRAVEL_HARD_THRESHOLD_KM = 60;

export function estimateTravelKm(suburb) {
    if (!suburb) return 25; // unknown → assume mid-range
    const s = suburb.toLowerCase().replace(/[^a-z ]/g, '').trim();
    // Strip postcodes and addresses — extract suburb name
    const words = s.split(/\s+/);
    // Try matching progressively shorter substrings
    for (const list of [
        { suburbs: TRAVEL_DISTANCE_60PLUS, km: 75 },
        { suburbs: TRAVEL_DISTANCE_30_60, km: 40 },
        { suburbs: TRAVEL_DISTANCE_CLOSE, km: 12 },
    ]) {
        if (list.suburbs.some(f => s.includes(f))) return list.km;
    }
    return 25; // unknown suburb → mid-range estimate
}

function calcTravelAlignment(suburb, isLateSlot) {
    const km = estimateTravelKm(suburb);
    if (km >= TRAVEL_HARD_THRESHOLD_KM) return isLateSlot ? 1.0 : 0.10; // Strongly prefer late
    if (km >= 30) return isLateSlot ? 0.85 : 0.50; // Slight late preference
    return isLateSlot ? 0.60 : 1.0; // Close → slight early preference
}

// ── Rule 9: Age-time preference (younger → earlier, older → later) ──
const AGE_TIME_WEIGHT = 0.08; // Soft preference added to composite

function calcAgeTimePreference(age, isLateSlot) {
    if (age == null) return 0;
    // Under 14 → prefer 5-7pm (+bonus for early, -penalty for late)
    // Over 16 → prefer 7-9pm (+bonus for late, -penalty for early)
    // 14-16 → neutral
    if (age < 14) return isLateSlot ? -AGE_TIME_WEIGHT : AGE_TIME_WEIGHT;
    if (age > 16) return isLateSlot ? AGE_TIME_WEIGHT : -AGE_TIME_WEIGHT;
    return 0; // 14-16 neutral
}

export function calcSPS(playerPrefs, squadWeekday, squadWeekendBlock, suburb) {
    if (!playerPrefs || (playerPrefs.weekday.length === 0 && playerPrefs.weekend.length === 0)) return 0.50; // neutral

    // WH: weekday hit
    const WH = playerPrefs.weekday.includes(squadWeekday) ? 1.0 : 0.0;

    // WEH: weekend hit — squad has a 4hr block (2 sub-slots)
    const weekendSubSlots = squadWeekendBlock === 'Sat 2-6pm' ? ['Sat 2-4pm', 'Sat 4-6pm']
        : squadWeekendBlock === 'Sun 2-6pm' ? ['Sun 2-4pm', 'Sun 4-6pm'] : [];
    const weekendMatches = weekendSubSlots.filter(s => playerPrefs.weekend.includes(s)).length;
    const WEH = weekendSubSlots.length > 0 ? weekendMatches / weekendSubSlots.length : 0;

    // TA: travel alignment
    const isLateSlot = squadWeekday.includes('7-9pm');
    const TA = calcTravelAlignment(suburb, isLateSlot);

    // PC: preference coverage
    const allSquadSlots = [squadWeekday, ...weekendSubSlots];
    const allPlayerPrefs = [...playerPrefs.weekday, ...playerPrefs.weekend];
    const PC = allPlayerPrefs.length > 0 ? allSquadSlots.filter(s => allPlayerPrefs.includes(s)).length / allPlayerPrefs.length : 0;

    return SPS_WEEKDAY_HIT * WH + SPS_WEEKEND_HIT * WEH + SPS_TRAVEL_ALIGN * TA + SPS_PREF_COVERAGE * PC;
}

// ── Rule 6: Role balance adjustment ──

function calcRoleAdjustment(squad, playerRole) {
    const roleCounts = {};
    Object.keys(ROLE_TARGETS).forEach(r => { roleCounts[r] = 0; });
    squad.forEach(p => { roleCounts[p.roleCategory] = (roleCounts[p.roleCategory] || 0) + 1; });

    const target = ROLE_TARGETS[playerRole];
    if (!target) return 0;

    const currentCount = roleCounts[playerRole] || 0;
    if (currentCount < target.min) return ROLE_BONUS_UNDERSTOCKED;
    if (currentCount >= target.surplus) return ROLE_PENALTY_SURPLUS;
    return 0;
}

// ── Rule 5: Age banding check ──

function wouldExceedAgeBand(squad, playerAge) {
    if (squad.length === 0) return false;
    const ages = squad.map(p => p.age).filter(a => a != null);
    if (ages.length === 0) return false;
    const allAges = [...ages, playerAge];
    const spread = Math.max(...allAges) - Math.min(...allAges);
    return spread > MAX_AGE_SPREAD;
}

function squadAvgCCM(squad) {
    const ccms = squad.map(p => p.ccm).filter(c => c > 0);
    return ccms.length > 0 ? ccms.reduce((a, b) => a + b, 0) / ccms.length : 0;
}

// ── Rule 8: Sibling detection (shared parent email → same time slot) ──

function detectSiblingGroups(players) {
    // Group players by parent email to find siblings
    const byParent = {};
    players.forEach(p => {
        const emails = [p.parent1Email, p.parent2Email].filter(e => e && e.trim().length > 3);
        emails.forEach(email => {
            const key = email.toLowerCase().trim();
            if (!byParent[key]) byParent[key] = [];
            // Avoid adding the same player twice (from parent1 + parent2 matching)
            if (!byParent[key].some(s => s.id === p.id || s.dnaId === p.dnaId)) {
                byParent[key].push(p);
            }
        });
    });
    // Only keep groups with 2+ distinct players (actual siblings)
    return Object.values(byParent).filter(group => group.length > 1);
}

function getSiblingTimeSlot(player, siblingGroups, placedPlayers) {
    // Find which sibling group this player belongs to
    for (const group of siblingGroups) {
        const isSibling = group.some(s => (s.id === player.id) || (s.dnaId === player.dnaId));
        if (!isSibling) continue;
        // Check if any sibling has already been placed
        for (const sib of group) {
            if ((sib.id === player.id) || (sib.dnaId === player.dnaId)) continue;
            const placed = placedPlayers.get(sib.id || sib.dnaId);
            if (placed) return placed.weekday; // Must match this time slot
        }
    }
    return null; // No sibling constraint
}

// ═══ MAIN ALLOCATION ENGINE ═══

export function autoAssignSquads(players, sessionConfig) {
    // Default session config if not provided
    const config = sessionConfig || generateSessionConfig(players.length);

    // Rule 8: Detect sibling groups before allocation
    const siblingGroups = detectSiblingGroups(players);

    // Rule 1: Gender separation
    const pools = { male: [], female: [] };
    players.forEach(p => {
        const pool = getGenderPool(p.gender);
        pools[pool].push({
            ...p,
            age: p.age ?? getPlayerAge(p.dob),
            roleCategory: getRoleCategory(p.role || p.playerRole, p.bowlingType),
            prefs: parseSessionPrefs(p.selectedSessions),
            ccm: p.ccm || 0,
        });
    });

    const result = { squads: [], overflow: [], overrides: [], dataQuality: [], siblingGroups: [] };
    const placedPlayers = new Map(); // track id → squad for sibling lookups

    // Run engine on each pool
    Object.entries(pools).forEach(([gender, pool]) => {
        if (pool.length === 0) return;

        // Rule 2: CCM rank
        pool.sort((a, b) => (b.ccm || 0) - (a.ccm || 0));
        const maxCCM = pool[0]?.ccm || 1;

        // Create squads needed
        const numSquads = Math.ceil(pool.length / MAX_SQUAD_SIZE);
        const squads = [];
        for (let i = 0; i < numSquads; i++) {
            const sessionIdx = result.squads.length + i;
            const weekdaySlot = config.weekday?.[sessionIdx % config.weekday.length] || WEEKDAY_SLOTS[sessionIdx % WEEKDAY_SLOTS.length];
            const weekendBlock = config.weekend?.[sessionIdx % config.weekend.length] || WEEKEND_BLOCKS[sessionIdx % WEEKEND_BLOCKS.length];
            squads.push({
                id: `${gender === 'female' ? 'F' : ''}${result.squads.length + i + 1}`,
                name: gender === 'female' ? `Squad F${i > 0 ? i + 1 : ''}` : `Squad ${result.squads.length + i + 1}`,
                gender,
                players: [],
                weekday: weekdaySlot,
                weekend: weekendBlock,
            });
        }

        // Rule 3: Place each player (in CCM order) into best squad
        pool.forEach(player => {
            const normCCM = maxCCM > 0 ? (player.ccm / maxCCM) : 0;

            // Rule 8: Sibling constraint — must match sibling's time slot
            const requiredSlot = getSiblingTimeSlot(player, siblingGroups, placedPlayers);

            // Rule 9: Travel distance — 60+ km must be 7-9pm (hard constraint)
            const travelKm = estimateTravelKm(player.suburb);
            const mustBeLate = travelKm >= TRAVEL_HARD_THRESHOLD_KM;

            // Score each squad
            let bestSquad = null;
            let bestScore = -Infinity;
            let override = false;

            for (const squad of squads) {
                // Rule 4: Gate A — capacity
                if (squad.players.length >= MAX_SQUAD_SIZE) continue;

                // Rule 8: Gate — sibling time slot (hard constraint)
                if (requiredSlot && squad.weekday !== requiredSlot) continue;

                // Rule 9: Gate — travel distance (hard constraint: 60+ km → must be 7-9pm)
                if (mustBeLate && !squad.weekday.includes('7-9pm')) continue;

                // Rule 5: Gate B — age banding (skip if player has no age data)
                let ageBlocked = false;
                if (player.age != null && squad.players.some(p => p.age != null) && wouldExceedAgeBand(squad.players, player.age)) {
                    // CCM Override Test
                    const avgCCM = squadAvgCCM(squad.players);
                    if (avgCCM > 0 && player.ccm >= avgCCM * CCM_OVERRIDE_THRESHOLD) {
                        override = true; // Will be placed up
                    } else {
                        ageBlocked = true;
                    }
                }
                if (ageBlocked) continue;

                // Rule 6: Role adjustment
                const roleAdj = calcRoleAdjustment(squad.players, player.roleCategory);

                // Rule 7: SPS
                const sps = calcSPS(player.prefs, squad.weekday, squad.weekend, player.suburb);

                // Rule 10: Age-time preference (younger → earlier, older → later)
                const isLate = squad.weekday.includes('7-9pm');
                const ageTimePref = calcAgeTimePreference(player.age, isLate);

                // Rule 3: Composite
                const composite = (COMPOSITE_CCM_WEIGHT * normCCM) + (COMPOSITE_SPS_WEIGHT * sps) + roleAdj + ageTimePref;

                if (composite > bestScore) {
                    bestScore = composite;
                    bestSquad = squad;
                }
            }

            if (bestSquad) {
                bestSquad.players.push(player);
                placedPlayers.set(player.id || player.dnaId, { weekday: bestSquad.weekday, squad: bestSquad.name });
                if (override) {
                    result.overrides.push({ player: player.name, squad: bestSquad.name, ccm: player.ccm, reason: 'CCM override — placed up despite age gap' });
                }
                if (requiredSlot) {
                    result.siblingGroups.push({ player: player.name, squad: bestSquad.name, slot: requiredSlot, reason: 'Sibling time slot constraint' });
                }
            } else {
                const overflowReason = requiredSlot ? `No valid squad at sibling time slot (${requiredSlot})`
                    : mustBeLate ? 'No 7-9pm squad available (60+ km travel)'
                    : (player.age == null ? 'No age data' : 'No valid squad (age banding / capacity)');
                result.overflow.push({ ...player, reason: overflowReason });
            }

            // Data quality flags
            if (!player.role && !player.playerRole) result.dataQuality.push({ name: player.name, issue: 'No role data' });
            if (!player.ccm || player.ccm === 0) result.dataQuality.push({ name: player.name, issue: 'No CCM data' });
            if (!player.selectedSessions) result.dataQuality.push({ name: player.name, issue: 'No session preferences' });
        });

        result.squads.push(...squads);
    });

    // Log sibling groups detected for transparency
    if (siblingGroups.length > 0) {
        result.siblingGroups.unshift(...siblingGroups.map(g => ({
            players: g.map(p => p.name).join(' & '),
            reason: 'Detected via shared parent email',
        })));
    }

    return result;
}

// ── Generate default session config based on cohort size ──

function generateSessionConfig(totalPlayers) {
    const numSquads = Math.ceil(totalPlayers / MAX_SQUAD_SIZE);
    const weekday = [];
    const weekend = [];

    for (let i = 0; i < numSquads; i++) {
        weekday.push(WEEKDAY_SLOTS[i % WEEKDAY_SLOTS.length]);
        weekend.push(WEEKEND_BLOCKS[i % WEEKEND_BLOCKS.length]);
    }

    return { weekday, weekend };
}

// ── Engine output summary helpers ──

export function getSquadSummary(squad) {
    const ages = squad.players.map(p => p.age).filter(a => a != null);
    const ccms = squad.players.map(p => p.ccm).filter(c => c > 0);
    const roleCounts = {};
    squad.players.forEach(p => { roleCounts[p.roleCategory] = (roleCounts[p.roleCategory] || 0) + 1; });

    return {
        name: squad.name,
        gender: squad.gender,
        count: squad.players.length,
        ageRange: ages.length > 0 ? { min: Math.min(...ages), max: Math.max(...ages), spread: Math.max(...ages) - Math.min(...ages) } : null,
        avgCCM: ccms.length > 0 ? ccms.reduce((a, b) => a + b, 0) / ccms.length : 0,
        roles: roleCounts,
        weekday: squad.weekday,
        weekend: squad.weekend,
        flags: {
            overCapacity: squad.players.length > MAX_SQUAD_SIZE,
            ageSpreadExceeded: ages.length > 0 && (Math.max(...ages) - Math.min(...ages)) > MAX_AGE_SPREAD,
            underFilled: squad.players.length < 6,
            missingRoles: Object.entries(ROLE_TARGETS).filter(([role, target]) => (roleCounts[role] || 0) < target.min).map(([role]) => role),
        },
    };
}
