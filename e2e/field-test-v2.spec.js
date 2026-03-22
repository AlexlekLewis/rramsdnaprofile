/**
 * RRAM DNA Profile — E2E Field Test v2
 *
 * Tests ACTUAL UI flows using real Supabase auth on the live Vercel app.
 * 1. Player login → onboarding → full form → submission
 * 2. Player re-login → verify lands on Player Portal (not onboarding)
 * 3. Coach login → verify lands on Coach Portal
 *
 * Run: npx playwright test e2e/field-test-v2.spec.js --reporter=list
 */

import { test, expect } from '@playwright/test';

const BASE = 'https://rramsdnaprofile.vercel.app';
const PW = 'Cr1cket#Dna9xQ';

const ROLE_LABELS = {
  batter: 'Specialist Batter', pace: 'Pace Bowler', spin: 'Spin Bowler',
  keeper: 'WK-Batter', allrounder: 'Batting All-Rounder',
};

const PLAYERS = [
  { username: 'ft.mason.reid',   name: 'Mason Reid',   dob: '15/06/2012', role: 'batter',     club: 'Melbourne CC' },
  { username: 'ft.priya.sharma', name: 'Priya Sharma',  dob: '22/03/2011', role: 'pace',       club: 'Eastern Stars' },
  { username: 'ft.liam.carter',  name: 'Liam Carter',   dob: '08/11/2013', role: 'allrounder', club: 'Bayside Tigers' },
];

const COACH = { username: 'ft.coach.sarah', name: 'Sarah Mitchell' };

const findings = [];
function log(sev, area, msg) {
  findings.push({ sev, area, msg });
  console.log(`  [${sev}] ${area}: ${msg}`);
}

// ═══ HELPERS ═══

async function clearAndGo(page) {
  await page.goto(BASE);
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
    // Specifically clear onboarding draft keys
    ['rra_pd', 'rra_pStep', 'rra_obGuide', 'rra_user_role', 'rra_pending_role'].forEach(k => {
      localStorage.removeItem(k);
      sessionStorage.removeItem(k);
    });
  });
  await page.goto(BASE);
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(2000);
}

async function loginAs(page, username) {
  await clearAndGo(page);

  // Ensure we're on login form
  const backLink = page.locator('text=/already have/i').first();
  if (await backLink.isVisible({ timeout: 2000 }).catch(() => false)) {
    await backLink.click();
    await page.waitForTimeout(500);
  }

  await page.locator('input[placeholder="Username"]').fill(username);
  await page.locator('input[placeholder="Password"]').fill(PW);
  await page.locator('button:has-text("SIGN IN")').click();
  await page.waitForTimeout(5000);

  const err = page.locator('text=/⚠/').first();
  if (await err.isVisible({ timeout: 1000 }).catch(() => false)) {
    const t = await err.textContent();
    log('ERROR', 'Login', `${username}: ${t}`);
    return false;
  }
  return true;
}

async function clickNext(page) {
  const btn = page.locator('button:has-text("NEXT")').first();
  if (!await btn.isVisible({ timeout: 3000 }).catch(() => false)) return 'NEXT button not found';
  await btn.scrollIntoViewIfNeeded();
  await btn.click({ force: true });
  await page.waitForTimeout(1500);

  const err = page.locator('text=/please/i').first();
  if (await err.isVisible({ timeout: 800 }).catch(() => false)) {
    return await err.textContent();
  }
  return null;
}

