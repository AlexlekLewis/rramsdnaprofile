// ═══ FALLBACK DATA — Used when Supabase fetch fails ═══

// ═══ 8-PILLAR ROLE WEIGHTS ═══
// Keys: tm=Technical Mastery, te=Tactical Execution, pc=Physical Conditioning,
//       mr=Mental Resilience, af=Athletic Fielding, mi=Match Impact,
//       pw=Power Hitting, sa=Self-Awareness
export const FALLBACK_RW = {
    batter: { tm: .14, te: .18, pc: .08, mr: .14, af: .10, mi: .12, pw: .10, sa: .14 },
    pace: { tm: .16, te: .14, pc: .16, mr: .14, af: .10, mi: .12, pw: .06, sa: .12 },
    spin: { tm: .18, te: .18, pc: .08, mr: .12, af: .08, mi: .12, pw: .06, sa: .18 },
    keeper: { tm: .16, te: .14, pc: .10, mr: .12, af: .16, mi: .10, pw: .08, sa: .14 },
    allrounder: { tm: .14, te: .16, pc: .10, mr: .14, af: .10, mi: .14, pw: .08, sa: .14 },
    bowlrounder: { tm: .16, te: .14, pc: .14, mr: .14, af: .10, mi: .14, pw: .06, sa: .12 },
};

// ═══ LEGACY 6-DOMAIN WEIGHTS (kept for backward compat / migration) ═══
export const FALLBACK_RW_LEGACY = {
    batter: { t: .35, i: .25, m: .20, h: .10, ph: .10 },
    pace: { t: .30, i: .20, m: .20, h: .20, ph: .10 },
    spin: { t: .35, i: .25, m: .20, h: .10, ph: .10 },
    keeper: { t: .35, i: .20, m: .20, h: .15, ph: .10 },
    allrounder: { t: .30, i: .25, m: .20, h: .15, ph: .10 },
    bowlrounder: { t: .30, i: .20, m: .20, h: .20, ph: .10 },
};

export const FALLBACK_CONST = {
    arm_sensitivity_factor: 0.05,
    arm_floor: 0.80,
    arm_ceiling: 1.50,
    coach_weight: 0.75,
    player_weight: 0.25,
    sagi_aligned_min: -0.5,
    sagi_aligned_max: 0.5,
    trajectory_age_threshold: 1.5,
    pdi_scale_max: 5,
    // Self-Awareness pillar scoring
    sagi_penalty_factor: 2.0,       // |SAGI| × factor → subtracted from 5 to get 1-5 score
    sagi_floor_score: 1.0,          // Minimum self-awareness score
};

// ═══ 8-PILLAR AGE-TIER DOMAIN WEIGHTS ═══
// Used to dynamically blend statistical weight by age bracket
// In the 8-pillar model, Statistical Performance feeds into Match Impact
export const FALLBACK_DOMAIN_WEIGHTS = {
    young: { tm: .14, te: .18, mr: .14, pc: .08, af: .10, mi: .12, pw: .10, sa: .14 },
    mid: { tm: .14, te: .16, mr: .14, pc: .08, af: .10, mi: .14, pw: .10, sa: .14 },
    senior: { tm: .14, te: .14, mr: .12, pc: .08, af: .10, mi: .18, pw: .10, sa: .14 },
};

// ═══ ARCHETYPE ALIGNMENT DEFAULTS ═══
// How much archetype alignment can boost/dampen a pillar score (±% adjustment)
export const ARCHETYPE_ALIGNMENT = {
    boost_factor: 0.10,     // 10% boost for pillar-archetype match
    max_boost: 0.15,        // maximum 15% adjustment
    min_signal_count: 3,    // need at least 3 onboarding signals to compute archetype DNA
};
