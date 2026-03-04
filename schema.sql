DROP TABLE IF EXISTS public.eligibility_rules CASCADE;
DROP TABLE IF EXISTS public.competition_tiers CASCADE;
DROP TABLE IF EXISTS public.vmcu_associations CASCADE;
DROP TABLE IF EXISTS public.vccl_regions CASCADE;
DROP TABLE IF EXISTS public.domain_weights CASCADE;
DROP TABLE IF EXISTS public.assessment_domains CASCADE;
DROP TABLE IF EXISTS public.engine_constants CASCADE;



CREATE TABLE public.engine_constants (
    constant_key text PRIMARY KEY,
    value text,
    data_type text,
    owner text,
    review_cadence text,
    description text
);

INSERT INTO public.engine_constants (constant_key, value, data_type, owner, review_cadence, description) VALUES ('arm_sensitivity_factor', 0.05, 'float', 'Head Coach', 'After each intake', 'Each year younger = +5% amplification');
INSERT INTO public.engine_constants (constant_key, value, data_type, owner, review_cadence, description) VALUES ('arm_floor', 0.8, 'float', 'Head Coach', 'As needed', 'Minimum ARM — prevents extreme dampening');
INSERT INTO public.engine_constants (constant_key, value, data_type, owner, review_cadence, description) VALUES ('arm_ceiling', 1.5, 'float', 'Head Coach', 'As needed', 'Maximum ARM — prevents extreme inflation');
INSERT INTO public.engine_constants (constant_key, value, data_type, owner, review_cadence, description) VALUES ('coach_weight', 0.75, 'float', 'Head Coach', 'Stable', 'Coach assessment weight in CSS blend');
INSERT INTO public.engine_constants (constant_key, value, data_type, owner, review_cadence, description) VALUES ('player_weight', 0.25, 'float', 'Head Coach', 'Stable', 'Player self-assessment weight in CSS blend');
INSERT INTO public.engine_constants (constant_key, value, data_type, owner, review_cadence, description) VALUES ('trajectory_age_threshold', 1.5, 'float', 'Head Coach', 'Annually', 'Years below midpoint to trigger flag');
INSERT INTO public.engine_constants (constant_key, value, data_type, owner, review_cadence, description) VALUES ('sagi_aligned_min', -0.5, 'float', 'Head Coach', 'Stable', 'SAGI range: aligned self-awareness lower bound');
INSERT INTO public.engine_constants (constant_key, value, data_type, owner, review_cadence, description) VALUES ('sagi_aligned_max', 0.5, 'float', 'Head Coach', 'Stable', 'SAGI range: aligned self-awareness upper bound');
INSERT INTO public.engine_constants (constant_key, value, data_type, owner, review_cadence, description) VALUES ('pdi_scale_max', 5, 'float', 'System', 'Fixed', 'PDI expressed as score out of 5.0');
INSERT INTO public.engine_constants (constant_key, value, data_type, owner, review_cadence, description) VALUES ('cohort_size_target', 120, 'int', 'Program', 'Per intake', 'Target cohort for normalisation');
INSERT INTO public.engine_constants (constant_key, value, data_type, owner, review_cadence, description) VALUES ('benchmark_ceiling_code', 'P1M', 'string', 'Head Coach + DoT', 'Annually', 'Competition code = CTI 1.00');



CREATE TABLE public.assessment_domains (
    domain_id text PRIMARY KEY,
    domain_name text,
    data_tier text,
    source_page text,
    item_count text,
    feeds_algorithm boolean,
    notes text
);

INSERT INTO public.assessment_domains (domain_id, domain_name, data_tier, source_page, item_count, feeds_algorithm, notes) VALUES ('technical', 'Technical Skill', 'TIER_1', 'Page 3', '10-14', TRUE, 'Primary + Secondary skill ratings (1-5)');
INSERT INTO public.assessment_domains (domain_id, domain_name, data_tier, source_page, item_count, feeds_algorithm, notes) VALUES ('game_iq', 'T20 Game Intelligence', 'TIER_1', 'Page 4', '6', TRUE, 'Phase awareness, decision-making');
INSERT INTO public.assessment_domains (domain_id, domain_name, data_tier, source_page, item_count, feeds_algorithm, notes) VALUES ('mental', 'Mental Performance', 'TIER_1', 'Page 4', '7', TRUE, 'Courage, curiosity, resilience, coachability');
INSERT INTO public.assessment_domains (domain_id, domain_name, data_tier, source_page, item_count, feeds_algorithm, notes) VALUES ('physical', 'Physical / Athletic', 'TIER_1', 'Page 4', '5', TRUE, 'Movement quality, athletic potential');
INSERT INTO public.assessment_domains (domain_id, domain_name, data_tier, source_page, item_count, feeds_algorithm, notes) VALUES ('phase', 'Phase Effectiveness', 'TIER_2', 'Page 2', '6', TRUE, '3 phases × 2 (bat + bowl) ratings');
INSERT INTO public.assessment_domains (domain_id, domain_name, data_tier, source_page, item_count, feeds_algorithm, notes) VALUES ('archetype', 'Archetype Profile', 'TIER_3', 'Page 2', NULL, FALSE, 'Classification only — bat & bowl archetype');
INSERT INTO public.assessment_domains (domain_id, domain_name, data_tier, source_page, item_count, feeds_algorithm, notes) VALUES ('player_voice', 'Player Voice', 'TIER_4', 'Page 5', NULL, FALSE, 'Qualitative — IDP narrative only');



CREATE TABLE public.domain_weights (
    role_id text PRIMARY KEY,
    role_label text,
    technical_weight numeric,
    game_iq_weight numeric,
    mental_weight numeric,
    physical_weight numeric,
    phase_weight numeric,
    notes text
);