// ═══ PLAYER ONBOARDING ═══
test.describe.serial('Player Onboarding', () => {

  for (const player of PLAYERS) {
    test(`Onboard ${player.name}`, async ({ page }) => {
      test.setTimeout(180_000);

      const ok = await loginAs(page, player.username);
      expect(ok).toBe(true);

      // Check if already onboarded
      const portal = page.locator('text=/Welcome back|Recent Sessions|🧬/').first();
      if (await portal.isVisible({ timeout: 5000 }).catch(() => false)) {
        log('INFO', 'Onboarding', `${player.name} already onboarded`);
        return;
      }

      // Should be on PLAYER ONBOARDING
      await expect(page.locator('text=/PLAYER ONBOARDING/i').first()).toBeVisible({ timeout: 10000 });
      console.log(`\n  🏏 ${player.name} — onboarding started`);

      // ── WELCOME MODAL — dismiss it ──
      const letsGo = page.locator('button:has-text("LET\'S GO")').first();
      if (await letsGo.isVisible({ timeout: 3000 }).catch(() => false)) {
        await letsGo.click();
        await page.waitForTimeout(1000);
        console.log(`  ✅ Welcome modal dismissed`);
      }

      // ══════════════════════════════════════
      // STEP 0: PROFILE (Name, DOB, Club)
      // ══════════════════════════════════════
      const nameInput = page.locator('input').filter({ hasText: '' }).nth(0);
      // Find inputs by their label text above them
      const allInputs = page.locator('input[type="text"], input:not([type])');
      const inputCount = await allInputs.count();
      console.log(`  📋 Step 0: ${inputCount} text inputs visible`);

      // Name — first input on the page
      if (inputCount > 0) {
        const firstInput = allInputs.first();
        const val = await firstInput.inputValue();
        if (!val || val.trim() === '') {
          await firstInput.fill(player.name);
          console.log(`  ✅ Name filled: ${player.name}`);
        } else {
          console.log(`  ✅ Name pre-filled: ${val}`);
        }
      }

      // DOB — find by placeholder pattern DD/MM/YYYY
      const dobInput = page.locator('input[placeholder*="DD"]').first();
      if (await dobInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await dobInput.fill(player.dob);
        console.log(`  ✅ DOB filled: ${player.dob}`);
      }

      // Club — find by placeholder "e.g. Doncaster CC"
      const clubInput = page.locator('input[placeholder*="Doncaster"], input[placeholder*="club" i]').first();
      if (await clubInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await clubInput.fill(player.club);
        console.log(`  ✅ Club filled: ${player.club}`);
      }

      await page.screenshot({ path: `e2e/screenshots/v2-s0-${player.username}.png` });
      let stepErr = await clickNext(page);
      if (stepErr) { log('WARNING', 'Step 0', `${player.name}: ${stepErr}`); }

      // ══════════════════════════════════════
      // STEP 1: COMPETITION HISTORY
      // CompLevelSel uses TIER_GROUPS as clickable buttons
      // ══════════════════════════════════════
      await page.waitForTimeout(500);
      console.log(`  📋 Step 1: Competition History`);

      // Use "Entry Level / None" → then "No Recorded History"
      const entryBtn = page.locator('button:has-text("Entry Level")').first();
      if (await entryBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await entryBtn.click();
        await page.waitForTimeout(1500);
        console.log(`  ✅ Selected: Entry Level group`);
      }

      // Click "No Recorded History" — simplest option, no stats required
      const noHistoryBtn = page.locator('button:has-text("No Recorded History")').first();
      if (await noHistoryBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await noHistoryBtn.click();
        await page.waitForTimeout(500);
        console.log(`  ✅ Selected: No Recorded History`);
      } else {
        // Fallback: try "Woolworths Cricket Blast" or "School"
        const blastBtn = page.locator('button:has-text("Woolworths"), button:has-text("School")').first();
        if (await blastBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await blastBtn.click();
          await page.waitForTimeout(500);
          console.log(`  ✅ Selected: Blast/School fallback`);
        }
      }

      await page.screenshot({ path: `e2e/screenshots/v2-s1-${player.username}.png` });
      stepErr = await clickNext(page);
      if (stepErr) {
        log('WARNING', 'Step 1', `${player.name}: ${stepErr}`);
        await page.screenshot({ path: `e2e/screenshots/v2-s1-stuck-${player.username}.png` });

        // Debug: list all visible buttons
        const debugBtns = page.locator('button');
        const debugCount = await debugBtns.count();
        for (let i = 0; i < Math.min(debugCount, 15); i++) {
          const t = await debugBtns.nth(i).textContent().catch(() => '?');
          const vis = await debugBtns.nth(i).isVisible().catch(() => false);
          if (vis) console.log(`  🔍 Button[${i}]: "${t.trim().substring(0, 50)}"`);
        }

        // Try clicking any button that looks like a specific comp (not NEXT/BACK)
        for (let i = 0; i < debugCount; i++) {
          const btn = debugBtns.nth(i);
          const t = await btn.textContent().catch(() => '');
          if (/NEXT|BACK|Sign|Save|LET|Entry Level/i.test(t.trim())) continue;
          if (!await btn.isVisible().catch(() => false)) continue;
          if (t.trim().length > 3 && t.trim().length < 80) {
            await btn.click({ force: true }).catch(() => {});
            await page.waitForTimeout(500);
            // Check if the validation clears
            const still = page.locator('text=/please select at least/i').first();
            if (!await still.isVisible({ timeout: 500 }).catch(() => false)) {
              console.log(`  ✅ Comp selected via button: "${t.trim().substring(0, 30)}"`);
              break;
            }
          }
        }

        stepErr = await clickNext(page);
        if (stepErr) log('ERROR', 'Step 1 retry', `${player.name}: ${stepErr}`);
      }

      // ══════════════════════════════════════
      // STEP 2: T20 IDENTITY (Role + Archetype Questions)
      // ══════════════════════════════════════
      await page.waitForTimeout(500);
      console.log(`  📋 Step 2: T20 Identity`);
      await page.screenshot({ path: `e2e/screenshots/v2-s2-start-${player.username}.png` });

      // Find ALL selects on the page and fill them sequentially
      // Order: Primary Role, Batting Hand, Bowling Type, Primary Skill *, Secondary Skill
      const allSelects = page.locator('select');
      const selCount = await allSelects.count();
      console.log(`  📋 Step 2: ${selCount} select elements found`);

      // Dump all select options for debugging
      for (let i = 0; i < selCount; i++) {
        const sel = allSelects.nth(i);
        const opts = await sel.locator('option').allTextContents();
        console.log(`  📋 Select[${i}]: ${opts.join(', ')}`);
      }

      // Select[0] = Primary Role
      if (selCount > 0) {
        const roleText = ROLE_LABELS[player.role];
        try { await allSelects.nth(0).selectOption(roleText); console.log(`  ✅ Role: ${roleText}`); }
        catch { await allSelects.nth(0).selectOption({ index: 1 }); console.log(`  ✅ Role: fallback`); }
        await page.waitForTimeout(500);
      }

      // Select[1] = Batting Hand
      if (selCount > 1) {
        try { await allSelects.nth(1).selectOption('Right-Hand Bat'); }
        catch { await allSelects.nth(1).selectOption({ index: 1 }); }
        console.log(`  ✅ Batting Hand set`);
      }

      // Select[2] = Bowling Type
      if (selCount > 2) {
        await allSelects.nth(2).selectOption({ index: 1 }).catch(() => {});
        console.log(`  ✅ Bowling Type set`);
      }

      // Select[3] = PRIMARY SKILL (critical for validation!)
      if (selCount > 3) {
        const skillMap = { batter: 'Batting', pace: 'Fast Bowling', spin: 'Spin Bowling', keeper: 'Wicket Keeping', allrounder: 'Batting' };
        const skillVal = skillMap[player.role] || 'Batting';
        try { await allSelects.nth(3).selectOption(skillVal); console.log(`  ✅ Primary Skill: ${skillVal}`); }
        catch { await allSelects.nth(3).selectOption({ index: 1 }); console.log(`  ✅ Primary Skill: fallback`); }
      }

      // Select[4] = Secondary Skill
      if (selCount > 4) {
        await allSelects.nth(4).selectOption({ index: 1 }).catch(() => {});
        console.log(`  ✅ Secondary Skill set`);
      }

      // Archetype questions — these appear as card-style buttons after role is selected
      // Each question has 4 options as buttons within a question card
      await page.waitForTimeout(1000);

      // Find question answer buttons — they're typically inside styled divs
      // The archetype questions show scenario text and 4 answer options
      const allBtns = page.locator('button');
      const btnCount = await allBtns.count();
      console.log(`  📋 Step 2: ${btnCount} buttons total`);

      // Click archetype answer buttons — ONLY within question cards
      // Skip: nav buttons, selects, utility buttons
      const SKIP_PATTERNS = /^(NEXT|BACK|←|→|Sign Out|LET|SAVE|Save|SUBMIT|Next|Back|ADD|✕|Change|Save Progress)/i;
      let answersClicked = 0;
      for (let i = 0; i < btnCount; i++) {
        const btn = allBtns.nth(i);
        const text = (await btn.textContent().catch(() => '')).trim();
        if (SKIP_PATTERNS.test(text)) continue;
        if (text.length < 10 || text.length > 200) continue; // archetype answers are 10-150 chars
        if (!await btn.isVisible().catch(() => false)) continue;
        await btn.click({ force: true }).catch(() => {});
        answersClicked++;
        await page.waitForTimeout(100);
      }
      console.log(`  ✅ Clicked ${answersClicked} archetype answers`);

      await page.screenshot({ path: `e2e/screenshots/v2-s2-${player.username}.png` });
      stepErr = await clickNext(page);
      if (stepErr) log('WARNING', 'Step 2', `${player.name}: ${stepErr}`);

      // ══════════════════════════════════════
      // STEP 3: SELF-ASSESSMENT (1-5 rating dots)
      // ══════════════════════════════════════
      await page.waitForTimeout(500);
      console.log(`  📋 Step 3: Self-Assessment`);
      await page.screenshot({ path: `e2e/screenshots/v2-s3-start-${player.username}.png` });

      // Rating buttons are small buttons containing just a number 1-5
      // They appear in rows of 5 (confidence) then rows of 5 (frequency)
      const ratingBtns = page.locator('button').filter({ has: page.locator('div', { hasText: /^[1-5]$/ }) });
      let ratingCount = await ratingBtns.count();
      console.log(`  📋 Found ${ratingCount} rating buttons`);

      // Need to click enough: minimum 3 confidence + 3 frequency to pass validation
      // Click 20+ buttons to be safe (each skill has conf 1-5 + freq 1-5 = 10 buttons, click one per row)
      // Strategy: click button "3" or "4" for each set (every 5th button is rating 3 or 4)
      if (ratingCount > 0) {
        // Click every 5th button starting at index 2 (which is rating "3") and index 7 (rating "3" of freq)
        const clickIndices = [];
        for (let i = 2; i < ratingCount; i += 5) { clickIndices.push(i); } // Every "3" rating

        const toClick = Math.min(clickIndices.length, 20);
        for (let idx = 0; idx < toClick; idx++) {
          const btnIdx = clickIndices[idx];
          if (btnIdx < ratingCount) {
            await ratingBtns.nth(btnIdx).click({ force: true }).catch(() => {});
            await page.waitForTimeout(30);
          }
        }
        console.log(`  ✅ Clicked ${toClick} rating buttons (every "3")`);
      }

      await page.screenshot({ path: `e2e/screenshots/v2-s3-${player.username}.png` });
      stepErr = await clickNext(page);
      if (stepErr) {
        log('WARNING', 'Step 3', `${player.name}: ${stepErr}`);
        // Click more ratings
        ratingCount = await ratingBtns.count();
        for (let i = 0; i < Math.min(ratingCount, 40); i += 3) {
          await ratingBtns.nth(i).click({ force: true }).catch(() => {});
          await page.waitForTimeout(30);
        }
        stepErr = await clickNext(page);
        if (stepErr) log('ERROR', 'Step 3 retry', `${player.name}: ${stepErr}`);
      }

      // ══════════════════════════════════════
      // STEP 4: PLAYER VOICE / MATCHUPS
      // ══════════════════════════════════════
      await page.waitForTimeout(500);
      console.log(`  📋 Step 4: Player Voice / Matchups`);
      await page.screenshot({ path: `e2e/screenshots/v2-s4-start-${player.username}.png` });

      const s4Ratings = page.locator('button').filter({ has: page.locator('div', { hasText: /^[1-5]$/ }) });
      const s4Count = await s4Ratings.count();
      console.log(`  📋 Found ${s4Count} rating buttons`);

      if (s4Count > 0) {
        const clickIndices = [];
        for (let i = 2; i < s4Count; i += 5) { clickIndices.push(i); }
        const toClick = Math.min(clickIndices.length, 15);
        for (let idx = 0; idx < toClick; idx++) {
          if (clickIndices[idx] < s4Count) {
            await s4Ratings.nth(clickIndices[idx]).click({ force: true }).catch(() => {});
            await page.waitForTimeout(30);
          }
        }
        console.log(`  ✅ Clicked ${toClick} matchup ratings`);
      }

      await page.screenshot({ path: `e2e/screenshots/v2-s4-${player.username}.png` });
      stepErr = await clickNext(page);
      if (stepErr) {
        log('WARNING', 'Step 4', `${player.name}: ${stepErr}`);
        for (let i = 0; i < Math.min(s4Count, 30); i += 3) {
          await s4Ratings.nth(i).click({ force: true }).catch(() => {});
          await page.waitForTimeout(30);
        }
        stepErr = await clickNext(page);
        if (stepErr) log('ERROR', 'Step 4 retry', `${player.name}: ${stepErr}`);
      }

      // ══════════════════════════════════════
      // STEP 5: INJURY & GOALS (textareas)
      // ══════════════════════════════════════
      await page.waitForTimeout(500);
      console.log(`  📋 Step 5: Injury & Goals`);

      const textareas = page.locator('textarea');
      const taCount = await textareas.count();
      if (taCount > 0) {
        await textareas.nth(0).fill('No current injuries. Fully fit.');
        if (taCount > 1) await textareas.nth(1).fill('Want to improve my cricket and represent my state.');
        console.log(`  ✅ Filled ${taCount} textareas`);
      }

      await page.screenshot({ path: `e2e/screenshots/v2-s5-${player.username}.png` });
      await clickNext(page);

      // ══════════════════════════════════════
      // STEP 6: REVIEW & SUBMIT
      // ══════════════════════════════════════
      await page.waitForTimeout(1000);
      console.log(`  📋 Step 6: Review & Submit`);
      await page.screenshot({ path: `e2e/screenshots/v2-s6-${player.username}.png` });

      const submitBtn = page.locator('button:has-text("SUBMIT SURVEY")').first();
      const canSubmit = await submitBtn.isVisible({ timeout: 5000 }).catch(() => false);

      if (canSubmit) {
        await submitBtn.scrollIntoViewIfNeeded();
        await submitBtn.click();
        console.log(`  ⏳ Submit clicked — waiting for response...`);
        await page.waitForTimeout(6000);

        const success = page.locator('text=/Survey Submitted/i').first();
        if (await success.isVisible({ timeout: 8000 }).catch(() => false)) {
          console.log(`  ✅✅ ${player.name} — ONBOARDING COMPLETE ✅✅`);
          log('PASS', 'Onboarding', `${player.name}: Fully completed`);
        } else {
          const errMsg = page.locator('text=/failed|error/i').first();
          if (await errMsg.isVisible({ timeout: 2000 }).catch(() => false)) {
            log('ERROR', 'Submit', `${player.name}: ${await errMsg.textContent()}`);
          } else {
            log('WARNING', 'Submit', `${player.name}: No clear success/error after submit`);
          }
        }
      } else {
        log('ERROR', 'Submit', `${player.name}: SUBMIT SURVEY not visible — stuck before review`);
        // Log what IS visible to debug
        const pageText = await page.locator('body').textContent();
        const snippet = pageText.substring(0, 200);
        console.log(`  Page content: ${snippet}...`);
      }

      await page.screenshot({ path: `e2e/screenshots/v2-done-${player.username}.png` });
    });
  }
});

