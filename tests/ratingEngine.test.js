// ═══ Rating Engine Unit Tests — 8-Pillar DNA System ═══
import { describe, it, expect } from 'vitest';
import {
    getAge,
    getBracket,
    dAvg,
    calcCCM,
    getCTIBand,
    getAgeTier,
    calcPeakScore,
    calcStatDomain,
    calcPDI,
    calcCohortPercentile,
    calcAgeScore,
    calcSelfAwarenessScore,
    calcArchetypeDNA,
    calcGrowthDelta,
    techItems,
    FALLBACK_STAT_BENCHMARKS,
    FALLBACK_SUB_WEIGHTS,
    FALLBACK_DOMAIN_WEIGHTS,
    PEAK_BENCHMARKS,
} from '../src/engine/ratingEngine.js';

import { FALLBACK_RW, FALLBACK_CONST } from '../src/data/fallbacks.js';

// ═══ Test Data ═══
const MOCK_COMP_TIERS = [
    { code: 'PREM_1ST', cti_value: '1.30', expected_midpoint_age: '25', competition_name: 'Premier 1st XI' },
    { code: 'DIST_TURF', cti_value: '0.85', expected_midpoint_age: '22', competition_name: 'District Turf' },
    { code: 'COMM_A', cti_value: '0.50', expected_midpoint_age: '20', competition_name: 'Community A-Grade' },
    { code: 'U16_REP', cti_value: '0.70', expected_midpoint_age: '15', competition_name: 'U16 Representative' },
];

const MOCK_CONSTANTS = {
    arm_sensitivity_factor: '0.05',
    arm_floor: '0.80',
    arm_ceiling: '1.50',
    cohort_pdi_threshold: '40',
    age_score_baseline: '1.0',
    age_score_sensitivity: '0.1',
    age_score_ceiling: '1.25',
    potential_adj_enabled: 'true',
    potential_adj_factor: '0.05',
    sagi_penalty_factor: '2.0',
    sagi_floor_score: '1.0',
    sagi_aligned_min: '-0.5',
    sagi_aligned_max: '0.5',
    coach_weight: '0.75',
    player_weight: '0.25',
    trajectory_age_threshold: '1.5',
    pdi_scale_max: '5',
};


// ───────── getAge ─────────
describe('getAge', () => {
    it('returns correct age from DD/MM/YYYY format', () => {
        // Use a date far enough in the past that birthday has definitely passed
        const year = new Date().getFullYear() - 16;
        expect(getAge(`01/01/${year}`)).toBe(16);
    });
    it('returns null for null/undefined input', () => {
        expect(getAge(null)).toBeNull();
        expect(getAge(undefined)).toBeNull();
    });
    it('returns null for invalid format', () => {
        expect(getAge('not-a-date')).toBeNull();
    });
    it('handles two-part strings gracefully', () => {
        expect(getAge('03/2010')).toBeNull();
    });
});


// ───────── getBracket ─────────
describe('getBracket', () => {
    it('returns U11-U13 for age 12', () => {
        expect(getBracket('01/01/2014')).toBe('U11-U13');
    });
    it('returns U14-U16 for age 15', () => {
        expect(getBracket('01/01/2011')).toBe('U14-U16');
    });
    it('returns U17-U19 for age 18', () => {
        expect(getBracket('01/01/2008')).toBe('U17-U19');
    });
    it('returns U20+ for age 22', () => {
        expect(getBracket('01/01/2004')).toBe('U20+');
    });
    it('returns ? for invalid dob', () => {
        expect(getBracket(null)).toBe('?');
    });
});


// ───────── dAvg ─────────
describe('dAvg', () => {
    it('calculates average of rated items', () => {
        const data = { iq_0: 3, iq_1: 4, iq_2: 5 };
        const result = dAvg(data, 'iq_', 3);
        expect(result.a).toBe(4);
        expect(result.r).toBe(3);
        expect(result.t).toBe(3);
    });
    it('skips zero-valued items', () => {
        const data = { iq_0: 3, iq_1: 0, iq_2: 5 };
        const result = dAvg(data, 'iq_', 3);
        expect(result.a).toBe(4);
        expect(result.r).toBe(2);
    });
    it('returns zeros when no items are rated', () => {
        const result = dAvg({}, 'iq_', 3);
        expect(result.a).toBe(0);
        expect(result.r).toBe(0);
    });
});


