-- ═══════════════════════════════════════════════════════════════════════════
-- Coach Scheduler — Phase 1
-- Applied to live DB on 2026-05-05 via Supabase MCP apply_migration.
-- Purely additive. Backups created. Rollback at end.
-- Migration name (live): coach_scheduler_phase1_staffing_rules
-- Follow-up (live):       coach_scheduler_phase1_advisor_fixes
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Backups (additive safety per "rollback for every PR" rule)
CREATE TABLE IF NOT EXISTS public.sp_session_coaches_backup_20260505 AS
SELECT * FROM public.sp_session_coaches;

CREATE TABLE IF NOT EXISTS public.sp_coach_availability_backup_20260505 AS
SELECT * FROM public.sp_coach_availability;

ALTER TABLE public.sp_session_coaches_backup_20260505 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sp_coach_availability_backup_20260505 ENABLE ROW LEVEL SECURITY;
-- No policies = no API access. Backups readable only via direct DB.

-- 2. Staffing rules table
CREATE TABLE IF NOT EXISTS public.sp_session_staffing_rules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id uuid NOT NULL REFERENCES public.sp_programs(id) ON DELETE CASCADE,
    squad_id uuid NULL REFERENCES public.sp_squads(id) ON DELETE CASCADE,
    coach_role text NOT NULL CHECK (coach_role IN ('squad_coach','assistant','specialist','head_coach','guest_coach')),
    min_count int NOT NULL DEFAULT 0 CHECK (min_count >= 0),
    notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS sp_session_staffing_rules_unique
    ON public.sp_session_staffing_rules
    (program_id, COALESCE(squad_id, '00000000-0000-0000-0000-000000000000'::uuid), coach_role);

CREATE INDEX IF NOT EXISTS sp_session_staffing_rules_program_idx
    ON public.sp_session_staffing_rules (program_id);

-- 3. RLS: program members read; head_coach + admin write
ALTER TABLE public.sp_session_staffing_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY sp_session_staffing_rules_select ON public.sp_session_staffing_rules
    FOR SELECT USING (user_is_program_member(program_id));

CREATE POLICY sp_session_staffing_rules_insert ON public.sp_session_staffing_rules
    FOR INSERT WITH CHECK (
        user_is_program_head_coach(program_id)
        OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin','super_admin'))
    );

CREATE POLICY sp_session_staffing_rules_update ON public.sp_session_staffing_rules
    FOR UPDATE USING (
        user_is_program_head_coach(program_id)
        OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin','super_admin'))
    );

CREATE POLICY sp_session_staffing_rules_delete ON public.sp_session_staffing_rules
    FOR DELETE USING (
        user_is_program_head_coach(program_id)
        OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin','super_admin'))
    );

-- 4. Seed defaults: 2 squad_coach + 2 assistant for Elite Program 2026
INSERT INTO public.sp_session_staffing_rules (program_id, squad_id, coach_role, min_count, notes)
VALUES
    ('a0000000-0000-0000-0000-000000000001', NULL, 'squad_coach', 2, 'Default minimum — applies to all squads.'),
    ('a0000000-0000-0000-0000-000000000001', NULL, 'assistant',   2, 'Default minimum — applies to all squads.')
ON CONFLICT DO NOTHING;

-- 5. RPC: get_staffing_status(start, end, program_id)
--    Returns one row per session with assigned/unavailable/rules/gaps/total_gaps.
--    SECURITY DEFINER with explicit search_path; head_coach + admin only.
--    See live function definition for full body (long; mirrors the migration applied).

-- ROLLBACK (manual, if ever needed):
-- DROP FUNCTION IF EXISTS public.get_staffing_status(date, date, uuid);
-- DROP TABLE IF EXISTS public.sp_session_staffing_rules CASCADE;
-- DROP TABLE IF EXISTS public.sp_session_coaches_backup_20260505;
-- DROP TABLE IF EXISTS public.sp_coach_availability_backup_20260505;
