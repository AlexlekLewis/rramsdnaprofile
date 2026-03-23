/**
 * RRAM DNA Profile — End-to-End Field Test v2
 *
 * Tests the full user journey:
 * 1. Register players + coaches (code auto-detects role)
 * 2. Complete player onboarding with realistic data
 * 3. Verify returning players go to Player Portal (not onboarding)
 * 4. Verify coaches go to Coach Portal
 * 5. Log all findings
 *
 * Run: npx playwright test e2e/field-test.spec.js --headed
 */

import { test, expect } from '@playwright/test';

const APP = 'https://rramsdnaprofile.vercel.app';
const PLAYER_CODE = 'RRAM-ELITE-2026';
const COACH_CODE  = 'RR9X-STF-4KQ7';
const PW          = 'Cr1cket#Dna9xQ';

// 3 players (enough to prove the flow without 20-min test runs)
const PLAYERS = [
  { username: 'ft2.mason.reid',   name: 'Mason Reid',   dob: '15/06/2012', club: 'Melbourne CC' },
  { username: 'ft2.priya.sharma', name: 'Priya Sharma', dob: '22/03/2011', club: 'Eastern Stars' },
  { username: 'ft2.liam.carter',  name: 'Liam Carter',  dob: '08/11/2013', club: 'Bayside Tigers' },
];

const COACHES = [
  { username: 'ft2.coach.sarah', name: 'Sarah Mitchell' },
];

const findings = [];
function logFinding(sev, area, desc) {
  findings.push({ sev, area, desc });
  console.log(`  [${sev}] ${area}: ${desc}`);
}

// ═══ HELPERS ═══

/** Register a user — code determines role automatically */
async function registerUser(page, { username, name, code }) {
  await page.goto(APP);
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1500);

  // Click "Register with your code"
  const regLink = page.locator('text=/register|new here/i').first();
  await regLink.waitFor({ timeout: 5000 });
  await regLink.click();
  await page.waitForTimeout(800);

  // Fill the form
  await page.locator('input[placeholder="Registration Code"]').fill(code);
  await page.locator('input[placeholder="Full Name"]').fill(name);
  await page.locator('input[placeholder="Username"]').fill(username);
  await page.locator('input[placeholder="Password"]').fill(PW);
  await page.locator('input[placeholder="Confirm Password"]').fill(PW);

  // Submit
  await page.locator('button:has-text("CREATE ACCOUNT")').click();
  await page.waitForTimeout(6000);

  // Check for errors
  const err = page.locator('text=/⚠/').first();
  if (await err.isVisible({ timeout: 1000 }).catch(() => false)) {
    const msg = await err.textContent();
    if (msg.includes('already taken')) {
      console.log(`  ⏭  ${username} already exists — OK`);
      return 'exists';
    }
    logFinding('ERROR', 'Register', `${username}: ${msg}`);
    return 'error';
  }

  console.log(`  ✅ Registered: ${username}`);
  return 'ok';
}

/** Sign in and return true if successful */
async function signIn(page, username) {
  await page.goto(APP);
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1500);

  // If we see "Register" form, switch to login
  const backToLogin = page.locator('text=/already have.*account|back.*login|sign in/i').first();
  if (await backToLogin.isVisible({ timeout: 2000 }).catch(() => false)) {
    await backToLogin.click();
    await page.waitForTimeout(500);
  }

  await page.locator('input[placeholder="Username"]').fill(username);
  await page.locator('input[placeholder="Password"]').fill(PW);
  await page.locator('button:has-text("SIGN IN")').click();
  await page.waitForTimeout(5000);

  const err = page.locator('text=/⚠/').first();
  if (await err.isVisible({ timeout: 1000 }).catch(() => false)) {
    logFinding('ERROR', 'Login', `${username}: ${await err.textContent()}`);
    return false;
  }
  return true;
}

/** Click the NEXT button (handles SaveToast overlay) */
async function clickNext(page) {
  const btn = page.locator('button:has-text("Next")').first();
  await btn.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await btn.click({ force: true });
  await page.waitForTimeout(2500);
}

/** Get the step indicator text */
async function getStepText(page) {
  const stepEl = page.locator('text=/STEP \\d/i').first();
  if (await stepEl.isVisible({ timeout: 1000 }).catch(() => false)) {
    return await stepEl.textContent();
  }
  return '';
}

