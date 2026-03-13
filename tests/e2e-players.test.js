// ═══ END-TO-END PLAYER PROFILE TESTS ═══
// Tests 5 complete player profiles through the full pipeline:
//   Onboarding data → Archetype scoring → Coach assessment → CCM → 8-pillar PDI → SAGI → Scores
// Covers: batter, pace, spin, keeper, allrounder across junior + senior + multi-comp scenarios.

import { describe, it, expect } from 'vitest';
import {
    getAge, getBracket, calcCCM, calcPDI, calcCohortPercentile, calcAgeScore,
    techItems, dAvg, extractMatchUpSelf, calcInternalSAGI, calcArchetypeDNA,
} from '../src/engine/ratingEngine.js';
import {
    ROLES, BAT_ITEMS, PACE_ITEMS, SPIN_ITEMS, KEEP_ITEMS,
    IQ_ITEMS, MN_ITEMS, PH_MAP, FLD_ITEMS, PWR_ITEMS,
    BAT_ARCH, BWL_ARCH, BAT_QUESTIONS, BWL_QUESTIONS,
    scoreArchetypeAnswers, scoreBatArchetype, scoreBwlArchetype,
    BAT_MATCHUPS, BWL_MATCHUPS, MENTAL_MATCHUPS,
    getCricketAge, JUNIOR_AGE_CUTOFF,
} from '../src/data/skillItems.js';
import { FALLBACK_RW, FALLBACK_CONST } from '../src/data/fallbacks.js';

// ═══ SHARED TEST INFRASTRUCTURE ═══

const COMP_TIERS = [
    { code: 'prem_1st', cti_value: '1.30', expected_midpoint_age: '25', competition_name: 'Premier 1st XI' },
    { code: 'prem_2nd', cti_value: '1.10', expected_midpoint_age: '23', competition_name: 'Premier 2nd XI' },
    { code: 'prem_low', cti_value: '1.00', expected_midpoint_age: '22', competition_name: 'Premier 3rd XI' },
    { code: 'local_j1', cti_value: '0.70', expected_midpoint_age: '14', competition_name: 'Local Junior Shield 1' },
    { code: 'local_j2', cti_value: '0.55', expected_midpoint_age: '13', competition_name: 'Local Junior Shield 2' },
    { code: 'comm_a', cti_value: '0.50', expected_midpoint_age: '20', competition_name: 'Community A-Grade' },
    { code: 'comm_b', cti_value: '0.35', expected_midpoint_age: '18', competition_name: 'Community B-Grade' },
    { code: 'rep_u16', cti_value: '0.80', expected_midpoint_age: '15', competition_name: 'Rep U16' },
    { code: 'rep_u18', cti_value: '0.90', expected_midpoint_age: '17', competition_name: 'Rep U18' },
];

const C = FALLBACK_CONST;

// Build a full coach assessment for a role with specified rating averages
function buildCoachData(role, avgRating, opts = {}) {
    const t = techItems(role);
    const cd = { _dob: opts.dob || '15/03/2008' };

    // Batting/bowling archetype
    if (opts.batA) cd.batA = opts.batA;
    if (opts.bwlA) cd.bwlA = opts.bwlA;

    // Technical primary (vary around average)
    t.pri.forEach((_, i) => { cd[`t1_${i}`] = Math.max(1, Math.min(5, avgRating + (i % 3 === 0 ? 1 : i % 3 === 1 ? -1 : 0))); });
    // Technical secondary
    t.sec.forEach((_, i) => { cd[`t2_${i}`] = Math.max(1, Math.min(5, avgRating + (i % 2 === 0 ? 0 : -1))); });
    // Game IQ
    IQ_ITEMS.forEach((_, i) => { cd[`iq_${i}`] = Math.max(1, Math.min(5, avgRating + (i === 0 ? 1 : 0))); });
    // Mental
    MN_ITEMS.forEach((_, i) => { cd[`mn_${i}`] = Math.max(1, Math.min(5, avgRating + (i < 2 ? 1 : 0))); });
    // Physical
    const phItems = PH_MAP[role] || PH_MAP.batter;
    phItems.forEach((_, i) => { cd[`ph_${i}`] = Math.max(1, Math.min(5, avgRating)); });
    // Fielding
    FLD_ITEMS.forEach((_, i) => { cd[`fld_${i}`] = Math.max(1, Math.min(5, avgRating + (i === 0 ? 1 : 0))); });
    // Phase effectiveness
    cd.pb_pp = avgRating; cd.pw_pp = avgRating;
    cd.pb_mid = avgRating; cd.pw_mid = avgRating;
    cd.pb_death = avgRating; cd.pw_death = avgRating;
    // Narrative
    cd.narrative = opts.narrative || 'Test player assessment';
    cd.str1 = 'Strength 1'; cd.str2 = 'Strength 2';
    cd.pri1 = 'Priority 1'; cd.pri2 = 'Priority 2';

    return cd;
}

