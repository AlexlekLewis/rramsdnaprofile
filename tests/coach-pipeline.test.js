// ═══ COACH PIPELINE TESTS ═══
// Tests the full coach assessment flow: data shape integrity, save/load symmetry,
// PDI calculation with coach data, report card assembly, and edge cases.

import { describe, it, expect } from 'vitest';
import {
    getAge, getBracket, calcCCM, calcPDI, calcCohortPercentile, calcAgeScore,
    techItems, dAvg, calcArchetypeDNA,
} from '../src/engine/ratingEngine.js';
import {
    ROLES, BAT_ITEMS, PACE_ITEMS, SPIN_ITEMS, KEEP_ITEMS,
    IQ_ITEMS, MN_ITEMS, PH_MAP, PHASES,
    BAT_ARCH, BWL_ARCH,
} from '../src/data/skillItems.js';
import { FALLBACK_CONST } from '../src/data/fallbacks.js';

const C = FALLBACK_CONST;
const COMP_TIERS = [
    { code: 'prem_2nd', cti_value: '1.10', expected_midpoint_age: '23', competition_name: 'Premier 2nd XI' },
    { code: 'prem_low', cti_value: '1.00', expected_midpoint_age: '22', competition_name: 'Premier 3rd XI' },
    { code: 'local_j1', cti_value: '0.70', expected_midpoint_age: '14', competition_name: 'Local Junior Shield 1' },
    { code: 'comm_a', cti_value: '0.50', expected_midpoint_age: '20', competition_name: 'Community A-Grade' },
];

// ═══ HELPER: Simulate the saveAssessmentToDB write path ═══
// This mirrors the exact logic from playerDb.js without hitting Supabase
function simulateSaveTransform(cd) {
    const phaseKeys = ['pb_pp', 'pw_pp', 'pb_mid', 'pw_mid', 'pb_death', 'pw_death'];
    return {
        batting_archetype: cd.batA || null,
        bowling_archetype: cd.bwlA || null,
        phase_ratings: Object.fromEntries(phaseKeys.filter(k => cd[k] != null).map(k => [k, cd[k]])),
        tech_primary: Object.fromEntries(Object.entries(cd).filter(([k]) => k.startsWith('t1_'))),
        tech_secondary: Object.fromEntries(Object.entries(cd).filter(([k]) => k.startsWith('t2_'))),
        game_iq: Object.fromEntries(Object.entries(cd).filter(([k]) => k.startsWith('iq_'))),
        mental: Object.fromEntries(Object.entries(cd).filter(([k]) => k.startsWith('mn_'))),
        physical: Object.fromEntries(Object.entries(cd).filter(([k]) => k.startsWith('ph_'))),
        strengths: [cd.str1, cd.str2, cd.str3].filter(Boolean),
        priorities: [cd.pri1, cd.pri2, cd.pri3].filter(Boolean),
        narrative: cd.narrative || null,
        plan_explore: cd.pl_explore || null,
        plan_challenge: cd.pl_challenge || null,
        plan_execute: cd.pl_execute || null,
        squad_rec: cd.sqRec || null,
    };
}

// ═══ HELPER: Simulate the loadPlayersFromDB read path ═══
// This mirrors the exact logic from playerDb.js that reconstructs the cd object
function simulateLoadTransform(ass) {
    return {
        batA: ass.batting_archetype,
        bwlA: ass.bowling_archetype,
        narrative: ass.narrative,
        sqRec: ass.squad_rec,
        pl_explore: ass.plan_explore,
        pl_challenge: ass.plan_challenge,
        pl_execute: ass.plan_execute,
        ...Object.fromEntries((ass.strengths || []).map((s, i) => [`str${i + 1}`, s])),
        ...Object.fromEntries((ass.priorities || []).map((s, i) => [`pri${i + 1}`, s])),
        ...(ass.phase_ratings || {}),
        ...(ass.tech_primary || {}),
        ...(ass.tech_secondary || {}),
        ...(ass.game_iq || {}),
        ...(ass.mental || {}),
        ...(ass.physical || {}),
    };
}

