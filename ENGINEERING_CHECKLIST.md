# RRAM DNA Profile — Engineering Checklist & Known Patterns

## Pre-Push Checklist
Before every push:
1. `npx vite build` — 0 errors
2. `npm test` — all tests green (160+)
3. Manual: verify login → player portal → DNA view → journal → IDP
4. Manual: verify coach portal → roster → assessment → report card
5. Manual: verify admin nav bar → dashboard → profiles → squads (all 4 tabs)
6. Manual: verify profiles edit/archive/bulk actions
7. Manual: verify squad auto-assign runs without crash
8. Check: no `console.log` with sensitive data (passwords, tokens)
9. Check: localStorage.clear() + fresh load shows login screen (not blank)

---

## RRAM-Specific Engine Traps

### 1. PDI Calculation Order
`calcPDI()` requires all parameters in correct order. Missing `compTiers` or `engineConst` silently produces `NaN` scores.
- Always pass: `(cd, self_ratings, role, ccmR, dbWeights, engineConst, grades, {}, topBat, topBowl, compTiers)`

### 2. CCM Must Come First
`calcCCM()` must be computed before `calcPDI()` — PDI depends on the CCM result.

### 3. Domain Key Map
Domain keys are 2-letter codes: `tm` (Technical), `te` (Tactical), `pc` (Physical), `mr` (Mental), `af` (Fielding), `mi` (Match Impact), `pw` (Power), `sa` (Self-Awareness).
- Coach assessment prefixes: `t1_` (primary tech), `t2_` (secondary tech), `iq_` (game IQ), `mn_` (mental), `ph_` (physical), `pb_` / `pw_` (phase batting/bowling)

### 4. Role IDs vs Labels
- Database stores role IDs: `batter`, `pace`, `spin`, `keeper`, `allrounder`, `fielder`
- Display uses ROLES array labels: `Batter`, `Pace Bowler`, etc.
- Always use `ROLES.find(r => r.id === p.role)?.label` for display

### 5. Age Calculation
- DOB format is `DD/MM/YYYY` (Australian format)
- `getAge(dob)` handles this parsing
- `getBracket(dob)` returns age groups: `U11-U13`, `U14-U16`, `U17-U19`, `U20+`

### 6. Archetype Scoring
- `scoreBatArchetype(answers)` / `scoreBwlArchetype(answers)` return `{ primary, secondary, scores }`
- `scores` is an object with archetype IDs as keys and percentages as values
- Junior/senior question sets are different — use `getCricketAge()` to determine which

### 7. Self-Ratings Key Pattern
- Player self-ratings are stored as `sr_` prefixed keys in the `self_ratings` JSONB column
- Matchup ratings: `sr_mc_{domain}_{idx}_c` (confidence) and `sr_mc_{domain}_{idx}_f` (frequency)

---

## Supabase RLS Patterns

### Must-Check for Every Write
1. Every `.upsert()` must chain `.select()` and verify `data.length > 0`
2. Use `.maybeSingle()` not `.single()` for queries that might return 0 rows
3. RLS policies must cover ALL roles: `player`, `coach`, `admin`, `super_admin`

### Known RLS Requirements
| Table | Players | Coaches | Admins |
|-------|---------|---------|--------|
| `players` | Own rows (auth_user_id) | Read all submitted | Full access |
| `coach_assessments` | Read own (via player_id) | Read/Write | Full access |
| `journal_entries` | Own entries | — | Read all |
| `idp_goals` | Own goals | Read assigned players | Full access |
| `idp_focus_areas` | Read own | Write | Full access |
| `idp_notes` | Own + coach notes | Write + read assigned | Full access |
| `competition_grades` | Own | Read all | Full access |

### Draft Save Pattern
Players save drafts with `submitted: false`. RLS SELECT policies must allow reading unsubmitted rows for the owning player.

---

## Silent Error Swallowing Detection

### Pattern to Flag
Any catch block that:
1. Writes to localStorage without user notification
2. Logs to console.warn without surfacing to UI
3. Returns a fallback value without indicating failure

### Known Safe Silent Catches
- `useSessionState` localStorage write — UI preferences, not data
- `localStorage.removeItem` cleanup — non-critical
- `notifySlack` fire-and-forget — analytics, not user-facing

