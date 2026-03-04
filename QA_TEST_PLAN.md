# RRA DNA Profile — Comprehensive QA Test Plan
## Board-Ready Go/No-Go Verification

**App:** Rajasthan Royals Academy Melbourne — Player DNA Profile System
**URL:** https://rramsdnaprofile.vercel.app
**Test Links:**
- Player Registration: `https://rramsdnaprofile.vercel.app/?join=player`
- Coach Registration: `https://rramsdnaprofile.vercel.app/?join=coach`
- Standard Login: `https://rramsdnaprofile.vercel.app/`

---

## ROLE ASSIGNMENTS

Each tester assumes one role. All tests must pass before shipping.

| Role | Focus Area | Priority |
|------|-----------|----------|
| **QA Lead** | End-to-end flows, regression, cross-browser | P0 |
| **Security Engineer** | Auth, RLS, role escalation, data leakage | P0 |
| **Product Manager** | UX, copy, edge cases, accessibility | P1 |
| **Data Engineer** | Scoring engine, PDI calculations, PDF output | P1 |
| **DevOps Engineer** | Build, deploy, env vars, performance | P2 |

---

## MODULE 1: AUTHENTICATION & REGISTRATION

### 1.1 Registration Flow (Player)
- [ ] Navigate to `?join=player` — registration form appears (not login)
- [ ] "Create your player account" text is visible
- [ ] Full Name field accepts text, autoCapitalize works on mobile
- [ ] Username field auto-lowercases input and strips invalid chars (only `a-z`, `0-9`, `.`, `_`)
- [ ] Username < 3 chars → error on submit
- [ ] Username > 30 chars → error on submit
- [ ] Password < 6 chars → "Password must be at least 6 characters"
- [ ] Mismatched password/confirm → "Passwords do not match"
- [ ] Empty fields → "Please fill in all fields"
- [ ] Valid submission → "Creating your account..." spinner
- [ ] Successful registration → lands in player onboarding (Step 0)
- [ ] `?join=` param is cleared from URL after successful signup
- [ ] Duplicate username → "This username is already taken"
- [ ] After registration, `program_members` row exists with `role = 'player'`, `active = true`
- [ ] After registration, Supabase Auth user exists with `username@rra.internal` email
- [ ] "Already have an account? Sign in" link switches to login form

### 1.2 Registration Flow (Coach)
- [ ] Navigate to `?join=coach` — registration form shows "Create your coach account"
- [ ] Successful registration creates `program_members` row with `role = 'coach'`
- [ ] After login, lands in coach portal (not player portal)

### 1.3 Login Flow
- [ ] Standard URL (no `?join=`) shows login form
- [ ] "New player? Register here" link switches to registration form
- [ ] Empty username/password → "Please enter your username and password"
- [ ] Wrong username → "Username not found. Please check your credentials."
- [ ] Wrong password → "Invalid password. Please try again."
- [ ] Deactivated account → "This account has been deactivated. Contact your program coordinator."
- [ ] Successful login → "Signing in..." spinner → lands in correct portal
- [ ] Player role → player portal; Coach role → coach portal; Admin role → coach portal

### 1.4 Admin Access Preservation
- [ ] `alex.lewis` can log in with existing credentials
- [ ] `alex.lewis` lands in coach/admin portal (not player)
- [ ] `alex.lewis` has `role = 'admin'` in `user_profiles`
- [ ] No way to self-register as `admin` or `super_admin` (RPC rejects)
- [ ] Attempting `register_new_user('x', 'admin')` via browser console returns `{success: false, error: 'Invalid role'}`

### 1.5 Session & Auth Edge Cases
- [ ] Refresh page while logged in → session persists, correct portal loads
- [ ] Open second tab → same session active
- [ ] Sign out → clears session, redirects to login
- [ ] Sign out clears `rra_pending_role`, `rra_user_role` from localStorage
- [ ] Sign out clears `rra_pStep`, `rra_selP`, `rra_cView`, `rra_cPage` from sessionStorage
- [ ] Token refresh (wait >1hr) → session stays valid
- [ ] Network offline during login → error displayed, no crash

