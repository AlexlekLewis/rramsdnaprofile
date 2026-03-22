# RRAM DNA Profile — Field Test Results
**Date**: 23 March 2026
**Method**: Playwright automated UI tests against live production (rramsdnaprofile.vercel.app)
**Viewport**: 375x812 (iPhone mobile)
**Test accounts**: 12 players + 2 coaches created via real registration flow

---

## Test Summary

| Phase | Status | Notes |
|-------|--------|-------|
| Player Registration (12) | ✅ 12/12 passed | 11 fresh + 1 already existed |
| Coach Registration (2) | ✅ 2/2 passed | Required `?join=coach` URL param |
| Player Onboarding (12) | ⚠️ Partial | All reached portal but `submitted=false` |
| Coach Assessment | ❌ Blocked | New players invisible in roster |
| Admin Dashboard | ⚠️ Partial | Renders but couldn't test with admin creds |
| Player Portal (DNA/Journal/IDP) | ⚠️ Partial | Shows onboarding instead of portal |

---

## CRITICAL Findings

### 1. Onboarding completes without `submitted = true`
**Severity**: CRITICAL
**Location**: `PlayerOnboarding.jsx` → `savePlayerToDB()`
**Description**: Players can click through all 7 onboarding steps and land on a "portal" view, but the `submitted` flag in the `players` table remains `false`. This means:
- Players don't appear in the coach roster (filtered by `submitted = true`)
- Players see the onboarding form again on next login instead of the portal
- The "completion" was illusory — the player thinks they're done but the system doesn't

**Root cause**: The Next buttons advance steps without validating that step content was actually filled in. Steps 3-5 (Self-Assessment, Player Voice, Medical & Goals) can be skipped entirely — 0 rating dots and 0 text areas were interacted with but step advancement still worked.

**Fix needed**:
- Enforce minimum content per step before allowing advancement
- Ensure the final step's submit action explicitly sets `submitted = true`
- Add a completion confirmation screen

### 2. Coach registration requires undiscoverable `?join=coach` URL
**Severity**: CRITICAL
**Location**: `AuthContext.jsx` line 20-24, `App.jsx`
**Description**: The registration form defaults to "player" role. The only way to register as a coach is to navigate to `/?join=coach`. There is no visible toggle, radio button, or dropdown on the registration screen to select the coach role. Coaches trying to register from the main URL will get "This code is not valid for player registration."

**Fix needed**: Add a visible role selector (Player / Coach toggle) on the registration form.

### 3. New players invisible to coaches
**Severity**: CRITICAL
**Location**: `playerDb.js` line 10
**Description**: `loadPlayersFromDB()` filters by `.eq('submitted', true)`. Since onboarding doesn't properly set `submitted = true` (Finding #1), all newly onboarded players are invisible in the coach roster. The coach portal showed 4/10 original players but 0/12 new field test players.

**Consequence**: A coach logging in after 12 players complete onboarding sees zero new players to assess.

---

## HIGH Findings

### 4. Role selection not working in onboarding
**Severity**: HIGH
**Location**: `PlayerOnboarding.jsx` Step 2
**Description**: All 12 test players were saved with `role = 'batter'` regardless of their intended role (bowler, allrounder, keeper). The role selector buttons in Step 2 either weren't clickable or the selection didn't persist to the database save.

**Database evidence**: `SELECT role FROM players WHERE name = 'Priya Sharma'` returns `batter` (should be `bowler`)

### 5. Club field not saving
**Severity**: HIGH
**Location**: `PlayerOnboarding.jsx` Step 0
**Description**: All 12 players have `club = NULL` in the database despite the Club input being present on Step 0 (Profile). The field exists in the UI but either the value doesn't map to the save function or the selector name doesn't match.

### 6. Self-assessment ratings skippable
**Severity**: HIGH
**Location**: `PlayerOnboarding.jsx` Steps 3-4
**Description**: Steps 3 (Self-Assessment) and 4 (Player Voice) contain rating dot grids, but the test found 0 interactive rating elements matching `button` with text `1-5`. Either:
- The rating dots use a non-button element (div, span)
- The dot labels don't contain the digit as text content
- The step validation doesn't require any ratings to be filled

