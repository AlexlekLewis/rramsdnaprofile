-- =============================================================================
-- Fitness Tracking — Program v3 update (Kneadasoothe revised spreadsheet)
-- =============================================================================
-- Source: ROYALS 2025/Coaching Planning/Royals Home Program.xlsx (sheet "Program 3").
-- YouTube demo links intentionally not stored.
--
-- Changes:
--   1. Activation block:
--        - Hip Bridges: 12 reps → 20 reps
--        - Upper body activation: Banded Pull Apart (12 reps) → Arm Circles (20 reps)
--        - Star Jumps: 60 seconds → 20 reps
--   2. Day 1 Core Power: 4x8 → 4x8es
--   3. Day 1 Core Strength: 3x10 → 3x10es
--   4. Day 2: unchanged
--   5. NEW Day 3 — Conditioning (Aerobic / Acceleration / Anaerobic / Stretch)
--   6. sessions_per_week: 2 → 3
--
-- Existing session logs are protected: their prescription_snapshot was
-- frozen at save time, so historical data still shows the prescription
-- they actually trained against.
-- =============================================================================

BEGIN;

-- 1+6. Program-level updates: activation block + sessions_per_week + description
UPDATE public.fitness_programs
SET
    activation_block = '[
        { "id":"hip_bridges",  "category":"Lower Body Activation", "name":"Hip Bridges",  "prescription":"20 reps" },
        { "id":"arm_circles",  "category":"Upper Body Activation", "name":"Arm Circles",  "prescription":"20 reps" },
        { "id":"star_jumps",   "category":"Warm Up",                "name":"Star Jumps",   "prescription":"20 reps" }
    ]'::jsonb,
    sessions_per_week = 3,
    description = 'Ten-week, three-sessions-per-week home program. Day 1 (Full Body 1) + Day 2 (Full Body 2) + Day 3 (Conditioning).',
    updated_at = now()
WHERE slug = 'kneadasoothe-royals-academy-2026';

-- 2+3. Day 1 update — Core Power and Core Strength prescriptions add "es"
UPDATE public.fitness_program_blocks
SET
    exercises = '[
        { "id":"jumping_squats",         "category":"Lower Body Power",    "name":"Jumping Squats",         "prescription":"4x8",   "prescribed_sets":4, "prescribed_reps":"8" },
        { "id":"bulgarian_split_squat",  "category":"Lower Body Strength", "name":"Bulgarian Split Squat",  "prescription":"3x10es","prescribed_sets":3, "prescribed_reps":"10 each side" },
        { "id":"depth_drop_pushup",      "category":"Upper Body Power",    "name":"Depth Drop Power Push Up","prescription":"4x8", "prescribed_sets":4, "prescribed_reps":"8" },
        { "id":"push_ups",               "category":"Upper Body Strength", "name":"Push Ups",                "prescription":"3x10", "prescribed_sets":3, "prescribed_reps":"10" },
        { "id":"mountain_climbers_palof","category":"Core Power",          "name":"Mountain Climbers / Banded Palof Rotations","prescription":"4x8es","prescribed_sets":4,"prescribed_reps":"8 each side" },
        { "id":"russian_rotations",      "category":"Core Strength",       "name":"Russian Rotations",       "prescription":"3x10es","prescribed_sets":3,"prescribed_reps":"10 each side" }
    ]'::jsonb,
    updated_at = now()
WHERE day_number = 1
  AND program_id = (SELECT id FROM public.fitness_programs WHERE slug = 'kneadasoothe-royals-academy-2026');

-- 5. Insert Day 3 — Conditioning (idempotent via UNIQUE on program+day)
INSERT INTO public.fitness_program_blocks (
    program_id, day_number, day_label, duration_minutes_target, rest_seconds,
    applies_to_weeks, display_order, exercises, is_active
)
SELECT
    p.id, 3, 'Conditioning', 35, 60, ARRAY[1,2,3,4,5,6,7,8,9,10], 3,
    '[
        { "id":"aerobic_run_20min",         "category":"Aerobic",       "name":"20-minute Run",         "prescription":"1 x 20 min",        "prescribed_sets":1, "prescribed_reps":"20 minutes" },
        { "id":"acceleration_10m_sprints",  "category":"Acceleration",  "name":"10 m Sprints",          "prescription":"20 x 10 m sprints", "prescribed_sets":1, "prescribed_reps":"20 sprints" },
        { "id":"anaerobic_20m_sprints",     "category":"Anaerobic",     "name":"20 m Sprints",          "prescription":"10 x 20 m sprints", "prescribed_sets":1, "prescribed_reps":"10 sprints" },
        { "id":"full_body_stretch",         "category":"Stretch",       "name":"Full Body Stretch",     "prescription":"Full body routine", "prescribed_sets":1, "prescribed_reps":"as needed" }
    ]'::jsonb,
    true
FROM public.fitness_programs p
WHERE p.slug = 'kneadasoothe-royals-academy-2026'
  AND NOT EXISTS (
      SELECT 1 FROM public.fitness_program_blocks b
      WHERE b.program_id = p.id AND b.day_number = 3
  );

COMMIT;

-- =============================================================================
-- ROLLBACK (commented; restores the v2 program)
-- =============================================================================
-- BEGIN;
-- DELETE FROM public.fitness_program_blocks
-- WHERE day_number = 3
--   AND program_id = (SELECT id FROM public.fitness_programs WHERE slug = 'kneadasoothe-royals-academy-2026');
--
-- UPDATE public.fitness_program_blocks
-- SET exercises = '[
--     { "id":"jumping_squats", ...4x8...},
--     { "id":"mountain_climbers_palof", ..."prescription":"4x8"...},
--     { "id":"russian_rotations", ..."prescription":"3x10"...}
--   ]'::jsonb
-- WHERE day_number = 1 AND program_id = (...);
--
-- UPDATE public.fitness_programs
-- SET activation_block = '[hip_bridges 12 reps, banded_pull_apart 12 reps, star_jumps 60 seconds]'::jsonb,
--     sessions_per_week = 2
-- WHERE slug = 'kneadasoothe-royals-academy-2026';
-- COMMIT;