### 1.6 Security — Role Escalation
- [ ] `register_new_user` RPC only accepts 'player' or 'coach'
- [ ] Direct Supabase API call with `role = 'admin'` → rejected
- [ ] Direct Supabase API call with `role = 'super_admin'` → rejected
- [ ] Anon user cannot INSERT into `program_members` directly (RLS blocks)
- [ ] Anon user cannot read `program_members` (RLS blocks)
- [ ] Player cannot access coach assessment screens (portal routing prevents)
- [ ] Coach cannot modify another coach's profile

---

## MODULE 2: PLAYER ONBOARDING (7-Step Wizard)

### 2.0 Pre-Onboarding
- [ ] Welcome guidance modal appears on first visit ("Welcome to Your DNA Profile")
- [ ] Modal shows 3 bullet points (PlayHQ, 15-20 mins, be honest)
- [ ] "Let's Go" button dismisses modal
- [ ] Modal doesn't reappear after dismissal (sessionStorage `rra_obGuide`)
- [ ] Progress bar shows "STEP 1/7" with visual progress

### 2.1 Step 0 — Player Profile
- [ ] Full Name field is required (cannot advance without it)
- [ ] DOB field accepts DD/MM/YYYY format only
- [ ] Invalid DOB format → red border + "(use DD/MM/YYYY)" error
- [ ] Future DOB → rejected
- [ ] Cannot advance from Step 0 without Name + valid DOB
- [ ] Phone, Email, Club fields accept free text
- [ ] Association dropdown populates from engine context data
- [ ] Gender dropdown: M or F options
- [ ] **Age < 18:** Parent Name and Parent Email fields appear
- [ ] **Age >= 18:** Parent fields are hidden
- [ ] Back button on Step 0 → signs out
- [ ] Next button → advances to Step 1
- [ ] Scroll resets to top on navigation

### 2.2 Step 1 — Competition History & Top Performances
- [ ] Can add up to 3 competition levels
- [ ] Info box: "Start with your highest level played" visible
- [ ] Each competition card has colored left border (pink/blue/navy)
- [ ] Competition level selector loads tiers from engine context
- [ ] Club/Team, Matches fields accept input
- [ ] **Age >= 16:** Format dropdown (T20, One-Day, Multi-Day) appears
- [ ] **Age < 16:** Format dropdown is hidden
- [ ] Batting stats section: Inn, Runs, NO, HS, Avg, BF
- [ ] HS Detail expandable: HS BF, HS 4/6
- [ ] Bowling stats section: Inn, Ovrs, Wkts, SR, Avg, Econ, BB W, BB R
- [ ] Fielding stats section: Ct, RO, St, KpCt
- [ ] Can remove competition levels (X button visible when > 1)
- [ ] "ADD COMPETITION LEVEL" button shows remaining count
- [ ] At max (3) → disabled with message
- [ ] Top Batting Scores: up to 3, with Runs/Balls/4s/6s/NotOut/Comp/vs/Format
- [ ] Top Bowling Figures: up to 3, with Wkts/Runs/Overs/Maidens/Comp/vs/Format
- [ ] Competition dropdown in top performances populated from entered competitions

### 2.3 Step 2 — T20 Identity (Playing Style)
- [ ] Primary Role dropdown (Specialist Batter, Pace Bowler, Spin Bowler, WK-Batter, All-Rounder)
- [ ] Role selection drives conditional content for rest of form
- [ ] Batting Hand dropdown (Right/Left)
- [ ] Bowling Type dropdown (9 options)
- [ ] **Batting Identity section:**
  - [ ] Batting Position dropdown (Top/Middle/Lower/Tail)
  - [ ] Batting Phase Preferences chips (multi-select)
  - [ ] Go-To Shots chips (12 options, multi-select)
  - [ ] Pressure Shot free text
  - [ ] Comfort vs Spin (1-5 dots)
  - [ ] Comfort vs Short Ball (1-5 dots)
  - [ ] Batting Archetype cards (6 options, single-select, visual feedback)