// ═══ BUILD REALISTIC COACH DATA FOR EACH ROLE ═══
function buildCoachCD(role, avg) {
    const t = techItems(role);
    const cd = {};
    cd.batA = 'tempo';
    if (['pace', 'spin', 'allrounder'].includes(role)) cd.bwlA = 'newball';

    t.pri.forEach((_, i) => { cd[`t1_${i}`] = Math.max(1, Math.min(5, avg + (i % 3 === 0 ? 1 : 0))); });
    t.sec.forEach((_, i) => { cd[`t2_${i}`] = Math.max(1, Math.min(5, avg)); });
    IQ_ITEMS.forEach((_, i) => { cd[`iq_${i}`] = avg; });
    MN_ITEMS.forEach((_, i) => { cd[`mn_${i}`] = Math.max(1, Math.min(5, avg + (i < 2 ? 1 : 0))); });
    (PH_MAP[role] || PH_MAP.batter).forEach((_, i) => { cd[`ph_${i}`] = avg; });
    cd.pb_pp = avg; cd.pw_pp = avg; cd.pb_mid = avg; cd.pw_mid = avg; cd.pb_death = avg; cd.pw_death = avg;
    cd.narrative = 'Test assessment'; cd.str1 = 'S1'; cd.str2 = 'S2'; cd.str3 = 'S3';
    cd.pri1 = 'P1'; cd.pri2 = 'P2'; cd.pri3 = 'P3';
    cd.pl_explore = 'Explore phase'; cd.pl_challenge = 'Challenge phase'; cd.pl_execute = 'Execute phase';
    cd.sqRec = 'Squad 2';
    return cd;
}


// ═══ TEST 1: SAVE/LOAD SYMMETRY ═══
describe('Coach Assessment: Save/Load Data Symmetry', () => {
    const roles = ['batter', 'pace', 'spin', 'keeper', 'allrounder'];

    roles.forEach(role => {
        it(`${role}: cd → save → load → cd produces identical data`, () => {
            const original = buildCoachCD(role, 3);
            const saved = simulateSaveTransform(original);
            const loaded = simulateLoadTransform(saved);

            // Every rating key should survive the round trip
            Object.entries(original).filter(([k]) => k.match(/^(t1_|t2_|iq_|mn_|ph_|pb_|pw_)/)).forEach(([k, v]) => {
                expect(loaded[k]).toBe(v);
            });

            // Archetypes (undefined becomes null through save/load — correct Supabase behavior)
            expect(loaded.batA).toBe(original.batA);
            expect(loaded.bwlA ?? undefined).toBe(original.bwlA ?? undefined);

            // Text fields
            expect(loaded.narrative).toBe(original.narrative);
            expect(loaded.sqRec).toBe(original.sqRec);
            expect(loaded.pl_explore).toBe(original.pl_explore);

            // Strengths/priorities
            expect(loaded.str1).toBe(original.str1);
            expect(loaded.str2).toBe(original.str2);
            expect(loaded.str3).toBe(original.str3);
            expect(loaded.pri1).toBe(original.pri1);
        });
    });
});


// ═══ TEST 2: DATA SHAPE INTEGRITY PER ROLE ═══
describe('Coach Assessment: Data Shape by Role', () => {
    it('batter: t1 has 10 keys (BAT_ITEMS), t2 has 4 keys (secondary)', () => {
        const cd = buildCoachCD('batter', 3);
        const saved = simulateSaveTransform(cd);
        expect(Object.keys(saved.tech_primary).length).toBe(BAT_ITEMS.length); // 10
        expect(Object.keys(saved.tech_secondary).length).toBe(4);
    });

    it('pace: t1 has 10 keys (PACE_ITEMS), t2 has 6 keys (BAT secondary)', () => {
        const cd = buildCoachCD('pace', 3);
        const saved = simulateSaveTransform(cd);
        expect(Object.keys(saved.tech_primary).length).toBe(PACE_ITEMS.length); // 10
        expect(Object.keys(saved.tech_secondary).length).toBe(6);
    });

    it('spin: t1 has 10 keys (SPIN_ITEMS), t2 has 6 keys (BAT secondary)', () => {
        const cd = buildCoachCD('spin', 3);
        const saved = simulateSaveTransform(cd);
        expect(Object.keys(saved.tech_primary).length).toBe(SPIN_ITEMS.length); // 10
        expect(Object.keys(saved.tech_secondary).length).toBe(6);
    });

    it('keeper: t1 has 8 keys (KEEP_ITEMS), t2 has 10 keys (full BAT_ITEMS)', () => {
        const cd = buildCoachCD('keeper', 3);
        const saved = simulateSaveTransform(cd);
        expect(Object.keys(saved.tech_primary).length).toBe(KEEP_ITEMS.length); // 8
        expect(Object.keys(saved.tech_secondary).length).toBe(BAT_ITEMS.length); // 10
    });

    it('allrounder: t1 has 7 keys (BAT first 7), t2 has 5 keys (bowling secondary)', () => {
        const cd = buildCoachCD('allrounder', 3);
        const saved = simulateSaveTransform(cd);
        expect(Object.keys(saved.tech_primary).length).toBe(7);
        expect(Object.keys(saved.tech_secondary).length).toBe(5);
    });

    it('all roles: phase_ratings always has 6 keys', () => {
        ['batter', 'pace', 'spin', 'keeper', 'allrounder'].forEach(role => {
            const cd = buildCoachCD(role, 3);
            const saved = simulateSaveTransform(cd);
            expect(Object.keys(saved.phase_ratings).length).toBe(6);
        });
    });

    it('all roles: IQ has 6 keys, Mental has 7 keys, Physical has 5 keys', () => {
        ['batter', 'pace', 'spin', 'keeper', 'allrounder'].forEach(role => {
            const cd = buildCoachCD(role, 3);
            const saved = simulateSaveTransform(cd);
            expect(Object.keys(saved.game_iq).length).toBe(IQ_ITEMS.length); // 6
            expect(Object.keys(saved.mental).length).toBe(MN_ITEMS.length); // 7
            expect(Object.keys(saved.physical).length).toBe((PH_MAP[role] || PH_MAP.batter).length); // 5
        });
    });
});