INSERT INTO public.domain_weights (role_id, role_label, technical_weight, game_iq_weight, mental_weight, physical_weight, phase_weight, notes) VALUES ('specialist_batter', 'Specialist Batter', 0.35, 0.25, 0.2, 0.1, 0.1, 'Technical precision primary differentiator');
INSERT INTO public.domain_weights (role_id, role_label, technical_weight, game_iq_weight, mental_weight, physical_weight, phase_weight, notes) VALUES ('pace_bowler', 'Pace Bowler', 0.3, 0.2, 0.2, 0.2, 0.1, 'Physical elevated — eccentric strength, GRF');
INSERT INTO public.domain_weights (role_id, role_label, technical_weight, game_iq_weight, mental_weight, physical_weight, phase_weight, notes) VALUES ('spin_bowler', 'Spin Bowler', 0.35, 0.25, 0.2, 0.1, 0.1, 'Technical precision for spin');
INSERT INTO public.domain_weights (role_id, role_label, technical_weight, game_iq_weight, mental_weight, physical_weight, phase_weight, notes) VALUES ('wicketkeeper_batter', 'Wicketkeeper-Batter', 0.35, 0.2, 0.2, 0.15, 0.1, 'Physical elevated — lateral movement');
INSERT INTO public.domain_weights (role_id, role_label, technical_weight, game_iq_weight, mental_weight, physical_weight, phase_weight, notes) VALUES ('batting_allrounder', 'Batting All-Rounder', 0.3, 0.25, 0.2, 0.15, 0.1, 'Dual-discipline demands');



CREATE TABLE public.vccl_regions (
    region_code text PRIMARY KEY,
    region_name text,
    associations text,
    linked_premier_club text,
    has_direct_pathway boolean
);

INSERT INTO public.vccl_regions (region_code, region_name, associations, linked_premier_club, has_direct_pathway) VALUES ('R1', 'Barwon Rockets', 'Geelong CA, Bellarine Peninsula CA, Colac DCA, South West CA', 'Geelong CC', TRUE);
INSERT INTO public.vccl_regions (region_code, region_name, associations, linked_premier_club, has_direct_pathway) VALUES ('R2', 'Western Waves', 'Warrnambool DCA, Hamilton DCA, Portland CA', NULL, FALSE);
INSERT INTO public.vccl_regions (region_code, region_name, associations, linked_premier_club, has_direct_pathway) VALUES ('R3', 'Central Highlands', 'Ballarat CA, Buninyong DCA, Hepburn Shire CA, Creswick DCA', NULL, FALSE);
INSERT INTO public.vccl_regions (region_code, region_name, associations, linked_premier_club, has_direct_pathway) VALUES ('R4', 'Mallee Murray Suns', 'Mildura CA, Swan Hill CA, Kerang DCA', NULL, FALSE);
INSERT INTO public.vccl_regions (region_code, region_name, associations, linked_premier_club, has_direct_pathway) VALUES ('R5', 'Northern Rivers', 'Bendigo DCA, Castlemaine DCA, Campaspe Valley CA, Heathcote DCA', NULL, FALSE);
INSERT INTO public.vccl_regions (region_code, region_name, associations, linked_premier_club, has_direct_pathway) VALUES ('R6', 'North-East Knights', 'Albury-Wodonga CA, Benalla DCA, Murray Valley CA, Ovens & Murray CA', NULL, FALSE);
INSERT INTO public.vccl_regions (region_code, region_name, associations, linked_premier_club, has_direct_pathway) VALUES ('R7', 'Gippsland Pride', 'Sale-Maffra CA, Cricket Latrobe Valley, Warragul DCA, Bairnsdale CA, Leongatha DCA', NULL, FALSE);
INSERT INTO public.vccl_regions (region_code, region_name, associations, linked_premier_club, has_direct_pathway) VALUES ('R8', 'SE Country Sharks', 'Mornington Peninsula CA, Westernport CA, Frankston DCA, Bass Coast CA', 'Frankston Peninsula CC', TRUE);



CREATE TABLE public.vmcu_associations (
    abbrev text PRIMARY KEY,
    full_name text,
    type text,
    surface text,
    region_notes text
);

INSERT INTO public.vmcu_associations (abbrev, full_name, type, surface, region_notes) VALUES ('ECA', 'Eastern Cricket Association', 'Sr+Jr+Girls+Vets', 'Turf & Synth', 'Inner/Outer East — 50+ clubs');
INSERT INTO public.vmcu_associations (abbrev, full_name, type, surface, region_notes) VALUES ('BHRDCA', 'Box Hill Reporter District CA', 'Sr+Jr+Girls', 'Turf & Synth', 'Outer East');
INSERT INTO public.vmcu_associations (abbrev, full_name, type, surface, region_notes) VALUES ('DDCA', 'Dandenong District CA', 'Sr+Jr+Girls', 'Turf & Synth', 'South East — large, strong turf');
INSERT INTO public.vmcu_associations (abbrev, full_name, type, surface, region_notes) VALUES ('DVCA', 'Diamond Valley CA', 'Sr+Jr+Girls', 'Turf & Synth', 'North East');
INSERT INTO public.vmcu_associations (abbrev, full_name, type, surface, region_notes) VALUES ('CSB', 'Cricket Southern Bayside', 'Sr+Jr+Girls', 'Turf & Synth', 'Bayside');
INSERT INTO public.vmcu_associations (abbrev, full_name, type, surface, region_notes) VALUES ('FTGDCA', 'Ferntree Gully & District CA', 'Sr+Jr+Girls', 'Turf & Synth', 'Outer East');
INSERT INTO public.vmcu_associations (abbrev, full_name, type, surface, region_notes) VALUES ('MPCA', 'Mornington Peninsula CA', 'Sr+Jr+Girls', 'Turf & Synth', 'Peninsula');
INSERT INTO public.vmcu_associations (abbrev, full_name, type, surface, region_notes) VALUES ('NMCA', 'North Metro CA', 'Sr+Jr', 'Turf & Synth', 'Northern suburbs');
INSERT INTO public.vmcu_associations (abbrev, full_name, type, surface, region_notes) VALUES ('NWMCA', 'North West Metro CA', 'Sr+Jr', 'Turf & Synth', 'NW suburbs');
INSERT INTO public.vmcu_associations (abbrev, full_name, type, surface, region_notes) VALUES ('RDCA', 'Ringwood District CA', 'Sr+Jr+Girls', 'Turf & Synth', 'Outer East');
INSERT INTO public.vmcu_associations (abbrev, full_name, type, surface, region_notes) VALUES ('SECA', 'South East CA', 'Sr+Jr+Girls', 'Mostly Synth', 'SE — 120+ sr, 280+ jr teams');
INSERT INTO public.vmcu_associations (abbrev, full_name, type, surface, region_notes) VALUES ('SCA', 'Southern CA', 'Sr+Jr', 'Synthetic', 'Southern suburbs');
INSERT INTO public.vmcu_associations (abbrev, full_name, type, surface, region_notes) VALUES ('CSMCA', 'Casey South Melbourne CA', 'Sr+Jr', 'Turf & Synth', 'SE growth corridor');
INSERT INTO public.vmcu_associations (abbrev, full_name, type, surface, region_notes) VALUES ('YVCA', 'Yarra Valley CA', 'Sr+Jr', 'Various', 'Outer East semi-regional');
INSERT INTO public.vmcu_associations (abbrev, full_name, type, surface, region_notes) VALUES ('WDCA', 'Williamstown & Districts CA', 'Sr+Jr', 'Various', 'Western suburbs');
INSERT INTO public.vmcu_associations (abbrev, full_name, type, surface, region_notes) VALUES ('WRJCA', 'Western Region Junior CA', 'Junior only', 'Various', 'Western suburbs');
INSERT INTO public.vmcu_associations (abbrev, full_name, type, surface, region_notes) VALUES ('MCA', 'Melbourne CA', 'Senior', 'Various', 'Inner Melbourne');
INSERT INTO public.vmcu_associations (abbrev, full_name, type, surface, region_notes) VALUES ('VTCA', 'Victorian Turf CA', 'Sr+Jr', 'Turf', 'Metro-wide turf — Turner Shield');
INSERT INTO public.vmcu_associations (abbrev, full_name, type, surface, region_notes) VALUES ('Mercantile', 'Mercantile CA', 'Senior', 'Synthetic', 'Midweek format');



