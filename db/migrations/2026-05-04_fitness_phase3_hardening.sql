-- =============================================================================
-- Fitness Tracking — Phase 3 hardening
-- =============================================================================
-- Closes server-side trust gaps surfaced by dev-team review:
--   H1  player_id / enrolment_id tampering on INSERT
--   H2  logged_by_role tampering (player self-stamps as 'admin')
--   H3  logged_on_time / catch_up_for_week tampering (streak gaming)
--   M1  prescription_snapshot tampering (client supplies arbitrary JSON)
--   M2  UPDATE policy doesn't re-check submitted; immutable fields not protected
--   DB  unique-constraint race on duplicate-Save (use upsert)
--
-- Approach:
--   1. SECURITY DEFINER RPC `fitness_log_session_for_self` derives every
--      sensitive field server-side from auth.uid() + the canonical
--      enrolment + block rows. Client only supplies activity data.
--   2. Tightened UPDATE policy on fitness_session_logs.
--   3. Trigger on UPDATE prevents the player from rewriting derived fields.
--   4. Cohort-scope index for cohort-summary queries.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Helper: compute current week from a start date
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fitness_compute_current_week(
    start_date date,
    total_weeks integer DEFAULT 10
)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT GREATEST(
        1,
        LEAST(
            total_weeks,
            ((CURRENT_DATE - start_date) / 7) + 1
        )
    )::integer;
$$;

COMMENT ON FUNCTION public.fitness_compute_current_week IS
    'Pure: returns week number 1..total_weeks given enrolment start_date.';

-- -----------------------------------------------------------------------------
-- 2. SECURITY DEFINER RPC for player-side session logging
--    Owns the derivation of every trust-sensitive field.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fitness_log_session_for_self(
    p_enrolment_id uuid,
    p_block_id     uuid,
    p_week_number  integer,
    p_exercise_logs jsonb,
    p_activation_done jsonb,
    p_notes text,
    p_modification_notes text,
    p_existing_log_id uuid DEFAULT NULL
)
RETURNS public.fitness_session_logs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller        uuid := auth.uid();
    v_enrolment     public.fitness_program_enrolment%ROWTYPE;
    v_block         public.fitness_program_blocks%ROWTYPE;
    v_program       public.fitness_programs%ROWTYPE;
    v_player        public.players%ROWTYPE;
    v_current_week  integer;
    v_on_time       boolean;
    v_catch_up_for  integer;
    v_snapshot      jsonb;
    v_row           public.fitness_session_logs;