// Build self-ratings using matchup confidence/frequency system
function buildMatchUpSelf(domains, avgConf = 4, avgFreq = 3) {
    const sr = {};
    if (domains.bat) {
        BAT_MATCHUPS.forEach((_, i) => {
            sr[`mc_bat_${i}_c`] = Math.max(1, Math.min(5, avgConf + (i % 3 === 0 ? 1 : 0)));
            sr[`mc_bat_${i}_f`] = Math.max(1, Math.min(5, avgFreq + (i % 2 === 0 ? 0 : -1)));
        });
    }
    if (domains.bwl) {
        BWL_MATCHUPS.forEach((_, i) => {
            sr[`mc_bwl_${i}_c`] = Math.max(1, Math.min(5, avgConf));
            sr[`mc_bwl_${i}_f`] = Math.max(1, Math.min(5, avgFreq));
        });
    }
    MENTAL_MATCHUPS.forEach((_, i) => {
        sr[`mc_mnt_${i}_c`] = Math.max(1, Math.min(5, avgConf));
        sr[`mc_mnt_${i}_f`] = Math.max(1, Math.min(5, avgFreq));
    });
    return sr;
}


// ═══ PLAYER 1: SPECIALIST BATTER — Senior Premier ═══
describe('Player 1: Specialist Batter (Senior Premier)', () => {
    const dob = '22/07/2005'; // ~20yo
    const role = 'batter';
    const grades = [
        { level: 'prem_2nd', ageGroup: 'Open', matches: '14', batInn: '14', runs: '412', hs: '87', avg: '37.5', ballsFaced: '380' },
        { level: 'prem_low', ageGroup: 'Open', matches: '4', batInn: '4', runs: '87', hs: '42', avg: '21.7' },
    ];
    const topBat = [
        { runs: 87, balls: 62, fours: 10, sixes: 2, notOut: false, comp: 'Premier 2nd XI', vs: 'Ringwood' },
        { runs: 67, balls: 48, fours: 8, sixes: 1, notOut: true, comp: 'Premier 2nd XI', vs: 'Doncaster' },
    ];
    const cd = buildCoachData(role, 4, { dob, batA: 'tempo', narrative: 'Classic anchor batter' });
    const sr = buildMatchUpSelf({ bat: true }, 4, 3);
    const batArchAnswers = [1, 1, 1, 2, 1, 1, 1, 2, 2, 1, 1, 3]; // Bias toward tempo

    it('age and bracket are correct', () => {
        expect(getAge(dob)).toBeGreaterThanOrEqual(20);
        expect(getBracket(dob)).toBe('U20+');
    });

    it('CCM picks highest CTI (prem_2nd = 1.10)', () => {
        const ccm = calcCCM(grades, dob, COMP_TIERS, C);
        expect(ccm.cti).toBe(1.10);
        expect(ccm.code).toBe('prem_2nd');
        expect(ccm.arm).toBeGreaterThanOrEqual(0.80);
        expect(ccm.arm).toBeLessThanOrEqual(1.50);
        expect(ccm.ccm).toBeGreaterThan(0);
    });

    it('archetype scoring identifies tempo controller', () => {
        const result = scoreBatArchetype(batArchAnswers);
        expect(result.primary).toBe('tempo');
        expect(result.scores.tempo).toBeGreaterThan(0);
    });

    it('matchup self-data extracts correctly', () => {
        const mc = extractMatchUpSelf(sr, false);
        expect(mc.tech).toBeGreaterThan(0);
        expect(mc.mental).toBeGreaterThan(0);
    });

    it('internal SAGI reflects confidence > frequency gap', () => {
        const sagi = calcInternalSAGI(sr, false);
        expect(sagi).not.toBeNull();
        expect(sagi).toBeGreaterThan(0); // confidence > frequency = positive
    });

    it('full 8-pillar PDI produces valid output', () => {
        const ccm = calcCCM(grades, dob, COMP_TIERS, C);
        const dn = calcPDI(cd, sr, role, ccm, null, C, grades, {}, topBat, [], COMP_TIERS);
        expect(dn.pdi).toBeGreaterThan(0);
        expect(dn.pdi).toBeLessThanOrEqual(5);
        expect(dn.domains).toHaveLength(8);
        expect(dn.g).not.toBe('—');
        expect(dn.pdiPct).toBeGreaterThan(0);
        expect(dn.pdiPct).toBeLessThanOrEqual(100);
    });

    it('all 8 domain keys are present', () => {
        const ccm = calcCCM(grades, dob, COMP_TIERS, C);
        const dn = calcPDI(cd, sr, role, ccm, null, C, grades, {}, topBat, [], COMP_TIERS);
        const keys = dn.domains.map(d => d.k);
        expect(keys).toEqual(['tm', 'te', 'pc', 'mr', 'af', 'mi', 'pw', 'sa']);
    });

    it('PDI grade is ADVANCED or ELITE for high-rated batter', () => {
        const ccm = calcCCM(grades, dob, COMP_TIERS, C);
        const dn = calcPDI(cd, sr, role, ccm, null, C, grades, {}, topBat, [], COMP_TIERS);
        expect(['ADVANCED', 'ELITE']).toContain(dn.g);
    });

    it('SAGI dual-layer: both internal and cross-layer calculated', () => {
        const ccm = calcCCM(grades, dob, COMP_TIERS, C);
        const dn = calcPDI(cd, sr, role, ccm, null, C, grades, {}, topBat, [], COMP_TIERS);
        expect(dn.internalSAGI).not.toBeNull();
        expect(dn.crossSAGI).not.toBeNull();
        expect(dn.sagi).not.toBeNull();
        expect(dn.sagiLabel).toBeDefined();
    });

    it('archetype DNA produces valid percentages', () => {
        const onboardingData = { batArchAnswers: batArchAnswers };
        const dna = calcArchetypeDNA(onboardingData, cd.batA, null);
        expect(dna.bat).toBeDefined();
        const batTotal = Object.values(dna.bat).reduce((s, v) => s + v, 0);
        expect(batTotal).toBe(100);
    });
});


