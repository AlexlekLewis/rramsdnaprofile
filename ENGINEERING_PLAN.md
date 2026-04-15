# RRA DNA Profile — Comprehensive Engineering Fix Plan
**Date:** 14 April 2026  
**Based on:** Stress Test Report + Live Chrome Diagnostic  
**Priority:** Coach data capture reliability  

---

## Executive Summary

The stress test revealed 6 issues across 5 player assessments. The live diagnostic confirmed auto-save works (285ms avg latency, 2s debounce) but uncovered additional problems: the local codebase is missing 7 fields from the save function, 3 score columns are never populated (despite being in the deployed code), the assessment history system creates redundant snapshots on every debounced save, and the save status UX is insufficient for busy coaches. This plan addresses every issue in priority order.

---

## PHASE 1 — CRITICAL: Sync Local Code with Deployed (Pre-Deploy Gate)

### Problem
The local `src/db/playerDb.js` `saveAssessmentToDB` function (lines 414-421) is missing 7 fields that the deployed Vercel version includes. If anyone deploys from the local codebase, these fields will stop being saved.

### Root Cause
The deployed version was edited directly or deployed from a branch that was never merged back to local.

### Fields Missing from Local Code

| Field | Type | How Deployed Code Sets It |
|-------|------|--------------------------|
| `fielding` | jsonb | `Object.fromEntries(Object.entries(cd).filter(([k]) => k.startsWith('fld_')))` |
| `session_date` | date | `new Date().toISOString().split('T')[0]` |
| `status` | text | Auto-calculated: `'complete'` if rated skills + narrative + strengths, else `'draft'` |
| `player_voice` | jsonb | `cd._playerVoice \|\| null` (passed through from player self-perception data) |
| `overall_batting` | smallint | `cd.overall_batting \|\| null` (PASS-THROUGH — never set, see Phase 2) |
| `overall_rating` | smallint | `cd.overall_rating \|\| null` (PASS-THROUGH — never set, see Phase 2) |
| `batting_qualities` | jsonb | `cd.batting_qualities \|\| null` (PASS-THROUGH — never set, see Phase 2) |

### Fix — Update `src/db/playerDb.js` lines 405-421

**BEFORE (current local code):**
```javascript
const phaseKeys = ['pb_pp', 'pw_pp', 'pb_mid', 'pw_mid', 'pb_death', 'pw_death'];
const phase_ratings = Object.fromEntries(phaseKeys.filter(k => cd[k] != null).map(k => [k, cd[k]]));
const tech_primary = Object.fromEntries(Object.entries(cd).filter(([k]) => k.startsWith('t1_')));
const tech_secondary = Object.fromEntries(Object.entries(cd).filter(([k]) => k.startsWith('t2_')));
const game_iq = Object.fromEntries(Object.entries(cd).filter(([k]) => k.startsWith('iq_')));
const mental = Object.fromEntries(Object.entries(cd).filter(([k]) => k.startsWith('mn_')));
const physical = Object.fromEntries(Object.entries(cd).filter(([k]) => k.startsWith('ph_')));
const strengths = [cd.str1, cd.str2, cd.str3].filter(Boolean);
const priorities = [cd.pri1, cd.pri2, cd.pri3].filter(Boolean);
const row = {
    player_id: playerId, coach_id: session?.user?.id || null,
    batting_archetype: cd.batA || null, bowling_archetype: cd.bwlA || null,
    phase_ratings, tech_primary, tech_secondary, game_iq, mental, physical,
    narrative: cd.narrative || null, strengths, priorities,
    plan_explore: cd.pl_explore || null, plan_challenge: cd.pl_challenge || null, plan_execute: cd.pl_execute || null,
    squad_rec: cd.sqRec || null, updated_at: new Date().toISOString()
};
```