**Consequence**: Players can skip self-assessment entirely, which means no SAGI calculation is possible.

### 7. No nav bar in coach portal
**Severity**: HIGH
**Location**: `CoachAssessment.jsx`
**Description**: The coach portal only has a bottom "Roster" icon. No persistent navigation between Roster → Dashboard → Profiles → Squads. The nav bar was built but may not be rendering on mobile viewport.

---

## MEDIUM Findings

### 8. Competition level dropdown shows format, not tier
**Severity**: MEDIUM
**Location**: `PlayerOnboarding.jsx` Step 1
**Description**: The dropdown options are "T20 / One-Day / Two-Day" (format-based), not "Community / District / Premier / Representative / State" (tier-based). This may be correct UX but differs from what the engine expects for CTI calculation.

### 9. Sign Out button intercepted by overlay
**Severity**: MEDIUM
**Location**: `App.jsx` / portal layout
**Description**: The "Sign Out" button at the top of the portal is covered by a `<div>` overlay on mobile viewport (375px). Playwright's click was blocked by the intercepting element. This means real users on mobile may also have trouble tapping Sign Out.

### 10. No archetype visible in player DNA view
**Severity**: MEDIUM
**Location**: `PlayerDNA.jsx`
**Description**: Three players checked — none showed archetype data. Expected since onboarding didn't fully complete (bat_arch_answers empty), but the empty state message could be more helpful.

---

## Positive Observations

1. ✅ Registration flow works smoothly — clean form, good password validation, instant feedback
2. ✅ Login works reliably — all 14 accounts could sign in successfully
3. ✅ Coach roster renders with existing players — search, sort chips (A-Z, PDI, CCM), filter visible
4. ✅ Name and DOB correctly persisted for all 12 players
5. ✅ Password rules (uppercase, lowercase, number, special char) enforced properly
6. ✅ Supabase rejects common passwords (TestPass1! rejected, Cr1cket#Dna9xQ accepted)
7. ✅ Mobile viewport (375px) renders all pages without horizontal scroll
8. ✅ Progress bar visible in coach roster (4/10 assessed)

---

## Test Accounts Created

### Players (password: Cr1cket#Dna9xQ)
| Username | Name | Intended Role |
|----------|------|---------------|
| ft.mason.reid | Mason Reid | Batter |
| ft.priya.sharma | Priya Sharma | Bowler (Pace) |
| ft.liam.carter | Liam Carter | All-Rounder |
| ft.aisha.patel | Aisha Patel | Bowler (Spin) |
| ft.noah.williams | Noah Williams | Batter |
| ft.zara.nguyen | Zara Nguyen | All-Rounder |
| ft.oliver.jones | Oliver Jones | Keeper |
| ft.maya.chen | Maya Chen | Batter |
| ft.ethan.brooks | Ethan Brooks | Bowler (Pace) |
| ft.lily.thompson | Lily Thompson | Bowler (Spin) |
| ft.jack.murphy | Jack Murphy | All-Rounder |
| ft.sofia.martinez | Sofia Martinez | Batter |

### Coaches (password: Cr1cket#Dna9xQ)
| Username | Name |
|----------|------|
| ft.coach.sarah | Sarah Mitchell |
| ft.coach.james | James Okoro |

---

## Next Steps

1. **Fix CRITICAL #1**: Ensure onboarding `submitted` flag is set on final step completion
2. **Fix CRITICAL #2**: Add coach/player role selector to registration form
3. **Fix HIGH #4-6**: Verify role/club/rating data persistence through onboarding
4. **Re-run field test** after fixes to confirm coach roster populates with all players
5. **Complete coach assessment flow** once players are visible
6. **Verify admin dashboard** with admin credentials
7. **Cleanup**: Remove `ft.*` test accounts after all testing is complete