CREATE TABLE public.competition_tiers (
    code text PRIMARY KEY,
    tier text,
    competition_name text,
    shield_name text,
    gender text,
    age_group text,
    format text,
    cti_value numeric,
    expected_midpoint_age numeric,
    arm_sensitivity numeric,
    active boolean,
    notes text
);

INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('CA-M', 'NATIONAL', 'Australian Men''s Team', NULL, 'M', 'Open', 'All', 1.0, 28.0, 0.05, TRUE, 'Absolute ceiling');
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('CA-F', 'NATIONAL', 'Australian Women''s Team', NULL, 'F', 'Open', 'All', 1.0, 26.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('CA-AM', 'NATIONAL', 'Australia A — Men''s', NULL, 'M', 'Open', 'Multi', 0.97, 24.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('CA-AF', 'NATIONAL', 'Australia A — Women''s', NULL, 'F', 'Open', 'Multi', 0.97, 23.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('CA-19M', 'NATIONAL', 'U19 National Championships — M', NULL, 'M', 'U19', 'Multi-day+OD', 0.9, 18.0, 0.05, TRUE, 'State teams');
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('CA-19F', 'NATIONAL', 'U19 National Championships — F', NULL, 'F', 'U19', 'Multi-day+OD', 0.9, 17.5, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('CA-17M', 'NATIONAL', 'U17 National Championships', NULL, 'M', 'U17', 'Multi-day', 0.85, 16.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('CA-16F', 'NATIONAL', 'U16 National Championships', NULL, 'F', 'U16', 'Multi', 0.85, 15.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('CA-ACC', 'NATIONAL', 'Australian Country Championships', NULL, 'M/F', 'Open', 'OD', 0.75, 26.0, 0.05, TRUE, 'VIC Country rep');
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('CA-SSA15', 'NATIONAL', 'SSA U15 Championships', NULL, 'Mixed', 'U15', 'OD', 0.7, 14.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('CA-SSA12', 'NATIONAL', 'SSA U12 Championships', NULL, 'Mixed', 'U12', 'OD', 0.6, 11.5, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('VIC-SS', 'STATE', 'Sheffield Shield', NULL, 'M', 'Open', '4-day FC', 0.98, 27.0, 0.05, TRUE, 'Professional FC');
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('VIC-OD', 'STATE', 'Marsh One-Day Cup', NULL, 'M', 'Open', 'OD 50-over', 0.93, 27.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('VIC-BBL', 'STATE', 'BBL (Stars / Renegades)', NULL, 'M', 'Open', 'T20', 0.93, 27.0, 0.05, TRUE, 'Professional T20');
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('VIC-WNCL', 'STATE', 'WNCL', NULL, 'F', 'Open', 'OD 50-over', 0.93, 25.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('VIC-WBBL', 'STATE', 'WBBL (Stars / Renegades)', NULL, 'F', 'Open', 'T20', 0.93, 24.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('VIC-2XI', 'STATE', 'Victorian 2nd XI', NULL, 'M', 'Open', 'Multi', 0.88, 22.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('VP-19M', 'STATE_PATHWAY', 'VIC U19 Emerging (Metro)', NULL, 'M', 'U19', 'Multi', 0.85, 18.0, 0.05, TRUE, 'CV selection');
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('VP-19MC', 'STATE_PATHWAY', 'VIC U19 Emerging (Country)', NULL, 'M', 'U19', 'Multi', 0.85, 18.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('VP-17M', 'STATE_PATHWAY', 'VIC U17 Emerging (Metro)', NULL, 'M', 'U17', 'Multi', 0.8, 16.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('VP-17MC', 'STATE_PATHWAY', 'VIC U17 Emerging (Country)', NULL, 'M', 'U17', 'Multi', 0.8, 16.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('VP-19F', 'STATE_PATHWAY', 'VIC U19 Female Emerging', NULL, 'F', 'U19', 'Multi', 0.85, 17.5, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('VP-16F', 'STATE_PATHWAY', 'VIC U16 Female Emerging', NULL, 'F', 'U16', 'Multi', 0.8, 15.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('VP-CC16M', 'STATE_PATHWAY', 'Country Cup — U16 Male', NULL, 'M', 'U16', 'OD', 0.7, 15.0, 0.05, TRUE, 'VCCL regions');
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('VP-CC15F', 'STATE_PATHWAY', 'Country Cup — U15 Female', NULL, 'F', 'U15', 'OD', 0.7, 14.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('P1M', 'PREMIER', 'Premier Cricket 1st XI — Men''s', NULL, 'M', 'Open', '2-day/OD/T20', 1.0, 24.0, 0.05, TRUE, 'BENCHMARK CEILING — 18 clubs');
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('P2M', 'PREMIER', 'Premier Cricket 2nd XI — Men''s', NULL, 'M', 'Open', '2-day/OD/T20', 0.85, 22.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('P3M', 'PREMIER', 'Premier Cricket 3rd XI — Men''s', NULL, 'M', 'Open', '2-day/OD', 0.75, 21.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('P4M', 'PREMIER', 'Premier Cricket 4th XI — Men''s', NULL, 'M', 'Open', 'OD', 0.65, 20.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('P1F', 'PREMIER', 'Premier Cricket 1st XI — Women''s', NULL, 'F', 'Open', 'OD/T20', 0.85, 22.0, 0.05, TRUE, '10 clubs');
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('P2F', 'PREMIER', 'Premier Cricket 2nd XI — Women''s', NULL, 'F', 'Open', 'OD', 0.7, 20.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('P18M', 'PREMIER_UAGE', 'Premier U18 — Male', NULL, 'M', 'U18', 'OD', 0.75, 16.5, 0.05, TRUE, 'Ages 16-17 at 1 Sep');
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('P18F', 'PREMIER_UAGE', 'Premier U18 — Female', NULL, 'F', 'U18', 'OD', 0.7, 16.0, 0.05, TRUE, 'Ages 15-17 at 1 Sep');
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('P16M', 'PREMIER_UAGE', 'Dowling Shield', 'Dowling Shield', 'M', 'U16', 'OD', 0.75, 14.5, 0.05, TRUE, 'Ages 14-15 at 1 Sep');
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('P15F', 'PREMIER_UAGE', 'Marg Jennings Cup', 'Marg Jennings Cup', 'F', 'U15', 'OD', 0.65, 13.0, 0.05, TRUE, 'Ages 12-14 at 1 Sep');
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('PA', 'PREMIER_UAGE', 'Premier Academy Only', NULL, 'Mixed', 'Varies', 'Training', 0.55, 14.0, 0.05, TRUE, 'No comp matches yet');
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('SD1', 'SUB_DISTRICT', 'VSDCA 1st XI', NULL, 'M', 'Open', '2-day/OD', 0.7, 24.0, 0.05, TRUE, '32 clubs');
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('SD2', 'SUB_DISTRICT', 'VSDCA 2nd XI', NULL, 'M', 'Open', '2-day/OD', 0.6, 22.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('SD3', 'SUB_DISTRICT', 'VSDCA 3rd XI', NULL, 'M', 'Open', '2-day/OD', 0.55, 21.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('SD4', 'SUB_DISTRICT', 'VSDCA 4th XI', NULL, 'M', 'Open', 'OD', 0.5, 20.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('SD-15', 'SUB_DISTRICT', 'J.G. Craig Shield', 'J.G. Craig Shield', 'M', 'U15', 'OD', 0.6, 14.0, 0.05, TRUE, '32 clubs, Jan');
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('SD-V1', 'SUB_DISTRICT', 'VTCA Senior Division', 'Turner Shield', 'M', 'Open', '2-day/OD', 0.7, 24.0, 0.05, TRUE, 'Equal tier with VSDCA');
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('SD-V2', 'SUB_DISTRICT', 'VTCA Division 1', NULL, 'M', 'Open', '2-day/OD', 0.6, 23.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('SD-V3', 'SUB_DISTRICT', 'VTCA Division 2+', NULL, 'M', 'Open', 'Various', 0.5, 22.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('CS-1T', 'COMMUNITY_SR', 'Association 1st XI — Turf', NULL, 'M', 'Open', '2-day', 0.55, 24.0, 0.05, TRUE, 'e.g. ECA Dunstan, DDCA 1st');
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('CS-2T', 'COMMUNITY_SR', 'Association 2nd XI — Turf', NULL, 'M', 'Open', '2-day', 0.5, 22.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('CS-3T', 'COMMUNITY_SR', 'Association 3rd-4th XI — Turf', NULL, 'M', 'Open', '2-day', 0.45, 21.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('CS-5T', 'COMMUNITY_SR', 'Association 5th+ XI — Turf', NULL, 'M', 'Open', 'Reduced', 0.4, 20.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('CS-1S', 'COMMUNITY_SR', 'Association 1st XI — Synthetic', NULL, 'M', 'Open', '2-day', 0.5, 23.0, 0.05, TRUE, 'e.g. ECA Macgibbon');
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('CS-2S', 'COMMUNITY_SR', 'Association 2nd XI — Synthetic', NULL, 'M', 'Open', '2-day', 0.45, 22.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('CS-3S', 'COMMUNITY_SR', 'Association 3rd+ XI — Synthetic', NULL, 'M', 'Open', 'Various', 0.4, 21.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('CS-LOC', 'COMMUNITY_SR', 'Limited Overs Comp (top grade)', NULL, 'M', 'Open', 'LOC', 0.45, 22.0, 0.05, TRUE, 'LOC1 strongest');
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('CS-SUN', 'COMMUNITY_SR', 'Sunday Turf Grades', NULL, 'M', 'Open', 'OD', 0.45, 22.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('RY-1T', 'COUNTRY_SR', 'Country Assoc — Premier/1st Turf', NULL, 'M', 'Open', '2-day/OD', 0.55, 24.0, 0.05, TRUE, 'e.g. BDCA Prem, GCA Div1');
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('RY-2T', 'COUNTRY_SR', 'Country Assoc — 2nd Grade Turf', NULL, 'M', 'Open', '2-day/OD', 0.45, 22.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('RY-3T', 'COUNTRY_SR', 'Country Assoc — 3rd+ Turf', NULL, 'M', 'Open', 'OD', 0.4, 21.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('RY-1S', 'COUNTRY_SR', 'Country Assoc — 1st Synthetic', NULL, 'M', 'Open', 'OD', 0.45, 24.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('RY-2S', 'COUNTRY_SR', 'Country Assoc — Lower Synthetic', NULL, 'M', 'Open', 'OD', 0.35, 21.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('RY-1F', 'COUNTRY_SR', 'Country Assoc — Women''s Top', NULL, 'F', 'Open', 'OD', 0.45, 22.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('RY-CW', 'COUNTRY_REP', 'VCCL Country Week — Sr Men', NULL, 'M', 'Open', 'OD', 0.6, 26.0, 0.05, TRUE, 'Annual carnival Melb');
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('RY-CWF', 'COUNTRY_REP', 'VCCL Country Week — Sr Women', NULL, 'F', 'Open', 'OD', 0.55, 24.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('RY-JCW', 'COUNTRY_REP', 'VCCL Junior Country Week', NULL, 'Mixed', 'U14-U16', 'OD', 0.5, 14.0, 0.05, TRUE, 'Country equiv of VMCU');
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('RY-J18', 'COUNTRY_JR', 'Country Assoc — U18/U17', NULL, 'Mixed', 'U17-U18', 'OD', 0.4, 16.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('RY-J16', 'COUNTRY_JR', 'Country Assoc — U16/U15', NULL, 'Mixed', 'U15-U16', 'OD', 0.35, 14.5, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('RY-J14', 'COUNTRY_JR', 'Country Assoc — U14/U13', NULL, 'Mixed', 'U13-U14', 'OD', 0.3, 13.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('RY-J12', 'COUNTRY_JR', 'Country Assoc — U12/U11', NULL, 'Mixed', 'U11-U12', 'Modified', 0.25, 11.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('CJ-18A', 'COMMUNITY_JR', 'Association U18 — A Grade', NULL, 'M', 'U18', 'OD', 0.45, 16.5, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('CJ-18B', 'COMMUNITY_JR', 'Association U18 — B/C', NULL, 'M', 'U18', 'OD', 0.35, 16.5, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('CJ-16A', 'COMMUNITY_JR', 'Association U16 — A Grade', NULL, 'M', 'U16', 'OD', 0.4, 15.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('CJ-16B', 'COMMUNITY_JR', 'Association U16 — B Grade', NULL, 'M', 'U16', 'OD', 0.35, 15.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('CJ-16C', 'COMMUNITY_JR', 'Association U16 — C+', NULL, 'M', 'U16', 'OD', 0.3, 15.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('CJ-14A', 'COMMUNITY_JR', 'Association U14 — A Grade', NULL, 'M', 'U14', 'OD', 0.35, 13.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('CJ-14B', 'COMMUNITY_JR', 'Association U14 — B', NULL, 'M', 'U14', 'OD', 0.3, 13.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('CJ-14C', 'COMMUNITY_JR', 'Association U14 — C+', NULL, 'M', 'U14', 'OD', 0.25, 13.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('CJ-12A', 'COMMUNITY_JR', 'Association U12 — A Grade', NULL, 'M', 'U12', 'OD', 0.3, 11.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('CJ-12B', 'COMMUNITY_JR', 'Association U12 — B', NULL, 'M', 'U12', 'OD', 0.25, 11.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('CJ-12C', 'COMMUNITY_JR', 'Association U12 — C+', NULL, 'M', 'U12', 'OD', 0.2, 11.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('CJ-10', 'COMMUNITY_JR', 'Association U10', NULL, 'Mixed', 'U10', 'Modified', 0.18, 9.5, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('CW-1', 'COMMUNITY_WG', 'Association Sr Women — Top', NULL, 'F', 'Open', 'OD', 0.45, 22.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('CW-S', 'COMMUNITY_WG', 'Association Sr Women — Social', NULL, 'F', 'Open', 'OD/T20', 0.35, 22.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('CG-1', 'COMMUNITY_WG', 'Girls Stage 1 (U18)', NULL, 'F', 'U18', 'Modified', 0.35, 16.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('CG-2', 'COMMUNITY_WG', 'Girls Stage 2 (U15)', NULL, 'F', 'U15', 'Modified', 0.3, 14.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('CG-3', 'COMMUNITY_WG', 'Girls Stage 3 (U12)', NULL, 'F', 'U12', 'Modified', 0.25, 11.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('REP-17M', 'VMCU_REP', 'Beitzel Shield (U17)', 'Beitzel Shield', 'M', 'U17', 'OD', 0.55, 15.5, 0.05, TRUE, '2026 merged');
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('REP-16M', 'VMCU_REP', 'Keith Mackay Shield', 'Keith Mackay Shield', 'M', 'U16', 'OD', 0.45, 15.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('REP-14MT', 'VMCU_REP', 'Russell Allen Shield', 'Russell Allen Shield', 'M', 'U14', 'OD', 0.5, 13.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('REP-13M', 'VMCU_REP', 'Des Nolan Cup (U13)', 'Des Nolan Cup', 'M', 'U13', 'OD', 0.4, 12.5, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('REP-12M', 'VMCU_REP', 'Keith Mitchell Shield', 'Keith Mitchell Shield', 'M', 'U12', 'Modified', 0.35, 11.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('REP-12M2', 'VMCU_REP', 'Josh Browne Plate', 'Josh Browne Plate', 'M', 'U12', 'Modified', 0.3, 11.0, 0.05, TRUE, '2nd tier U12');
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('REP-17F', 'VMCU_REP', 'Mel Jones Shield', 'Mel Jones Shield', 'F', 'U17', 'OD', 0.5, 15.5, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('REP-14F', 'VMCU_REP', 'Julie Savage Shield', 'Julie Savage Shield', 'F', 'U14', 'OD', 0.4, 13.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('REP-12F', 'VMCU_REP', 'Claudia Fatone Shield', 'Claudia Fatone Shield', 'F', 'U12', 'Modified', 0.3, 11.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('EN-CB', 'ENTRY', 'Woolworths Cricket Blast', NULL, 'Mixed', 'U7-U12', 'Modified', 0.12, 8.0, 0.05, TRUE, 'Participation');
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('EN-SC', 'ENTRY', 'School / In2Cricket', NULL, 'Mixed', 'Various', 'Modified', 0.12, 10.0, 0.05, TRUE, NULL);
INSERT INTO public.competition_tiers (code, tier, competition_name, shield_name, gender, age_group, format, cti_value, expected_midpoint_age, arm_sensitivity, active, notes) VALUES ('EN-NR', 'ENTRY', 'No Recorded History', NULL, 'Mixed', NULL, NULL, 0.1, 12.0, 0.05, TRUE, 'Default for new/unknown');



CREATE TABLE public.eligibility_rules (
    competition_code text PRIMARY KEY REFERENCES public.competition_tiers(code),
    competition_name text,
    eligibility text,
    excluded_from text,
    source text
);

INSERT INTO public.eligibility_rules (competition_code, competition_name, eligibility, excluded_from, source) VALUES ('P16M', 'Dowling Shield', '14-15 yrs at 1 Sep', 'Craig, Beitzel, Mackay, Savage shields', 'CV Pathway');
INSERT INTO public.eligibility_rules (competition_code, competition_name, eligibility, excluded_from, source) VALUES ('P15F', 'Marg Jennings Cup', '12-14 yrs at 1 Sep', 'Craig, Beitzel, Mackay, Savage shields', 'CV Pathway');
INSERT INTO public.eligibility_rules (competition_code, competition_name, eligibility, excluded_from, source) VALUES ('P18M', 'Premier U18 Male', '16-17 yrs at 1 Sep', 'Dowling/Marg Jennings', 'CV Pathway');
INSERT INTO public.eligibility_rules (competition_code, competition_name, eligibility, excluded_from, source) VALUES ('P18F', 'Premier U18 Female', '15-17 yrs at 1 Sep', 'Dowling/Marg Jennings', 'CV Pathway');
INSERT INTO public.eligibility_rules (competition_code, competition_name, eligibility, excluded_from, source) VALUES ('SD-15', 'J.G. Craig Shield', 'Under 15', 'Dowling/Marg Jennings', 'CV Pathway');
INSERT INTO public.eligibility_rules (competition_code, competition_name, eligibility, excluded_from, source) VALUES ('REP-*', 'VMCU Carnival shields', 'Per shield age group', 'Dowling/Marg Jennings', 'CV Pathway');
INSERT INTO public.eligibility_rules (competition_code, competition_name, eligibility, excluded_from, source) VALUES ('PA', 'Premier Academy', 'Club sets criteria', 'Only 1 academy at a time', 'CV Pathway');
INSERT INTO public.eligibility_rules (competition_code, competition_name, eligibility, excluded_from, source) VALUES ('VP-CC*', 'Country Cup', 'U16M/U15F country only', 'Not Barwon/SE Sharks regions', 'CV Pathway');




-- RLS FIX: Allow login flow and pre-auth data loading
-- Run in Supabase SQL Editor

-- ══════════════════════════════════════════════════════════════
-- FIX 1: Allow anon users to look up program_members for login
-- The signInWithUsername() function queries program_members BEFORE
-- the user is authenticated. We need a limited anon SELECT policy.
-- ══════════════════════════════════════════════════════════════

CREATE POLICY "Anon lookup for login" ON program_members
    FOR SELECT TO anon
    USING (true);

-- Members should also be able to read their own record
CREATE POLICY "Members read own record" ON program_members
    FOR SELECT TO authenticated
    USING (auth_user_id = auth.uid());


-- ══════════════════════════════════════════════════════════════
-- FIX 2: Allow anon users to read reference data
-- The app loads competition_tiers, vmcu_associations, vccl_regions,
-- engine_constants, etc. on mount BEFORE the user logs in.
-- These are read-only reference tables — safe for public read.
-- ══════════════════════════════════════════════════════════════

DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN 
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename IN (
            'competition_tiers', 'vmcu_associations', 'vccl_regions',
            'engine_constants', 'assessment_domains', 'domain_weights',
            'association_competitions', 'stat_benchmarks', 
            'stat_domain_weights', 'stat_sub_weights', 'skill_definitions',
            'eligibility_rules'
        )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Anon read reference data" ON %I', tbl);
        EXECUTE format('CREATE POLICY "Anon read reference data" ON %I FOR SELECT TO anon USING (true)', tbl);
    END LOOP;
END $$;


-- ══════════════════════════════════════════════════════════════
-- FIX 3: Allow upsert on user_profiles during auth
-- The upsertUserProfile() function runs immediately after login
-- to create/update the user's profile row. The current policy
-- only allows admin writes — users can't create their own profile.
-- ══════════════════════════════════════════════════════════════

CREATE POLICY "Users upsert own profile" ON user_profiles
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users update own profile" ON user_profiles
    FOR UPDATE TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);



-- SECURITY HARDENING MIGRATION
-- Generated by Antigravity
-- Run this in Supabase SQL Editor

-- 1. Enable 'admin' role in user_profiles
ALTER TABLE user_profiles DROP CONSTRAINT user_profiles_role_check;
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_role_check 
    CHECK (role IN ('player', 'coach', 'admin'));

-- 2. Set Admin User (Alex Lewis)
-- Using the email addresses found in App.jsx as admin candidates
UPDATE user_profiles 
SET role = 'admin' 
WHERE email IN ('alex.lewis@rra.internal', 'alex.lewis@rramelbourne.com');

-- 3. Enable RLS on all un-enabled tables
ALTER TABLE assessment_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE domain_weights ENABLE ROW LEVEL SECURITY;
ALTER TABLE competition_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE eligibility_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE vmcu_associations ENABLE ROW LEVEL SECURITY;
ALTER TABLE vccl_regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE association_competitions ENABLE ROW LEVEL SECURITY;
-- ensure others are enabled too (idempotent)
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE competition_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE engine_constants ENABLE ROW LEVEL SECURITY;
ALTER TABLE stat_benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE stat_domain_weights ENABLE ROW LEVEL SECURITY;
ALTER TABLE stat_sub_weights ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE squad_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE squad_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_definitions ENABLE ROW LEVEL SECURITY;

-- 4. Helper Function for Admin Check (Performance Oriented)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Helper Function for Coach Check
CREATE OR REPLACE FUNCTION public.is_coach()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND role = 'coach'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Clean up existing permissive policies
DROP POLICY IF EXISTS "Allow anon insert" ON applications;
DROP POLICY IF EXISTS "Allow public insert coach assessments" ON coach_assessments;
DROP POLICY IF EXISTS "Allow public update coach assessments" ON coach_assessments;
DROP POLICY IF EXISTS "Allow public upsert coach assessments" ON coach_assessments;
DROP POLICY IF EXISTS "Allow public delete competition grades" ON competition_grades;
DROP POLICY IF EXISTS "Allow public insert competition grades" ON competition_grades;
DROP POLICY IF EXISTS "Allow public insert players" ON players;
DROP POLICY IF EXISTS "Allow public update players" ON players;
-- Drop inefficient policies (to be replaced)
DROP POLICY IF EXISTS "Users read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "coaches_read_members" ON program_members;
DROP POLICY IF EXISTS "members_read_own" ON program_members;
DROP POLICY IF EXISTS "admin_read_analytics" ON analytics_events;
DROP POLICY IF EXISTS "users_insert_own_analytics" ON analytics_events;
DROP POLICY IF EXISTS "admin_manage_squad_groups" ON squad_groups;
DROP POLICY IF EXISTS "admin_manage_squad_allocations" ON squad_allocations;


-- 7. Define New Policies

-- A. Reference Data (Read-only for all Authenticated, Write for Admin)
-- Tables: assessment_domains, domain_weights, competition_tiers, eligibility_rules, vmcu_associations, vccl_regions, association_competitions, engine_constants, stat_benchmarks, stat_domain_weights, stat_sub_weights, skill_definitions

DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN 
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename IN ('assessment_domains', 'domain_weights', 'competition_tiers', 'eligibility_rules', 'vmcu_associations', 'vccl_regions', 'association_competitions', 'engine_constants', 'stat_benchmarks', 'stat_domain_weights', 'stat_sub_weights', 'skill_definitions')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Enable read access for authenticated users" ON %I', tbl);
        EXECUTE format('CREATE POLICY "Enable read access for authenticated users" ON %I FOR SELECT TO authenticated USING (true)', tbl);
        
        EXECUTE format('DROP POLICY IF EXISTS "Enable write access for admins" ON %I', tbl);
        EXECUTE format('CREATE POLICY "Enable write access for admins" ON %I FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin())', tbl);
    END LOOP;
END $$;


-- B. User Profiles
-- Admin: Full Access
-- Users: Read Own Only (No Update, per user request "Admin Only Changes")
CREATE POLICY "Admin manage all profiles" ON user_profiles
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Users read own profile" ON user_profiles
    FOR SELECT TO authenticated
    USING (auth.uid() = id);

-- C. Players Table
-- Admin: Full Access
-- Coach: Read All (to see roster) - but CANNOT EDIT
-- Player: Read Own. Update Own (Self Assessment only).
CREATE POLICY "Admin manage all players" ON players
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Coaches read all players" ON players
    FOR SELECT TO authenticated
    USING (public.is_coach());

CREATE POLICY "Players read own data" ON players
    FOR SELECT TO authenticated
    USING (auth.uid() = auth_user_id);

-- Trigger to prevent Players from updating non-assessment fields
CREATE OR REPLACE FUNCTION check_player_update_permissions()
RETURNS TRIGGER AS $$
BEGIN
  -- If user is admin, allow everything (handled by RLS mainly, but good safety)
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  -- If user is updating their own record
  IF auth.uid() = OLD.auth_user_id THEN
    -- Prevent changing core fields
    IF (NEW.name IS DISTINCT FROM OLD.name) OR
       (NEW.role IS DISTINCT FROM OLD.role) OR
       (NEW.club IS DISTINCT FROM OLD.club) OR
       (NEW.association IS DISTINCT FROM OLD.association) OR
       (NEW.dob IS DISTINCT FROM OLD.dob) OR
       (NEW.email IS DISTINCT FROM OLD.email) THEN
        RAISE EXCEPTION 'Players cannot edit core profile details (Name, Role, Club, DOB, Email). Contact Admin.';
    END IF;
    -- Allowed: self_ratings, voice_answers, goals, injury, phone, parent_details
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_player_update_permission ON players;
CREATE TRIGGER trg_player_update_permission
BEFORE UPDATE ON players
FOR EACH ROW EXECUTE FUNCTION check_player_update_permissions();

-- Allow players to update their own row (trigger restricts columns)
CREATE POLICY "Players update own data" ON players
    FOR UPDATE TO authenticated
    USING (auth.uid() = auth_user_id)
    WITH CHECK (auth.uid() = auth_user_id);


-- D. Coach Assessments
-- Admin: Full Access
-- Coach: Create/Update/Delete where they are the coach/allocator
-- Player: Read Own
CREATE POLICY "Admin manage assessments" ON coach_assessments
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Coaches manage own assessments" ON coach_assessments
    FOR ALL TO authenticated
    USING (auth.uid() = coach_id OR auth.uid() = allocated_by)
    WITH CHECK (auth.uid() = coach_id OR auth.uid() = allocated_by);

CREATE POLICY "Players read own assessments" ON coach_assessments
    FOR SELECT TO authenticated
    USING (exists (select 1 from players where players.id = coach_assessments.player_id and players.auth_user_id = auth.uid()));


-- E. Competition Grades (History)
-- Admin: Full Access
-- Player: Read Own
-- Coach: Read All (via Player association?) -> Coach needs to see player history.
CREATE POLICY "Admin manage comp grades" ON competition_grades
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Read comp grades" ON competition_grades
    FOR SELECT TO authenticated
    USING (
        -- Admin/Coach can read all (Coach needs to see history of any player)
        public.is_admin() OR public.is_coach() OR 
        -- Player reads own
        exists (select 1 from players where players.id = competition_grades.player_id and players.auth_user_id = auth.uid())
    );


-- F. Program Members & Squads
-- Admin: Full Access
CREATE POLICY "Admin manage program members" ON program_members
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Admin manage squad groups" ON squad_groups
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Admin manage squad allocations" ON squad_allocations
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Coaches Read Members/Squads? (Likely needed for dashboard roster)
CREATE POLICY "Coaches read program members" ON program_members
    FOR SELECT TO authenticated
    USING (public.is_coach());

CREATE POLICY "Coaches read squad groups" ON squad_groups
    FOR SELECT TO authenticated
    USING (public.is_coach());

CREATE POLICY "Coaches read squad allocations" ON squad_allocations
    FOR SELECT TO authenticated
    USING (public.is_coach());


-- G. Analytics
-- Admin: Read All
-- Users: Insert Own
CREATE POLICY "Admin read all analytics" ON analytics_events
    FOR SELECT TO authenticated
    USING (public.is_admin());

CREATE POLICY "Users insert own analytics" ON analytics_events
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- 8. Applications Table (Public Insert is actually OK for signups? Assuming 'applications' prevents unauthorized play)
-- Assuming 'applications' is for incoming non-authenticated users?
-- If users are NOT authenticated, RLS applies to 'anon'.
-- Existing policy was "Allow anon insert". This is probably fine if it's a signup form.
-- But we should restrict Update/Delete.
DROP POLICY IF EXISTS "Anon insert applications" ON applications;
CREATE POLICY "Anon insert applications" ON applications
    FOR INSERT TO anon
    WITH CHECK (true);

CREATE POLICY "Admin manage applications" ON applications
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());



-- ═══════════════════════════════════════════════════════════════════
-- SECURITY HARDENING & DATA INTEGRITY MIGRATION
-- Date: 2026-02-24
-- Scope: Phase 1 (Security) + Phase 2.1 (Assessment History)
-- ═══════════════════════════════════════════════════════════════════

-- ══════════════════════════════════════════════════════════════
-- 1. NARROWED LOGIN LOOKUP — Replace broad anon SELECT on program_members
--    with a security-definer function that returns ONLY login-required fields
-- ══════════════════════════════════════════════════════════════

-- Drop the overly permissive anon policy
DROP POLICY IF EXISTS "Anon lookup for login" ON program_members;

-- Create the restricted login lookup function
CREATE OR REPLACE FUNCTION public.lookup_member_for_login(p_username text)
RETURNS TABLE(auth_user_id uuid, role text, active boolean)
SECURITY DEFINER
SET search_path = public
LANGUAGE sql STABLE
AS $$
    SELECT pm.auth_user_id, pm.role, pm.active
    FROM program_members pm
    WHERE pm.username = lower(trim(p_username))
    LIMIT 1;
$$;

-- Grant anon access to call the function (but NOT direct table access)
GRANT EXECUTE ON FUNCTION public.lookup_member_for_login(text) TO anon;
GRANT EXECUTE ON FUNCTION public.lookup_member_for_login(text) TO authenticated;


-- ══════════════════════════════════════════════════════════════
-- 2. ASSESSMENT HISTORY TABLE — Preserve every version of coach assessments
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS assessment_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    assessment_data JSONB NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE assessment_history ENABLE ROW LEVEL SECURITY;

-- Coaches and admins can view assessment history
CREATE POLICY "Authenticated users can view assessment history"
    ON assessment_history FOR SELECT TO authenticated
    USING (true);

-- Only authenticated users can insert history records
CREATE POLICY "Authenticated users can insert assessment history"
    ON assessment_history FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = created_by);

-- Index for fast lookups by player
CREATE INDEX IF NOT EXISTS idx_assessment_history_player
    ON assessment_history(player_id);

CREATE INDEX IF NOT EXISTS idx_assessment_history_created
    ON assessment_history(created_at DESC);


-- ══════════════════════════════════════════════════════════════
-- 3. DATABASE INDEXES — Address the 14 unindexed foreign keys
-- ══════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_competition_grades_player ON competition_grades(player_id);
CREATE INDEX IF NOT EXISTS idx_coach_assessments_player ON coach_assessments(player_id);
CREATE INDEX IF NOT EXISTS idx_squad_allocations_squad ON squad_allocations(squad_id);
CREATE INDEX IF NOT EXISTS idx_squad_allocations_player ON squad_allocations(player_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_program ON sessions(program_id);
CREATE INDEX IF NOT EXISTS idx_session_activities_session ON session_activities(session_id);
CREATE INDEX IF NOT EXISTS idx_program_week_blocks_program ON program_week_blocks(program_id);
CREATE INDEX IF NOT EXISTS idx_coach_squad_access_squad ON coach_squad_access(squad_id);
CREATE INDEX IF NOT EXISTS idx_coach_squad_access_coach ON coach_squad_access(coach_id);
CREATE INDEX IF NOT EXISTS idx_players_auth_user ON players(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_program_members_auth_user ON program_members(auth_user_id);


-- ══════════════════════════════════════════════════════════════
-- 4. VERIFY — Run after migration to confirm
-- ══════════════════════════════════════════════════════════════

-- Check RLS is enabled on new table:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'assessment_history';

-- Test the login lookup function:
-- SELECT * FROM lookup_member_for_login('testuser');

-- Verify indexes created:
-- SELECT indexname FROM pg_indexes WHERE schemaname = 'public' ORDER BY indexname;


-- ══════════════════════════════════════════════════════════════
-- 5. SELF-SERVICE REGISTRATION — Security-definer signup RPC
--    Allows new players/coaches to register via invite links.
--    Role is hardcoded to 'player' or 'coach' — admin self-registration is impossible.
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.register_new_user(
    p_username text,
    p_role text
)
RETURNS jsonb
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    v_existing_id uuid;
BEGIN
    -- Validate role (NEVER allow admin/super_admin self-registration)
    IF p_role NOT IN ('player', 'coach') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid role');
    END IF;

    -- Validate username format
    IF length(trim(p_username)) < 3 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Username must be at least 3 characters');
    END IF;

    -- Check username uniqueness
    SELECT auth_user_id INTO v_existing_id
    FROM program_members
    WHERE username = lower(trim(p_username));

    IF v_existing_id IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Username already taken');
    END IF;

    -- Insert member record linked to the current auth user
    INSERT INTO program_members (username, role, active, auth_user_id)
    VALUES (lower(trim(p_username)), p_role, true, auth.uid());

    RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_new_user(text, text) TO authenticated;