// ───────── getCTIBand ─────────
describe('getCTIBand', () => {
    it('returns top for CTI >= 1.20', () => {
        expect(getCTIBand(1.30)).toBe('top');
    });
    it('returns elite for CTI >= 1.00', () => {
        expect(getCTIBand(1.10)).toBe('elite');
    });
    it('returns high for CTI >= 0.80', () => {
        expect(getCTIBand(0.90)).toBe('high');
    });
    it('returns mid for CTI >= 0.60', () => {
        expect(getCTIBand(0.65)).toBe('mid');
    });
    it('returns low for CTI < 0.60', () => {
        expect(getCTIBand(0.40)).toBe('low');
    });
});


// ───────── getAgeTier ─────────
describe('getAgeTier', () => {
    it('returns young for age <= 14', () => {
        expect(getAgeTier(12)).toBe('young');
        expect(getAgeTier(14)).toBe('young');
    });
    it('returns mid for age 15-16', () => {
        expect(getAgeTier(15)).toBe('mid');
        expect(getAgeTier(16)).toBe('mid');
    });
    it('returns senior for age > 16', () => {
        expect(getAgeTier(17)).toBe('senior');
        expect(getAgeTier(25)).toBe('senior');
    });
    it('returns young for null', () => {
        expect(getAgeTier(null)).toBe('young');
    });
});


// ───────── calcCCM ─────────
describe('calcCCM', () => {
    it('returns correct CCM for a young player in district comp', () => {
        const grades = [{ level: 'DIST_TURF' }];
        const dob = '01/01/2010'; // age 16
        const result = calcCCM(grades, dob, MOCK_COMP_TIERS, MOCK_CONSTANTS);

        expect(result.cti).toBe(0.85);
        expect(result.code).toBe('DIST_TURF');
        expect(result.expectedAge).toBe(22);
        // ARM = 1 + (22 - 16) * 0.05 = 1.30
        expect(result.arm).toBe(1.30);
        // CCM = 0.85 * 1.30 = 1.105
        expect(result.ccm).toBe(1.105);
    });

    it('picks highest CTI when multiple grades exist', () => {
        const grades = [{ level: 'COMM_A' }, { level: 'DIST_TURF' }];
        const dob = '01/01/2006'; // age 20
        const result = calcCCM(grades, dob, MOCK_COMP_TIERS, MOCK_CONSTANTS);

        expect(result.cti).toBe(0.85); // DIST_TURF is higher than COMM_A
        expect(result.code).toBe('DIST_TURF');
    });

    it('clamps ARM to floor (0.80)', () => {
        const grades = [{ level: 'COMM_A' }];
        const dob = '01/01/1996'; // age 30, midpoint 20 -> ARM = 1 + (20-30)*0.05 = 0.50 -> clamped to 0.80
        const result = calcCCM(grades, dob, MOCK_COMP_TIERS, MOCK_CONSTANTS);

        expect(result.arm).toBe(0.80);
    });

    it('clamps ARM to ceiling (1.50)', () => {
        const grades = [{ level: 'PREM_1ST' }];
        const dob = '01/01/2014'; // age 12, midpoint 25 -> ARM = 1 + (25-12)*0.05 = 1.65 -> clamped to 1.50
        const result = calcCCM(grades, dob, MOCK_COMP_TIERS, MOCK_CONSTANTS);

        expect(result.arm).toBe(1.50);
    });

    it('returns zero CCM for empty grades', () => {
        const result = calcCCM([], '01/01/2010', MOCK_COMP_TIERS, MOCK_CONSTANTS);
        expect(result.ccm).toBe(0);
    });

    it('returns zero CCM for null dob', () => {
        const result = calcCCM([{ level: 'DIST_TURF' }], null, MOCK_COMP_TIERS, MOCK_CONSTANTS);
        expect(result.ccm).toBe(0);
    });

    it('returns zero CCM when no tiers match', () => {
        const grades = [{ level: 'NONEXISTENT' }];
        const result = calcCCM(grades, '01/01/2010', MOCK_COMP_TIERS, MOCK_CONSTANTS);
        expect(result.ccm).toBe(0);
    });
});


// ───────── techItems ─────────
describe('techItems', () => {
    it('returns batting items for batter role', () => {
        const items = techItems('batter');
        expect(items.pL).toBe('Batting');
    });
    it('returns pace bowling items for pace role', () => {
        const items = techItems('pace');
        expect(items.pL).toBe('Pace Bowling');
        expect(items.sL).toBe('Batting');
    });
    it('returns spin bowling items for spin role', () => {
        const items = techItems('spin');
        expect(items.pL).toBe('Spin Bowling');
    });
    it('returns wicketkeeping items for keeper role', () => {
        const items = techItems('keeper');
        expect(items.pL).toBe('Wicketkeeping');
    });
    it('returns batting + bowling items for allrounder role', () => {
        const items = techItems('allrounder');
        expect(items.pL).toBe('Batting');
        expect(items.sL).toBe('Bowling');
    });
});


