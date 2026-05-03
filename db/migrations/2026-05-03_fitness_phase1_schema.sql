-- =============================================================================
-- Fitness Tracking — Phase 1: Additive Schema + Seed
-- =============================================================================
-- Purpose:
--   Adds 5 new tables to support the 10-week, 2-sessions-per-week fitness
--   program. NO existing tables are modified. NO data is touched.
--
-- Cohort gate (load-bearing):
--   Players can only INSERT fitness logs if their `players` row has
--   submitted = true. Enforced in the database via row-level security so
--   no client-side bug can bypass it.
--
-- Rollback:
--   Drop the 5 tables in reverse dependency order (script at the bottom of
--   this file, commented out). No data migration needed.
--
-- Tables created:
--   1. fitness_programs           — one row per program (currently: Kneadasoothe 2026)
--   2. fitness_program_blocks     — session templates (Day 1, Day 2) per program
--   3. fitness_program_enrolment  — one row per player enrolled in a program
--   4. fitness_session_logs       — one row per player per session completed
--   5. fitness_badges_awarded     — one row per badge earned by a player
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. fitness_programs
--   The top-level program metadata. One row per program. Admin-editable.
-- -----------------------------------------------------------------------------
CREATE TABLE public.fitness_programs (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name                text NOT NULL,
    slug                text NOT NULL UNIQUE,
    description         text,
    total_weeks         integer NOT NULL DEFAULT 10
                          CHECK (total_weeks BETWEEN 1 AND 52),
    sessions_per_week   integer NOT NULL DEFAULT 2
                          CHECK (sessions_per_week BETWEEN 1 AND 7),
    activation_block    jsonb NOT NULL DEFAULT '[]'::jsonb,
    is_active           boolean NOT NULL DEFAULT true,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX fitness_programs_active_idx
    ON public.fitness_programs (is_active) WHERE is_active = true;

COMMENT ON TABLE public.fitness_programs IS
    'Top-level fitness program (e.g. Kneadasoothe Royals Academy Home Program 2026). Admin-editable.';
COMMENT ON COLUMN public.fitness_programs.activation_block IS
    'JSON array of warm-up movements every session opens with. Shape: [{ "id":"hip_bridges", "name":"Hip Bridges", "prescription":"12 reps" }, ...]';

-- -----------------------------------------------------------------------------
-- 2. fitness_program_blocks
--   Session templates. For Kneadasoothe: 2 rows (Day 1 = Full Body 1,
--   Day 2 = Full Body 2). Each row holds the full exercise list.
-- -----------------------------------------------------------------------------
CREATE TABLE public.fitness_program_blocks (
    id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id               uuid NOT NULL
                               REFERENCES public.fitness_programs(id) ON DELETE CASCADE,
    day_number               integer NOT NULL CHECK (day_number BETWEEN 1 AND 7),
    day_label                text NOT NULL,
    duration_minutes_target  integer NOT NULL DEFAULT 25,
    rest_seconds             integer NOT NULL DEFAULT 45,
    exercises                jsonb NOT NULL DEFAULT '[]'::jsonb,
    applies_to_weeks         integer[] NOT NULL
                               DEFAULT ARRAY[1,2,3,4,5,6,7,8,9,10],
    is_active                boolean NOT NULL DEFAULT true,
    display_order            integer NOT NULL DEFAULT 0,
    created_at               timestamptz NOT NULL DEFAULT now(),
    updated_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX fitness_program_blocks_program_idx
    ON public.fitness_program_blocks (program_id, day_number);

COMMENT ON TABLE public.fitness_program_blocks IS
    'Session templates per program. For the current Kneadasoothe program, 2 blocks (Day 1, Day 2) cover all 10 weeks.';
COMMENT ON COLUMN public.fitness_program_blocks.exercises IS
    'JSON array. Shape: [{ "id":"jumping_squats", "category":"LB Power", "name":"Jumping Squats", "prescription":"4x8", "tip":"...", "demo_url":null }, ...]';
COMMENT ON COLUMN public.fitness_program_blocks.applies_to_weeks IS
    'Which weeks of the program this block applies to. Lets a future program have different Week 1-3 vs Week 4-10 prescriptions.';

-- -----------------------------------------------------------------------------
-- 3. fitness_program_enrolment
--   One row per player per program. Tracks start date (week 1 begins),
--   current status, and provides the canary gate for Phase 3 rollout.
-- -----------------------------------------------------------------------------
CREATE TABLE public.fitness_program_enrolment (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id      uuid NOT NULL
                      REFERENCES public.fitness_programs(id) ON DELETE RESTRICT,
    auth_user_id    uuid NOT NULL,
    player_id       uuid NOT NULL
                      REFERENCES public.players(id) ON DELETE CASCADE,
    start_date      date NOT NULL,
    status          text NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active','complete','withdrawn','paused')),
    canary_enabled  boolean NOT NULL DEFAULT false,
    enrolled_by     uuid,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    UNIQUE (program_id, auth_user_id)
);

CREATE INDEX fitness_program_enrolment_player_idx
    ON public.fitness_program_enrolment (player_id);
CREATE INDEX fitness_program_enrolment_status_idx
    ON public.fitness_program_enrolment (status) WHERE status = 'active';

COMMENT ON TABLE public.fitness_program_enrolment IS
    'One row per player per program. Created by admin (or auto-enrolment on Phase 6). canary_enabled flips the player into the Phase 3 canary group.';

-- -----------------------------------------------------------------------------
-- 4. fitness_session_logs
--   One row per player per session completed. The player's actual log.
--   Stores week + day so catch-up entries (logging week 3 on week 5) work.
-- -----------------------------------------------------------------------------
CREATE TABLE public.fitness_session_logs (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    enrolment_id            uuid NOT NULL
                              REFERENCES public.fitness_program_enrolment(id) ON DELETE CASCADE,
    block_id                uuid NOT NULL
                              REFERENCES public.fitness_program_blocks(id) ON DELETE RESTRICT,
    week_number             integer NOT NULL CHECK (week_number BETWEEN 1 AND 52),
    day_number              integer NOT NULL CHECK (day_number BETWEEN 1 AND 7),
    auth_user_id            uuid NOT NULL,
    player_id               uuid NOT NULL
                              REFERENCES public.players(id) ON DELETE CASCADE,
    activation_done         jsonb NOT NULL DEFAULT '{}'::jsonb,
    exercise_logs           jsonb NOT NULL DEFAULT '[]'::jsonb,
    prescription_snapshot   jsonb NOT NULL DEFAULT '{}'::jsonb,
    notes                   text,
    modification_notes      text,
    completed_at            timestamptz NOT NULL DEFAULT now(),
    logged_on_time          boolean NOT NULL DEFAULT true,
    catch_up_for_week       integer,
    logged_by_user_id       uuid NOT NULL,
    logged_by_role          text NOT NULL DEFAULT 'player'
                              CHECK (logged_by_role IN ('player','coach','admin','super_admin')),
    created_at              timestamptz NOT NULL DEFAULT now(),
    updated_at              timestamptz NOT NULL DEFAULT now(),
    UNIQUE (enrolment_id, week_number, day_number)
);

CREATE INDEX fitness_session_logs_player_idx
    ON public.fitness_session_logs (player_id, completed_at DESC);
CREATE INDEX fitness_session_logs_enrolment_idx
    ON public.fitness_session_logs (enrolment_id, week_number, day_number);

COMMENT ON TABLE public.fitness_session_logs IS
    'One row per player per session completed. UNIQUE constraint prevents double-logging the same week+day. logged_by_role tags coach-on-behalf saves so analytics can exclude them from on-time stats.';
COMMENT ON COLUMN public.fitness_session_logs.exercise_logs IS
    'JSON array of per-exercise set logs. Shape: [{ "exercise_id":"jumping_squats", "sets":[{ "set_number":1, "completed":true, "actual_reps":8 }, ...] }, ...]';
COMMENT ON COLUMN public.fitness_session_logs.prescription_snapshot IS
    'Frozen copy of the block exercises at log time. Protects historical logs if the program is edited mid-cohort.';

-- -----------------------------------------------------------------------------
-- 5. fitness_badges_awarded
--   One row per badge earned. Permanent record (computed-on-the-fly badges
--   risk silently disappearing if logs are corrected). Most badges are
--   one-time per enrolment; "perfect_week" is repeatable, hence the partial
--   unique index.
-- -----------------------------------------------------------------------------
CREATE TABLE public.fitness_badges_awarded (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    enrolment_id        uuid NOT NULL
                          REFERENCES public.fitness_program_enrolment(id) ON DELETE CASCADE,
    auth_user_id        uuid NOT NULL,
    player_id           uuid NOT NULL
                          REFERENCES public.players(id) ON DELETE CASCADE,
    badge_key           text NOT NULL,
    awarded_at          timestamptz NOT NULL DEFAULT now(),
    qualifying_log_id   uuid REFERENCES public.fitness_session_logs(id) ON DELETE SET NULL,
    metadata            jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at          timestamptz NOT NULL DEFAULT now()
);

-- One-time badges: unique per (enrolment, badge_key).
-- Perfect Week is repeatable (one per qualifying week), so we let it through.
CREATE UNIQUE INDEX fitness_badges_awarded_one_time_unique
    ON public.fitness_badges_awarded (enrolment_id, badge_key)
    WHERE badge_key <> 'perfect_week';

CREATE INDEX fitness_badges_awarded_player_idx
    ON public.fitness_badges_awarded (player_id, awarded_at DESC);

COMMENT ON TABLE public.fitness_badges_awarded IS
    'Permanent badge record. badge_key values: first_step, week_one_down, halfway, perfect_week (repeatable), catch_up, power_player, core_strong, iron_cricketer.';

-- =============================================================================
-- ROW LEVEL SECURITY
--   Enable RLS on every new table.
--   Mirror the weekly_reflections pattern with one extra rule: a player
--   can only INSERT a fitness_session_log if their players row has
--   submitted = true.
-- =============================================================================

ALTER TABLE public.fitness_programs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fitness_program_blocks     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fitness_program_enrolment  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fitness_session_logs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fitness_badges_awarded     ENABLE ROW LEVEL SECURITY;

-- ------ fitness_programs -----------------------------------------------------
-- Any authenticated user can read active programs (player needs to know
-- the program structure). Only coach/admin can write.
CREATE POLICY "Authenticated read active programs"
    ON public.fitness_programs FOR SELECT TO authenticated
    USING (is_active = true OR public.user_is_coach_or_admin());

CREATE POLICY "Coaches/admins manage programs (insert)"
    ON public.fitness_programs FOR INSERT TO authenticated
    WITH CHECK (public.user_is_coach_or_admin());

CREATE POLICY "Coaches/admins manage programs (update)"
    ON public.fitness_programs FOR UPDATE TO authenticated
    USING (public.user_is_coach_or_admin())
    WITH CHECK (public.user_is_coach_or_admin());

CREATE POLICY "Coaches/admins manage programs (delete)"
    ON public.fitness_programs FOR DELETE TO authenticated
    USING (public.user_is_coach_or_admin());

-- ------ fitness_program_blocks -----------------------------------------------
-- Any authenticated user can read active blocks of an active program.
-- Only coach/admin can write.
CREATE POLICY "Authenticated read active blocks"
    ON public.fitness_program_blocks FOR SELECT TO authenticated
    USING (
        is_active = true
        OR public.user_is_coach_or_admin()
    );

CREATE POLICY "Coaches/admins manage blocks (insert)"
    ON public.fitness_program_blocks FOR INSERT TO authenticated
    WITH CHECK (public.user_is_coach_or_admin());

CREATE POLICY "Coaches/admins manage blocks (update)"
    ON public.fitness_program_blocks FOR UPDATE TO authenticated
    USING (public.user_is_coach_or_admin())
    WITH CHECK (public.user_is_coach_or_admin());

CREATE POLICY "Coaches/admins manage blocks (delete)"
    ON public.fitness_program_blocks FOR DELETE TO authenticated
    USING (public.user_is_coach_or_admin());

-- ------ fitness_program_enrolment --------------------------------------------
-- Player reads own. Coach/admin reads all and manages writes.
CREATE POLICY "Players read own enrolment"
    ON public.fitness_program_enrolment FOR SELECT TO authenticated
    USING (auth.uid() = auth_user_id);

CREATE POLICY "Coaches/admins read all enrolments"
    ON public.fitness_program_enrolment FOR SELECT TO authenticated
    USING (public.user_is_coach_or_admin());

CREATE POLICY "Coaches/admins manage enrolments (insert)"
    ON public.fitness_program_enrolment FOR INSERT TO authenticated
    WITH CHECK (public.user_is_coach_or_admin());

CREATE POLICY "Coaches/admins manage enrolments (update)"
    ON public.fitness_program_enrolment FOR UPDATE TO authenticated
    USING (public.user_is_coach_or_admin())
    WITH CHECK (public.user_is_coach_or_admin());

-- ------ fitness_session_logs (THE CRITICAL ONE) ------------------------------
-- Players read/write own logs ONLY IF they are submitted=true players.
-- Coaches/admins read all and may log on behalf of a player.

CREATE POLICY "Players read own logs"
    ON public.fitness_session_logs FOR SELECT TO authenticated
    USING (auth.uid() = auth_user_id);

CREATE POLICY "Coaches/admins read all logs"
    ON public.fitness_session_logs FOR SELECT TO authenticated
    USING (public.user_is_coach_or_admin());

-- *** Cohort gate enforced here: only submitted-DNA-Profile players can insert. ***
CREATE POLICY "Players insert own logs (submitted only)"
    ON public.fitness_session_logs FOR INSERT TO authenticated
    WITH CHECK (
        auth.uid() = auth_user_id
        AND EXISTS (
            SELECT 1 FROM public.players p
            WHERE p.auth_user_id = auth.uid()
              AND p.submitted = true
        )
    );

CREATE POLICY "Players update own logs"
    ON public.fitness_session_logs FOR UPDATE TO authenticated
    USING (auth.uid() = auth_user_id)
    WITH CHECK (auth.uid() = auth_user_id);

CREATE POLICY "Coaches/admins insert logs on behalf"
    ON public.fitness_session_logs FOR INSERT TO authenticated
    WITH CHECK (public.user_is_coach_or_admin());

CREATE POLICY "Coaches/admins update logs"
    ON public.fitness_session_logs FOR UPDATE TO authenticated
    USING (public.user_is_coach_or_admin())
    WITH CHECK (public.user_is_coach_or_admin());

CREATE POLICY "Coaches/admins delete logs"
    ON public.fitness_session_logs FOR DELETE TO authenticated
    USING (public.user_is_coach_or_admin());

-- ------ fitness_badges_awarded -----------------------------------------------
-- Players read own badges. Coach/admin reads all and writes (via SECURITY
-- DEFINER functions added in Phase 5; for Phase 1 we just allow direct
-- coach/admin writes so testing is unblocked).
CREATE POLICY "Players read own badges"
    ON public.fitness_badges_awarded FOR SELECT TO authenticated
    USING (auth.uid() = auth_user_id);

CREATE POLICY "Coaches/admins read all badges"
    ON public.fitness_badges_awarded FOR SELECT TO authenticated
    USING (public.user_is_coach_or_admin());

CREATE POLICY "Coaches/admins write badges"
    ON public.fitness_badges_awarded FOR INSERT TO authenticated
    WITH CHECK (public.user_is_coach_or_admin());

CREATE POLICY "Coaches/admins update badges"
    ON public.fitness_badges_awarded FOR UPDATE TO authenticated
    USING (public.user_is_coach_or_admin())
    WITH CHECK (public.user_is_coach_or_admin());

-- =============================================================================
-- SEED DATA — Kneadasoothe Royals Academy Home Program 2026
-- =============================================================================

-- Program
INSERT INTO public.fitness_programs (slug, name, description, total_weeks, sessions_per_week, activation_block, is_active)
VALUES (
    'kneadasoothe-royals-academy-2026',
    'Royals Academy Home Program 2026 (Kneadasoothe)',
    'Ten-week, two-sessions-per-week home program. Day 1 (Full Body 1) + Day 2 (Full Body 2). 20-30 minutes per session.',
    10,
    2,
    '[
        { "id":"hip_bridges",       "category":"Lower Body Activation", "name":"Hip Bridges",       "prescription":"12 reps" },
        { "id":"banded_pull_apart", "category":"Upper Body Activation", "name":"Banded Pull Apart", "prescription":"12 reps" },
        { "id":"star_jumps",        "category":"Warm Up",               "name":"Star Jumps",        "prescription":"60 seconds" }
    ]'::jsonb,
    true
);

-- Day 1 — Full Body 1
INSERT INTO public.fitness_program_blocks (
    program_id, day_number, day_label, duration_minutes_target, rest_seconds, applies_to_weeks, display_order, exercises
)
SELECT
    p.id,
    1,
    'Full Body 1',
    25,
    45,
    ARRAY[1,2,3,4,5,6,7,8,9,10],
    1,
    '[
        { "id":"jumping_squats",       "category":"Lower Body Power",    "name":"Jumping Squats",         "prescription":"4x8",   "prescribed_sets":4, "prescribed_reps":"8" },
        { "id":"bulgarian_split_squat","category":"Lower Body Strength", "name":"Bulgarian Split Squat",  "prescription":"3x10es","prescribed_sets":3, "prescribed_reps":"10 each side" },
        { "id":"depth_drop_pushup",    "category":"Upper Body Power",    "name":"Depth Drop Power Push Up","prescription":"4x8",  "prescribed_sets":4, "prescribed_reps":"8" },
        { "id":"push_ups",             "category":"Upper Body Strength", "name":"Push Ups",               "prescription":"3x10",  "prescribed_sets":3, "prescribed_reps":"10" },
        { "id":"mountain_climbers_palof","category":"Core Power",        "name":"Mountain Climbers / Banded Palof Rotations","prescription":"4x8","prescribed_sets":4,"prescribed_reps":"8" },
        { "id":"russian_rotations",    "category":"Core Strength",       "name":"Russian Rotations",      "prescription":"3x10",  "prescribed_sets":3, "prescribed_reps":"10" }
    ]'::jsonb