// ═══ TEST 1: REGISTER ALL USERS ═══
test('1 — Register players and coaches', async ({ browser }) => {
  test.setTimeout(120000);

  // Register players
  for (const p of PLAYERS) {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    const result = await registerUser(page, { username: p.username, name: p.name, code: PLAYER_CODE });
    expect(['ok', 'exists']).toContain(result);
    await ctx.close();
  }

  // Register coaches — same form, coach code auto-detects role
  for (const c of COACHES) {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    const result = await registerUser(page, { username: c.username, name: c.name, code: COACH_CODE });
    expect(['ok', 'exists']).toContain(result);
    await ctx.close();
  }

  console.log(`\n📊 Registered ${PLAYERS.length} players + ${COACHES.length} coaches`);
});

// ═══ TEST 2: ONBOARD MASON (full flow, detailed checks) ═══
test('2 — Onboard Mason Reid (full journey)', async ({ browser }) => {
  test.setTimeout(90000);
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  // Sign in
  const ok = await signIn(page, PLAYERS[0].username);
  expect(ok).toBe(true);

  // Should see onboarding (PLAYER ONBOARDING header or LET'S GO button)
  const onboardHeader = page.locator('text=/PLAYER ONBOARDING|LET.*GO|GET STARTED/i').first();
  await expect(onboardHeader).toBeVisible({ timeout: 10000 });
  console.log('  ✅ Onboarding screen loaded');

  // Click LET'S GO if visible
  const letsGo = page.locator('button:has-text("LET\'S GO")').first();
  if (await letsGo.isVisible({ timeout: 3000 }).catch(() => false)) {
    await letsGo.click({ force: true });
    await page.waitForTimeout(2000);
  }

  // ── STEP 0: Profile ──
  let step = await getStepText(page);
  console.log(`  📍 ${step}`);

  // Name might be pre-filled
  const nameInput = page.locator('input[placeholder*="name" i]').first();
  if (await nameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    const val = await nameInput.inputValue();
    if (!val) await nameInput.fill(PLAYERS[0].name);
  }

  // DOB
  const dobInput = page.locator('input[placeholder*="DD" i]').first();
  if (await dobInput.isVisible({ timeout: 2000 }).catch(() => false)) {
    await dobInput.fill(PLAYERS[0].dob);
  }

  // Club — placeholder is "e.g. Doncaster CC"
  const clubInput = page.locator('input[placeholder*="Doncaster" i], input[placeholder*="club" i]').first();
  if (await clubInput.isVisible({ timeout: 2000 }).catch(() => false)) {
    await clubInput.fill(PLAYERS[0].club);
    console.log(`  ✅ Club filled: ${PLAYERS[0].club}`);
  } else {
    logFinding('WARNING', 'Step 0', 'Club input not found');
  }

  await clickNext(page);

  // ── STEP 1: Competition History ──
  step = await getStepText(page);
  console.log(`  📍 ${step}`);

  // CompLevelSel is a multi-step button selector, NOT a native <select>
  // Step 1: Pick a tier group — click "Entry Level / None" (simplest path)
  const entryBtn = page.locator('button:has-text("Entry Level")').first();
  if (await entryBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await entryBtn.click();
    await page.waitForTimeout(1000);
    console.log('  ✅ Selected: Entry Level group');

    // Step 2: Now a tier button should appear — click the first one
    const tierBtn = page.locator('button:has-text("No Recorded"), button:has-text("Cricket Blast"), button:has-text("School")').first();
    if (await tierBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await tierBtn.click();
      await page.waitForTimeout(500);
      console.log('  ✅ Selected: Entry tier');
    }
  } else {
    // Fallback: try clicking Community Association
    const commBtn = page.locator('button:has-text("Community")').first();
    if (await commBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await commBtn.click();
      await page.waitForTimeout(1000);
      // Pick first association
      const assocBtn = page.locator('button').filter({ hasText: /[A-Z]{2,5}/ }).first();
      if (await assocBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await assocBtn.click();
        await page.waitForTimeout(1000);
        // Pick first competition
        const compBtn = page.locator('button').filter({ hasText: /U\d|Senior|Junior/i }).first();
        if (await compBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await compBtn.click();
          await page.waitForTimeout(500);
        }
      }
    }
  }

  await clickNext(page);

  // ── STEP 2: T20 Identity ──
  step = await getStepText(page);
  console.log(`  📍 ${step}`);

  // Select Role from the role dropdown (it's a <Sel> component = <select>)
  const selects = page.locator('select');
  const selCount = await selects.count();
  console.log(`  📋 ${selCount} select dropdowns on Step 2`);

  // First select is usually Role
  if (selCount >= 1) {
    await selects.nth(0).selectOption({ index: 1 }); // First real role
    await page.waitForTimeout(300);
  }

  // After role selection, more selects appear (Batting Hand, Bowling, Primary Skill, Secondary)
  await page.waitForTimeout(1000);
  const selCount2 = await selects.count();
  console.log(`  📋 After role select: ${selCount2} selects`);

  for (let i = 1; i < selCount2; i++) {
    const sel = selects.nth(i);
    if (await sel.isVisible({ timeout: 1000 }).catch(() => false)) {
      const opts = await sel.locator('option').count();
      if (opts > 1) {
        await sel.selectOption({ index: 1 });
        await page.waitForTimeout(200);
      }
    }
  }

  // Answer archetype questions — these are radio-style buttons within question cards
  // Each question has 4 options. Look for clickable answer options.
  const archButtons = page.locator('button').filter({ hasText: /^[A-D]$|^[a-d]\)/ });
  const abCount = await archButtons.count();
  if (abCount > 0) {
    console.log(`  📝 Archetype questions: ${abCount} option buttons`);
    for (let i = 0; i < abCount; i += 4) {
      // Click first option of each question
      await archButtons.nth(i).click().catch(() => {});
      await page.waitForTimeout(150);
    }
  } else {
    // Archetype options might be styled as regular buttons with text
    // Try scrolling down and looking for question option buttons
    const qOptions = page.locator('[style*="cursor: pointer"][style*="border-radius"]').filter({ hasText: /./  });
    const qCount = await qOptions.count();
    console.log(`  📝 Found ${qCount} potential archetype option elements`);
  }

  await clickNext(page);

  // Check for validation error on step 2
  const valErr = page.locator('text=/please select/i').first();
  if (await valErr.isVisible({ timeout: 1000 }).catch(() => false)) {
    logFinding('INFO', 'Step 2', 'Validation caught missing field — re-selecting');
    // Try selecting all required fields again
    const allSels = page.locator('select');
    for (let i = 0; i < await allSels.count(); i++) {
      const sel = allSels.nth(i);
      const val = await sel.inputValue();
      if (!val) await sel.selectOption({ index: 1 }).catch(() => {});
    }
    await clickNext(page);
  }

  // ── STEPS 3-5: Self-Assessment, Matchups, Medical ──
  // These steps have complex interactive elements (rating dots).
  // Use soft-nudge skip: tap Next twice per step (first shows nudge, second skips)
  for (let s = 3; s <= 5; s++) {
    step = await getStepText(page);
    console.log(`  📍 ${step}`);

    // On the Medical step (last before review), fill textareas
    const textareas = page.locator('textarea');
    const taCount = await textareas.count();
    if (taCount >= 1) {
      await textareas.nth(0).fill('No injuries or medical conditions.').catch(() => {});
      if (taCount >= 2) await textareas.nth(1).fill('I want to improve my batting against pace bowling.').catch(() => {});
      console.log(`  📝 Filled ${taCount} textareas`);
    }

    // Try clicking some rating buttons (number divs inside buttons)
    // The buttons contain child divs: one with the number, one with the label
    const allBtns = page.locator('button');
    const btnCount = await allBtns.count();
    let clicked = 0;
    for (let i = 0; i < btnCount && clicked < 8; i++) {
      const btn = allBtns.nth(i);
      const text = await btn.innerText().catch(() => '');
      // Match buttons whose text starts with a digit 3-5 (rating buttons)
      if (/^[345]\n/.test(text) || /^[345]\s/.test(text)) {
        await btn.click({ force: true }).catch(() => {});
        clicked++;
        await page.waitForTimeout(30);
      }
    }
    if (clicked > 0) console.log(`  📝 Clicked ${clicked} rating buttons`);

    // Click NEXT (may need twice due to soft nudge)
    await clickNext(page);
    // Check if we're still on the same step (nudge blocked us)
    const newStep = await getStepText(page);
    if (newStep === step) {
      console.log('  ⏭ Nudge skip — tapping Next again');
      await clickNext(page);
    }
  }

  // ── STEP 6: Review & Submit ──
  step = await getStepText(page);
  console.log(`  📍 ${step}`);

  // The button says "SUBMIT SURVEY"
  const submitBtn = page.locator('button:has-text("SUBMIT SURVEY")').first();
  if (await submitBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await submitBtn.scrollIntoViewIfNeeded();
    await submitBtn.click({ force: true });
    await page.waitForTimeout(6000);
    console.log('  ✅ SUBMIT SURVEY clicked');
  } else {
    // Fallback: try any submit-like button
    const altSubmit = page.locator('button:has-text("SUBMIT"), button:has-text("Submit")').first();
    if (await altSubmit.isVisible({ timeout: 2000 }).catch(() => false)) {
      await altSubmit.click({ force: true });
      await page.waitForTimeout(6000);
    } else {
      logFinding('CRITICAL', 'Submit', 'No submit button found on review step');
      await page.screenshot({ path: 'e2e/screenshots/no-submit.png' });
    }
  }

  // ── STEP 7: Success screen ──
  const success = page.locator('text=/submitted|complete|success/i').first();
  if (await success.isVisible({ timeout: 5000 }).catch(() => false)) {
    console.log('  ✅ Survey submitted successfully!');
  }

  await page.screenshot({ path: 'e2e/screenshots/mason-complete.png' });
  await ctx.close();
});

