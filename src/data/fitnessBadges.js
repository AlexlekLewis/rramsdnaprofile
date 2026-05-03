// ═══ FITNESS BADGES — pure compute logic ═══
//
// Badge mechanics decided 2026-05-03 with Alex:
//   - Some badges lapse if the player goes inactive (≥14 days since last log).
//   - Lapsed badges show a clear "earn back" path.
//   - Permanent (no decay): First Step, Week One Down, Catch-up, Iron Cricketer.
//   - Repeatable: Perfect Week (counter shown).
//
// All compute functions here are PURE — they take logs + program + today's date
// and return state. No DB calls. The DB layer awards rows separately when
// status flips from 'pending' → 'active' for the first time.

// ─── Configuration ─────────────────────────────────────────────────────────

export const LAPSE_AFTER_DAYS = 14; // No log in past N days = badge goes lapsed
export const RECOVER_THRESHOLD = 2;  // Logging N sessions wakes a lapsed badge

const POWER_CATEGORY_KEYS = ['Lower Body Power', 'Upper Body Power'];
const CORE_CATEGORY_KEYS = ['Core Power', 'Core Strength'];

// ─── Badge catalogue ───────────────────────────────────────────────────────

export const BADGE_CATALOGUE = [
    {
        key: 'first_step',
        name: 'First Step',
        emoji: '🌱',
        tier: 1,
        permanent: true,
        repeatable: false,
        howToEarn: 'Log your first session.',
        flavour: 'The hardest one. Keep going.',
    },
    {
        key: 'week_one_down',
        name: 'Week One Down',
        emoji: '🚀',
        tier: 1,
        permanent: true,
        repeatable: false,
        howToEarn: 'Log both Day 1 and Day 2 inside week 1.',
        flavour: 'The base is forming.',
    },
    {
        key: 'halfway',
        name: 'Halfway',
        emoji: '⛰️',
        tier: 2,
        permanent: false,
        repeatable: false,
        howToEarn: 'Complete both sessions in 5 different weeks.',
        flavour: 'You are on the program now.',
    },
    {
        key: 'perfect_week',
        name: 'Perfect Week',
        emoji: '✨',
        tier: 2,
        permanent: false,
        repeatable: true,
        howToEarn: 'Log both sessions on time AND tick every prescribed set in a week.',
        flavour: 'Every set, on time.',
    },
    {
        key: 'catch_up',
        name: 'Catch-up',
        emoji: '🔁',
        tier: 2,
        permanent: true,
        repeatable: false,
        howToEarn: 'Backfill a missed session from the Past Sessions tab.',
        flavour: 'You came back. That counts more than not missing.',
    },
    {
        key: 'power_player',
        name: 'Power Player',
        emoji: '⚡',
        tier: 3,
        permanent: false,
        repeatable: false,
        howToEarn: 'Log every Lower Body Power and Upper Body Power exercise across the program.',
        flavour: 'Explosive work, locked in.',
    },
    {
        key: 'core_strong',
        name: 'Core Strong',
        emoji: '🛡️',
        tier: 3,
        permanent: false,
        repeatable: false,
        howToEarn: 'Log every Core Power and Core Strength exercise across the program.',
        flavour: 'The middle holds.',
    },
    {
        key: 'iron_cricketer',
        name: 'Iron Cricketer',
        emoji: '🏆',
        tier: 3,
        permanent: true,
        repeatable: false,
        howToEarn: 'Log all sessions across the full program.',
        flavour: 'Capstone. Earned forever.',
    },
];

export const BADGE_BY_KEY = Object.fromEntries(BADGE_CATALOGUE.map(b => [b.key, b]));

// ─── Helpers ───────────────────────────────────────────────────────────────

const daysBetween = (a, b) => Math.floor((b.getTime() - a.getTime()) / 86400000);

const isLogOnTime = (log) => log.logged_on_time === true && !log.catch_up_for_week;

/**
 * Bucket logs by week_number → { 1: [logs...], 2: [...] }
 */
function logsByWeek(logs) {
    const out = {};
    (logs || []).forEach(l => {
        const w = l.week_number;
        if (!out[w]) out[w] = [];
        out[w].push(l);
    });
    return out;
}

/**
 * Returns true if the log records a "complete" session — at least one set
 * ticked across at least one exercise. The player explicitly "did the work."
 */
function isLogComplete(log) {
    const exLogs = Array.isArray(log.exercise_logs) ? log.exercise_logs : [];
    if (exLogs.length === 0) return false;
    return exLogs.some(el => Array.isArray(el.sets) && el.sets.some(s => s && s.completed === true));
}

/**
 * Returns true if every prescribed set across every exercise in the log was ticked.
 * Used by Perfect Week.
 */