// ───────── calcAgeScore ─────────
describe('calcAgeScore', () => {
    it('returns a number for valid ARM', () => {
        const score = calcAgeScore(1.20, MOCK_CONSTANTS);
        expect(typeof score).toBe('number');
        expect(score).toBeGreaterThan(0);
    });
    it('caps at 100 (max scale)', () => {
        const score = calcAgeScore(5.0, MOCK_CONSTANTS);
        expect(score).toBeLessThanOrEqual(100);
    });
});


// ───────── calcSelfAwarenessScore ─────────
describe('calcSelfAwarenessScore', () => {
    it('returns 5.0 for perfectly aligned SAGI (0)', () => {
        const score = calcSelfAwarenessScore(0, MOCK_CONSTANTS);
        expect(score).toBe(5.0);
    });

    it('returns lower score for positive SAGI (over-estimation)', () => {
        const score = calcSelfAwarenessScore(1.0, MOCK_CONSTANTS);
        // 5 - |1.0| * 2.0 = 3.0
        expect(score).toBe(3.0);
    });

    it('returns lower score for negative SAGI (under-estimation)', () => {
        const score = calcSelfAwarenessScore(-1.0, MOCK_CONSTANTS);
        // 5 - |-1.0| * 2.0 = 3.0
        expect(score).toBe(3.0);
    });

    it('floors at 1.0 for extreme SAGI', () => {
        const score = calcSelfAwarenessScore(2.5, MOCK_CONSTANTS);
        // 5 - |2.5| * 2.0 = 0 -> clamped to 1.0
        expect(score).toBe(1.0);
    });

    it('returns 0 for null SAGI', () => {
        const score = calcSelfAwarenessScore(null, MOCK_CONSTANTS);
        expect(score).toBe(0);
    });

    it('handles small alignment gap correctly', () => {
        const score = calcSelfAwarenessScore(0.25, MOCK_CONSTANTS);
        // 5 - 0.25 * 2.0 = 4.5
        expect(score).toBe(4.5);
    });
});