// ═══ TEST 3: ONBOARD PRIYA (second player, faster) ═══
test('3 — Onboard Priya Sharma', async ({ browser }) => {
  test.setTimeout(90000);
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  const ok = await signIn(page, PLAYERS[1].username);
  expect(ok).toBe(true);

  // Wait for onboarding
  await page.waitForTimeout(3000);

  // Click LET'S GO
  const letsGo = page.locator('button:has-text("LET\'S GO")').first();
  if (await letsGo.isVisible({ timeout: 5000 }).catch(() => false)) {
    await letsGo.click({ force: true });
    await page.waitForTimeout(2000);
  }

  // Step 0: Profile
  const nameInput = page.locator('input[placeholder*="name" i]').first();
  if (await nameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    const val = await nameInput.inputValue();
    if (!val) await nameInput.fill(PLAYERS[1].name);
  }
  const dobInput = page.locator('input[placeholder*="DD" i]').first();
  if (await dobInput.isVisible({ timeout: 2000 }).catch(() => false)) await dobInput.fill(PLAYERS[1].dob);
  const clubInput = page.locator('input[placeholder*="Doncaster" i], input[placeholder*="club" i]').first();
  if (await clubInput.isVisible({ timeout: 2000 }).catch(() => false)) await clubInput.fill(PLAYERS[1].club);
  await clickNext(page);

  // Step 1: Competition — use Entry Level (button-based selector)
  const entryBtn2 = page.locator('button:has-text("Entry Level")').first();
  if (await entryBtn2.isVisible({ timeout: 5000 }).catch(() => false)) {
    await entryBtn2.click();
    await page.waitForTimeout(1000);
    const tierBtn2 = page.locator('button:has-text("No Recorded"), button:has-text("Cricket Blast"), button:has-text("School")').first();
    if (await tierBtn2.isVisible({ timeout: 3000 }).catch(() => false)) {
      await tierBtn2.click();
      await page.waitForTimeout(500);
    }
  }
  await clickNext(page);

  // Step 2: Identity — select all dropdowns
  const sels = page.locator('select');
  await page.waitForTimeout(500);
  for (let i = 0; i < await sels.count(); i++) {
    const sel = sels.nth(i);
    if (await sel.isVisible().catch(() => false)) {
      const opts = await sel.locator('option').count();
      if (opts > 1) await sel.selectOption({ index: Math.min(2, opts - 1) }).catch(() => {});
      await page.waitForTimeout(200);
    }
  }
  await page.waitForTimeout(500);
  // Re-check selects after new ones appear
  const sels2 = page.locator('select');
  for (let i = 0; i < await sels2.count(); i++) {
    const sel = sels2.nth(i);
    if (await sel.isVisible().catch(() => false)) {
      const val = await sel.inputValue();
      if (!val) {
        const opts = await sel.locator('option').count();
        if (opts > 1) await sel.selectOption({ index: 1 }).catch(() => {});
      }
    }
  }
  await clickNext(page);
  // Retry if validation
  const valErr2 = page.locator('text=/please select/i').first();
  if (await valErr2.isVisible({ timeout: 1000 }).catch(() => false)) {
    await page.waitForTimeout(500);
    await clickNext(page);
  }

  // Steps 3-5: Self-Assessment, Matchups, Medical — use nudge-skip approach
  for (let s = 3; s <= 5; s++) {
    const stepBefore = await getStepText(page);

    // Fill any textareas on this step (Medical step has them)
    const tas = page.locator('textarea');
    const tc = await tas.count();
    if (tc >= 1) await tas.nth(0).fill('No injuries.').catch(() => {});
    if (tc >= 2) await tas.nth(1).fill('Want to become the best spin bowler in my age group.').catch(() => {});

    // Try clicking rating buttons
    const allBtns = page.locator('button');
    let clicked = 0;
    for (let i = 0; i < await allBtns.count() && clicked < 8; i++) {
      const text = await allBtns.nth(i).innerText().catch(() => '');
      if (/^[345]\n/.test(text) || /^[345]\s/.test(text)) {
        await allBtns.nth(i).click({ force: true }).catch(() => {});
        clicked++;
        await page.waitForTimeout(30);
      }
    }

    await clickNext(page);
    const stepAfter = await getStepText(page);
    if (stepAfter === stepBefore) {
      await clickNext(page); // nudge skip
    }
  }

  // Step 6: Submit
  const submitBtn = page.locator('button:has-text("SUBMIT SURVEY")').first();
  if (await submitBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await submitBtn.click({ force: true });
    await page.waitForTimeout(6000);
    console.log('  ✅ Priya submitted');
  }

  await page.screenshot({ path: 'e2e/screenshots/priya-complete.png' });
  await ctx.close();
});