**AFTER (synced with deployed + Phase 2 additions):**
```javascript
const phaseKeys = ['pb_pp', 'pw_pp', 'pb_mid', 'pw_mid', 'pb_death', 'pw_death'];
const phase_ratings = Object.fromEntries(phaseKeys.filter(k => cd[k] != null).map(k => [k, cd[k]]));
const tech_primary = Object.fromEntries(Object.entries(cd).filter(([k]) => k.startsWith('t1_')));
const tech_secondary = Object.fromEntries(Object.entries(cd).filter(([k]) => k.startsWith('t2_')));
const game_iq = Object.fromEntries(Object.entries(cd).filter(([k]) => k.startsWith('iq_')));
const mental = Object.fromEntries(Object.entries(cd).filter(([k]) => k.startsWith('mn_')));
const physical = Object.fromEntries(Object.entries(cd).filter(([k]) => k.startsWith('ph_')));
const fielding = Object.fromEntries(Object.entries(cd).filter(([k]) => k.startsWith('fld_')));
const strengths = [cd.str1, cd.str2, cd.str3].filter(Boolean);
const priorities = [cd.pri1, cd.pri2, cd.pri3].filter(Boolean);

// Auto-calculate status
const ratedSkills = [...Object.values(tech_primary), ...Object.values(tech_secondary)].filter(v => v > 0).length;
const status = (ratedSkills > 0 && cd.narrative && strengths.length > 0) ? 'complete' : 'draft';

const row = {
    player_id: playerId, coach_id: session?.user?.id || null,
    batting_archetype: cd.batA || null, bowling_archetype: cd.bwlA || null,
    phase_ratings, tech_primary, tech_secondary, game_iq, mental, physical,
    fielding: Object.keys(fielding).length > 0 ? fielding : null,
    narrative: cd.narrative || null, strengths, priorities,
    plan_explore: cd.pl_explore || null, plan_challenge: cd.pl_challenge || null, plan_execute: cd.pl_execute || null,
    squad_rec: cd.sqRec || null,
    overall_batting: cd._overallBatting || null,
    overall_rating: cd._overallRating || null,
    batting_qualities: cd._battingQualities || null,
    session_date: new Date().toISOString().split('T')[0],
    status,
    player_voice: cd._playerVoice || null,
    updated_at: new Date().toISOString()
};
```

### Verification
- Run `npm run dev` and complete one assessment locally
- Compare saved row against a deployed-version row using SQL
- Confirm all 28 columns match structure

---

## PHASE 2 — HIGH: Compute and Persist Score Columns

### Problem
`overall_batting`, `overall_rating`, and `batting_qualities` are NULL for ALL assessments (including the 5 stress-tested ones). The deployed save function passes these through from `cd`, but nothing ever writes them into `cd`.

### Root Cause
The `overallScore` is computed on-the-fly in `CoachAssessment.jsx` (line 744):
```javascript
const pathwayScore = dn.pdiPct;
const cohortScore = calcCohortPercentile(dn.pdi, players, compTiers, dbWeights, engineConst);
const ageScore = calcAgeScore(ccmR.arm, engineConst);
const overallScore = Math.round((pathwayScore + cohortScore + ageScore) / 3);
```
But this value is only rendered in the UI — never persisted via `cU()`.

### Fix — Inject computed scores into `cd` during save (CoachAssessment.jsx)

Add score persistence to the `cU` wrapper or create a dedicated score-sync function that runs on each save cycle.

**Option A (Recommended): Compute in `saveAssessmentToDB` itself**  
Pass the engine results alongside `cd` so the save function can compute scores server-side-style:

```javascript
// In CoachAssessment.jsx, modify the auto-save call:
saveTimer.current = setTimeout(async () => {
    saveStatusHook.setSaving();
    retryCount.current = 0;
    
    // Compute scores at save time
    const currentCd = pendingCdRef.current;
    const ccm = calcCCM(sp.grades, sp.dob, compTiers, engineConst);
    const dnResult = calcPDI({ ...currentCd, _dob: sp.dob }, sp.self_ratings, sp.role, ccm, dbWeights, engineConst, sp.grades, {}, sp.topBat, sp.topBowl, compTiers);
    
    if (dnResult && dnResult.pdi > 0) {
        const pathS = dnResult.pdiPct;
        const cohortS = calcCohortPercentile(dnResult.pdi, players, compTiers, dbWeights, engineConst);
        const ageS = calcAgeScore(ccm.arm, engineConst);
        currentCd._overallRating = Math.round((pathS + cohortS + ageS) / 3);
        
        // Batting domain score
        const batDomain = dnResult.domains.find(d => d.k === 'bat' || d.k === 'tech_primary');
        currentCd._overallBatting = batDomain ? Math.round(batDomain.s100) : null;
        
        // Batting qualities breakdown
        currentCd._battingQualities = {
            technique: Math.round(dnResult.domains.find(d => d.k === 'tech_primary')?.s100 || 0),
            secondary: Math.round(dnResult.domains.find(d => d.k === 'tech_secondary')?.s100 || 0),
            phases: Object.fromEntries(
                ['pb_pp','pb_mid','pb_death'].filter(k => currentCd[k]).map(k => [k, currentCd[k]])
            )
        };
    }
    
    const doSave = async () => { /* existing retry logic */ };
    doSave();
}, 2000);
```

**Option B: Inject via `cU` on PDI Summary page load**  
When `cPage === 3` loads, auto-call `cU('_overallRating', overallScore)` etc. Simpler but only fires if the coach visits page 4.

**Recommendation:** Option A — ensures scores are computed regardless of which page the coach is on, and they're always up-to-date with the latest ratings.

---

## PHASE 3 — HIGH: Fix Assessment History Bloat

### Problem  
Every debounced auto-save triggers a full history snapshot: `SELECT *` from existing → `INSERT INTO assessment_history`. During the live diagnostic, 3 rapid archetype changes created 3 redundant history rows. A real coaching session with ~40 rating clicks would generate ~20 history snapshots.

### Diagnostic Evidence
- 3 rapid archetype changes → 3 history rows created
- Each save = 2 DB round trips (history snapshot + upsert)
- Assessment_history table will grow at ~20× the rate of actual assessments

### Fix — Throttle History Snapshots

```javascript
// In saveAssessmentToDB, add time-based throttle for history
const HISTORY_INTERVAL_MS = 5 * 60 * 1000; // 5-minute minimum between snapshots

export async function saveAssessmentToDB(playerId, cd) {
    let session = null;
    try {
        const { data } = await supabase.auth.getSession();
        session = data?.session || null;
    } catch (e) { console.warn('Session error:', e.message); }

    // ── History snapshot — throttled to once per 5 minutes ──
    const historyKey = `rra_last_history_${playerId}`;
    const lastHistory = parseInt(localStorage.getItem(historyKey) || '0');
    const now = Date.now();
    
    if (now - lastHistory > HISTORY_INTERVAL_MS) {
        try {
            const { data: existing } = await supabase
                .from('coach_assessments')
                .select('*').eq('player_id', playerId).maybeSingle();
            if (existing) {
                const { count } = await supabase
                    .from('assessment_history')
                    .select('id', { count: 'exact', head: true })
                    .eq('player_id', playerId);
                await supabase.from('assessment_history').insert({
                    player_id: playerId,
                    assessment_data: existing,
                    version: (count || 0) + 1,
                    created_by: session?.user?.id || null,
                });
                localStorage.setItem(historyKey, String(now));
            }
        } catch (e) { console.warn('History snapshot failed:', e.message); }
    }

    // ── Upsert (unchanged) ──
    // ... rest of function
}
```

This reduces history snapshots from every save (~20/session) to roughly 1-2 per session, while still capturing meaningful checkpoints.

---

## PHASE 4 — MEDIUM: Persistent Save Status Indicator

### Problem
The current `SaveToast` component:
- Success state fades after 2.4s (too fast to notice during busy coaching)
- Error state is a small, non-interactive toast in the top-right corner (`pointerEvents: 'none'`)
- No visual distinction between "never saved" and "saved successfully"
- No prevention of navigating away with unsaved changes