- [ ] **Bowling Identity section (only if role includes bowling):**
  - [ ] Bowling Phase Preferences chips
  - [ ] Bowling Speed dropdown (only for pace/allrounder)
  - [ ] Bowling Variations chips (Pace: 7 options; Spin: 7 different options)
  - [ ] Shut-Down Delivery free text
  - [ ] Bowling Archetype cards (7 options, single-select)
- [ ] **Non-bowlers:** Bowling Identity section is hidden entirely
- [ ] Height (cm) numeric input

### 2.4 Step 3 — Self-Assessment (1-5 Ratings)
- [ ] Rating guide info box visible (1=Just Starting → 5=Elite)
- [ ] Technical Skills grid shows role-specific items:
  - Batter: 10 items | Pace: 10 | Spin: 10 | Keeper: 8 | Allrounder: varies
- [ ] Info icons (i) show skill definitions on tap
- [ ] Game Intelligence grid: 6 universal items
- [ ] Mental & Character grid: 7 universal items
- [ ] Physical & Athletic grid: 5 role-specific items
- [ ] Phase Effectiveness: Batting phases (3) for all + Bowling phases (3) if bowler
- [ ] All ratings use 1-5 scale buttons with visual feedback
- [ ] Ratings persist across back/forward navigation (sessionStorage)

### 2.5 Step 4 — Player Voice
- [ ] 6 open-ended text questions displayed
- [ ] Each has textarea (2 rows) with question as placeholder
- [ ] Free text input, no character limit enforced
- [ ] Answers persist in session state

### 2.6 Step 5 — Medical & Goals
- [ ] Injury & Medical textarea (3 rows)
- [ ] Goals & Aspirations textarea (3 rows)
- [ ] Both are optional (can advance without filling)

### 2.7 Step 6 — Review & Submit
- [ ] Summary card shows player name, DOB, club, competition count, scores, figures
- [ ] "SUBMIT SURVEY" button present
- [ ] Button disabled if name or DOB missing
- [ ] Click → "SUBMITTING..." state
- [ ] Successful submit → Step 7 (success screen)
- [ ] Submit clears sessionStorage (rra_pd, rra_pStep)
- [ ] Failed submit → error message in red, button re-enabled for retry
- [ ] Data saved to Supabase `players` table with `submitted = true`
- [ ] Competition grades saved to `competition_grades` table
- [ ] All v2 fields saved (height, archetype, phases, variations, etc.)

### 2.8 Step 7 — Success Screen
- [ ] Checkmark icon + "Survey Submitted!" in green
- [ ] "Your coaching team will review your details." message
- [ ] No forward navigation available

### 2.9 Onboarding Cross-Step Tests
- [ ] Session persistence: close tab, reopen → resumes at same step with data intact
- [ ] Back navigation works from every step
- [ ] Progress bar updates correctly at each step
- [ ] `SURVEY_STEP` analytics event fires on step advance (check analytics_events table)
- [ ] `SURVEY_ABANDON` event fires on page unload if partially complete
- [ ] v1→v2 upgrade banner shows for existing v1 profiles with "Update My Profile" CTA

---

## MODULE 3: PLAYER PORTAL (Post-Onboarding)

### 3.1 Home View
- [ ] Welcome banner shows "Welcome back, {firstName}"
- [ ] Program badge shows "Elite Academy" (hardcoded)
- [ ] Two action tiles: Journal and My IDP
- [ ] Recent Sessions card loads attendance data
- [ ] Empty state: "No sessions recorded yet."
- [ ] Session items show title, date, and status badge (present/excused/absent)
- [ ] Status badges color-coded (green/amber/pink)
- [ ] Sign Out button works, redirects to login

### 3.2 Journal View
- [ ] "My Journal" header with back arrow
- [ ] Two tabs: New Entry (default) and History
- [ ] **New Entry tab:**
  - [ ] Session selector dropdown populated from recent sessions
  - [ ] Empty state: "You have no pending reflections for recent sessions."
  - [ ] Selecting a session shows dynamic questions (or 3 defaults)
  - [ ] Textarea for each question (4 rows)
  - [ ] "SAVE JOURNAL ENTRY" button disabled without session selected
  - [ ] Successful save → green toast "Journal saved!" (3s) → switches to History tab
  - [ ] Failed save → red toast "Failed to save" (5s)
  - [ ] Saved session removed from dropdown (no duplicate entries)