BEGIN
    IF v_caller IS NULL THEN
        RAISE EXCEPTION 'fitness_log_session_for_self: not authenticated';
    END IF;

    -- 1. Enrolment must belong to caller and be active.
    SELECT * INTO v_enrolment
    FROM public.fitness_program_enrolment
    WHERE id = p_enrolment_id
      AND auth_user_id = v_caller
      AND status = 'active';
    IF v_enrolment.id IS NULL THEN
        RAISE EXCEPTION 'fitness_log_session_for_self: enrolment not found or not yours';
    END IF;

    -- 2. Player row must exist and be submitted=true.
    SELECT * INTO v_player
    FROM public.players
    WHERE id = v_enrolment.player_id
      AND auth_user_id = v_caller
      AND submitted = true;
    IF v_player.id IS NULL THEN
        RAISE EXCEPTION 'fitness_log_session_for_self: player profile not submitted';
    END IF;

    -- 3. Block must exist, be active, and belong to the same program.
    SELECT * INTO v_block
    FROM public.fitness_program_blocks
    WHERE id = p_block_id
      AND program_id = v_enrolment.program_id
      AND is_active = true;
    IF v_block.id IS NULL THEN
        RAISE EXCEPTION 'fitness_log_session_for_self: block not found or inactive';
    END IF;

    -- 4. Week number must be within program range and within block applicability.
    SELECT * INTO v_program FROM public.fitness_programs WHERE id = v_enrolment.program_id;
    IF p_week_number < 1 OR p_week_number > v_program.total_weeks THEN
        RAISE EXCEPTION 'fitness_log_session_for_self: week_number out of range';
    END IF;
    IF NOT (p_week_number = ANY (v_block.applies_to_weeks)) THEN
        RAISE EXCEPTION 'fitness_log_session_for_self: block does not apply to that week';
    END IF;

    -- 5. Server-derived trust-sensitive fields.
    v_current_week := public.fitness_compute_current_week(v_enrolment.start_date, v_program.total_weeks);
    v_on_time      := (p_week_number = v_current_week);
    v_catch_up_for := CASE WHEN v_on_time THEN NULL ELSE p_week_number END;

    v_snapshot := jsonb_build_object(
        'exercises',   COALESCE(v_block.exercises, '[]'::jsonb),
        'activation',  COALESCE(v_program.activation_block, '[]'::jsonb),
        'day_label',   v_block.day_label,
        'day_number',  v_block.day_number,
        'rest_seconds', v_block.rest_seconds
    );

    -- 6. Upsert. UNIQUE (enrolment_id, week_number, day_number) means we
    --    naturally idempotent-update on conflict. Client can also pass
    --    p_existing_log_id but it's only a UI optimisation; the constraint
    --    is the real authority.
    INSERT INTO public.fitness_session_logs (
        enrolment_id, block_id, week_number, day_number,
        auth_user_id, player_id,
        activation_done, exercise_logs, prescription_snapshot,
        notes, modification_notes,
        completed_at, logged_on_time, catch_up_for_week,
        logged_by_user_id, logged_by_role
    ) VALUES (
        v_enrolment.id, v_block.id, p_week_number, v_block.day_number,
        v_caller, v_enrolment.player_id,
        COALESCE(p_activation_done, '{}'::jsonb),
        COALESCE(p_exercise_logs, '[]'::jsonb),
        v_snapshot,
        NULLIF(TRIM(COALESCE(p_notes, '')), ''),
        NULLIF(TRIM(COALESCE(p_modification_notes, '')), ''),
        now(), v_on_time, v_catch_up_for,
        v_caller, 'player'
    )
    ON CONFLICT (enrolment_id, week_number, day_number) DO UPDATE
    SET
        block_id              = EXCLUDED.block_id,
        activation_done       = EXCLUDED.activation_done,
        exercise_logs         = EXCLUDED.exercise_logs,
        prescription_snapshot = EXCLUDED.prescription_snapshot,
        notes                 = EXCLUDED.notes,
        modification_notes    = EXCLUDED.modification_notes,
        completed_at          = EXCLUDED.completed_at,
        logged_on_time        = EXCLUDED.logged_on_time,
        catch_up_for_week     = EXCLUDED.catch_up_for_week,
        logged_by_user_id     = EXCLUDED.logged_by_user_id,
        logged_by_role        = EXCLUDED.logged_by_role,
        updated_at            = now()
    RETURNING * INTO v_row;

    RETURN v_row;
END;
$$;

COMMENT ON FUNCTION public.fitness_log_session_for_self IS
    'Player self-log path. Validates ownership + submitted=true, derives logged_on_time, catch_up_for_week, prescription_snapshot, logged_by_role server-side. Upserts on the (enrolment, week, day) unique key. Client cannot tamper with derived fields.';

-- Permission: any authenticated user may call. RLS inside the function is
-- enforced by the explicit checks against auth.uid(). The function bypasses
-- the table's player INSERT policy via SECURITY DEFINER.
REVOKE ALL ON FUNCTION public.fitness_log_session_for_self FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fitness_log_session_for_self TO authenticated;

-- -----------------------------------------------------------------------------
-- 3. Tighten UPDATE policy: re-check submitted=true on player UPDATE.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Players update own logs" ON public.fitness_session_logs;
CREATE POLICY "Players update own logs (submitted only)"
    ON public.fitness_session_logs FOR UPDATE TO authenticated
    USING (auth.uid() = auth_user_id)
    WITH CHECK (
        auth.uid() = auth_user_id
        AND EXISTS (
            SELECT 1 FROM public.players p
            WHERE p.auth_user_id = auth.uid()
              AND p.submitted = true
        )
    );