function isLogAllSetsTicked(log) {
    const exLogs = Array.isArray(log.exercise_logs) ? log.exercise_logs : [];
    if (exLogs.length === 0) return false;
    return exLogs.every(el => {
        const sets = Array.isArray(el.sets) ? el.sets : [];
        if (sets.length === 0) return false;
        return sets.every(s => s && s.completed === true);
    });
}

// ─── Status compute ────────────────────────────────────────────────────────

/**
 * Compute the lapse state for the enrolment.
 * Returns { lapsed: bool, daysSinceLastLog: number|null, latestLogAt: Date|null }
 */
function computeActivityState(logs, now) {
    if (!logs || logs.length === 0) {
        return { lapsed: false, daysSinceLastLog: null, latestLogAt: null };
    }
    const dates = logs.map(l => new Date(l.completed_at)).sort((a, b) => b - a);
    const latest = dates[0];
    const days = daysBetween(latest, now);
    return {
        lapsed: days >= LAPSE_AFTER_DAYS,
        daysSinceLastLog: days,
        latestLogAt: latest,
    };
}

/**
 * Count weeks where BOTH sessions of the program (day 1 + day 2) have been logged.
 * On-time or catch-up both count.
 */
function countCompleteWeeks(logs, sessionsPerWeek = 2) {
    const buckets = logsByWeek(logs);
    let n = 0;
    for (const w of Object.keys(buckets)) {
        const days = new Set(buckets[w].map(l => l.day_number));
        if (days.size >= sessionsPerWeek) n++;
    }
    return n;
}

/**
 * Count Perfect Weeks: a week where both sessions are logged on-time AND every
 * prescribed set was ticked. (Catch-up sessions don't qualify.)
 */
function countPerfectWeeks(logs, sessionsPerWeek = 2) {
    const buckets = logsByWeek(logs);
    let n = 0;
    for (const w of Object.keys(buckets)) {
        const ws = buckets[w];
        const onTime = ws.filter(isLogOnTime);
        if (onTime.length < sessionsPerWeek) continue;
        if (onTime.every(isLogAllSetsTicked)) n++;
    }
    return n;
}

/**
 * Set of categories that have been touched (≥1 set ticked) across all logs.
 */
function categoriesTouched(logs) {
    const set = new Set();
    (logs || []).forEach(log => {
        const presc = Array.isArray(log.prescription_snapshot?.exercises)
            ? log.prescription_snapshot.exercises
            : [];
        const presByEx = Object.fromEntries(presc.map(e => [e.id, e]));
        const exLogs = Array.isArray(log.exercise_logs) ? log.exercise_logs : [];
        exLogs.forEach(el => {
            const sets = Array.isArray(el.sets) ? el.sets : [];
            const ticked = sets.some(s => s && s.completed === true);
            if (!ticked) return;
            const cat = (presByEx[el.exercise_id] || {}).category;
            if (cat) set.add(cat);
        });
    });
    return set;
}

/**
 * Compute current state of every badge.
 * Inputs:
 *   - logs: array of fitness_session_logs rows (most recent first or any order)
 *   - program: fitness_programs row
 *   - awardedRows: array of fitness_badges_awarded rows for this enrolment
 *   - now: Date (default new Date())
 *
 * Returns:
 *   array of { ...badgeMeta, status: 'active'|'lapsed'|'pending', earnedAt: Date|null,
 *              progress?: number, total?: number, count?: number, recoverHint?: string }
 */