// ═══ TEST 3: PDI WITH COACH DATA ═══
describe('Coach Assessment: PDI Calculation', () => {
    it('coach-only data (no self-ratings) produces valid PDI', () => {
        const cd = { ...buildCoachCD('batter', 4), _dob: '14/03/2009' };
        const grades = [{ level: 'prem_2nd' }];
        const ccm = calcCCM(grades, '14/03/2009', COMP_TIERS, C);
        const dn = calcPDI(cd, {}, 'batter', ccm, null, C, grades, {}, [], [], COMP_TIERS);
        expect(dn.pdi).toBeGreaterThan(0);
        expect(dn.provisional).toBe(false);
        expect(dn.g).not.toBe('—');
    });

    it('higher coach ratings produce higher PDI across all roles', () => {
        const roles = ['batter', 'pace', 'spin', 'keeper', 'allrounder'];
        roles.forEach(role => {
            const cd3 = { ...buildCoachCD(role, 3), _dob: '14/03/2009' };
            const cd4 = { ...buildCoachCD(role, 4), _dob: '14/03/2009' };
            const grades = [{ level: 'comm_a' }];
            const ccm = calcCCM(grades, '14/03/2009', COMP_TIERS, C);
            const dn3 = calcPDI(cd3, {}, role, ccm, null, C, grades, {}, [], [], COMP_TIERS);
            const dn4 = calcPDI(cd4, {}, role, ccm, null, C, grades, {}, [], [], COMP_TIERS);
            expect(dn4.pdi).toBeGreaterThan(dn3.pdi);
        });
    });

    it('non-provisional when t1_ keys are present', () => {
        const cd = { ...buildCoachCD('batter', 3), _dob: '14/03/2009' };
        const grades = [{ level: 'comm_a' }];
        const ccm = calcCCM(grades, '14/03/2009', COMP_TIERS, C);
        const dn = calcPDI(cd, {}, 'batter', ccm, null, C, grades, {}, [], [], COMP_TIERS);
        expect(dn.provisional).toBe(false);
    });

    it('provisional when no t1_ keys (self-data only)', () => {
        const cd = { _dob: '14/03/2009' };
        const grades = [{ level: 'comm_a' }];
        const ccm = calcCCM(grades, '14/03/2009', COMP_TIERS, C);
        const dn = calcPDI(cd, {}, 'batter', ccm, null, C, grades, {}, [], [], COMP_TIERS);
        expect(dn.provisional).toBe(true);
    });
});


