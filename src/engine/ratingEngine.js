// ═══ RATING ENGINE v2.0 — 8-Pillar DNA System ═══
// Pure calculation logic, no UI, no Supabase
import { B } from '../data/theme';
import {
    ROLES, BAT_ITEMS, PACE_ITEMS, SPIN_ITEMS, KEEP_ITEMS,
    IQ_ITEMS, MN_ITEMS, PH_MAP, FLD_ITEMS, PWR_ITEMS,
    BAT_ARCH, BWL_ARCH,
    BAT_ARCH_AFFINITY, BWL_ARCH_AFFINITY,
    BAT_SIGNAL_MAP,
    scoreBatArchetype, scoreBwlArchetype,
} from '../data/skillItems';
import { FALLBACK_RW, FALLBACK_CONST, ARCHETYPE_ALIGNMENT } from '../data/fallbacks';

// ═══ HELPERS ═══
export function getAge(dob) {
    if (!dob) return null;
    const p = dob.split("/");
    if (p.length !== 3) return null;
    const birthDate = new Date(Number(p[2]), Number(p[1]) - 1, Number(p[0]));
    if (isNaN(birthDate.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
}

export function getBracket(dob) {
    const a = getAge(dob);
    if (!a) return "?";
    if (a <= 13) return "U11-U13";
    if (a <= 16) return "U14-U16";
    if (a <= 19) return "U17-U19";
    return "U20+";
}

// ═══ DOMAIN MAP (8 PILLARS) ═══
export const DM = [
    { k: "tm", l: "Technical Mastery", c: B.pk, priPfx: "t1_", secPfx: "t2_" },
    { k: "te", l: "Tactical Execution", c: B.sky, pfx: "iq_" },
    { k: "pc", l: "Physical Conditioning", c: B.nv, pfx: "ph_" },
    { k: "mr", l: "Mental Resilience", c: B.prp, pfx: "mn_" },
    { k: "af", l: "Athletic Fielding", c: B.grn, pfx: "fld_" },
    { k: "mi", l: "Match Impact", c: B.org, pfx: "pb_" },
    { k: "pw", l: "Power Hitting", c: B.pk, pfx: "pwr_" },
    { k: "sa", l: "Self-Awareness", c: B.bl },
];

// Legacy DM for backward compatibility (used by old CoachDashboard renderDomains)
export const DM_LEGACY = [
    { k: "t", l: "Technical", c: B.pk, priPfx: "t1_", secPfx: "t2_" },
    { k: "i", l: "Game Intelligence", c: B.sky, pfx: "iq_" },
    { k: "m", l: "Mental & Character", c: B.prp, pfx: "mn_" },
    { k: "h", l: "Physical & Athletic", c: B.nv, pfx: "ph_" },
    { k: "ph", l: "Phase Effectiveness", c: B.org, pfx: "pb_" },
];

// ═══ TECH ITEMS BY ROLE ═══
export function techItems(r) {
    if (r === "pace") return { pri: PACE_ITEMS, sec: BAT_ITEMS.slice(0, 6), pL: "Pace Bowling", sL: "Batting" };
    if (r === "spin") return { pri: SPIN_ITEMS, sec: BAT_ITEMS.slice(0, 6), pL: "Spin Bowling", sL: "Batting" };
    if (r === "keeper") return { pri: KEEP_ITEMS, sec: BAT_ITEMS, pL: "Wicketkeeping", sL: "Batting" };
    if (r === "allrounder") return { pri: BAT_ITEMS.slice(0, 7), sec: ["Stock Ball Control", "Variation Execution", "Bowling to Plans", "Death Execution", "Match-Up Awareness"], pL: "Batting", sL: "Bowling" };
    return { pri: BAT_ITEMS, sec: ["Ground Fielding", "Catching", "Part-Time Bowling", "Running Between"], pL: "Batting", sL: "Fielding" };
}

// ═══ DOMAIN AVERAGE ═══
export function dAvg(d, pfx, n) {
    let s = 0, r = 0;
    for (let i = 0; i < n; i++) { const v = d[`${pfx}${i}`]; if (v > 0) { s += v; r++; } }
    return r > 0 ? { a: s / r, r, t: n } : { a: 0, r: 0, t: n };
}

// ═══ COMPETITION CONTEXT ENGINE (CCM = CTI × ARM) ═══
export function calcCCM(grades, dob, compTiers, constants) {
    if (!grades?.length || !dob || !compTiers?.length) return { ccm: 0, cti: 0, arm: 1, code: null, expectedAge: 0 };
    const c = constants || FALLBACK_CONST;
    const sens = parseFloat(c.arm_sensitivity_factor) || 0.05;
    const floor = parseFloat(c.arm_floor) || 0.80;
    const ceil = parseFloat(c.arm_ceiling) || 1.50;
    const playerAge = getAge(dob);
    if (!playerAge) return { ccm: 0, cti: 0, arm: 1, code: null, expectedAge: 0 };
    let hCTI = 0, hCode = null, hAge = 0;
    grades.forEach(g => {
        if (!g.level) return;
        const tier = compTiers.find(t => t.code === g.level);
        if (tier && parseFloat(tier.cti_value) > hCTI) {
            hCTI = parseFloat(tier.cti_value); hCode = tier.code; hAge = parseFloat(tier.expected_midpoint_age);
        }
    });
    if (!hCode) return { ccm: 0, cti: 0, arm: 1, code: null, expectedAge: 0 };
    const rawARM = 1 + (hAge - playerAge) * sens;
    const arm = Math.round(Math.max(floor, Math.min(ceil, rawARM)) * 100) / 100;
    const ccm = Math.round(hCTI * arm * 1000) / 1000;
    return { ccm, cti: hCTI, arm, code: hCode, expectedAge: hAge };
}

// ═══ STATISTICAL PERFORMANCE DOMAIN v2.0 ═══
export const FALLBACK_STAT_BENCHMARKS = {
    low: { rpi: [6, 10, 16, 24, 35], batSR: [40, 55, 70, 85, 100], bowlEcon: [7.5, 6.5, 5.5, 4.5, 3.5], bowlAvg: [40, 32, 25, 18, 12] },
    mid: { rpi: [8, 14, 22, 32, 45], batSR: [45, 60, 75, 90, 110], bowlEcon: [7.0, 6.0, 5.0, 4.0, 3.0], bowlAvg: [35, 28, 22, 16, 10] },
    high: { rpi: [10, 18, 28, 40, 55], batSR: [50, 65, 80, 95, 115], bowlEcon: [6.5, 5.5, 4.5, 3.5, 2.8], bowlAvg: [32, 25, 19, 14, 9] },
    elite: { rpi: [14, 24, 36, 50, 65], batSR: [55, 70, 85, 100, 120], bowlEcon: [6.0, 5.0, 4.0, 3.2, 2.5], bowlAvg: [28, 22, 17, 12, 8] },
    top: { rpi: [18, 30, 44, 58, 75], batSR: [60, 75, 90, 105, 125], bowlEcon: [5.5, 4.5, 3.5, 2.8, 2.2], bowlAvg: [25, 20, 15, 10, 7] },
};

export const FALLBACK_SUB_WEIGHTS = {
    batter: [0.60, 0.10, 0.30],
    pace: [0.15, 0.65, 0.20],
    spin: [0.15, 0.65, 0.20],
    allrounder: [0.35, 0.45, 0.20],
    keeper: [0.45, 0.10, 0.45],
};

export const FALLBACK_DOMAIN_WEIGHTS = {
    young: { tm: .14, te: .18, mr: .14, pc: .08, af: .10, mi: .12, pw: .10, sa: .14 },
    mid: { tm: .14, te: .16, mr: .14, pc: .08, af: .10, mi: .14, pw: .10, sa: .14 },
    senior: { tm: .14, te: .14, mr: .12, pc: .08, af: .10, mi: .18, pw: .10, sa: .14 },
};

export const FALLBACK_THRESHOLDS = { minBatInn: 5, minOvers: 20, minMatches: 5 };

// ═══ PEAK PERFORMANCE BENCHMARKS ═══
export const PEAK_BENCHMARKS = {
    batRuns: {
        low: [15, 25, 40, 60, 85],
        mid: [12, 22, 35, 55, 80],
        high: [10, 18, 30, 50, 75],
        elite: [8, 15, 25, 45, 70],
        top: [6, 12, 22, 40, 65],
    },
    bowlWkts: [0, 1, 2, 3, 4],
};

const SEASON_WEIGHT = 0.70;
const PEAK_WEIGHT = 0.30;

function scoreAgainstBenchmark(val, benchArr, reverseIsBetter = false) {
    if (val == null || val === 0) return 0;
    if (reverseIsBetter) {
        if (val >= benchArr[0]) return 1.0;
        if (val <= benchArr[4]) return 5.0;
        for (let i = 0; i < 4; i++) {
            if (val <= benchArr[i] && val > benchArr[i + 1]) {
                const pct = (benchArr[i] - val) / (benchArr[i] - benchArr[i + 1]);
                return (i + 1) + pct;
            }
        }
        return 3.0;
    } else {
        if (val <= benchArr[0]) return 1.0;
        if (val >= benchArr[4]) return 5.0;
        for (let i = 0; i < 4; i++) {
            if (val >= benchArr[i] && val < benchArr[i + 1]) {
                const pct = (val - benchArr[i]) / (benchArr[i + 1] - benchArr[i]);
                return (i + 1) + pct;
            }
        }
        return 3.0;
    }
}

export function getCTIBand(cti) {
    if (cti >= 1.20) return 'top';
    if (cti >= 1.00) return 'elite';
    if (cti >= 0.80) return 'high';
    if (cti >= 0.60) return 'mid';
    return 'low';
}

export function getAgeTier(age) {
    if (!age || age <= 14) return 'young';
    if (age <= 16) return 'mid';
    return 'senior';
}

// ═══ PEAK PERFORMANCE SCORING ═══
function resolveCTI(compName, compTiers, fallbackCTI) {
    if (!compName || !compTiers?.length) return fallbackCTI;
    const tier = compTiers.find(t => t.competition_name === compName);
    return tier ? parseFloat(tier.cti_value) : fallbackCTI;
}

export function calcPeakScore(topBat, topBowl, compTiers, fallbackCTI, role, opts = {}) {
    const peakBench = opts.peakBenchmarks || PEAK_BENCHMARKS;
    const allSeasonBench = opts.statBenchmarks || FALLBACK_STAT_BENCHMARKS;
    const allSubWeights = opts.statSubWeights || FALLBACK_SUB_WEIGHTS;
    const sub = allSubWeights[role] || allSubWeights.batter;

    let bestBatScore = 0;
    const batScores = [];
    (topBat || []).forEach(b => {
        const runs = +b.runs || 0;
        if (runs <= 0) return;
        const perfCTI = resolveCTI(b.comp, compTiers, fallbackCTI);
        const band = getCTIBand(perfCTI);
        const runsBench = peakBench.batRuns?.[band] || peakBench.batRuns?.mid || [12, 22, 35, 55, 80];
        const runsScore = scoreAgainstBenchmark(runs, runsBench);
        const balls = +b.balls || 0;
        let innScore = runsScore;
        if (balls > 0 && runs > 0) {
            const sr = (runs / balls) * 100;
            const srBench = allSeasonBench[band]?.batSR || [45, 60, 75, 90, 110];
            const srScore = scoreAgainstBenchmark(sr, srBench);
            if (srScore > 0) innScore = (runsScore * 0.7) + (srScore * 0.3);
        }
        if (innScore > bestBatScore) bestBatScore = innScore;
        batScores.push({ runs, score: Math.round(innScore * 100) / 100, band, comp: b.comp, vs: b.vs });
    });

    let bestBowlScore = 0;
    const bowlScores = [];
    (topBowl || []).forEach(b => {
        const wkts = +b.wkts || 0;
        const bRuns = +b.runs || 0;
        const overs = +b.overs || 0;
        if (wkts <= 0 && bRuns <= 0) return;
        const perfCTI = resolveCTI(b.comp, compTiers, fallbackCTI);
        const band = getCTIBand(perfCTI);
        const wktsBench = peakBench.bowlWkts || [0, 1, 2, 3, 4];
        const wktsScore = scoreAgainstBenchmark(wkts, wktsBench);
        let spellScore = wktsScore;
        if (overs > 0 && bRuns >= 0) {
            const econ = bRuns / overs;
            const econBench = allSeasonBench[band]?.bowlEcon || [7.0, 6.0, 5.0, 4.0, 3.0];
            const econScore = scoreAgainstBenchmark(econ, econBench, true);
            if (econScore > 0 && wktsScore > 0) {
                spellScore = (wktsScore * 0.6) + (econScore * 0.4);
            }
        }
        if (spellScore > bestBowlScore) bestBowlScore = spellScore;
        bowlScores.push({ wkts, runs: bRuns, score: Math.round(spellScore * 100) / 100, band, comp: b.comp, vs: b.vs });
    });

    let totalScore = 0, totalWeight = 0;
    if (bestBatScore > 0) { totalScore += bestBatScore * sub[0]; totalWeight += sub[0]; }
    if (bestBowlScore > 0) { totalScore += bestBowlScore * sub[1]; totalWeight += sub[1]; }
    const score = totalWeight > 0 ? totalScore / totalWeight : 0;

    return {
        score: Math.round(score * 100) / 100,
        bestBat: Math.round(bestBatScore * 100) / 100,
        bestBowl: Math.round(bestBowlScore * 100) / 100,
        batScores, bowlScores,
        hasPeaks: bestBatScore > 0 || bestBowlScore > 0,
    };
}

export function calcStatDomain(grades, role, cti, arm, playerAge, opts = {}, topBat = [], topBowl = [], compTiers = []) {
    const hasSeason = grades?.length > 0 && cti > 0;
    const peakResult = calcPeakScore(topBat, topBowl, compTiers, cti, role, opts);
    const hasPeaks = peakResult.hasPeaks;

    if (!hasSeason && !hasPeaks) return { css: 0, score: 0, breakdown: null, eligible: false, peakResult: null };

    let seasonScore = 0;
    let batMean = 0, bowlMean = 0, fieldScore = 0;
    let band = getCTIBand(cti);

    if (hasSeason) {
        const primary = grades.reduce((best, g) => {
            const m = +g.matches || 0;
            return m > (+best.matches || 0) ? g : best;
        }, grades[0]);

        const matches = +primary.matches || 0;
        const batInn = +primary.batInn || 0;
        const overs = +primary.overs || 0;

        const thresholds = opts.statThresholds || FALLBACK_THRESHOLDS;
        const allBenchmarks = opts.statBenchmarks || FALLBACK_STAT_BENCHMARKS;
        const allSubWeights = opts.statSubWeights || FALLBACK_SUB_WEIGHTS;

        if (matches >= thresholds.minMatches) {
            const benchmarks = allBenchmarks[band];
            const sub = allSubWeights[role] || allSubWeights.batter;

            let batScore = 0, batN = 0;
            if (batInn >= thresholds.minBatInn) {
                const runs = +primary.runs || 0;
                const rpi = batInn > 0 ? runs / batInn : 0;
                const ballsFaced = +primary.ballsFaced || 0;
                const batSR = ballsFaced > 0 ? (runs / ballsFaced) * 100 : 0;
                const rpiScore = scoreAgainstBenchmark(rpi, benchmarks.rpi);
                if (rpiScore > 0) { batScore += rpiScore; batN++; }
                if (batSR > 0) {
                    const srScore = scoreAgainstBenchmark(batSR, benchmarks.batSR);
                    if (srScore > 0) { batScore += srScore; batN++; }
                }
            }
            batMean = batN > 0 ? batScore / batN : 0;

            let bowlScore = 0, bowlN = 0;
            if (overs >= thresholds.minOvers) {
                const wkts = +primary.wkts || 0;
                const econ = primary.econ ? +primary.econ : 0;
                const bAvg = primary.bAvg ? +primary.bAvg : (wkts > 0 ? (econ * overs) / wkts : 0);
                if (econ > 0) {
                    const econScore = scoreAgainstBenchmark(econ, benchmarks.bowlEcon, true);
                    if (econScore > 0) { bowlScore += econScore; bowlN++; }
                }
                if (bAvg > 0) {
                    const avgScore = scoreAgainstBenchmark(bAvg, benchmarks.bowlAvg, true);
                    if (avgScore > 0) { bowlScore += avgScore; bowlN++; }
                }
            }
            bowlMean = bowlN > 0 ? bowlScore / bowlN : 0;

            const ct = +primary.ct || 0;
            const ro = +primary.ro || 0;
            const st = +primary.st || 0;
            const kpCt = +primary.keeperCatches || 0;
            const fieldActions = ct + ro + st + kpCt;
            const fieldPM = matches > 0 ? fieldActions / matches : 0;
            fieldScore = fieldPM > 0 ? Math.min(5, Math.max(1, 1 + (fieldPM / 0.3) * 1)) : 0;

            let totalScore = 0, totalWeight = 0;
            if (batMean > 0) { totalScore += batMean * sub[0]; totalWeight += sub[0]; }
            if (bowlMean > 0) { totalScore += bowlMean * sub[1]; totalWeight += sub[1]; }
            if (fieldScore > 0) { totalScore += fieldScore * sub[2]; totalWeight += sub[2]; }
            seasonScore = totalWeight > 0 ? totalScore / totalWeight : 0;
        }
    }

    let rawScore;
    if (seasonScore > 0 && hasPeaks) {
        rawScore = seasonScore * SEASON_WEIGHT + peakResult.score * PEAK_WEIGHT;
    } else if (seasonScore > 0) {
        rawScore = seasonScore;
    } else if (hasPeaks) {
        rawScore = peakResult.score * 0.80;
    } else {
        rawScore = 0;
    }

    const css = rawScore * (arm || 1);

    return {
        css: Math.round(css * 100) / 100,
        score: Math.round(rawScore * 100) / 100,
        eligible: rawScore > 0,
        breakdown: {
            batMean: Math.round(batMean * 100) / 100,
            bowlMean: Math.round(bowlMean * 100) / 100,
            fieldScore: Math.round(fieldScore * 100) / 100,
            seasonScore: Math.round(seasonScore * 100) / 100,
            peakScore: peakResult.score,
            blendUsed: seasonScore > 0 && hasPeaks ? '70/30' : (seasonScore > 0 ? 'season-only' : (hasPeaks ? 'peak-only' : 'none')),
            subWeights: (opts.statSubWeights || FALLBACK_SUB_WEIGHTS)[role] || (opts.statSubWeights || FALLBACK_SUB_WEIGHTS).batter,
            band,
        },
        peakResult,
    };
}

// ═══ CSS CALCULATION ═══
export function calcCSS(coachVal, playerVal, ccm, cW, pW) {
    if (coachVal > 0 && playerVal > 0) return (coachVal * cW + playerVal * pW) * ccm;
    if (coachVal > 0) return coachVal * ccm;
    if (playerVal > 0) return playerVal * ccm;
    return 0;
}

// ═══ SELF-AWARENESS SCORE (SAGI → 1-5) ═══
// Converts the absolute gap between player and coach into a 1-5 pillar score
// SAGI of 0 → 5/5 (perfectly aligned)
// SAGI of ±2 → 1/5 (significantly misaligned)
export function calcSelfAwarenessScore(sagi, constants) {
    if (sagi === null || sagi === undefined) return 0;
    const c = constants || FALLBACK_CONST;
    const penalty = parseFloat(c.sagi_penalty_factor) || 2.0;
    const floor = parseFloat(c.sagi_floor_score) || 1.0;
    const raw = 5 - Math.abs(sagi) * penalty;
    return Math.round(Math.max(floor, Math.min(5, raw)) * 100) / 100;
}

// ═══ ARCHETYPE DNA PERCENTAGE (v3 — questionnaire-driven) ═══
// Primary source: questionnaire answers scored via scoreArchetypeAnswers()
// Secondary source: coach-assigned archetype (weighted heavily)
// Fallback: equal distribution if no data
export function calcArchetypeDNA(onboardingData, coachBatArchetype, coachBowlArchetype) {
    const batArchetypes = BAT_ARCH.map(a => a.id);
    const bowlArchetypes = BWL_ARCH.map(a => a.id);
    const data = onboardingData || {};

    // ── BATTING DNA ──
    let batDNA = {};
    batArchetypes.forEach(a => { batDNA[a] = 0; });

    // Layer 1: Questionnaire answers (primary signal)
    const batAnswers = data.batArchAnswers;
    if (Array.isArray(batAnswers) && batAnswers.length > 0) {
        const result = scoreBatArchetype(batAnswers);
        batArchetypes.forEach(a => { batDNA[a] = (result.scores[a] || 0) / 100 * 5.0; }); // scale to 0-5 weight
    }

    // Layer 2: Coach-assigned archetype (heavy weight, always applied if present)
    if (coachBatArchetype && batDNA[coachBatArchetype] !== undefined) {
        batDNA[coachBatArchetype] += 3.0;
    }

    // ── BOWLING DNA ──
    let bowlDNA = {};
    bowlArchetypes.forEach(a => { bowlDNA[a] = 0; });

    // Layer 1: Questionnaire answers
    const bwlAnswers = data.bwlArchAnswers;
    if (Array.isArray(bwlAnswers) && bwlAnswers.length > 0) {
        const result = scoreBwlArchetype(bwlAnswers);
        bowlArchetypes.forEach(a => { bowlDNA[a] = (result.scores[a] || 0) / 100 * 5.0; });
    }

    // Layer 2: Coach-assigned archetype
    if (coachBowlArchetype && bowlDNA[coachBowlArchetype] !== undefined) {
        bowlDNA[coachBowlArchetype] += 3.0;
    }

    // ── Normalise to percentages ──
    const normalise = (dna, archetypes) => {
        const total = Object.values(dna).reduce((s, v) => s + v, 0);
        const pct = {};
        archetypes.forEach(a => { pct[a] = total > 0 ? Math.round((dna[a] / total) * 100) : 0; });
        // Fix rounding to ensure sum = 100
        const pctTotal = Object.values(pct).reduce((s, v) => s + v, 0);
        if (pctTotal !== 100 && pctTotal > 0) {
            const maxKey = Object.entries(pct).reduce((a, b) => b[1] > a[1] ? b : a)[0];
            pct[maxKey] += (100 - pctTotal);
        }
        return pct;
    };

    const batPct = normalise(batDNA, batArchetypes);
    const bowlPct = normalise(bowlDNA, bowlArchetypes);

    return {
        bat: batPct,
        bowl: bowlPct,
        primaryBat: Object.entries(batPct).reduce((a, b) => b[1] > a[1] ? b : a, ['', 0])[0],
        primaryBowl: Object.entries(bowlPct).reduce((a, b) => b[1] > a[1] ? b : a, ['', 0])[0],
    };
}

// ═══ GROWTH DELTA ═══
// Compares two PDI result objects (e.g., baseline vs current) and returns per-pillar deltas
export function calcGrowthDelta(baselinePDI, currentPDI) {
    if (!baselinePDI?.domains || !currentPDI?.domains) return null;
    const deltas = {};
    currentPDI.domains.forEach(d => {
        const base = baselinePDI.domains.find(b => b.k === d.k);
        deltas[d.k] = {
            label: d.l,
            color: d.c,
            baseline: base?.raw || 0,
            current: d.raw || 0,
            delta: Math.round(((d.raw || 0) - (base?.raw || 0)) * 100) / 100,
        };
    });
    return {
        deltas,
        pdiDelta: Math.round((currentPDI.pdi - baselinePDI.pdi) * 100) / 100,
        sagiDelta: (currentPDI.sagi !== null && baselinePDI.sagi !== null)
            ? Math.round((currentPDI.sagi - baselinePDI.sagi) * 100) / 100
            : null,
    };
}

// ═══ MATCH-UP CONFIDENCE → DOMAIN SELF-SCORES ═══
// Extracts domain-level 1-5 averages from match-up confidence data.
// selfData keys: mc_bat_N_c (confidence), mc_bat_N_f (frequency)
// Returns domain self-scores that plug into the CSS blend where old sr_ keys are empty.
export function extractMatchUpSelf(selfData, hasBowling) {
    if (!selfData) return { tech: 0, tact: 0, mental: 0, phase: 0, techN: 0, tactN: 0, mentalN: 0, phaseN: 0 };
    const avg = (keys) => {
        let s = 0, n = 0;
        keys.forEach(k => { const v = selfData[k]; if (v > 0) { s += v; n++; } });
        return { a: n > 0 ? s / n : 0, n };
    };

    // Technical self: all batting + bowling confidence ratings
    const batConfKeys = [0,1,2,3,4,5,6].map(i => `mc_bat_${i}_c`);
    const bwlConfKeys = hasBowling ? [0,1,2,3,4,5].map(i => `mc_bwl_${i}_c`) : [];
    const techResult = avg([...batConfKeys, ...bwlConfKeys]);

    // Tactical self: rotation(3), powerplay(5), death batting(6), bowling to plan(4), death bowl(5)
    const tactKeys = ['mc_bat_3_c', 'mc_bat_5_c', 'mc_bat_6_c'];
    if (hasBowling) tactKeys.push('mc_bwl_4_c', 'mc_bwl_5_c');
    const tactResult = avg(tactKeys);

    // Mental self: all mental match-up confidence
    const mntConfKeys = [0,1,2,3,4].map(i => `mc_mnt_${i}_c`);
    const mentalResult = avg(mntConfKeys);

    // Phase self: pressure(4), pp(5), death(6) batting + pressure(2), death(5) bowling
    const phaseKeys = ['mc_bat_4_c', 'mc_bat_5_c', 'mc_bat_6_c'];
    if (hasBowling) phaseKeys.push('mc_bwl_2_c', 'mc_bwl_5_c');
    const phaseResult = avg(phaseKeys);

    return {
        tech: techResult.a, techN: techResult.n,
        tact: tactResult.a, tactN: tactResult.n,
        mental: mentalResult.a, mentalN: mentalResult.n,
        phase: phaseResult.a, phaseN: phaseResult.n,
    };
}

// ═══ INTERNAL SAGI (Confidence vs Frequency gap within player data) ═══
// Positive gap = overestimates (confident but doesn't execute)
// Negative gap = underestimates (executes well but lacks confidence)
// Near zero = self-aware
export function calcInternalSAGI(selfData, hasBowling) {
    if (!selfData) return null;
    let confSum = 0, confN = 0, freqSum = 0, freqN = 0;

    // Batting match-ups (7)
    for (let i = 0; i < 7; i++) {
        const cv = selfData[`mc_bat_${i}_c`]; if (cv > 0) { confSum += cv; confN++; }
        const fv = selfData[`mc_bat_${i}_f`]; if (fv > 0) { freqSum += fv; freqN++; }
    }
    // Bowling match-ups (6)
    if (hasBowling) {
        for (let i = 0; i < 6; i++) {
            const cv = selfData[`mc_bwl_${i}_c`]; if (cv > 0) { confSum += cv; confN++; }
            const fv = selfData[`mc_bwl_${i}_f`]; if (fv > 0) { freqSum += fv; freqN++; }
        }
    }
    // Mental match-ups (5)
    for (let i = 0; i < 5; i++) {
        const cv = selfData[`mc_mnt_${i}_c`]; if (cv > 0) { confSum += cv; confN++; }
        const fv = selfData[`mc_mnt_${i}_f`]; if (fv > 0) { freqSum += fv; freqN++; }
    }

    if (confN < 3 || freqN < 3) return null; // need minimum data
    return Math.round((confSum / confN - freqSum / freqN) * 100) / 100;
}

// ═══ PDI CALCULATION (8-PILLAR) ═══
export function calcPDI(coachData, selfData, role, ccmResult, dbWeights, constants, playerGrades, opts = {}, topBat = [], topBowl = [], compTiers = []) {
    const c = constants || FALLBACK_CONST;
    const cW = parseFloat(c.coach_weight) || 0.75, pW = parseFloat(c.player_weight) || 0.25;
    const ccm = ccmResult?.ccm || 0;
    const t = techItems(role);
    const roleObj = ROLES.find(r => r.id === role);
    const dbW = dbWeights?.[roleObj?.dbId] || null;

    const playerAge = getAge(coachData?._dob);
    const ageTier = getAgeTier(playerAge);
    const domainWeights = opts.statDomainWeights || FALLBACK_DOMAIN_WEIGHTS;
    const ageW = domainWeights[ageTier];

    const w = dbW || (FALLBACK_RW[role] || FALLBACK_RW.batter);

    // Use 8-pillar weights: prefer age-tier weights, fallback to role-based
    const useW = {
        tm: ageW.tm ?? w.tm ?? 0.14,
        te: ageW.te ?? w.te ?? 0.18,
        pc: ageW.pc ?? w.pc ?? 0.08,
        mr: ageW.mr ?? w.mr ?? 0.14,
        af: ageW.af ?? w.af ?? 0.10,
        mi: ageW.mi ?? w.mi ?? 0.12,
        pw: ageW.pw ?? w.pw ?? 0.10,
        sa: ageW.sa ?? w.sa ?? 0.14,
    };

    // ── Extract match-up confidence → domain self-scores ──
    const hasBowling = ['pace', 'spin', 'allrounder'].includes(role);
    const mcSelf = extractMatchUpSelf(selfData, hasBowling);

    // Helper: use old sr_ self-data if available, fall back to match-up confidence
    const selfOrMC = (oldAvg, mcVal) => oldAvg.a > 0 ? oldAvg.a : mcVal;

    // ═══ PILLAR 1: TECHNICAL MASTERY ═══
    const priAvg = dAvg(coachData, "t1_", t.pri.length);
    const secAvg = dAvg(coachData, "t2_", t.sec.length);
    const priSelf = dAvg(selfData || {}, "t1_", t.pri.length);
    const secSelf = dAvg(selfData || {}, "t2_", t.sec.length);
    const techAll = priAvg.r + secAvg.r, techSelf = priSelf.r + secSelf.r;
    const techCoachMean = techAll > 0 ? (priAvg.a * priAvg.r + secAvg.a * secAvg.r) / techAll : 0;
    const techSelfMean = techSelf > 0 ? (priSelf.a * priSelf.r + secSelf.a * secSelf.r) / techSelf : 0;
    const techSelfFinal = techSelfMean > 0 ? techSelfMean : mcSelf.tech;
    const tmCSS = ccm > 0 ? calcCSS(techCoachMean, techSelfFinal, ccm, cW, pW) : (techCoachMean || techSelfFinal);
    const techTotal = priAvg.t + secAvg.t;

    // ═══ PILLAR 2: TACTICAL EXECUTION ═══
    const iqAvg = dAvg(coachData, "iq_", IQ_ITEMS.length);
    const iqSelf = dAvg(selfData || {}, "iq_", IQ_ITEMS.length);
    const iqSelfFinal = selfOrMC(iqSelf, mcSelf.tact);
    const teCSS = ccm > 0 ? calcCSS(iqAvg.a, iqSelfFinal, ccm, cW, pW) : (iqAvg.a || iqSelfFinal);

    // ═══ PILLAR 3: PHYSICAL CONDITIONING ═══
    const phAvg = dAvg(coachData, "ph_", (PH_MAP[role] || PH_MAP.batter).length);
    const phSelf = dAvg(selfData || {}, "ph_", (PH_MAP[role] || PH_MAP.batter).length);
    const pcCSS = ccm > 0 ? calcCSS(phAvg.a, phSelf.a, ccm, cW, pW) : (phAvg.a || phSelf.a);

    // ═══ PILLAR 4: MENTAL RESILIENCE ═══
    const mnAvg = dAvg(coachData, "mn_", MN_ITEMS.length);
    const mnSelf = dAvg(selfData || {}, "mn_", MN_ITEMS.length);
    const mnSelfFinal = selfOrMC(mnSelf, mcSelf.mental);
    const mrCSS = ccm > 0 ? calcCSS(mnAvg.a, mnSelfFinal, ccm, cW, pW) : (mnAvg.a || mnSelfFinal);

    // ═══ PILLAR 5: ATHLETIC FIELDING ═══
    const fldAvg = dAvg(coachData, "fld_", FLD_ITEMS.length);
    const fldSelf = dAvg(selfData || {}, "fld_", FLD_ITEMS.length);
    const afCSS = ccm > 0 ? calcCSS(fldAvg.a, fldSelf.a, ccm, cW, pW) : (fldAvg.a || fldSelf.a);

    // ═══ PILLAR 6: MATCH IMPACT (Phase Effectiveness + Statistical Performance) ═══
    const phaseKeys = ["pb_pp", "pw_pp", "pb_mid", "pw_mid", "pb_death", "pw_death"];
    let phaseSum = 0, phaseN = 0;
    phaseKeys.forEach(k => { if (coachData[k] > 0) { phaseSum += coachData[k]; phaseN++; } });
    const phaseMean = phaseN > 0 ? phaseSum / phaseN : 0;
    let phaseSelfSum = 0, phaseSelfN = 0;
    phaseKeys.forEach(k => { if (selfData?.[k] > 0) { phaseSelfSum += selfData[k]; phaseSelfN++; } });
    const phaseSelfMean = phaseSelfN > 0 ? phaseSelfSum / phaseSelfN : 0;
    const phaseSelfFinal = phaseSelfMean > 0 ? phaseSelfMean : mcSelf.phase;
    const phaseCSS = ccm > 0 ? calcCSS(phaseMean, phaseSelfFinal, ccm, cW, pW) : (phaseMean || phaseSelfFinal);

    // Stat domain feeds into Match Impact
    const cti = ccmResult?.cti || 0;
    const arm = ccmResult?.arm || 1;
    const statResult = calcStatDomain(playerGrades, role, cti, arm, playerAge, opts, topBat, topBowl, compTiers);

    // Blend phase (60%) + stat (40%) for Match Impact when both available
    let miCSS;
    if (phaseCSS > 0 && statResult.css > 0) {
        miCSS = phaseCSS * 0.60 + statResult.css * 0.40;
    } else if (phaseCSS > 0) {
        miCSS = phaseCSS;
    } else {
        miCSS = statResult.css;
    }

    // ═══ PILLAR 7: POWER HITTING ═══
    const pwrAvg = dAvg(coachData, "pwr_", PWR_ITEMS.length);
    const pwrSelf = dAvg(selfData || {}, "pwr_", PWR_ITEMS.length);
    let pwCSS = ccm > 0 ? calcCSS(pwrAvg.a, pwrSelf.a, ccm, cW, pW) : (pwrAvg.a || pwrSelf.a);

    // If Power Hitting pillar has no dedicated pwr_ data yet, fall back to BAT_ITEMS[4] + BAT_ITEMS[9]
    if (pwrAvg.r === 0 && pwrSelf.r === 0) {
        const pwCoach = ((coachData?.t1_4 || 0) + (coachData?.t1_9 || 0));
        const pwSelf = ((selfData?.t1_4 || 0) + (selfData?.t1_9 || 0));
        const pwCoachMean = pwCoach > 0 ? pwCoach / ([coachData?.t1_4, coachData?.t1_9].filter(v => v > 0).length || 1) : 0;
        const pwSelfMean = pwSelf > 0 ? pwSelf / ([selfData?.t1_4, selfData?.t1_9].filter(v => v > 0).length || 1) : 0;
        pwCSS = ccm > 0 ? calcCSS(pwCoachMean, pwSelfMean, ccm, cW, pW) : (pwCoachMean || pwSelfMean);
    }

    // ═══ SAGI (Self-Awareness Gap Index) — DUAL LAYER ═══
    //
    // Layer A (Internal SAGI): Confidence vs Frequency gap within the player's own match-up data.
    //   Positive = overestimates, Negative = underestimates, Zero = self-aware.
    //   Available from day one — no coach data needed.
    //
    // Layer B (Cross-Layer SAGI): Player domain confidence avg vs Coach domain rating avg.
    //   Only available when both coach and match-up data exist.
    //
    // Combined SAGI: If both layers are available, blend 60% internal + 40% cross-layer.
    //   If only internal, use 100% internal. If neither, null.

    const internalSAGI = calcInternalSAGI(selfData, hasBowling);

    // Cross-layer: compare player match-up confidence averages vs coach domain averages
    let crossSAGI = null;
    const coachDomainAvgs = [];
    const selfDomainAvgs = [];
    if (techCoachMean > 0 && mcSelf.techN > 0) { coachDomainAvgs.push(techCoachMean); selfDomainAvgs.push(mcSelf.tech); }
    if (iqAvg.a > 0 && mcSelf.tactN > 0) { coachDomainAvgs.push(iqAvg.a); selfDomainAvgs.push(mcSelf.tact); }
    if (mnAvg.a > 0 && mcSelf.mentalN > 0) { coachDomainAvgs.push(mnAvg.a); selfDomainAvgs.push(mcSelf.mental); }
    if (phaseMean > 0 && mcSelf.phaseN > 0) { coachDomainAvgs.push(phaseMean); selfDomainAvgs.push(mcSelf.phase); }

    if (coachDomainAvgs.length >= 2) {
        const coachMean = coachDomainAvgs.reduce((s, v) => s + v, 0) / coachDomainAvgs.length;
        const selfMean = selfDomainAvgs.reduce((s, v) => s + v, 0) / selfDomainAvgs.length;
        crossSAGI = Math.round((selfMean - coachMean) * 100) / 100;
    }

    // Blend: 60% internal, 40% cross-layer when both available
    let sagi = null;
    if (internalSAGI !== null && crossSAGI !== null) {
        sagi = Math.round((internalSAGI * 0.6 + crossSAGI * 0.4) * 100) / 100;
    } else if (internalSAGI !== null) {
        sagi = internalSAGI;
    } else if (crossSAGI !== null) {
        sagi = crossSAGI;
    }
    // Fallback: legacy SAGI from old sr_ keys if no match-up data at all
    if (sagi === null) {
        let coachSum = 0, coachN = 0, selfSum = 0, selfN = 0;
        const allPfx = ["t1_", "t2_", "iq_", "mn_", "ph_", "fld_", "pwr_"];
        const allCounts = [t.pri.length, t.sec.length, IQ_ITEMS.length, MN_ITEMS.length, (PH_MAP[role] || PH_MAP.batter).length, FLD_ITEMS.length, PWR_ITEMS.length];
        allPfx.forEach((pfx, pi) => {
            for (let i = 0; i < allCounts[pi]; i++) {
                if (coachData[`${pfx}${i}`] > 0) { coachSum += coachData[`${pfx}${i}`]; coachN++; }
                if (selfData?.[`${pfx}${i}`] > 0) { selfSum += selfData[`${pfx}${i}`]; selfN++; }
            }
        });
        if (selfN > 0 && coachN > 0) sagi = Math.round((selfSum / selfN - coachSum / coachN) * 100) / 100;
    }

    const sagiMin = parseFloat(c.sagi_aligned_min) || -0.5, sagiMax = parseFloat(c.sagi_aligned_max) || 0.5;
    let sagiLabel = "—", sagiColor = B.g400;
    if (sagi !== null) {
        if (sagi > sagiMax) { sagiLabel = "Over-estimates"; sagiColor = B.amb; }
        else if (sagi < sagiMin) { sagiLabel = "Under-estimates"; sagiColor = B.sky; }
        else { sagiLabel = "Aligned ✓"; sagiColor = B.grn; }
    }

    // ═══ PILLAR 8: SELF-AWARENESS (SAGI as scored pillar) ═══
    const saScore = calcSelfAwarenessScore(sagi, c);
    const saCSS = saScore > 0 ? (ccm > 0 ? saScore * ccm : saScore) : 0;

    // ═══ BUILD DOMAINS ARRAY (8 PILLARS) ═══
    const domains = [
        { k: "tm", l: "Technical Mastery", c: B.pk, css: tmCSS, raw: techCoachMean, r: techAll, t: techTotal, wt: useW.tm },
        { k: "te", l: "Tactical Execution", c: B.sky, css: teCSS, raw: iqAvg.a, r: iqAvg.r, t: iqAvg.t, wt: useW.te },
        { k: "pc", l: "Physical Conditioning", c: B.nv, css: pcCSS, raw: phAvg.a, r: phAvg.r, t: phAvg.t, wt: useW.pc },
        { k: "mr", l: "Mental Resilience", c: B.prp, css: mrCSS, raw: mnAvg.a, r: mnAvg.r, t: mnAvg.t, wt: useW.mr },
        { k: "af", l: "Athletic Fielding", c: B.grn, css: afCSS, raw: fldAvg.a, r: fldAvg.r, t: fldAvg.t, wt: useW.af },
        { k: "mi", l: "Match Impact", c: B.org, css: miCSS, raw: phaseMean, r: phaseN + (statResult.eligible ? 1 : 0), t: phaseKeys.length + 1, wt: useW.mi, breakdown: statResult.breakdown },
        { k: "pw", l: "Power Hitting", c: B.pk, css: pwCSS, raw: pwrAvg.a || ((coachData?.t1_4 || 0) + (coachData?.t1_9 || 0)) / 2, r: pwrAvg.r || ([coachData?.t1_4, coachData?.t1_9].filter(v => v > 0).length), t: PWR_ITEMS.length, wt: useW.pw },
        { k: "sa", l: "Self-Awareness", c: B.bl, css: saCSS, raw: saScore, r: sagi !== null ? 1 : 0, t: 1, wt: useW.sa },
    ];

    let pdiSum = 0, pdiWeightSum = 0;
    let tr = 0, ti = 0;
    domains.forEach(d => {
        tr += d.r; ti += d.t;
        const s100 = d.raw > 0 ? (d.raw / 5) * 100 : 0;
        d.s100 = s100;
        if (d.r > 0) { pdiSum += d.css * d.wt; pdiWeightSum += d.wt; }
    });
    const pdi = pdiWeightSum > 0 ? Math.round((pdiSum / pdiWeightSum) * 100) / 100 : 0;
    const pdiPct = pdi > 0 ? Math.round((pdi / 5) * 100) : 0;
    const cp = ti > 0 ? Math.round(tr / ti * 100) : 0;

    let g = "—", gc = B.g400;
    if (pdi >= 4.25) { g = "ELITE"; gc = B.grn; } else if (pdi >= 3.50) { g = "ADVANCED"; gc = B.bl; } else if (pdi >= 2.75) { g = "COMPETENT"; gc = B.amb; } else if (pdi >= 2.00) { g = "EMERGING"; gc = B.pk; } else if (pdi >= 1.00) { g = "DEVELOPING"; gc = B.g600; } else if (pdi > 0) { g = "FOUNDATION"; gc = B.g400; }

    const trajThresh = parseFloat(c.trajectory_age_threshold) || 1.5;
    const trajectory = playerAge && ccmResult?.expectedAge && pdi >= 2.5 && (playerAge < (ccmResult.expectedAge - trajThresh));

    return { pdi, pdiPct, g, gc, domains, cp, tr, ti, sagi, sagiLabel, sagiColor, internalSAGI, crossSAGI, trajectory, ccmResult, provisional: priAvg.r === 0, statResult };
}

// ═══ CORE SCORE HELPERS ═══
export function calcCohortPercentile(playerPdi, allPlayers, compTiers, dbWeights, engineConst) {
    const pdis = allPlayers.filter(p => p.submitted && Object.keys(p.cd || {}).some(k => k.match(/^t1_/))).map(p => {
        const ccmR = calcCCM(p.grades, p.dob, compTiers, engineConst);
        const dn = calcPDI({ ...p.cd, _dob: p.dob }, p.self_ratings, p.role, ccmR, dbWeights, engineConst, p.grades, {}, p.topBat, p.topBowl, compTiers);
        return dn.pdi;
    }).filter(v => v > 0);
    if (pdis.length <= 1) return 50;
    const below = pdis.filter(v => v < playerPdi).length;
    return Math.min(100, Math.round((below / (pdis.length - 1)) * 100));
}

export function calcAgeScore(arm, constants) {
    const c = constants || FALLBACK_CONST;
    const floor = parseFloat(c.arm_floor) || 0.80;
    const ceil = parseFloat(c.arm_ceiling) || 1.50;
    const range = ceil - floor;
    if (range <= 0) return 50;
    return Math.round(Math.max(0, Math.min(100, ((arm - floor) / range) * 100)));
}