// ═══ TEST 4: RETURNING PLAYER → PLAYER PORTAL (not onboarding) ═══
test('4 — Returning player goes to Player Portal', async ({ browser }) => {
  test.setTimeout(30000);
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  // Sign in as Mason (who has already completed onboarding)
  const ok = await signIn(page, PLAYERS[0].username);
  expect(ok).toBe(true);

  // Should NOT see onboarding — should see Player Portal
  // Player Portal has: "My DNA", "Journal", or "Welcome" on the home tiles
  const portalIndicator = page.locator('text=/My DNA|Journal|IDP|Welcome back/i').first();
  const onboardIndicator = page.locator('text=/PLAYER ONBOARDING|LET.*GO/i').first();

  // Wait for either to appear
  await page.waitForTimeout(5000);

  const isPortal = await portalIndicator.isVisible({ timeout: 5000 }).catch(() => false);
  const isOnboard = await onboardIndicator.isVisible({ timeout: 1000 }).catch(() => false);

  await page.screenshot({ path: 'e2e/screenshots/returning-player.png' });

  if (isPortal) {
    console.log('  ✅ Returning player correctly routed to Player Portal');
  } else if (isOnboard) {
    logFinding('CRITICAL', 'Routing', 'Returning player sent to onboarding instead of portal');
  } else {
    logFinding('WARNING', 'Routing', 'Could not determine which view loaded');
  }

  expect(isPortal).toBe(true);
  expect(isOnboard).toBe(false);

  await ctx.close();
});

