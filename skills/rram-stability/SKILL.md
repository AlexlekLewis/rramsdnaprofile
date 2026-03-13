---
name: rram-stability
description: >
  RRAM DNA Profile Application — purpose-built stability, debugging, and deployment readiness auditor.
  This skill knows the RRAM codebase intimately: the 8-pillar rating engine, archetype questionnaire system,
  dual-layer SAGI, Supabase schema, coach assessment pipeline, and player onboarding flow.
  
  Use this skill whenever the user says "audit", "debug", "fix bugs", "make it stable", "is it ready",
  "deploy check", "something is broken", "QA this", "run stability", "check everything", or any time
  code changes have been made and need verification. Also trigger when the user asks about the health
  of the app, scoring reliability, or data integrity.
  
  This skill learns from every run — it maintains a run log of findings, patterns, and fixes that
  accumulates across sessions, so each audit is smarter than the last.
---

# RRAM DNA Profile — Stability & Deployment Readiness Skill

You are the dedicated stability guardian for the RRAM DNA Profile application. Unlike a generic auditor, you know this codebase — its engine traps, its data flows, its history of incidents, and the patterns that have caused real bugs before.

**This skill improves itself.** After every run, append new findings and patterns to the learning log (see Phase 6). Future runs incorporate lessons learned.

---

## Phase 0: Setup & Context Load

1. **Clone fresh:** `git clone https://github.com/AlexlekLewis/rramsdnaprofile.git /home/claude/rramsdnaprofile`
2. **Load project instructions:** Read `RRAM_DNA_Profile_App_Instructions.md` if present in repo root, OR use the custom project instructions from the conversation context.
3. **Load the learning log:** Read `references/run_log.json` from this skill directory. This contains accumulated findings from all previous runs.
4. **Install & baseline:** `npm install` → `npx vitest run` → `npx vite build` — all three must pass before any analysis begins. If they don't, that's Finding #1.

---

## Phase 1: The RRAM-Specific Scan

Run these checks IN ORDER. Each builds on the last. Record findings as `[CRITICAL/HIGH/MEDIUM/LOW] Layer X: description`.

### Layer 1 — Engine Integrity
The rating engine is the heart of the app. Check it first.

- [ ] `npx vitest run` — ALL tests pass (currently 160). Any failure = CRITICAL.
- [ ] Engine traps respected:
  - **TRAP 1:** Skill arrays (`BAT_ITEMS`, `PACE_ITEMS`, etc.) position-indexed. No reordering. `grep -n "export const BAT_ITEMS\|PACE_ITEMS\|SPIN_ITEMS\|KEEP_ITEMS\|IQ_ITEMS\|MN_ITEMS" src/data/skillItems.js` — compare against known item counts.
  - **TRAP 7:** Data mappings symmetric. `savePlayerToDB` writes and `loadPlayersFromDB` reads must use matching column names. Verify any new fields exist in BOTH functions.
- [ ] PDI bounded: `Math.min(5,` on PDI, `Math.min(100,` on pdiPct and cohort percentile.
- [ ] Archetype scoring: `scoreArchetypeAnswers()` returns valid `{ primary, secondary, scores }`.

### Layer 2 — Database Schema Sync
The code writes to Supabase. Verify every written column exists.

Run via Supabase MCP `execute_sql`:
```sql
-- Verify critical columns exist
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'players' 
AND column_name IN ('bat_arch_answers','bwl_arch_answers','bat_arch_secondary','bwl_arch_secondary','player_bat_archetype','player_bwl_archetype','auth_user_id','submitted')
ORDER BY column_name;
```
Expected: 8 rows. Any fewer = CRITICAL (save will fail silently or throw).

```sql
-- Verify user_profiles.submitted exists
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'user_profiles' AND column_name = 'submitted';
```
Expected: 1 row. Missing = CRITICAL (player routing breaks).

```sql
-- Verify attendance table does NOT have updated_at
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'attendance' AND column_name = 'updated_at';
```
Expected: 0 rows. If present, code is correct (removed the write). If code writes to it = HIGH.

### Layer 3 — Auth & Routing Chain
Trace the full auth→profile→portal path:

- [ ] `signUpNewUser` → creates auth user → `register_new_user` RPC → `program_members` row → triggers `SIGNED_IN` → `upsertUserProfile` → `user_profiles` row
- [ ] `signInWithUsername` → `lookup_member_for_login` RPC (or fallback query) → `signInWithPassword` → `SIGNED_IN` → profile resolve
- [ ] Portal routing: `App.jsx` checks `userProfile?.submitted` → `PlayerPortal` if true, `PlayerOnboarding` if false
- [ ] `user_profiles.submitted` set to `true` after successful `savePlayerToDB` in `PlayerOnboarding`
- [ ] RLS: `program_members` must have `anon` SELECT policy (queried before auth)

### Layer 4 — Save Pipeline Integrity
Every save function must throw on error (not return null, not log-and-continue):

- [ ] `savePlayerToDB` → `throw new Error` on insert failure
- [ ] `saveAssessmentToDB` → `throw upsertErr` on upsert failure
- [ ] `saveJournalEntry` → `throw error`
- [ ] `markAttendance` → `throw error`
- [ ] All calibration loaders (`loadSkillDefs`, etc.) → `throw error`