### Must-Throw Patterns
- `savePlayerToDB()` — must throw on failure, never silently succeed
- `saveAssessmentToDB()` — must throw + check row count
- `saveJournalEntry()` — must throw on failure

---

## Player Portal Privacy Rules

Players MUST NEVER see:
- Raw PDI score or numerical rating
- Domain score bars or percentages
- SAGI score or label
- CCM breakdown
- Cohort ranking or percentile
- Any comparison to other players

Players CAN see:
- T20 archetype results (batting + bowling primary/secondary)
- Archetype percentage bars
- Role, phase preferences, playing style summary
- Coach-written narrative
- Strengths and development priorities
- 12-week plan (explore/challenge/execute)
- Report card (read-only, isAdmin=false)

---

## Known Code Patterns & Incident Prevention

### 1. Database Column Naming
- Supabase columns use `snake_case`
- JavaScript objects use `camelCase`
- All mapping happens in `playerDb.js` `loadPlayersFromDB()` and `buildPlayerRow()`

### 2. GRANT Requirements for Migrations
- Any new table needs: `GRANT ALL ON table TO authenticated;`
- Any new function needs: `GRANT EXECUTE ON FUNCTION fn TO authenticated;`
- Missing GRANTs cause silent RLS-like failures

### 3. Assessment History Snapshots
- `saveAssessmentToDB()` snapshots existing assessment to `assessment_history` before overwriting
- History save failure must never block the actual assessment save (wrapped in try/catch)

### 4. Lazy Loading Boundaries
- `ReportCard` — lazy (pulls html2canvas + jsPDF)
- `EngineGuide` — lazy (large explainer content)
- `AdminDashboard` — lazy (admin-only, pulls xlsx)
- `PlayerOnboarding` — lazy (large form)
- `PlayerPortal` — lazy
- `CoachAssessment` — lazy

### 5. Session State vs Database State
- `useSessionState()` — survives page reload, stored in localStorage
- Used for: selected player ID, current view, current page
- NOT used for: player data, assessment data, any persisted content

### 6. Theme Tokens
- Colors: `B.pk` (pink), `B.bl` (blue), `B.nvD` (navy dark), `B.grn` (green), `B.amb` (amber), `B.red`, `B.prp` (purple)
- Font: `F` = Montserrat
- Card style: `sCard` (white card with border)
- Gradient: `sGrad` (navy-blue-pink gradient)

---

## Data Quality & Deduplication

### Duplicate Players (CRITICAL)
The `official_cohort_2026` table has ~59 duplicate rows (166 total, 107 unique). Duplicates come from multiple form submissions.
- **Client-side dedup**: Both `AdminProfiles.jsx` and `SquadAssignment.jsx` deduplicate by `player_name.toLowerCase().trim()`, keeping the row with the most populated fields
- **Database cleanup**: Should periodically remove duplicate rows, keeping the most complete record
- **Prevention**: The checkout form should check for existing entries before inserting

### Cross-Table Data Merging
Player data is scattered across 4+ tables. The merge priority is:
1. `official_cohort_2026` — primary (accepted players, session prefs, uniform)
2. `applications` — fallback for DOB/age, history, bio (285 rows, most have DOB)
3. `players` — DNA engine data (role, archetypes, competition, CCM)
4. `coach_assessments` — narrative, strengths, priorities

**Link keys**: Email links cohort ↔ applications. Name match links cohort ↔ DNA players.

### Age Data Gaps
Only 33/166 cohort rows have DOB/age. The `applications` table has DOB for 269/285. Always merge age from applications when cohort is missing.

---

## Squad Allocation Engine Traps

### 1. Pass `squad.players` Not `squad`
The engine functions `wouldExceedAgeBand()`, `squadAvgCCM()`, and `calcRoleAdjustment()` expect an array of player objects, NOT the squad object. Always pass `squad.players`.

### 2. Null Age Handling
Players without age data should skip age banding checks entirely and be placed on CCM/SPS alone. The engine checks `player.age != null && squad.players.some(p => p.age != null)` before applying the age band gate.