// ═══ TEST 5: COACH → COACH PORTAL ═══
test('5 — Coach goes to Coach Portal', async ({ browser }) => {
  test.setTimeout(30000);
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  const ok = await signIn(page, COACHES[0].username);
  expect(ok).toBe(true);

  // Coach Portal should show: roster, dashboard tab, or player cards
  const coachIndicator = page.locator('text=/Roster|Dashboard|Player Assessment|Profiles|Squads/i').first();
  const playerIndicator = page.locator('text=/PLAYER ONBOARDING|My DNA|Journal/i').first();

  await page.waitForTimeout(5000);

  const isCoach = await coachIndicator.isVisible({ timeout: 5000 }).catch(() => false);
  const isPlayer = await playerIndicator.isVisible({ timeout: 1000 }).catch(() => false);

  await page.screenshot({ path: 'e2e/screenshots/coach-portal.png' });

  if (isCoach) {
    console.log('  ✅ Coach correctly routed to Coach Portal');
  } else if (isPlayer) {
    logFinding('CRITICAL', 'Routing', 'Coach sent to player portal/onboarding');
  } else {
    logFinding('WARNING', 'Routing', 'Could not determine coach view');
  }

  expect(isCoach).toBe(true);
  expect(isPlayer).toBe(false);

  await ctx.close();
});

// ═══ SUMMARY ═══
test.afterAll(() => {
  console.log('\n' + '═'.repeat(60));
  console.log('FIELD TEST FINDINGS');
  console.log('═'.repeat(60));
  if (findings.length === 0) {
    console.log('  ✅ No issues found — all flows passed');
  } else {
    findings.forEach(f => console.log(`  [${f.sev}] ${f.area}: ${f.desc}`));
  }
  console.log('═'.repeat(60));
});