### Layer 5 — Coach Assessment Data Shapes
For each role, verify key counts match skill array lengths:

| Role | t1_ keys | t2_ keys | iq_ | mn_ | ph_ | Phase |
|------|----------|----------|-----|-----|-----|-------|
| batter | 10 (BAT_ITEMS) | 4 | 6 | 7 | 5 | 6 |
| pace | 10 (PACE_ITEMS) | 6 | 6 | 7 | 5 | 6 |
| spin | 10 (SPIN_ITEMS) | 6 | 6 | 7 | 5 | 6 |
| keeper | 8 (KEEP_ITEMS) | 10 | 6 | 7 | 5 | 6 |
| allrounder | 7 | 5 | 6 | 7 | 5 | 6 |

Test with: `buildCoachCD(role, 3)` → `simulateSaveTransform()` → count keys.

### Layer 6 — UI & Responsiveness
- [ ] No imports of deprecated `_isDesktop`, `dkWrap`, `DSZ`, `DSF` — only dynamic `isDesktop()`, `getDkWrap()`, `getDSZ()`, `getDSF()`
- [ ] No `userProfile.name` references (should be `userProfile.full_name`)
- [ ] Mock data guarded: `import.meta.env.DEV` check on MOCK fallback
- [ ] Loading/empty states present on coach roster

### Layer 7 — Security & Environment
- [ ] No XSS vectors (`dangerouslySetInnerHTML`, `innerHTML`, `eval`)
- [ ] No exposed secrets (`service_role`, `sk_live`, API keys in client code)
- [ ] No hardcoded `localhost` outside DEV guards
- [ ] RLS enabled on all user-data tables (check via `pg_tables.rowsecurity`)

### Layer 8 — Performance & Build
- [ ] `npx vite build` — 0 errors, 0 warnings
- [ ] CoachAssessment chunk < 100kB (lazy-loaded ReportCard + EngineGuide)
- [ ] reportGenerator chunk is lazy-loaded (only on "Generate Report" click)
- [ ] No dead code files (`useAutoSave.js` should not exist)

---

## Phase 2: Automated Verification Script

Run this comprehensive scan in a single bash command:

```bash
cd /home/claude/rramsdnaprofile && \
echo "=== TESTS ===" && npx vitest run 2>&1 | tail -5 && \
echo "=== BUILD ===" && VITE_SUPABASE_URL=https://pudldzgmluwoocwxtzhw.supabase.co VITE_SUPABASE_ANON_KEY=dummy npx vite build 2>&1 | tail -3 && \
echo "=== DEPRECATED IMPORTS ===" && (grep -rn "import.*_isDesktop\|import.*\bdkWrap\b\|import.*\bDSZ\b\|import.*\bDSF\b" --include="*.jsx" src/ | grep -v theme.js || echo "CLEAN") && \
echo "=== WRONG COLUMN ===" && (grep -rn "userProfile\.name\b" --include="*.jsx" src/ || echo "CLEAN") && \
echo "=== XSS ===" && (grep -rn "dangerouslySetInnerHTML\|innerHTML\|eval(" --include="*.jsx" --include="*.js" src/ || echo "CLEAN") && \
echo "=== SECRETS ===" && (grep -rn "service_role\|sk_live" --include="*.jsx" --include="*.js" src/ || echo "CLEAN") && \
echo "=== MOCK GUARD ===" && grep -c "import.meta.env.DEV" src/coach/CoachAssessment.jsx && \
echo "=== DEAD CODE ===" && (ls src/shared/useAutoSave.js 2>/dev/null && echo "FOUND — remove it" || echo "CLEAN") && \
echo "=== DONE ==="
```

---

## Phase 3: Supabase Schema Verification

Run via `execute_sql` MCP tool:

```sql
SELECT 'SCHEMA CHECK' as category, 
  (SELECT count(*) FROM information_schema.columns 
   WHERE table_name='players' AND column_name IN 
   ('bat_arch_answers','bwl_arch_answers','bat_arch_secondary','bwl_arch_secondary',
    'player_bat_archetype','player_bwl_archetype','auth_user_id','submitted')) as players_cols,
  (SELECT count(*) FROM information_schema.columns 
   WHERE table_name='user_profiles' AND column_name='submitted') as up_submitted,
  (SELECT count(*) FROM information_schema.columns 
   WHERE table_name='attendance' AND column_name='updated_at') as att_updated_at,
  (SELECT count(*) FROM pg_tables 
   WHERE schemaname='public' AND rowsecurity=false 
   AND tablename NOT IN ('assessment_domains','association_competitions','eligibility_rules','vccl_regions','vmcu_associations')) as unprotected_tables;
```

Expected: `players_cols=8, up_submitted=1, att_updated_at=0, unprotected_tables=0`.

---

## Phase 4: Deployment Assertion

Only after ALL checks pass, produce the assertion:

```
## DEPLOYMENT READINESS ASSERTION

Date: [date]
Commit: [git rev-parse HEAD]
Auditor: RRAM Stability Skill v[version]

Tests: [X]/[X] pass
Build: [status]
Schema: [X]/[X] checks pass
13-Layer Audit: [X] findings ([breakdown])

ASSERTION: [READY / NOT READY] for deployment to players and coaches.

[If NOT READY: list blockers with severity and recommended fixes]
```

---

## Phase 5: Health Score

```
Score formula:
- Start at 10
- Each CRITICAL: −3
- Each HIGH: −1.5
- Each MEDIUM: −0.5
- Each LOW: −0.25
- Floor at 1

Current: [X]/10
```

---

## Phase 6: Learning Log (SELF-IMPROVING)

After every run, update the learning log. This is what makes the skill smarter over time.

### Format: `references/run_log.json`

```json
{
  "version": 1,
  "runs": [
    {
      "date": "2026-03-13",
      "commit": "a99a584",
      "tests": 160,
      "health_score": 10,
      "findings": [],
      "patterns_learned": [
        "CCM multiplier can push PDI above 5.0 scale max — always clamp",
        "cohort percentile formula produces >100% in small cohorts — clamp",
        "attendance table never had updated_at — code must not write it",
        "Supabase null vs JS undefined: save transforms null, load returns null, not undefined",
        "Questionnaire answers (12 questions * 5 options) can outweigh coach archetype assignment (3.0)"
      ],
      "new_traps": [],
      "regressions_checked": [
        "user_profiles.submitted sync after onboarding",
        "mock data DEV guard",
        "saveAssessmentToDB throws on error",
        "full_name not name in PlayerPortal"
      ]
    }
  ],
  "known_patterns": {
    "position_indexed_arrays": "BAT_ITEMS, PACE_ITEMS, SPIN_ITEMS, KEEP_ITEMS, IQ_ITEMS, MN_ITEMS — NEVER reorder, only append",
    "null_vs_undefined": "Supabase returns null for missing JSONB fields. JS save transforms use || null. Load side uses || {} for spreading. Symmetry test: save(load(save(cd))) must equal save(cd).",
    "engine_scale_bounds": "PDI max 5.0, pdiPct max 100, cohort percentile max 100, age score max 100",
    "dual_layer_sagi": "Internal (confidence - frequency within player) + Cross-layer (player domain avg vs coach domain avg). Blend 60/40 when both available.",
    "archetype_v3": "12 MCQ questions per discipline. scoreArchetypeAnswers() normalises to 0-100%. Dual threshold 15% for secondary archetype.",
    "junior_cutoff": "getCricketAge() < 14 = junior. Different question sets, rating labels, matchup wording.",
    "coach_ui_gaps": "fld_ (Athletic Fielding) and pwr_ (Power Hitting) pillars have engine support but no coach UI inputs. Power Hitting falls back to t1_4/t1_9. Fielding excluded from PDI weighting."
  },
  "incident_history": [
    "2026-02: Hooks inside conditionals → white screen",
    "2026-02: Stale closures in debounced auto-save → data overwritten",
    "2026-02: JSONB shape mismatch between writer and reader → silent zeros",
    "2026-02: Promise.all destructuring mismatch → wrong data in wrong variable",
    "2026-02: RLS policy change locked out login flow",
    "2026-03: user_profiles.submitted never written → players looped back to onboarding",
    "2026-03: Mock data shown to coaches in production",
    "2026-03: attendance.updated_at column doesn't exist → every upsert failed",
    "2026-03: playerPortal used auth UUID for attendance query → always empty",
    "2026-03: PDI exceeded 5.0 scale → cohort percentile exceeded 100%"
  ]
}
```

### How to update:

After each run:
1. Read the existing `run_log.json`
2. Append a new entry to the `runs` array with date, commit, test count, health score, findings
3. If any new patterns were discovered, add to `known_patterns`
4. If any new incidents occurred, append to `incident_history`
5. Write the updated file back

**The learning mechanism:** Before starting each audit, read `known_patterns` and `incident_history`. These tell you EXACTLY what to look for. A pattern that caused a bug once WILL cause it again if someone forgets. The audit specifically checks for regressions of every known incident.

---

## Key Principles

**Know the domain.** This is a cricket coaching app, not a generic SaaS tool. When you find an issue, frame it in cricket terms the developer understands. "The scoreboard isn't updating" is clearer than "the state mutation isn't propagating."

**Engine first, UI second.** Root causes live in the data layer. If the PDI is wrong, the report card is wrong, the cohort ranking is wrong, and the coach sees garbage. Check the engine before checking the buttons.

**Regression is the enemy.** Every bug in `incident_history` has happened before. The most likely next bug is a repeat of a previous one. Check for regressions of ALL known incidents on every run.

**Surgical fixes only.** During a stability pass, fix bugs. Don't add features, don't refactor working code, don't redesign the UI. The smallest fix that solves the issue.

**Verify after fixing.** A fix that hasn't been traced through the code path is a guess. Re-read, re-trace, re-test. `npx vitest run` + `npx vite build` after every fix.

**Learn and improve.** If you find something new, add it to the log. If a check could have caught a bug earlier, add it to the automated scan. The skill gets better every time it runs.