// ═══ RETURNING PLAYER → PORTAL ═══
test('Returning player lands on portal', async ({ page }) => {
  test.setTimeout(30_000);
  const player = PLAYERS[0];

  const ok = await loginAs(page, player.username);
  expect(ok).toBe(true);

  // Should see Player Portal (DNA, Journal, etc), NOT onboarding
  const portalEl = page.locator('text=/Welcome back|Recent Sessions|🧬/').first();
  const isPortal = await portalEl.isVisible({ timeout: 10000 }).catch(() => false);

  const isOnboarding = await page.locator('text=/PLAYER ONBOARDING/i').first()
    .isVisible({ timeout: 2000 }).catch(() => false);

  if (isPortal) {
    log('PASS', 'Routing', `${player.name}: Returning player goes to portal ✅`);
  } else if (isOnboarding) {
    log('CRITICAL', 'Routing', `${player.name}: SENT BACK TO ONBOARDING`);
  } else {
    log('ERROR', 'Routing', `${player.name}: Neither portal nor onboarding visible`);
  }

  await page.screenshot({ path: 'e2e/screenshots/v2-returning.png' });
  expect(isPortal).toBe(true);
});

// ═══ COACH LOGIN → COACH PORTAL ═══
test('Coach lands on coach portal', async ({ page }) => {
  test.setTimeout(30_000);

  const ok = await loginAs(page, COACH.username);
  expect(ok).toBe(true);

  const coachEl = page.locator('text=/Roster|Dashboard|COACH|Player/i').first();
  const isCoach = await coachEl.isVisible({ timeout: 10000 }).catch(() => false);

  if (isCoach) {
    log('PASS', 'Routing', `${COACH.name}: Coach portal confirmed ✅`);
  } else {
    const isOnboarding = await page.locator('text=/PLAYER ONBOARDING/i').first()
      .isVisible({ timeout: 2000 }).catch(() => false);
    if (isOnboarding) log('CRITICAL', 'Routing', `Coach sent to player onboarding!`);
    else log('ERROR', 'Routing', `Coach: Neither coach portal nor onboarding`);
  }

  await page.screenshot({ path: 'e2e/screenshots/v2-coach.png' });
  expect(isCoach).toBe(true);
});

// ═══ SUMMARY ═══
test.afterAll(() => {
  console.log('\n' + '═'.repeat(60));
  console.log('FIELD TEST v2 — RESULTS');
  console.log('═'.repeat(60));

  const grouped = {};
  findings.forEach(f => { if (!grouped[f.sev]) grouped[f.sev] = []; grouped[f.sev].push(f); });

  for (const sev of ['CRITICAL', 'ERROR', 'WARNING', 'INFO', 'PASS']) {
    if (grouped[sev]) {
      console.log(`\n${sev} (${grouped[sev].length}):`);
      grouped[sev].forEach(f => console.log(`  ${f.area}: ${f.msg}`));
    }
  }

  console.log('\n' + '═'.repeat(60));
});