export function computeBadgeStates({ logs = [], program = {}, awardedRows = [], now = new Date() }) {
    const sessionsPerWeek = program.sessions_per_week || 2;
    const totalWeeks = program.total_weeks || 10;
    const totalSessions = totalWeeks * sessionsPerWeek;
    const activity = computeActivityState(logs, now);
    const completeWeeks = countCompleteWeeks(logs, sessionsPerWeek);
    const perfectWeeks = countPerfectWeeks(logs, sessionsPerWeek);
    const sessionCount = logs.length;
    const cats = categoriesTouched(logs);
    const awardedByKey = Object.fromEntries(awardedRows.map(a => [a.badge_key, a]));

    const earnedAt = (key) => awardedByKey[key]?.awarded_at ? new Date(awardedByKey[key].awarded_at) : null;

    const out = BADGE_CATALOGUE.map(badge => {
        const earned = earnedAt(badge.key);
        let status = 'pending';
        let progress = null;
        let total = null;
        let count = 0;
        let recoverHint = null;

        switch (badge.key) {
            case 'first_step':
                if (sessionCount >= 1) status = 'active';
                progress = Math.min(sessionCount, 1);
                total = 1;
                break;

            case 'week_one_down': {
                const week1 = (logs || []).filter(l => l.week_number === 1);
                const days = new Set(week1.map(l => l.day_number));
                if (days.size >= sessionsPerWeek) status = 'active';
                progress = days.size;
                total = sessionsPerWeek;
                break;
            }

            case 'halfway':
                progress = completeWeeks;
                total = 5;
                if (completeWeeks >= 5) {
                    status = activity.lapsed ? 'lapsed' : 'active';
                    if (activity.lapsed) recoverHint = `Log ${RECOVER_THRESHOLD} sessions to wake this back up.`;
                }
                break;

            case 'perfect_week':
                count = perfectWeeks;
                if (perfectWeeks >= 1) {
                    status = activity.lapsed ? 'lapsed' : 'active';
                    if (activity.lapsed) recoverHint = `Log a full on-time week with every set ticked to earn another.`;
                }
                progress = perfectWeeks;
                total = totalWeeks;
                break;

            case 'catch_up': {
                const catchUps = (logs || []).filter(l => l.catch_up_for_week != null);
                if (catchUps.length >= 1) status = 'active';
                progress = Math.min(catchUps.length, 1);
                total = 1;
                break;
            }

            case 'power_player': {
                const need = POWER_CATEGORY_KEYS;
                const got = need.filter(c => cats.has(c)).length;
                progress = got;
                total = need.length;
                if (got === need.length) {
                    status = activity.lapsed ? 'lapsed' : 'active';
                    if (activity.lapsed) recoverHint = `Log ${RECOVER_THRESHOLD} sessions to wake this back up.`;
                }
                break;
            }

            case 'core_strong': {
                const need = CORE_CATEGORY_KEYS;
                const got = need.filter(c => cats.has(c)).length;
                progress = got;
                total = need.length;
                if (got === need.length) {
                    status = activity.lapsed ? 'lapsed' : 'active';
                    if (activity.lapsed) recoverHint = `Log ${RECOVER_THRESHOLD} sessions to wake this back up.`;
                }
                break;
            }

            case 'iron_cricketer':
                progress = sessionCount;
                total = totalSessions;
                if (sessionCount >= totalSessions) status = 'active';
                break;
        }

        return {
            ...badge,
            status,
            earnedAt: earned,
            progress,
            total,
            count,
            recoverHint,
        };
    });

    return out;
}

// ─── Award detection ───────────────────────────────────────────────────────

/**
 * Given the existing awarded rows + the freshly-computed states, return
 * the badge keys that need to be inserted as new awards (i.e. status went
 * from 'pending' → 'active' since last computation, or 'perfect_week'
 * incremented).
 *
 * For Perfect Week (repeatable), we award one row per qualifying week,
 * with metadata.week_number identifying which.
 */
export function detectNewAwards(states, awardedRows) {
    const awardedByKey = {};
    awardedRows.forEach(a => {
        if (!awardedByKey[a.badge_key]) awardedByKey[a.badge_key] = [];
        awardedByKey[a.badge_key].push(a);
    });
    const out = [];
    states.forEach(s => {
        if (s.status === 'pending') return;
        const existing = awardedByKey[s.key] || [];
        if (s.repeatable) {
            // Perfect Week: count vs awarded count
            const expected = s.count || 0;
            const have = existing.length;
            for (let i = have; i < expected; i++) {
                out.push({ badge_key: s.key, metadata: { occurrence: i + 1 } });
            }
        } else {
            if (existing.length === 0 && s.status === 'active') {
                out.push({ badge_key: s.key, metadata: {} });
            }
        }
    });
    return out;
}

// ─── Header status copy ────────────────────────────────────────────────────

/**
 * Compute the live status string shown on the player home tile.
 * Returns a short headline + a one-line subtext.
 */
export function computeHomeStatusCopy({ logs = [], program = {}, currentWeek = 1, now = new Date() }) {
    const sessionsPerWeek = program.sessions_per_week || 2;
    const totalWeeks = program.total_weeks || 10;
    const totalSessions = totalWeeks * sessionsPerWeek;
    const sessionCount = logs.length;
    const activity = computeActivityState(logs, now);

    if (sessionCount === 0) {
        return {
            headline: `Week ${currentWeek} of ${totalWeeks}`,
            sub: 'First session is the one. Tap to start.',
        };
    }

    if (sessionCount >= totalSessions) {
        return {
            headline: 'Program complete',
            sub: 'Iron Cricketer earned. Keep stacking Perfect Weeks.',
        };
    }

    const thisWeekLogs = logs.filter(l => l.week_number === currentWeek);
    const thisWeekCount = thisWeekLogs.length;
    const left = Math.max(0, sessionsPerWeek - thisWeekCount);

    if (left === 0) {
        return {
            headline: `Week ${currentWeek} locked.`,
            sub: `Both sessions logged. ${sessionCount} of ${totalSessions} sessions in the bank.`,
        };
    }

    if (activity.lapsed) {
        return {
            headline: `${activity.daysSinceLastLog} days since your last session.`,
            sub: 'Log this week to wake up your badges.',
        };
    }

    return {
        headline: `Week ${currentWeek} of ${totalWeeks}`,
        sub: `${left} session${left === 1 ? '' : 's'} left this week.`,
    };
}