- [ ] **History tab:**
  - [ ] Shows all past journal entries
  - [ ] Per entry: session title, date, program name, Q&A pairs
  - [ ] Empty state: "No journal entries yet."

### 3.3 IDP View (Individual Development Plan)
- [ ] "My IDP" header with back arrow
- [ ] **My Goals section:**
  - [ ] Add goal input + ADD button
  - [ ] Enter key triggers add
  - [ ] New goal appears at top of list
  - [ ] Progress slider (0-100%) per goal
  - [ ] Progress updates save to DB
  - [ ] Empty state: "No goals set yet."
  - [ ] Success toast "Goal added!" on add
- [ ] **Coach Focus Areas section (read-only):**
  - [ ] Shows focus areas assigned by coach
  - [ ] Pink left border on each card
  - [ ] Empty state: "No focus areas assigned yet."
- [ ] **IDP Notes section:**
  - [ ] Shows notes from both player and coach
  - [ ] Player notes: blue author badge
  - [ ] Coach notes: pink author badge
  - [ ] Add note input + POST button
  - [ ] Success toast "Note posted!" on add
  - [ ] Empty state: "No notes yet."

---

## MODULE 4: COACH ASSESSMENT PORTAL

### 4.1 Player Roster
- [ ] Roster shows all submitted players
- [ ] Archived players (inactive program_members) excluded
- [ ] Per-card: name, age, bracket, role, club
- [ ] Overall Score ring (star icon) if data exists
- [ ] PDI score with grade color
- [ ] CCM score displayed
- [ ] Trajectory flag (rocket icon) if applicable
- [ ] Assessment status: "Coach assessed" / "Self-assessed" / "Awaiting" / "(provisional)"
- [ ] Click player card → opens survey view
- [ ] 2-column grid on desktop, 1-column on mobile

### 4.2 Survey View (Player Profile Summary)
- [ ] Player header: name, age, bracket, role, club, CCM ring
- [ ] Competition History table with all stats
- [ ] Top Performances (batting scores + bowling figures)
- [ ] Player Voice answers (6 questions)
- [ ] Medical & Goals section
- [ ] "BEGIN ASSESSMENT" button → enters assessment mode
- [ ] "Back to roster" button → returns to list

### 4.3 Assessment — Page 0: Identity
- [ ] 4-page tabbed navigation (Identity / Technical / Tactical-Mental-Physical / PDI Summary)
- [ ] Batting Archetype selection (6 cards, single-select)
- [ ] Bowling Archetype selection (7 cards, single-select)
- [ ] Phase Effectiveness grid:
  - Batting: Powerplay, Middle, Death (1-5 sliders)
  - Bowling: Powerplay, Middle, Death (1-5 sliders)
- [ ] Auto-save triggers on every field change (2s debounce)
- [ ] Save status indicator appears ("Saved" / "Retrying" / "Offline")

### 4.4 Assessment — Page 1: Technical Skills
- [ ] Rating rubric info box visible (1=Novice → 5=Elite)
- [ ] Primary skills grid (role-specific, 8-10 items)
- [ ] Secondary skills grid (role-specific)
- [ ] Each skill has info icon → shows detailed definition
- [ ] 1-5 button slider per skill
- [ ] All changes auto-save

### 4.5 Assessment — Page 2: Tactical / Mental / Physical
- [ ] Game Intelligence grid (6 items, sky blue)
- [ ] Mental & Character grid (7 items, purple — "Royals Way aligned")
- [ ] Physical & Athletic grid (5 role-specific items, navy)
- [ ] All changes auto-save