FROM public.fitness_programs p WHERE p.slug = 'kneadasoothe-royals-academy-2026';

-- Day 2 — Full Body 2
INSERT INTO public.fitness_program_blocks (
    program_id, day_number, day_label, duration_minutes_target, rest_seconds, applies_to_weeks, display_order, exercises
)
SELECT
    p.id,
    2,
    'Full Body 2',
    25,
    45,
    ARRAY[1,2,3,4,5,6,7,8,9,10],
    2,
    '[
        { "id":"alternating_jumping_lunges","category":"Lower Body Power",    "name":"Alternating Jumping Lunges","prescription":"4x8es","prescribed_sets":4,"prescribed_reps":"8 each side" },
        { "id":"kneel_to_step_up",         "category":"Lower Body Strength", "name":"Kneel to Step Up",         "prescription":"3x10es","prescribed_sets":3,"prescribed_reps":"10 each side" },
        { "id":"renegade_row_shoulder_taps","category":"Upper Body Power",   "name":"Renegade Row / Shoulder Taps","prescription":"4x8es","prescribed_sets":4,"prescribed_reps":"8 each side" },
        { "id":"body_row_superman",        "category":"Upper Body Strength", "name":"Body Row / Superman Hold", "prescription":"3x10/60sec","prescribed_sets":3,"prescribed_reps":"10 reps or 60 sec" },
        { "id":"neg_leg_raises_palof_press","category":"Core Power",         "name":"Negative Assisted Leg Raises / Banded Palof Press","prescription":"4x8","prescribed_sets":4,"prescribed_reps":"8" },
        { "id":"oblique_plank_crunch",     "category":"Core Strength",       "name":"Oblique Plank Crunch",     "prescription":"3x10es","prescribed_sets":3,"prescribed_reps":"10 each side" }
    ]'::jsonb
FROM public.fitness_programs p WHERE p.slug = 'kneadasoothe-royals-academy-2026';

COMMIT;

-- =============================================================================
-- ROLLBACK (uncomment and run if Phase 1 needs to be undone)
-- =============================================================================
-- BEGIN;
-- DROP TABLE IF EXISTS public.fitness_badges_awarded     CASCADE;
-- DROP TABLE IF EXISTS public.fitness_session_logs       CASCADE;
-- DROP TABLE IF EXISTS public.fitness_program_enrolment  CASCADE;
-- DROP TABLE IF EXISTS public.fitness_program_blocks     CASCADE;
-- DROP TABLE IF EXISTS public.fitness_programs           CASCADE;
-- COMMIT;