### 3. Default Role = "batter"
Players without DNA onboarding data default to `roleCategory = "batter"`. This means role balance scoring is ineffective until players complete onboarding. The data quality report flags these as "No role data".

### 4. CCM = 0 When No Competition Data
Without competition grades, CCM defaults to 0. The engine still places these players via SPS scoring, but the ability-tiering component is absent. This is expected per the framework (Pattern D).

### 5. Session Preference Parsing
The `selected_sessions` field uses pipe-separated strings like `[Weekday] Tuesday: 7:00 - 9:00pm | [Weekend] Saturday: 2:00 - 4:00pm`. The parser handles combined entries like `Tuesday & Thursday: 7:00 - 9:00pm`. Saturday 8-10am is excluded per Rule 8.

---

## Registration & Auth Traps

### 1. Registration Race Condition (FIXED)
`signUp()` auto-signs-in the user, triggering `onAuthStateChange` → `upsertUserProfile()` BEFORE the `register_new_user` RPC completes. Fix: set `localStorage.setItem('rra_pending_role', role)` BEFORE calling `signUp()`.

### 2. RPC Schema Mismatch (FIXED)
The `register_new_user` RPC originally only inserted `username, role, active, auth_user_id` into `program_members`, but the table now requires `display_name`, `email`, and `generated_password` as NOT NULL. The RPC was updated to include these fields.

### 3. Dev Bypass Security (FIXED)
The dev bypass is now gated by `import.meta.env.DEV` (build-time check) in addition to hostname check. Vite tree-shakes the entire dev bypass code path out of production builds.

### 4. Edge Function Auth Headers (FIXED)
`generateDNAReport()` and `notifySlack()` now include `Authorization: Bearer` token from the current session. Without this, edge functions with `verify_jwt: true` would fail silently.

---

## Performance Patterns

### 1. Memoize PDI Calculations in Roster
The `rosterScores` useMemo in `CoachAssessment.jsx` computes PDI/CCM for all players once, keyed on `[players, compTiers, dbWeights, engineConst]`. The `.map()` render then reads from the memoized map instead of recalculating. This eliminates 22+ engine calls per keystroke in the search bar.

### 2. Lazy Loading Boundaries
- `ReportCard` + `EngineGuide` — lazy (html2canvas/jsPDF)
- `AdminDashboard` + `AdminProfiles` + `SquadAssignment` — lazy (admin-only)
- `PlayerOnboarding` + `PlayerPortal` — lazy (player-only)
- xlsx library — dynamically imported only on export click

### 3. Bottom Nav Bar
The `CoachNavBar` is `React.memo`'d and renders at module level. It hides during assessment views (`cView === "assess" || "survey"`) to maximize screen real estate.

---

## Admin Player Management

### Profile Data Sources
The Profiles view merges data from 4 tables. The 104 players in Profiles come from `official_cohort_2026` (registration/checkout data), NOT the `players` table. The `players` table (DNA onboarding) only has 10 records.

| View | Source | Count |
|------|--------|-------|
| Coach Roster | `players` (submitted=true) | 10 |
| Admin Profiles | `official_cohort_2026` (deduplicated) | ~104 |
| Admin Dashboard | `players` (submitted=true) | 10 |
| Squad Engine | `official_cohort_2026` (deduplicated) | ~104 |

### Archive vs Delete
- **Archive** (`submitted=false`): Player data preserved, hidden from active roster, program membership deactivated. Reversible via Restore.
- **Delete** (cascading): Permanently removes player + all related data (assessments, grades, squads, IDP goals, focus areas, notes, journal entries). Irreversible. Requires confirmation dialog.

### Bulk Operations
- Select via checkboxes, "Select all" toggles entire visible list
- Bulk Archive: sets `submitted=false` for all selected DNA players
- Bulk Delete: cascading delete with confirmation dialog
- Only players with DNA profiles (`dnaId`) can be archived/deleted — cohort-only records are managed via the cohort table

### Stale localStorage on Logout
The `signOut()` function clears some localStorage keys but NOT all `useSessionState` keys. If a different user logs in on the same device, they may see the previous user's `cView` state. The `cView` is non-sensitive (just which tab was open) but could be confusing. Clear localStorage on fresh login if needed.