### Diagnostic Evidence
- "Saving..." toast was visible in screenshot at :07, gone by :11 (4 seconds total from click)
- A coach looking at a rating grid would miss the toast entirely
- No "unsaved changes" warning if the coach navigates back to roster

### Fix A — Enhanced Save Status Bar

Replace the transient toast with a persistent status indicator in the assessment header:

```jsx
// In CoachAssessment.jsx, add to the assessment page header (near line 630)
const SaveStatusBar = ({ status, message }) => {
    const colors = {
        idle: { bg: 'transparent', text: B.g400, icon: '' },
        saving: { bg: `${B.bl}10`, text: B.bl, icon: '⏳' },
        saved: { bg: `${B.grn}10`, text: B.grn, icon: '✓' },
        error: { bg: '#e53e3e15', text: '#e53e3e', icon: '⚠' },
        offline: { bg: '#dd6b2015', text: '#dd6b20', icon: '📡' },
    };
    const c = colors[status] || colors.idle;
    if (status === 'idle') return null;
    
    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '4px 10px', borderRadius: 6,
            background: c.bg, border: `1px solid ${c.text}30`,
            fontSize: 10, fontWeight: 700, color: c.text, fontFamily: F,
            transition: 'all 0.3s',
        }}>
            <span>{c.icon}</span>
            <span>{message || { saving: 'Saving...', saved: 'All changes saved', error: 'Save failed!', offline: 'Offline — saved locally' }[status]}</span>
            {status === 'error' && (
                <button onClick={() => {/* trigger manual retry */}} 
                    style={{ marginLeft: 6, padding: '2px 8px', borderRadius: 4, 
                    border: '1px solid #e53e3e', background: 'transparent', 
                    color: '#e53e3e', fontSize: 9, cursor: 'pointer' }}>
                    Retry
                </button>
            )}
        </div>
    );
};
```

### Fix B — Unsaved Changes Guard

Add a `beforeunload` handler and a navigation guard:

```javascript
// In CoachAssessment.jsx, inside the assessment view
useEffect(() => {
    if (cView !== 'assess') return;
    const handler = (e) => {
        if (saveStatusHook.status === 'saving' || saveStatusHook.status === 'error') {
            e.preventDefault();
            e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
}, [cView, saveStatusHook.status]);
```

Add a soft guard on the "Back to Roster" button:
```javascript
// When clicking back to roster while saves are pending
const handleBackToRoster = () => {
    if (saveStatusHook.status === 'saving' || saveStatusHook.status === 'error') {
        if (!confirm('Changes are still saving. Leave anyway?')) return;
    }
    setCView('list');
    setSelP(null);
};
```

---

## PHASE 5 — MEDIUM: Deploy Pending Local Fixes

### Issue 3 Fix — Blank White Screen After Login
**File:** `src/coach/CoachAssessment.jsx`  
**Already fixed in local code, not deployed.**

The component returned `null` when `cView === 'assess'` but the player list hadn't loaded. Fix adds loading spinner and safety reset.

### Issue 4 Fix — Missing `loadPlayerScores` Export  
**File:** `src/db/playerDb.js`  
**Already fixed in local code, not deployed.**

The export was dropped during a file copy/edit.

### Deploy Steps
1. Commit Phase 1 + Phase 2 + Phase 3 changes
2. Include the existing Issue 3 + Issue 4 fixes
3. Push to GitHub → Vercel auto-deploys
4. Verify on production: 
   - Login as coach
   - Complete one assessment
   - Check DB for all 28 columns populated
   - Verify `overall_rating` and `overall_batting` are no longer NULL

---

## PHASE 6 — LOW: Console Error Accumulation & UX Polish

### Problem
When saves fail, the 3× exponential backoff retry generates 4 error messages per save attempt. With 2s debounce auto-save, rapid clicks can generate 50+ errors/minute.