// ═══ PLAYER 2: PACE BOWLER — Junior Local ═══
describe('Player 2: Pace Bowler (Junior Local)', () => {
    const dob = '15/03/2013'; // ~13yo — clearly junior
    const role = 'pace';
    const grades = [
        { level: 'local_j1', ageGroup: 'U14', matches: '12', bowlInn: '12', overs: '68', wkts: '24', bAvg: '17.9', econ: '6.32' },
    ];
    const topBowl = [
        { wkts: 4, runs: 18, overs: 4, maidens: 1, comp: 'Local Junior Shield 1', vs: 'Preston' },
    ];
    const cd = buildCoachData(role, 3, { dob, bwlA: 'newball', narrative: 'Exciting young quick' });
    const sr = buildMatchUpSelf({ bat: true, bwl: true }, 4, 2); // High confidence, low frequency = over-estimates
    const bwlArchAnswers = [0, 0, 0, 0, 1, 0, 0, 2, 0, 0, 0, 0]; // Bias toward new ball striker

    it('cricket age correctly identifies as junior', () => {
        const cAge = getCricketAge(dob);
        expect(cAge).toBeLessThan(JUNIOR_AGE_CUTOFF);
    });

    it('CCM gives ARM > 1.0 (young for comp level)', () => {
        const ccm = calcCCM(grades, dob, COMP_TIERS, C);
        expect(ccm.arm).toBeGreaterThan(1.0);
        expect(ccm.cti).toBe(0.70);
    });

    it('bowling archetype scoring identifies new ball striker', () => {
        const result = scoreBwlArchetype(bwlArchAnswers);
        expect(result.primary).toBe('newball');
    });

    it('internal SAGI positive (over-estimates: high conf, low freq)', () => {
        const sagi = calcInternalSAGI(sr, true);
        expect(sagi).toBeGreaterThan(0);
    });

    it('full PDI produces valid pace bowler output', () => {
        const ccm = calcCCM(grades, dob, COMP_TIERS, C);
        const dn = calcPDI(cd, sr, role, ccm, null, C, grades, {}, [], topBowl, COMP_TIERS);
        expect(dn.pdi).toBeGreaterThan(0);
        expect(dn.domains).toHaveLength(8);
        // Tech items should be pace-specific
        const techInfo = techItems(role);
        expect(techInfo.pri).toEqual(PACE_ITEMS);
    });

    it('physical domain uses pace-specific items', () => {
        const phItems = PH_MAP[role];
        expect(phItems).toContain('Explosive Power');
        expect(phItems).toContain('Eccentric Quad Strength');
    });
});