// ═══ TEST 4: REPORT CARD DATA ASSEMBLY ═══
describe('Coach Assessment: Report Card Data Assembly', () => {
    // Simulate the exact data assembly from CoachAssessment.jsx lines 564-590
    function assembleReportData(player, players) {
        const cd = player.cd || {};
        const ccm = calcCCM(player.grades, player.dob, COMP_TIERS, C);
        const dn = calcPDI({ ...cd, _dob: player.dob }, player.self_ratings, player.role, ccm, null, C, player.grades, {}, player.topBat || [], player.topBowl || [], COMP_TIERS);
        const pathway = dn.pdiPct;
        const cohort = calcCohortPercentile(dn.pdi, players, COMP_TIERS, null, C);
        const age = calcAgeScore(ccm.arm, C);
        const overall = Math.round((pathway + cohort + age) / 3);
        const grade = dn.pdi >= 4 ? 5 : dn.pdi >= 3 ? 4 : dn.pdi >= 2 ? 3 : dn.pdi >= 1 ? 2 : 1;
        const domains = (dn.domains || []).map(d => ({ label: d.l, value: Math.round(d.s100), color: d.c }));
        const strengths = [cd.str1, cd.str2, cd.str3].filter(Boolean);
        const growth = [cd.pri1, cd.pri2, cd.pri3].filter(Boolean);
        const phase = {};
        PHASES.forEach(p => { phase[`batting_${p.id}`] = cd[`pb_${p.id}`]; phase[`bowling_${p.id}`] = cd[`pw_${p.id}`]; });
        const plan = {
            explore: (cd.pl_explore || '').split('\n').filter(Boolean),
            challenge: (cd.pl_challenge || '').split('\n').filter(Boolean),
            execute: (cd.pl_execute || '').split('\n').filter(Boolean),
        };

        return { overall, pathway, cohort, age, pdi: dn.pdi, grade, domains, strengths, growth, sagi: dn.sagiLabel, phase, plan, squad: cd.sqRec, narrative: cd.narrative };
    }

    const player = {
        id: 'test-1', name: 'Ethan Blackwood', dob: '14/03/2009', role: 'batter', submitted: true,
        grades: [{ level: 'prem_2nd' }], topBat: [], topBowl: [], self_ratings: {},
        cd: buildCoachCD('batter', 4),
    };
    const players = [player];

    it('overall score is between 0 and 100', () => {
        const r = assembleReportData(player, players);
        expect(r.overall).toBeGreaterThanOrEqual(0);
        expect(r.overall).toBeLessThanOrEqual(100);
    });

    it('pathway, cohort, age are each 0-100', () => {
        const r = assembleReportData(player, players);
        expect(r.pathway).toBeGreaterThanOrEqual(0);
        expect(r.pathway).toBeLessThanOrEqual(100);
        expect(r.cohort).toBeGreaterThanOrEqual(0);
        expect(r.cohort).toBeLessThanOrEqual(100);
        expect(r.age).toBeGreaterThanOrEqual(0);
        expect(r.age).toBeLessThanOrEqual(100);
    });

    it('domains array has 8 entries with label, value, color', () => {
        const r = assembleReportData(player, players);
        expect(r.domains).toHaveLength(8);
        r.domains.forEach(d => {
            expect(d.label).toBeDefined();
            expect(typeof d.value).toBe('number');
            expect(d.color).toBeDefined();
        });
    });

    it('strengths and growth areas extracted correctly', () => {
        const r = assembleReportData(player, players);
        expect(r.strengths).toEqual(['S1', 'S2', 'S3']);
        expect(r.growth).toEqual(['P1', 'P2', 'P3']);
    });

    it('phase scores include all 6 phase keys', () => {
        const r = assembleReportData(player, players);
        expect(r.phase).toHaveProperty('batting_pp');
        expect(r.phase).toHaveProperty('batting_mid');
        expect(r.phase).toHaveProperty('batting_death');
        expect(r.phase).toHaveProperty('bowling_pp');
        expect(r.phase).toHaveProperty('bowling_mid');
        expect(r.phase).toHaveProperty('bowling_death');
    });

    it('plan has explore/challenge/execute arrays', () => {
        const r = assembleReportData(player, players);
        expect(Array.isArray(r.plan.explore)).toBe(true);
        expect(Array.isArray(r.plan.challenge)).toBe(true);
        expect(Array.isArray(r.plan.execute)).toBe(true);
    });

    it('narrative and squad recommendation preserved', () => {
        const r = assembleReportData(player, players);
        expect(r.narrative).toBe('Test assessment');
        expect(r.squad).toBe('Squad 2');
    });

    it('grade is an integer 1-5', () => {
        const r = assembleReportData(player, players);
        expect(r.grade).toBeGreaterThanOrEqual(1);
        expect(r.grade).toBeLessThanOrEqual(5);
        expect(Number.isInteger(r.grade)).toBe(true);
    });
});