### 4.6 Assessment — Page 3: PDI Summary
- [ ] **Score Rings:** Pathway, Cohort, Age, Overall (all calculated live)
- [ ] **PDI Detail:** PDI percentage, grade (ELITE/ADVANCED/DEVELOPING/EMERGING), completion %
- [ ] **CCM Breakdown:** CTI, ARM, CCM values
- [ ] **SAGI:** Self-Awareness Gap Index (Aligned/Overconfident/Humble badge)
- [ ] **Trajectory Flag:** Rocket icon if triggered
- [ ] **Domain Bars:** 6 domains with weighted bars
- [ ] **Narrative:** Free text textarea ("Who is this player right now?")
- [ ] **Strengths:** 3 text inputs (pink background)
- [ ] **Priorities:** 3 text inputs (blue background)
- [ ] **12-Week Development Plan:** Explore (1-4) / Challenge (5-8) / Execute (9-12) textareas
- [ ] **Squad Recommendation:** Free text
- [ ] All fields auto-save

### 4.7 Assessment Auto-Save System
- [ ] Changes auto-save after 2s debounce
- [ ] On save failure: retries 3x with exponential backoff (2s → 4s → 8s)
- [ ] After 3 failures: shows "Offline" status
- [ ] Draft saved to localStorage (`rra_draft_${playerId}`) on failure
- [ ] On next successful save: draft cleared from localStorage
- [ ] Assessment history snapshot created before each save (assessment_history table)

### 4.8 PDF Report Generation
- [ ] "Generate Report" button on Page 3
- [ ] Report renders off-screen (hidden container)
- [ ] PDF downloads as `DNA_Report_{Name}_{Date}.pdf`
- [ ] **Page 1:** Player identity, avatar, scores, phase heatmap
- [ ] **Page 2:** Radar chart, domain bars, strengths/growth, self-awareness index
- [ ] **Page 3:** Narrative, 12-week plan, bowling toolkit, batting style, squad rec
- [ ] PDF is A4 landscape, 3 pages
- [ ] All data populated correctly (no "undefined" or blank fields)
- [ ] Special characters in player name don't break filename

### 4.9 Navigation & State
- [ ] Tab navigation between 4 assessment pages
- [ ] Back button on Page 0 → returns to survey view
- [ ] "Done" button on Page 3 → returns to roster
- [ ] Session state persists on refresh (selP, cView, cPage in sessionStorage)
- [ ] Selecting a different player loads their data correctly
- [ ] Coach email displayed in header

---

## MODULE 5: SCORING ENGINE VERIFICATION

### 5.1 PDI (Pathway Development Index)
- [ ] Calculated from coach assessments + player self-ratings
- [ ] Blends with weights: coach 75% / player 25% (from engine_constants)
- [ ] Grade thresholds: ELITE / ADVANCED / DEVELOPING / EMERGING
- [ ] Provisional flag if completion < threshold
- [ ] Returns 0 if no data available

### 5.2 CCM (Competition Calibration Metric)
- [ ] CTI calculated from competition tier
- [ ] ARM calculated from batting/bowling averages
- [ ] CCM = CTI x ARM
- [ ] Higher comp tier → higher CCM

### 5.3 SAGI (Self-Awareness Gap Index)
- [ ] Compares coach ratings to player self-ratings
- [ ] Range: -0.5 to +0.5 = "Aligned"
- [ ] Above +0.5 = "Overconfident"
- [ ] Below -0.5 = "Humble"
- [ ] Color-coded badge

### 5.4 Trajectory Flag
- [ ] Triggered when: young for competition level + strong PDI
- [ ] Uses `trajectory_age_threshold` from engine_constants
- [ ] Displays rocket emoji in roster and report

### 5.5 Domain Scoring
- [ ] 6 domains: Technical, Game IQ, Mental, Physical, Phase, Misc
- [ ] Weights vary by role (from domain_weights table or fallbacks)
- [ ] Overall = weighted average of domain scores
- [ ] Unrated domains show "—"

### 5.6 Role-Specific Validation
- [ ] Test with each of 5 roles: Batter, Pace, Spin, Keeper, Allrounder
- [ ] Verify correct skill items loaded per role
- [ ] Verify correct physical items loaded per role
- [ ] Verify bowling sections hidden for Batter role
- [ ] Verify bowling speed only shown for Pace/Allrounder