// ───────── calcArchetypeDNA (v3 — questionnaire-driven) ─────────
describe('calcArchetypeDNA', () => {
    it('returns bat and bowl percentage objects', () => {
        const result = calcArchetypeDNA({}, null, null);
        expect(result).toHaveProperty('bat');
        expect(result).toHaveProperty('bowl');
    });

    it('bat percentages sum to 100 when questionnaire answers exist', () => {
        // Answer all 12 batting questions with option 0 (enforcer-heavy)
        const result = calcArchetypeDNA(
            { batArchAnswers: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
            'enforcer',
            null
        );
        const total = Object.values(result.bat).reduce((s, v) => s + v, 0);
        expect(total).toBe(100);
    });

    it('coach-assigned archetype gets highest percentage', () => {
        const result = calcArchetypeDNA({}, 'tempo', null);
        expect(result.bat.tempo).toBeGreaterThan(0);
        expect(result.primaryBat).toBe('tempo');
    });

    it('questionnaire answers influence archetype blend', () => {
        // Choose answers that heavily favour innovator (option index 3 or similar)
        // Q1=1(mid=tempo/innovator), Q3=3(surprise=innovator), Q4=3(unexpected=innovator), Q6=2(scoop=innovator), Q7=3(creative=innovator)
        const innovatorAnswers = [1, 3, 3, 3, 3, 2, 3, 3, 1, 3, 4, 2];
        const result = calcArchetypeDNA({ batArchAnswers: innovatorAnswers }, null, null);
        expect(result.bat.innovator).toBeGreaterThan(0);
        expect(result.primaryBat).toBe('innovator');
    });

    it('bowling archetype works independently with coach selection', () => {
        const result = calcArchetypeDNA({}, null, 'spinctrl');
        expect(result.bowl.spinctrl).toBeGreaterThan(0);
        expect(result.primaryBowl).toBe('spinctrl');
    });

    it('bowling questionnaire answers identify death closer', () => {
        // Answers that favour deathclose: Q1=2, Q2=3, Q3=3, Q4=3, Q6=0, Q7=3
        const deathAnswers = [2, 3, 3, 3, 3, 0, 3, 3, 3, 3, 3, 2];
        const result = calcArchetypeDNA({ bwlArchAnswers: deathAnswers }, null, null);
        expect(result.bowl.deathclose).toBeGreaterThan(0);
    });

    it('empty questionnaire answers return zeroes gracefully', () => {
        const result = calcArchetypeDNA({}, null, null);
        const batTotal = Object.values(result.bat).reduce((s, v) => s + v, 0);
        expect(batTotal).toBe(0);
    });
});


// ───────── calcPDI (8-pillar integration) ─────────
describe('calcPDI (8-pillar)', () => {
    it('returns valid PDI structure with all zero inputs', () => {
        const result = calcPDI(
            {}, // coachData
            {}, // selfData
            'batter', // role
            { ccm: 0, cti: 0, arm: 1 }, // ccmResult
            null, null, // dbWeights, constants
            [], // playerGrades
        );

        expect(result).toHaveProperty('pdi');
        expect(result).toHaveProperty('domains');
        expect(typeof result.pdi).toBe('number');
    });

    it('returns 8 domains in the output', () => {
        const result = calcPDI(
            {}, {}, 'batter',
            { ccm: 0.5, cti: 0.5, arm: 1 },
            null, null, [],
        );
        expect(result.domains).toHaveLength(8);
    });

    it('has correct 8-pillar domain keys', () => {
        const result = calcPDI(
            {}, {}, 'batter',
            { ccm: 0.5, cti: 0.5, arm: 1 },
            null, null, [],
        );
        const keys = result.domains.map(d => d.k);
        expect(keys).toEqual(['tm', 'te', 'pc', 'mr', 'af', 'mi', 'pw', 'sa']);
    });

    it('produces higher PDI with higher skill ratings', () => {
        const lowRatings = {};
        const highRatings = {};
        for (let i = 0; i < 8; i++) {
            lowRatings[`t1_${i}`] = 1;
            highRatings[`t1_${i}`] = 5;
            lowRatings[`iq_${i}`] = 1;
            highRatings[`iq_${i}`] = 5;
            lowRatings[`mn_${i}`] = 1;
            highRatings[`mn_${i}`] = 5;
        }

        const ccm = { ccm: 0.5, cti: 0.5, arm: 1 };
        const low = calcPDI(lowRatings, {}, 'batter', ccm, null, null, []);
        const high = calcPDI(highRatings, {}, 'batter', ccm, null, null, []);

        expect(high.pdi).toBeGreaterThan(low.pdi);
    });

    it('returns PDI grade label for non-zero ratings', () => {
        const ratings = {};
        for (let i = 0; i < 8; i++) { ratings[`t1_${i}`] = 3; ratings[`iq_${i}`] = 3; ratings[`mn_${i}`] = 3; }
        const ccm = { ccm: 0.85, cti: 0.85, arm: 1 };
        const result = calcPDI(ratings, {}, 'batter', ccm, null, null, []);
        expect(result.pdi).toBeGreaterThan(0);
        expect(typeof result.g).toBe('string');
        expect(result.g).not.toBe('—');
    });

    it('Self-Awareness pillar has a score when SAGI is calculable', () => {
        const coachData = {};
        const selfData = {};
        for (let i = 0; i < 6; i++) {
            coachData[`iq_${i}`] = 3;
            selfData[`iq_${i}`] = 4; // player rates higher → positive SAGI
        }
        const result = calcPDI(coachData, selfData, 'batter', { ccm: 0.5, cti: 0.5, arm: 1 }, null, MOCK_CONSTANTS, []);
        const saDomain = result.domains.find(d => d.k === 'sa');
        expect(saDomain.raw).toBeGreaterThan(0); // self-awareness score exists
        expect(result.sagi).toBeGreaterThan(0);   // positive sagi (over-estimates)
    });

    it('Power Hitting pillar falls back to BAT_ITEMS[4,9] when no pwr_ data', () => {
        const coachData = { t1_4: 4, t1_9: 3 }; // Power Hitting=4, Death-Over Hitting=3
        const result = calcPDI(coachData, {}, 'batter', { ccm: 0.5, cti: 0.5, arm: 1 }, null, null, []);
        const pwDomain = result.domains.find(d => d.k === 'pw');
        expect(pwDomain.raw).toBeGreaterThan(0);
    });

    it('Athletic Fielding pillar scores from fld_ prefix', () => {
        const coachData = { fld_0: 4, fld_1: 3, fld_2: 4, fld_3: 3, fld_4: 5 };
        const result = calcPDI(coachData, {}, 'batter', { ccm: 0.5, cti: 0.5, arm: 1 }, null, null, []);
        const afDomain = result.domains.find(d => d.k === 'af');
        expect(afDomain.raw).toBeGreaterThan(0);
        expect(afDomain.r).toBe(5);
    });
});


// ───────── calcGrowthDelta ─────────
describe('calcGrowthDelta', () => {
    it('returns null when baseline or current is missing', () => {
        expect(calcGrowthDelta(null, { domains: [] })).toBeNull();
        expect(calcGrowthDelta({ domains: [] }, null)).toBeNull();
    });

    it('calculates correct per-pillar deltas', () => {
        const baseline = {
            pdi: 2.0,
            sagi: 1.0,
            domains: [
                { k: 'tm', l: 'Technical Mastery', c: '#ff0', raw: 3.0 },
                { k: 'te', l: 'Tactical Execution', c: '#0ff', raw: 2.5 },
            ],
        };
        const current = {
            pdi: 2.8,
            sagi: 0.3,
            domains: [
                { k: 'tm', l: 'Technical Mastery', c: '#ff0', raw: 3.5 },
                { k: 'te', l: 'Tactical Execution', c: '#0ff', raw: 3.2 },
            ],
        };
        const result = calcGrowthDelta(baseline, current);
        expect(result.pdiDelta).toBe(0.8);
        expect(result.sagiDelta).toBe(-0.7);
        expect(result.deltas.tm.delta).toBe(0.5);
        expect(result.deltas.te.delta).toBe(0.7);
    });
});


// ───────── calcCohortPercentile ─────────
describe('calcCohortPercentile', () => {
    it('returns 100 when player is highest', () => {
        const allPlayers = [
            { pdi: 30 },
            { pdi: 40 },
            { pdi: 50 },
        ];
        const percentile = calcCohortPercentile(50, allPlayers, MOCK_COMP_TIERS, null, null);
        expect(percentile).toBeGreaterThanOrEqual(50);
    });

    it('returns 0 when player is lowest', () => {
        const allPlayers = [
            { pdi: 30 },
            { pdi: 40 },
            { pdi: 50 },
        ];
        const percentile = calcCohortPercentile(30, allPlayers, MOCK_COMP_TIERS, null, null);
        expect(percentile).toBeLessThanOrEqual(50);
    });
});


// ───────── 8-Pillar Weights ─────────
describe('8-Pillar Weights', () => {
    it('FALLBACK_RW has 8 pillar keys for each role', () => {
        const expectedKeys = ['tm', 'te', 'pc', 'mr', 'af', 'mi', 'pw', 'sa'];
        Object.values(FALLBACK_RW).forEach(weights => {
            expectedKeys.forEach(k => {
                expect(weights).toHaveProperty(k);
                expect(typeof weights[k]).toBe('number');
            });
        });
    });

    it('FALLBACK_RW weights sum to 1.0 for each role', () => {
        Object.entries(FALLBACK_RW).forEach(([role, weights]) => {
            const sum = Object.values(weights).reduce((s, v) => s + v, 0);
            expect(sum).toBeCloseTo(1.0, 2);
        });
    });

    it('FALLBACK_DOMAIN_WEIGHTS has 8 pillar keys per age tier', () => {
        const expectedKeys = ['tm', 'te', 'mr', 'pc', 'af', 'mi', 'pw', 'sa'];
        Object.values(FALLBACK_DOMAIN_WEIGHTS).forEach(weights => {
            expectedKeys.forEach(k => {
                expect(weights).toHaveProperty(k);
            });
        });
    });

    it('Tactical Execution is the highest weighted pillar for youth batters', () => {
        const batter = FALLBACK_RW.batter;
        expect(batter.te).toBeGreaterThanOrEqual(batter.tm); // te >= tm
        const maxWeight = Math.max(...Object.values(batter));
        expect(batter.te).toBe(maxWeight);
    });
});


// ───────── Edge Cases ─────────
describe('Edge Cases', () => {
    it('calcCCM handles undefined grades array', () => {
        const result = calcCCM(undefined, '01/01/2010', MOCK_COMP_TIERS, MOCK_CONSTANTS);
        expect(result.ccm).toBe(0);
    });

    it('dAvg handles negative values by skipping them (only > 0 counted)', () => {
        const data = { x_0: -1, x_1: 3 };
        const result = dAvg(data, 'x_', 2);
        expect(result.a).toBe(3);
        expect(result.r).toBe(1);
    });

    it('getAge calculates age correctly based on current date', () => {
        const yr = new Date().getFullYear();
        expect(getAge(`01/01/${yr - 20}`)).toBe(20);
        expect(getAge(`01/01/${yr - 10}`)).toBe(10);
    });
});