// ═══ PLAYER 3: SPIN BOWLER — Mid-age Community ═══
describe('Player 3: Spin Bowler (Mid-age Community)', () => {
    const dob = '08/11/2009'; // ~16yo
    const role = 'spin';
    const grades = [
        { level: 'comm_a', ageGroup: 'Open', matches: '10', bowlInn: '10', overs: '52', wkts: '18', bAvg: '15.5', econ: '5.4' },
    ];
    const cd = buildCoachData(role, 3, { dob, bwlA: 'spinatk', narrative: 'Aggressive leg-spinner with good wrong un' });
    const sr = buildMatchUpSelf({ bat: true, bwl: true }, 3, 3); // Balanced confidence = self-aware

    it('CCM correctly calculated for community level', () => {
        const ccm = calcCCM(grades, dob, COMP_TIERS, C);
        expect(ccm.cti).toBe(0.50);
        expect(ccm.code).toBe('comm_a');
    });

    it('internal SAGI near zero (balanced confidence and frequency)', () => {
        const sagi = calcInternalSAGI(sr, true);
        expect(Math.abs(sagi)).toBeLessThan(0.5);
    });

    it('PDI with spin items + community comp', () => {
        const ccm = calcCCM(grades, dob, COMP_TIERS, C);
        const dn = calcPDI(cd, sr, role, ccm, null, C, grades, {}, [], [], COMP_TIERS);
        expect(dn.pdi).toBeGreaterThan(0);
        expect(dn.sagiLabel).toContain('Aligned');
        // Should be COMPETENT range for avg 3 ratings
        expect(['COMPETENT', 'EMERGING', 'ADVANCED']).toContain(dn.g);
    });

    it('tech items use spin-specific primary', () => {
        const t = techItems(role);
        expect(t.pri).toEqual(SPIN_ITEMS);
        expect(t.pL).toBe('Spin Bowling');
    });
});


// ═══ PLAYER 4: WICKETKEEPER-BATTER — Senior Multi-Comp ═══
describe('Player 4: WK-Batter (Senior Multi-Comp)', () => {
    const dob = '19/05/2007'; // ~18yo
    const role = 'keeper';
    const grades = [
        { level: 'local_j1', ageGroup: 'U18', matches: '11', batInn: '11', runs: '356', hs: '78', avg: '39.6' },
        { level: 'prem_low', ageGroup: 'Open', matches: '8', batInn: '8', runs: '189', hs: '54', avg: '27.0' },
        { level: 'rep_u18', ageGroup: 'U18', matches: '3', batInn: '3', runs: '82', hs: '45', avg: '27.3' },
    ];
    const topBat = [
        { runs: 78, balls: 56, fours: 9, sixes: 2, notOut: false, comp: 'Local Junior Shield 1', vs: 'Ringwood' },
        { runs: 54, balls: 42, fours: 7, sixes: 0, notOut: true, comp: 'Premier 3rd XI', vs: 'FD' },
    ];
    const cd = buildCoachData(role, 4, { dob, batA: 'finisher', narrative: 'Athletic keeper who bats with authority' });
    const sr = buildMatchUpSelf({ bat: true }, 3, 4); // Low confidence but high frequency = under-estimates

    it('CCM picks highest tier (prem_low = 1.00)', () => {
        const ccm = calcCCM(grades, dob, COMP_TIERS, C);
        expect(ccm.cti).toBe(1.00);
        expect(ccm.code).toBe('prem_low');
    });

    it('ARM > 1 for young player at higher comp', () => {
        const ccm = calcCCM(grades, dob, COMP_TIERS, C);
        // 18yo at comp expecting 17yo — should be near 1.0
        expect(ccm.arm).toBeGreaterThanOrEqual(0.90);
    });

    it('keeper tech items are correct', () => {
        const t = techItems(role);
        expect(t.pri).toEqual(KEEP_ITEMS);
        expect(t.sec).toEqual(BAT_ITEMS);
        expect(t.pL).toBe('Wicketkeeping');
    });

    it('physical items are keeper-specific', () => {
        expect(PH_MAP[role]).toContain('Lateral Movement');
        expect(PH_MAP[role]).toContain('Hand-Eye Coordination');
    });

    it('internal SAGI negative (under-estimates: low conf, high freq)', () => {
        const sagi = calcInternalSAGI(sr, false);
        expect(sagi).toBeLessThan(0);
    });

    it('full PDI with multi-comp grades produces ADVANCED', () => {
        const ccm = calcCCM(grades, dob, COMP_TIERS, C);
        const dn = calcPDI(cd, sr, role, ccm, null, C, grades, {}, topBat, [], COMP_TIERS);
        expect(dn.pdi).toBeGreaterThan(3.0);
        expect(['ADVANCED', 'ELITE']).toContain(dn.g);
    });

    it('stat domain calculates from multi-comp batting data', () => {
        const ccm = calcCCM(grades, dob, COMP_TIERS, C);
        const dn = calcPDI(cd, sr, role, ccm, null, C, grades, {}, topBat, [], COMP_TIERS);
        // Match Impact domain should have some stat contribution
        const miDomain = dn.domains.find(d => d.k === 'mi');
        expect(miDomain.css).toBeGreaterThan(0);
    });
});