### Fix — Rate-Limit Console Errors
```javascript
// Wrap retry console.warn with a throttle
let lastRetryLog = 0;
const doSave = async () => {
    try {
        await saveAssessmentToDB(sp.id, pendingCdRef.current);
        saveStatusHook.setSaved();
        retryCount.current = 0;
    } catch (err) {
        retryCount.current++;
        const now = Date.now();
        if (now - lastRetryLog > 5000) { // Log at most once per 5s
            console.warn(`Save retry ${retryCount.current}/3:`, err.message);
            lastRetryLog = now;
        }
        if (retryCount.current <= 3) {
            saveStatusHook.setError(`Retrying (${retryCount.current}/3)…`);
            setTimeout(doSave, 1000 * Math.pow(2, retryCount.current - 1));
        } else {
            try { localStorage.setItem(`rra_draft_${sp.id}`, JSON.stringify(pendingCdRef.current)); } catch { }
            saveStatusHook.setOffline();
        }
    }
};
```

---

## PHASE 7 — HOUSEKEEPING: Database Constraint Audit

### Check all constraints match deployed code expectations

```sql
-- Run this audit query
SELECT tc.table_name, tc.constraint_name, tc.constraint_type, 
       cc.check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints cc 
    ON tc.constraint_name = cc.constraint_name
WHERE tc.table_schema = 'public'
    AND tc.constraint_type = 'CHECK'
ORDER BY tc.table_name;
```

### Known constraint already fixed:
```sql
-- Applied in prior session (stress test)
ALTER TABLE coach_assessments DROP CONSTRAINT coach_assessments_status_check;
ALTER TABLE coach_assessments ADD CONSTRAINT coach_assessments_status_check 
  CHECK (status = ANY (ARRAY['draft', 'complete', 'submitted', 'reviewed']));
```

### Recommendation
Add a migration file for this change so it's tracked in version control:
```
migrations/20260414_fix_status_constraint.sql
```

---

## Implementation Order & Risk Assessment

| Phase | Priority | Risk | Effort | Deploy Required |
|-------|----------|------|--------|-----------------|
| 1. Sync local code | CRITICAL | Data loss if deployed without | 30 min | Before any deploy |
| 2. Compute score columns | HIGH | Score dashboard shows blanks | 1 hr | Yes |
| 3. History throttle | HIGH | DB bloat, perf degradation | 30 min | Yes |
| 4. Save status UX | MEDIUM | Coach confusion, lost work | 1 hr | Yes |
| 5. Deploy pending fixes | MEDIUM | Blank screen on login | 15 min | Yes |
| 6. Console error throttle | LOW | Dev experience only | 15 min | Yes |
| 7. DB constraint audit | LOW | Future constraint conflicts | 30 min | DB only |

**Total estimated effort: ~4 hours**

---

## Live Diagnostic Results Summary

| Metric | Value | Status |
|--------|-------|--------|
| Auto-save debounce | 2,000ms | ✅ Working |
| Avg DB latency (history snapshot) | 525ms | ⚠ Unnecessary on every save |
| Avg DB latency (upsert) | 295ms | ✅ Fast |
| Total click-to-persisted | ~3,000ms | ✅ Acceptable |
| Retry mechanism | 3× exponential backoff | ✅ Working |
| localStorage fallback | After all retries fail | ✅ Working |
| SaveToast visibility | 2.4s then auto-hide | ⚠ Too fast |
| History snapshots per save | 1 (should be throttled) | ❌ Bloat risk |
| `overall_rating` populated | Never | ❌ Fix in Phase 2 |
| `overall_batting` populated | Never | ❌ Fix in Phase 2 |
| `batting_qualities` populated | Never | ❌ Fix in Phase 2 |
| `fielding` populated | Yes (deployed) | ⚠ Missing from local |
| `session_date` populated | Yes (deployed) | ⚠ Missing from local |
| `status` populated | Yes (deployed) | ⚠ Missing from local |
| `player_voice` populated | Yes (deployed) | ⚠ Missing from local |
| Console errors (post-fix) | 0 new errors | ✅ Clean |
| Assessment history rows | 108 for 5 players (~22/player) | ❌ Severe bloat |