---

## MODULE 6: DATA INTEGRITY

### 6.1 Supabase Tables
- [ ] `players` table: all fields saved correctly on submission
- [ ] `competition_grades` table: all grade rows linked to correct player_id
- [ ] `coach_assessments` table: upsert works (create + update)
- [ ] `assessment_history` table: version increments on each save
- [ ] `user_profiles` table: role matches program_members role
- [ ] `program_members` table: username unique, auth_user_id linked
- [ ] `analytics_events` table: events logged (SURVEY_STEP, error_boundary)
- [ ] `journal_entries` table: entries linked to correct player + session
- [ ] `squad_groups` / `squad_allocations`: allocation data consistent

### 6.2 RLS (Row Level Security)
- [ ] Players cannot read other players' data
- [ ] Players cannot read coach_assessments
- [ ] Coaches can read all submitted players
- [ ] Coaches can write assessments
- [ ] `is_admin()` function returns true only for admin/super_admin roles
- [ ] Anon users have no read/write access to any table
- [ ] `register_new_user` RPC executes as SECURITY DEFINER (elevated)
- [ ] `lookup_member_for_login` RPC restricts anon access to member data

### 6.3 Data Migration Safety
- [ ] v1 profiles (profileVersion: 1) still display correctly
- [ ] v2 fields (height, archetypes, phases, variations) are nullable
- [ ] Null v2 fields don't break scoring engine
- [ ] Profile upgrade banner appears for v1 profiles

---

## MODULE 7: UI / UX / ACCESSIBILITY

### 7.1 Responsive Design
- [ ] Login/Register form: centered, max-width 300px
- [ ] Player onboarding: readable on mobile (375px width)
- [ ] Coach roster: 2-column on desktop, 1-column on mobile
- [ ] Assessment tabs: horizontal scroll on mobile
- [ ] PDF report: fixed A4 landscape dimensions

### 7.2 Visual Consistency
- [ ] Gradient background (navy → dark) on all auth screens
- [ ] RRA logo visible on login, loading, and report
- [ ] Pink/blue color coding consistent (batting = pink, bowling = blue)
- [ ] Font: Montserrat/Inter throughout
- [ ] Error states: red text/border
- [ ] Loading states: spinner text ("Loading...", "Signing in...", "Submitting...")

### 7.3 Error States
- [ ] Network failure during onboarding submit → error message + retry
- [ ] Network failure during assessment save → "Offline" status + localStorage draft
- [ ] Network failure during journal save → red toast
- [ ] Missing Supabase env vars → app fails gracefully (thrown error)
- [ ] ErrorBoundary catches React errors → fallback UI with refresh button
- [ ] ErrorBoundary logs error to analytics_events

### 7.4 Loading States
- [ ] Initial app load → logo + "Loading..." spinner
- [ ] Auth check → splash screen until resolved
- [ ] Engine data load → splash screen until resolved
- [ ] Login → "Signing in..." text
- [ ] Registration → "Creating your account..." text
- [ ] Submit survey → "SUBMITTING..." button text
- [ ] Generate PDF → brief delay (300ms render + PDF build)

### 7.5 Copy & Wording
- [ ] No placeholder text visible in production ("Lorem ipsum", "TODO", etc.)
- [ ] All error messages are user-friendly (no raw error codes)
- [ ] Consistent terminology: "DNA Profile", "Pathway", "Archetype"
- [ ] "Rajasthan Royals Academy" branding correct throughout
- [ ] "Season 2026" in PDF report header (or dynamic year)

---

## MODULE 8: CROSS-BROWSER & PERFORMANCE

### 8.1 Browser Compatibility
- [ ] Chrome (latest) — full functionality
- [ ] Safari (latest, iOS) — full functionality, mobile-first
- [ ] Firefox (latest) — full functionality
- [ ] Edge (latest) — full functionality
- [ ] Safari iOS: input autoCapitalize, autoCorrect behave correctly
- [ ] Mobile keyboards: Enter key submits forms