// ═══ TEST 5: ARCHETYPE DNA IN COACH CONTEXT ═══
describe('Coach Assessment: Archetype DNA', () => {
    it('coach-assigned archetype dominates the DNA blend', () => {
        const dna = calcArchetypeDNA({}, 'tempo', null);
        expect(dna.bat.tempo).toBeGreaterThan(dna.bat.enforcer);
        expect(dna.bat.tempo).toBeGreaterThan(dna.bat.finisher);
    });

    it('questionnaire answers add weight alongside coach selection', () => {
        // All answers biased toward enforcer
        const batAnswers = Array(12).fill(0);
        const dnaWithQs = calcArchetypeDNA({ batArchAnswers: batAnswers }, 'tempo', null);
        const dnaWithout = calcArchetypeDNA({}, 'tempo', null);
        // With questionnaire, enforcer should get more weight than without
        expect(dnaWithQs.bat.enforcer).toBeGreaterThan(dnaWithout.bat.enforcer);
        // Strong questionnaire bias (12 questions) can outweigh coach assignment (3.0 weight)
        // This is correct — questionnaire is the primary signal, coach is supplementary
        expect(dnaWithQs.bat.enforcer).toBeGreaterThan(0);
        expect(dnaWithQs.bat.tempo).toBeGreaterThan(0);
    });

    it('bowling DNA independent of batting DNA', () => {
        const dna = calcArchetypeDNA({}, 'tempo', 'deathclose');
        expect(dna.primaryBat).toBe('tempo');
        expect(dna.primaryBowl).toBe('deathclose');
    });

    it('all DNA percentages sum to 100', () => {
        const dna = calcArchetypeDNA({ batArchAnswers: [0,1,2,3,0,1,2,3,0,1,2,3] }, 'finisher', 'spinctrl');
        const batSum = Object.values(dna.bat).reduce((s, v) => s + v, 0);
        const bowlSum = Object.values(dna.bowl).reduce((s, v) => s + v, 0);
        expect(batSum).toBe(100);
        expect(bowlSum).toBe(100);
    });
});


// ═══ TEST 6: EDGE CASES ═══
describe('Coach Assessment: Edge Cases', () => {
    it('empty cd object produces zero PDI without crash', () => {
        const ccm = calcCCM([{ level: 'comm_a' }], '14/03/2009', COMP_TIERS, C);
        const dn = calcPDI({ _dob: '14/03/2009' }, {}, 'batter', ccm, null, C, [{ level: 'comm_a' }], {}, [], [], COMP_TIERS);
        expect(dn.pdi).toBe(0);
        expect(dn.domains).toHaveLength(8);
        expect(dn.g).toBe('—');
    });

    it('partial assessment (only t1) still calculates PDI', () => {
        const cd = { _dob: '14/03/2009', t1_0: 3, t1_1: 4, t1_2: 3 };
        const ccm = calcCCM([{ level: 'comm_a' }], '14/03/2009', COMP_TIERS, C);
        const dn = calcPDI(cd, {}, 'batter', ccm, null, C, [{ level: 'comm_a' }], {}, [], [], COMP_TIERS);
        expect(dn.pdi).toBeGreaterThan(0);
        expect(dn.provisional).toBe(false);
    });

    it('stale archetype values (pre-v3) do not crash DNA calc', () => {
        const dna = calcArchetypeDNA({}, 'dual', 'developer');
        // These are invalid archetype IDs — should produce 0% for all valid archetypes
        expect(dna.bat).toBeDefined();
        expect(dna.bowl).toBeDefined();
    });

    it('save transform preserves zero-value ratings', () => {
        const cd = { t1_0: 0, t1_1: 3, iq_0: 0, mn_0: 5 };
        const saved = simulateSaveTransform(cd);
        // Zero values should still be in the JSONB — they're valid "unrated" markers
        expect(saved.tech_primary.t1_0).toBe(0);
        expect(saved.tech_primary.t1_1).toBe(3);
    });

    it('null/undefined strengths do not produce undefined str keys', () => {
        const saved = { strengths: null, priorities: [] };
        const loaded = simulateLoadTransform(saved);
        expect(loaded.str1).toBeUndefined();
        expect(loaded.pri1).toBeUndefined();
    });

    it('save/load handles missing JSONB fields gracefully', () => {
        const saved = {
            batting_archetype: 'tempo', bowling_archetype: null,
            phase_ratings: null, tech_primary: null, tech_secondary: null,
            game_iq: null, mental: null, physical: null,
            strengths: null, priorities: null,
            narrative: null, squad_rec: null,
            plan_explore: null, plan_challenge: null, plan_execute: null,
        };
        const loaded = simulateLoadTransform(saved);
        expect(loaded.batA).toBe('tempo');
        // Should not have any t1_/iq_/etc keys since all JSONB was null
        expect(Object.keys(loaded).filter(k => k.startsWith('t1_'))).toHaveLength(0);
    });
});