-- -----------------------------------------------------------------------------
-- 4. Trigger: prevent player from rewriting trust-sensitive fields on UPDATE.
--    Coach/admin updates bypass the trigger via user_is_coach_or_admin().
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fitness_session_log_protect_immutable()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Coaches/admins are trusted; let them through.
    IF public.user_is_coach_or_admin() THEN
        RETURN NEW;
    END IF;

    -- Anything below applies only to player-role UPDATE callers.
    IF NEW.enrolment_id      IS DISTINCT FROM OLD.enrolment_id      THEN RAISE EXCEPTION 'enrolment_id is immutable'; END IF;
    IF NEW.block_id          IS DISTINCT FROM OLD.block_id          THEN RAISE EXCEPTION 'block_id is immutable';     END IF;
    IF NEW.week_number       IS DISTINCT FROM OLD.week_number       THEN RAISE EXCEPTION 'week_number is immutable';  END IF;
    IF NEW.day_number        IS DISTINCT FROM OLD.day_number        THEN RAISE EXCEPTION 'day_number is immutable';   END IF;
    IF NEW.player_id         IS DISTINCT FROM OLD.player_id         THEN RAISE EXCEPTION 'player_id is immutable';    END IF;
    IF NEW.auth_user_id      IS DISTINCT FROM OLD.auth_user_id      THEN RAISE EXCEPTION 'auth_user_id is immutable'; END IF;
    IF NEW.logged_by_role    IS DISTINCT FROM OLD.logged_by_role    THEN RAISE EXCEPTION 'logged_by_role is immutable'; END IF;
    IF NEW.logged_by_user_id IS DISTINCT FROM OLD.logged_by_user_id THEN RAISE EXCEPTION 'logged_by_user_id is immutable'; END IF;
    IF NEW.logged_on_time    IS DISTINCT FROM OLD.logged_on_time    THEN RAISE EXCEPTION 'logged_on_time is immutable'; END IF;
    IF NEW.catch_up_for_week IS DISTINCT FROM OLD.catch_up_for_week THEN RAISE EXCEPTION 'catch_up_for_week is immutable'; END IF;
    IF NEW.prescription_snapshot IS DISTINCT FROM OLD.prescription_snapshot THEN RAISE EXCEPTION 'prescription_snapshot is immutable'; END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS fitness_session_log_protect_immutable_trg ON public.fitness_session_logs;
CREATE TRIGGER fitness_session_log_protect_immutable_trg
    BEFORE UPDATE ON public.fitness_session_logs
    FOR EACH ROW EXECUTE FUNCTION public.fitness_session_log_protect_immutable();

-- -----------------------------------------------------------------------------
-- 5. Index for cohort-summary admin query
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS fitness_program_enrolment_program_status_idx
    ON public.fitness_program_enrolment (program_id, status);

COMMIT;

-- =============================================================================
-- ROLLBACK (commented; uncomment + run to undo)
-- =============================================================================
-- BEGIN;
-- DROP INDEX IF EXISTS public.fitness_program_enrolment_program_status_idx;
-- DROP TRIGGER IF EXISTS fitness_session_log_protect_immutable_trg ON public.fitness_session_logs;
-- DROP FUNCTION IF EXISTS public.fitness_session_log_protect_immutable();
-- DROP POLICY IF EXISTS "Players update own logs (submitted only)" ON public.fitness_session_logs;
-- CREATE POLICY "Players update own logs"
--     ON public.fitness_session_logs FOR UPDATE TO authenticated
--     USING (auth.uid() = auth_user_id)
--     WITH CHECK (auth.uid() = auth_user_id);
-- DROP FUNCTION IF EXISTS public.fitness_log_session_for_self(uuid, uuid, integer, jsonb, jsonb, text, text, uuid);
-- DROP FUNCTION IF EXISTS public.fitness_compute_current_week(date, integer);
-- COMMIT;