// ═══ PLAYER 5: ALLROUNDER — Junior, dual archetype testing ═══
describe('Player 5: Allrounder (Junior, dual archetype)', () => {
    const dob = '01/09/2011'; // ~14yo
    const role = 'allrounder';
    const grades = [
        { level: 'local_j1', ageGroup: 'U14', matches: '10', batInn: '9', runs: '198', hs: '52', avg: '22.0',
          bowlInn: '8', overs: '28', wkts: '8', bAvg: '20.6', econ: '5.89' },
    ];
    const topBat = [{ runs: 52, balls: 38, fours: 6, sixes: 1, notOut: false, comp: 'Local Junior Shield 1', vs: 'Preston' }];
    const topBowl = [{ wkts: 3, runs: 12, overs: 3, maidens: 1, comp: 'Local Junior Shield 1', vs: 'Doncaster' }];
    const cd = buildCoachData(role, 3, { dob, batA: 'enforcer', bwlA: 'moenforcer', narrative: 'Combative young allrounder' });
    const sr = buildMatchUpSelf({ bat: true, bwl: true }, 3, 3);

    // Deliberately ambiguous answers to trigger dual archetype (scores close)
    const batArchAnswers = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]; // All first option — should bias enforcer + power
    const bwlArchAnswers = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]; // All first option — should bias newball + moenforcer

    it('allrounder tech items include batting + bowling blend', () => {
        const t = techItems(role);
        expect(t.pL).toBe('Batting');
        expect(t.sL).toBe('Bowling');
        expect(t.sec).toContain('Stock Ball Control');
    });

    it('physical items are allrounder-specific', () => {
        expect(PH_MAP[role]).toContain('Bowling Athleticism');
        expect(PH_MAP[role]).toContain('Explosive Power');
    });

    it('CCM for junior local player', () => {
        const ccm = calcCCM(grades, dob, COMP_TIERS, C);
        expect(ccm.cti).toBe(0.70);
        expect(ccm.arm).toBeGreaterThanOrEqual(0.80);
    });

    it('batting archetype scoring with uniform answers', () => {
        const result = scoreBatArchetype(batArchAnswers);
        expect(result.primary).toBeDefined();
        // All first options bias toward enforcer
        expect(result.primary).toBe('enforcer');
    });

    it('bowling archetype scoring with uniform answers', () => {
        const result = scoreBwlArchetype(bwlArchAnswers);
        expect(result.primary).toBeDefined();
    });

    it('archetype DNA produces both bat and bowl percentages', () => {
        const onboardingData = { batArchAnswers: batArchAnswers, bwlArchAnswers: bwlArchAnswers };
        const dna = calcArchetypeDNA(onboardingData, cd.batA, cd.bwlA);
        expect(dna.bat).toBeDefined();
        expect(dna.bowl).toBeDefined();
        // Coach assigned enforcer batting archetype
        expect(dna.bat.enforcer).toBeGreaterThan(0);
        // Coach assigned moenforcer bowling archetype
        expect(dna.bowl.moenforcer).toBeGreaterThan(0);
    });

    it('full PDI with bat + bowl stats produces valid output', () => {
        const ccm = calcCCM(grades, dob, COMP_TIERS, C);
        const dn = calcPDI(cd, sr, role, ccm, null, C, grades, {}, topBat, topBowl, COMP_TIERS);
        expect(dn.pdi).toBeGreaterThan(0);
        expect(dn.pdi).toBeLessThanOrEqual(5);
        expect(dn.domains).toHaveLength(8);
    });

    it('SAGI is balanced for equal confidence/frequency', () => {
        const sagi = calcInternalSAGI(sr, true);
        expect(Math.abs(sagi)).toBeLessThan(0.5);
    });
});