### 8.2 Performance
- [ ] Initial page load < 3s on 4G connection
- [ ] Lazy-loaded components (PlayerOnboarding, PlayerPortal, CoachAssessment) load on demand
- [ ] No unnecessary re-renders during assessment (check React DevTools)
- [ ] PDF generation completes < 5s
- [ ] No memory leaks from unmounted components (useEffect cleanup)
- [ ] Large roster (50+ players) renders without lag

### 8.3 Build & Deploy
- [ ] `npx vite build` succeeds with no errors
- [ ] `npx vitest run` passes all tests (67 currently)
- [ ] No console errors in production build
- [ ] Environment variables set correctly in Vercel
- [ ] Vercel deploy succeeds on git push

---

## MODULE 9: END-TO-END SMOKE TESTS

These are full journey tests that cross multiple modules.

### 9.1 New Player — Full Journey
1. Navigate to `?join=player`
2. Register with username, password, full name
3. Complete all 7 onboarding steps with realistic data
4. Submit survey
5. Land on Player Portal home
6. Navigate to Journal → create entry
7. Navigate to IDP → add goal, add note
8. Sign out
9. Log back in → portal loads, data intact

### 9.2 New Coach — Full Journey
1. Navigate to `?join=coach`
2. Register as coach
3. Land on coach roster (empty initially)
4. Wait for a player to submit onboarding
5. Select player → view survey
6. Begin assessment → fill all 4 pages
7. Generate PDF report → verify download
8. Click Done → return to roster
9. Sign out and log back in → assessment data persists

### 9.3 Admin — Existing Access
1. Log in as `alex.lewis`
2. Verify lands in coach/admin portal
3. Verify can see all players
4. Verify can assess players
5. Verify can generate reports
6. Sign out

### 9.4 Player Upgrades v1 → v2
1. Load a v1 profile player (profileVersion: 1)
2. Verify upgrade banner appears ("New DNA Fields Available")
3. Click "Update My Profile"
4. Fill v2 fields (archetype, phases, variations)
5. Submit updated profile
6. Verify profileVersion = 2 in database

### 9.5 Offline Resilience
1. Start assessing a player
2. Disable network (devtools or airplane mode)
3. Make rating changes → verify "Offline" status
4. Verify draft saved to localStorage
5. Re-enable network
6. Make another change → verify auto-save succeeds
7. Verify "Saved" status returns

---

## MODULE 10: REGRESSION CHECKS (Previously Fixed Bugs)

These items were identified and fixed in code review. Verify they remain resolved.

- [ ] `getAge()` uses dynamic year (not hardcoded 2025)
- [ ] `useSessionState` hook has deduplication guard
- [ ] PDF report DOM nodes are cleaned up after generation (no memory leak)
- [ ] Batting position saves label (not just ID)
- [ ] PlayerPortal signOut cannot be bypassed
- [ ] `journalDb.js` uses correct column name
- [ ] `CompLevelSel` dropdown doesn't use setTimeout anti-pattern
- [ ] DOB validation rejects future dates
- [ ] `.env.example` exists with placeholder values
- [ ] Supabase credentials are not hardcoded in source files
- [ ] FormComponents textarea uses correct event property

---

## SIGN-OFF CHECKLIST

| Area | Status | Tested By | Date |
|------|--------|-----------|------|
| Authentication & Registration | | | |
| Player Onboarding (7 steps) | | | |
| Player Portal (Home/Journal/IDP) | | | |
| Coach Assessment (4 pages) | | | |
| Scoring Engine (PDI/CCM/SAGI) | | | |
| PDF Report Generation | | | |
| Data Integrity & RLS | | | |
| UI/UX & Accessibility | | | |
| Cross-Browser & Performance | | | |
| End-to-End Smoke Tests | | | |
| Regression Checks | | | |

**Go/No-Go Decision:** ____________

**Signed off by:**
- QA Lead: ____________
- Security Engineer: ____________
- Product Manager: ____________
- Data Engineer: ____________
- DevOps Engineer: ____________

**Date:** ____________
