import { supabase } from '../supabaseClient';

// ─── ASSESSMENT SUMMARY (For Blended IDP View) ───

/**
 * Load coach assessment domains for a specific player.
 * Returns the JSONB domain objects: tech_primary, tech_secondary, game_iq, mental, physical, phase_ratings
 */
export async function loadCoachAssessment(playerId) {
    const { data, error } = await supabase
        .from('coach_assessments')
        .select('tech_primary, tech_secondary, game_iq, mental, physical, phase_ratings, created_at')
        .eq('player_id', playerId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
}

/**
 * Load player self-ratings + role from the players table.
 * self_ratings is JSONB with keys like t1_0, t1_1, iq_0, mn_0, ph_0 etc.
 */
export async function loadSelfRatings(playerId) {
    const { data, error } = await supabase
        .from('players')
        .select('self_ratings, role')
        .eq('id', playerId)
        .maybeSingle();
    if (error && error.code !== 'PGRST116') throw error;
    return { selfRatings: data?.self_ratings || {}, role: data?.role || 'Batter' };
}

// ─── DOMAIN AVERAGE HELPERS ───

/** Average all numeric values in an object whose keys start with a given prefix */
function avgByPrefix(obj, prefix) {
    if (!obj) return null;
    const vals = Object.entries(obj)
        .filter(([k]) => k.startsWith(prefix))
        .map(([, v]) => Number(v))
        .filter(v => !isNaN(v) && v > 0);
    if (vals.length === 0) return null;
    return +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2);
}

/** Average ALL numeric values in an object (for domain-specific JSONB columns) */
function avgAll(obj) {
    if (!obj) return null;
    const vals = Object.values(obj).map(Number).filter(v => !isNaN(v) && v > 0);
    if (vals.length === 0) return null;
    return +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2);
}

/**
 * Build blended assessment summary with SAGI gap for each domain.
 *
 * Returns an array of domain objects:
 * { label, coachAvg, selfAvg, gap, gapLevel }
 *   - gap = selfAvg - coachAvg (positive = player overrates, negative = underrates)
 *   - gapLevel = 'aligned' | 'slight' | 'significant'
 */
export function buildAssessmentSummary(coachData, selfRatings) {
    const DOMAINS = [
        { key: 'tech_primary', prefix: 't1_', label: 'Technical Primary', shortLabel: 'Tech 1' },
        { key: 'tech_secondary', prefix: 't2_', label: 'Technical Secondary', shortLabel: 'Tech 2' },
        { key: 'game_iq', prefix: 'iq_', label: 'Game Intelligence', shortLabel: 'Game IQ' },
        { key: 'mental', prefix: 'mn_', label: 'Mental & Character', shortLabel: 'Mental' },
        { key: 'physical', prefix: 'ph_', label: 'Physical & Athletic', shortLabel: 'Physical' },
    ];

    return DOMAINS.map(d => {
        // Coach average: from the domain-specific JSONB column
        const coachAvg = coachData ? avgAll(coachData[d.key]) : null;
        // Self average: from the flat self_ratings object, filtered by prefix
        const selfAvg = avgByPrefix(selfRatings, d.prefix);
        // SAGI gap: positive = over-rating, negative = under-rating
        const gap = (coachAvg != null && selfAvg != null) ? +(selfAvg - coachAvg).toFixed(2) : null;
        const absGap = gap != null ? Math.abs(gap) : 0;
        const gapLevel = absGap <= 0.5 ? 'aligned' : absGap <= 1.0 ? 'slight' : 'significant';
        return { ...d, coachAvg, selfAvg, gap, gapLevel };
    });
}

// ─── JOURNAL STREAK CALCULATOR ───

/**
 * Calculate the player's journal streak — consecutive weeks (from now backwards)
 * with at least one journal entry.
 */
export function calculateJournalStreak(entries) {
    if (!entries || entries.length === 0) return 0;

    // Get the week number for a date (ISO week)
    const getWeek = (d) => {
        const date = new Date(d);
        const jan1 = new Date(date.getFullYear(), 0, 1);
        const days = Math.floor((date - jan1) / 86400000);
        return `${date.getFullYear()}-W${Math.ceil((days + jan1.getDay() + 1) / 7)}`;
    };

    // Build set of weeks that have entries
    const weeksWithEntries = new Set(entries.map(e => getWeek(e.created_at)));

    // Count consecutive weeks backwards from current week
    let streak = 0;
    const now = new Date();
    for (let i = 0; i < 52; i++) {
        const checkDate = new Date(now);
        checkDate.setDate(checkDate.getDate() - (i * 7));
        const weekKey = getWeek(checkDate);
        if (weeksWithEntries.has(weekKey)) {
            streak++;
        } else if (i > 0) {
            // Allow skipping the current week if it just started
            break;
        }
    }
    return streak;
}

// ─── GROWTH STATS ───

/**
 * Compute quick growth stats for the player dashboard.
 */
export function computeGrowthStats(goals, journalEntries) {
    const activeGoals = (goals || []).filter(g => g.status !== 'completed');
    const completedGoals = (goals || []).filter(g => g.status === 'completed');
    const streak = calculateJournalStreak(journalEntries);
    const totalEntries = (journalEntries || []).length;

    // Average progress across active goals
    const avgProgress = activeGoals.length > 0
        ? Math.round(activeGoals.reduce((sum, g) => sum + (g.progress || 0), 0) / activeGoals.length)
        : 0;

    return {
        activeGoals: activeGoals.length,
        completedGoals: completedGoals.length,
        streak,
        totalEntries,
        avgProgress,
        topGoals: activeGoals.slice(0, 3), // Top 3 for dashboard
    };
}