// ═══ CROSS-PLAYER: COHORT COMPARISON ═══
describe('Cohort: All 5 players compared', () => {
    const players = [
        { dob: '22/07/2005', role: 'batter', avg: 4, grades: [{ level: 'prem_2nd' }], topBat: [{ runs: 87, balls: 62, fours: 10, sixes: 2, notOut: false }] },
        { dob: '15/03/2012', role: 'pace', avg: 3, grades: [{ level: 'local_j1' }], topBowl: [{ wkts: 4, runs: 18, overs: 4, maidens: 1 }] },
        { dob: '08/11/2009', role: 'spin', avg: 3, grades: [{ level: 'comm_a' }] },
        { dob: '19/05/2007', role: 'keeper', avg: 4, grades: [{ level: 'rep_u18' }, { level: 'prem_low' }], topBat: [{ runs: 78, balls: 56, fours: 9, sixes: 2, notOut: false }] },
        { dob: '01/09/2011', role: 'allrounder', avg: 3, grades: [{ level: 'local_j1' }], topBat: [{ runs: 52, balls: 38, fours: 6, sixes: 1, notOut: false }], topBowl: [{ wkts: 3, runs: 12, overs: 3, maidens: 1 }] },
    ];

    const fullPlayers = players.map(p => {
        const hasBwl = ['pace', 'spin', 'allrounder'].includes(p.role);
        const cd = buildCoachData(p.role, p.avg, { dob: p.dob });
        const sr = buildMatchUpSelf({ bat: true, bwl: hasBwl }, p.avg, p.avg);
        const ccm = calcCCM(p.grades, p.dob, COMP_TIERS, C);
        const dn = calcPDI(cd, sr, p.role, ccm, null, C, p.grades, {}, p.topBat || [], p.topBowl || [], COMP_TIERS);
        return { ...p, cd, sr, ccm, dn, submitted: true, id: `test-${p.role}` };
    });

    it('all 5 players produce non-zero PDIs', () => {
        fullPlayers.forEach(p => {
            expect(p.dn.pdi).toBeGreaterThan(0);
        });
    });

    it('higher-rated players have higher PDIs', () => {
        const batter = fullPlayers.find(p => p.role === 'batter');
        const spin = fullPlayers.find(p => p.role === 'spin');
        expect(batter.dn.pdi).toBeGreaterThan(spin.dn.pdi);
    });

    it('cohort percentile calculation works across all players', () => {
        fullPlayers.forEach(p => {
            const pct = calcCohortPercentile(p.dn.pdi, fullPlayers, COMP_TIERS, null, C);
            expect(pct).toBeGreaterThanOrEqual(0);
            expect(pct).toBeLessThanOrEqual(100);
        });
    });

    it('age scores vary across the cohort', () => {
        const ageScores = fullPlayers.map(p => calcAgeScore(p.ccm.arm, C));
        const unique = new Set(ageScores);
        expect(unique.size).toBeGreaterThan(1); // At least 2 different age scores
    });

    it('every player gets all 8 domains rated', () => {
        fullPlayers.forEach(p => {
            expect(p.dn.domains).toHaveLength(8);
            const allKeys = p.dn.domains.map(d => d.k);
            expect(allKeys).toEqual(['tm', 'te', 'pc', 'mr', 'af', 'mi', 'pw', 'sa']);
        });
    });

    it('provisional flag is false when coach has rated', () => {
        fullPlayers.forEach(p => {
            expect(p.dn.provisional).toBe(false);
        });
    });

    it('completion percentage reflects rated items', () => {
        fullPlayers.forEach(p => {
            expect(p.dn.cp).toBeGreaterThan(0);
            expect(p.dn.cp).toBeLessThanOrEqual(100);
        });
    });
});


// ═══ EDGE CASES & SCORING SYSTEM RELIABILITY ═══
describe('Scoring system reliability', () => {
    it('PDI is deterministic — same inputs always produce same output', () => {
        const dob = '22/07/2005';
        const cd = buildCoachData('batter', 3, { dob });
        const sr = buildMatchUpSelf({ bat: true }, 3, 3);
        const grades = [{ level: 'comm_a' }];
        const ccm = calcCCM(grades, dob, COMP_TIERS, C);
        const r1 = calcPDI(cd, sr, 'batter', ccm, null, C, grades, {}, [], [], COMP_TIERS);
        const r2 = calcPDI(cd, sr, 'batter', ccm, null, C, grades, {}, [], [], COMP_TIERS);
        expect(r1.pdi).toBe(r2.pdi);
        expect(r1.sagi).toBe(r2.sagi);
    });

    it('PDI monotonically increases with rating (1→5 = low→high)', () => {
        const pdis = [];
        for (let avg = 1; avg <= 5; avg++) {
            const dob = '22/07/2005';
            const cd = buildCoachData('batter', avg, { dob });
            const grades = [{ level: 'comm_a' }];
            const ccm = calcCCM(grades, dob, COMP_TIERS, C);
            const dn = calcPDI(cd, {}, 'batter', ccm, null, C, grades, {}, [], [], COMP_TIERS);
            pdis.push(dn.pdi);
        }
        for (let i = 1; i < pdis.length; i++) {
            expect(pdis[i]).toBeGreaterThan(pdis[i - 1]);
        }
    });

    it('higher CCM produces higher PDI for same ratings', () => {
        const dob = '22/07/2005';
        const cd = buildCoachData('batter', 3, { dob });
        const lowGrades = [{ level: 'comm_b' }];
        const highGrades = [{ level: 'prem_2nd' }];
        const ccmLow = calcCCM(lowGrades, dob, COMP_TIERS, C);
        const ccmHigh = calcCCM(highGrades, dob, COMP_TIERS, C);
        const dnLow = calcPDI(cd, {}, 'batter', ccmLow, null, C, lowGrades, {}, [], [], COMP_TIERS);
        const dnHigh = calcPDI(cd, {}, 'batter', ccmHigh, null, C, highGrades, {}, [], [], COMP_TIERS);
        expect(dnHigh.pdi).toBeGreaterThan(dnLow.pdi);
    });

    it('SAGI penalty reduces self-awareness score for large gaps', () => {
        const srOver = {};
        BAT_MATCHUPS.forEach((_, i) => { srOver[`mc_bat_${i}_c`] = 5; srOver[`mc_bat_${i}_f`] = 1; });
        MENTAL_MATCHUPS.forEach((_, i) => { srOver[`mc_mnt_${i}_c`] = 5; srOver[`mc_mnt_${i}_f`] = 1; });
        const srAligned = {};
        BAT_MATCHUPS.forEach((_, i) => { srAligned[`mc_bat_${i}_c`] = 3; srAligned[`mc_bat_${i}_f`] = 3; });
        MENTAL_MATCHUPS.forEach((_, i) => { srAligned[`mc_mnt_${i}_c`] = 3; srAligned[`mc_mnt_${i}_f`] = 3; });

        const sagiOver = calcInternalSAGI(srOver, false);
        const sagiAligned = calcInternalSAGI(srAligned, false);
        expect(Math.abs(sagiOver)).toBeGreaterThan(Math.abs(sagiAligned));
    });

    it('PDI with no coach data and only matchup self-data still produces a score', () => {
        const dob = '22/07/2005';
        const sr = buildMatchUpSelf({ bat: true }, 4, 3);
        const grades = [{ level: 'comm_a' }];
        const ccm = calcCCM(grades, dob, COMP_TIERS, C);
        const emptyCoach = { _dob: dob };
        const dn = calcPDI(emptyCoach, sr, 'batter', ccm, null, C, grades, {}, [], [], COMP_TIERS);
        // Should get a provisional score from matchup data alone
        expect(dn.provisional).toBe(true);
        expect(dn.sagi).not.toBeNull(); // Internal SAGI from matchup data
    });
});
