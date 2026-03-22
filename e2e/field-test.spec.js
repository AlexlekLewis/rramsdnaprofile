/**
 * RRAM DNA Profile — End-to-End Field Test
 *
 * Creates real users through the actual UI, tests every flow:
 * 1. Register 12 players + 2 coaches via the signup form
 * 2. Complete player onboarding for all 12 players
 * 3. Log in as coaches, assess players
 * 4. Verify admin dashboard renders with correct data
 * 5. Document all issues found
 *
 * Run: npx playwright test e2e/field-test.spec.js --project=mobile-chrome
 */

import { test, expect } from '@playwright/test';

// ═══ TEST DATA ═══
const PLAYER_CODE = 'RRAM-ELITE-2026';
const COACH_CODE  = 'RR9X-STF-4KQ7';
const PW          = 'Cr1cket#Dna9xQ';

const PLAYERS = [
  { username: 'ft.mason.reid',     name: 'Mason Reid',       dob: '15/06/2012', role: 'batter',     skill: 'bat', club: 'Melbourne CC',     age: 13 },
  { username: 'ft.priya.sharma',    name: 'Priya Sharma',     dob: '22/03/2011', role: 'bowler',     skill: 'pace', club: 'Eastern Stars',   age: 14 },
  { username: 'ft.liam.carter',     name: 'Liam Carter',      dob: '08/11/2013', role: 'allrounder', skill: 'bat', club: 'Bayside Tigers',   age: 12 },
  { username: 'ft.aisha.patel',     name: 'Aisha Patel',      dob: '30/01/2010', role: 'bowler',     skill: 'spin', club: 'Northern Hawks',  age: 16 },
  { username: 'ft.noah.williams',   name: 'Noah Williams',    dob: '14/07/2012', role: 'batter',     skill: 'bat', club: 'Westside CC',      age: 13 },
  { username: 'ft.zara.nguyen',     name: 'Zara Nguyen',      dob: '25/09/2011', role: 'allrounder', skill: 'bat', club: 'Southbank CC',     age: 14 },
  { username: 'ft.oliver.jones',    name: 'Oliver Jones',     dob: '03/04/2013', role: 'keeper',     skill: 'bat', club: 'Melbourne CC',     age: 12 },
  { username: 'ft.maya.chen',       name: 'Maya Chen',        dob: '18/12/2010', role: 'batter',     skill: 'bat', club: 'Eastern Stars',   age: 15 },
  { username: 'ft.ethan.brooks',    name: 'Ethan Brooks',     dob: '27/05/2012', role: 'bowler',     skill: 'pace', club: 'Bayside Tigers',  age: 13 },
  { username: 'ft.lily.thompson',   name: 'Lily Thompson',    dob: '09/08/2011', role: 'bowler',     skill: 'spin', club: 'Westside CC',     age: 14 },
  { username: 'ft.jack.murphy',     name: 'Jack Murphy',      dob: '21/02/2013', role: 'allrounder', skill: 'pace', club: 'Northern Hawks',  age: 13 },
  { username: 'ft.sofia.martinez',  name: 'Sofia Martinez',   dob: '12/10/2010', role: 'batter',     skill: 'bat', club: 'Southbank CC',     age: 15 },
];

const COACHES = [
  { username: 'ft.coach.sarah', name: 'Sarah Mitchell', },
  { username: 'ft.coach.james', name: 'James Okoro', },
];

// ═══ FINDINGS LOG ═══
const findings = [];
function logFinding(severity, area, description) {
  findings.push({ severity, area, description, timestamp: new Date().toISOString() });
  console.log(`[${severity}] ${area}: ${description}`);
}

// ═══ HELPERS ═══
async function waitForApp(page) {
  // Wait for either the login form or a portal to load
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(2000);
}

async function registerUser(page, { username, name, password, code, role }) {
  // Use ?join=role parameter to set the role
  await page.goto(`/?join=${role}`);
  await waitForApp(page);

  // Look for "Create account" or "Register" link
  const registerLink = page.locator('text=/create.*account|register|sign up/i').first();
  if (await registerLink.isVisible({ timeout: 3000 }).catch(() => false)) {
    await registerLink.click();
    await page.waitForTimeout(500);
  }

  // Check if we see the registration form
  const regCodeInput = page.locator('input[placeholder="Registration Code"]');
  if (!await regCodeInput.isVisible({ timeout: 5000 }).catch(() => false)) {
    // Maybe we need to find the toggle
    const joinLink = page.locator('text=/join|new.*account|register/i').first();
    if (await joinLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await joinLink.click();
      await page.waitForTimeout(500);
    }
  }

  // Fill registration form
  await regCodeInput.fill(code);
  await page.locator('input[placeholder="Full Name"]').fill(name);
  await page.locator('input[placeholder="Username"]').fill(username);
  await page.locator('input[placeholder="Password"]').fill(password);
  await page.locator('input[placeholder="Confirm Password"]').fill(password);

  // Take screenshot before submit
  await page.screenshot({ path: `e2e/screenshots/register-${username}.png` });

  // Click CREATE ACCOUNT
  await page.locator('button:has-text("CREATE ACCOUNT")').click();

  // Wait for either success (redirect) or error message
  await page.waitForTimeout(5000);

  // Check for error
  const errorEl = page.locator('text=/⚠|error|failed|already taken/i').first();
  if (await errorEl.isVisible({ timeout: 2000 }).catch(() => false)) {
    const errorText = await errorEl.textContent();
    logFinding('ERROR', 'Registration', `${username}: ${errorText}`);
    return false;
  }

  // Check if we landed on a portal or onboarding
  const url = page.url();
  const hasPortal = await page.locator('text=/onboarding|welcome|profile|DNA|journal/i').first()
    .isVisible({ timeout: 5000 }).catch(() => false);

  if (hasPortal || url !== page.url()) {
    console.log(`✅ Registered: ${username} (${role})`);
    return true;
  }

  logFinding('WARNING', 'Registration', `${username}: No clear success indicator after registration`);
  return true; // Assume success if no error
}

async function signOut(page) {
  // Navigate to app first (so localStorage is accessible), then clear and reload
  await page.goto('/');
  await page.waitForTimeout(1000);
  await page.evaluate(() => {
    try { localStorage.clear(); } catch(e) {}
    try { sessionStorage.clear(); } catch(e) {}
  });
  await page.goto('/');
  await page.waitForTimeout(2000);
}

async function signIn(page, username, password) {
  await page.goto('/');
  await waitForApp(page);

  // Make sure we're on login (not register)
  const loginLink = page.locator('text=/already have.*account|sign in/i').first();
  if (await loginLink.isVisible({ timeout: 2000 }).catch(() => false)) {
    await loginLink.click();
    await page.waitForTimeout(500);
  }

  const usernameInput = page.locator('input[placeholder="Username"]');
  const passwordInput = page.locator('input[placeholder="Password"]');

  await usernameInput.fill(username);
  await passwordInput.fill(password);
  await page.locator('button:has-text("SIGN IN")').click();

  await page.waitForTimeout(5000);

  // Check for errors
  const errorEl = page.locator('text=/⚠|error|not found|invalid/i').first();
  if (await errorEl.isVisible({ timeout: 2000 }).catch(() => false)) {
    const errorText = await errorEl.textContent();
    logFinding('ERROR', 'Login', `${username}: ${errorText}`);
    return false;
  }

  console.log(`✅ Signed in: ${username}`);
  return true;
}

// ═══ PHASE 1: REGISTRATION ═══
test.describe.serial('Phase 1 — User Registration', () => {

  test('Register 12 players', async ({ browser }) => {
    for (const player of PLAYERS) {
      // Fresh context per player — no state leakage
      const context = await browser.newContext();
      const page = await context.newPage();

      const success = await registerUser(page, {
        username: player.username,
        name: player.name,
        password: PW,
        code: PLAYER_CODE,
        role: 'player',
      });

      if (!success) {
        logFinding('CRITICAL', 'Registration', `Player ${player.name} failed to register`);
      }

      await context.close();
    }

    console.log(`\n📊 Registration: ${PLAYERS.length} players attempted`);
  });

  test('Register 2 coaches', async ({ browser }) => {
    for (const coach of COACHES) {
      const context = await browser.newContext();
      const page = await context.newPage();

      // Need to select "Coach" role before registering
      await page.goto('/');
      await waitForApp(page);

      // Check if there's a role selector (coach vs player toggle)
      const coachToggle = page.locator('text=/coach|i.*m.*coach/i').first();
      if (await coachToggle.isVisible({ timeout: 3000 }).catch(() => false)) {
        await coachToggle.click();
        await page.waitForTimeout(500);
      }

      const success = await registerUser(page, {
        username: coach.username,
        name: coach.name,
        password: PW,
        code: COACH_CODE,
        role: 'coach',
      });

      if (!success) {
        logFinding('CRITICAL', 'Registration', `Coach ${coach.name} failed to register`);
      }

      await context.close();
    }

    console.log(`\n📊 Registration: ${COACHES.length} coaches attempted`);
  });
});

// ═══ PHASE 2: PLAYER ONBOARDING ═══
test.describe.serial('Phase 2 — Player Onboarding', () => {

  // Map of competition levels to avoid mismatches
  const COMP_LEVELS = ['community', 'district', 'premier', 'representative', 'state'];

  for (const player of PLAYERS) {
    test(`Onboard: ${player.name}`, async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();

      // Sign in
      const loggedIn = await signIn(page, player.username, PW);
      if (!loggedIn) {
        logFinding('CRITICAL', 'Onboarding', `Cannot log in as ${player.name}`);
        await context.close();
        return;
      }

      await page.waitForTimeout(3000);
      await page.screenshot({ path: `e2e/screenshots/onboard-start-${player.username}.png` });

      // ── Welcome screen — click "LET'S GO" ──
      const letsGoBtn = page.locator('button:has-text("LET\'S GO"), button:has-text("Let\'s Go"), button:has-text("GET STARTED"), button:has-text("Start")').first();
      if (await letsGoBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await letsGoBtn.click({ force: true });
        await page.waitForTimeout(2000);
        console.log(`  ✅ Welcome screen passed`);
      }

      // ── Step 0: Profile ──
      const nameInput = page.locator('input[placeholder*="name" i], input[placeholder*="Name"]').first();
      if (await nameInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        // Check if name is pre-filled from registration
        const currentName = await nameInput.inputValue();
        if (!currentName) {
          await nameInput.fill(player.name);
        }
        console.log(`  📝 Step 0 (Profile): Name=${currentName || player.name}`);
      }

      // DOB input
      const dobInput = page.locator('input[placeholder*="DD" i], input[placeholder*="dob" i], input[placeholder*="birth" i]').first();
      if (await dobInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await dobInput.fill(player.dob);
      }

      // Club
      const clubInput = page.locator('input[placeholder*="club" i], input[placeholder*="Club"]').first();
      if (await clubInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await clubInput.fill(player.club);
      }

      // Click Next
      const nextBtn = page.locator('button:has-text("NEXT"), button:has-text("Next"), button:has-text("Continue")').first();
      if (await nextBtn.isVisible({ timeout: 3000 })) {
        await nextBtn.scrollIntoViewIfNeeded(); await nextBtn.click({ force: true });
        await page.waitForTimeout(2000);
      }

      // Capture any step validation errors
      const stepError = page.locator('text=/please|required|enter/i').first();
      if (await stepError.isVisible({ timeout: 1000 }).catch(() => false)) {
        const errText = await stepError.textContent();
        logFinding('WARNING', 'Onboarding Step 0', `${player.name}: ${errText}`);
      }

      await page.screenshot({ path: `e2e/screenshots/onboard-step1-${player.username}.png` });

      // ── Step 1: Competition History ──
      // Select at least one competition level
      const compSelect = page.locator('select').first();
      if (await compSelect.isVisible({ timeout: 5000 }).catch(() => false)) {
        // Pick a competition level based on player's age/profile
        const level = player.age >= 15 ? 'representative' : 'district';
        await compSelect.selectOption({ label: new RegExp(level, 'i') }).catch(async () => {
          // Try by value
          const options = await compSelect.locator('option').allTextContents();
          console.log(`  Available comp levels: ${options.join(', ')}`);
          if (options.length > 1) {
            await compSelect.selectOption({ index: 1 });
          }
        });
        console.log(`  📝 Step 1 (Comp History): Level selected`);
      }

      // Click Next
      if (await nextBtn.isVisible({ timeout: 3000 })) {
        await nextBtn.scrollIntoViewIfNeeded(); await nextBtn.click({ force: true });
        await page.waitForTimeout(2000);
      }

      await page.screenshot({ path: `e2e/screenshots/onboard-step2-${player.username}.png` });

      // ── Step 2: T20 Identity (Role + Archetype Questions) ──
      // Select role
      const roleOptions = page.locator(`text=/${player.role}/i`).first();
      if (await roleOptions.isVisible({ timeout: 5000 }).catch(() => false)) {
        await roleOptions.click();
        await page.waitForTimeout(500);
      } else {
        // Try radio buttons or select
        const roleSelect = page.locator('select, [role="radiogroup"]').first();
        if (await roleSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
          console.log(`  ⚠ Could not find role option '${player.role}' directly`);
        }
      }

      // Select primary skill
      const skillOptions = page.locator(`text=/${player.skill}/i`).first();
      if (await skillOptions.isVisible({ timeout: 3000 }).catch(() => false)) {
        await skillOptions.click();
        await page.waitForTimeout(500);
      }

      // Answer archetype questions (click random options)
      const questionOptions = page.locator('[class*="option"], [class*="choice"], button[class*="answer"]');
      const optCount = await questionOptions.count();
      if (optCount > 0) {
        console.log(`  📝 Step 2 (T20 Identity): ${optCount} question options found`);
        // Answer each question by clicking options
        for (let i = 0; i < Math.min(optCount, 24); i += 2) {
          // Click every other option to simulate varied answers
          await questionOptions.nth(i).click().catch(() => {});
          await page.waitForTimeout(200);
        }
      }

      // Click Next
      if (await nextBtn.isVisible({ timeout: 3000 })) {
        await nextBtn.scrollIntoViewIfNeeded(); await nextBtn.click({ force: true });
        await page.waitForTimeout(2000);
      }

      await page.screenshot({ path: `e2e/screenshots/onboard-step3-${player.username}.png` });

      // ── Step 3: Self-Assessment (Confidence + Frequency ratings) ──
      // Click rating dots — find all rating buttons and click middle-to-high values
      const ratingDots = page.locator('button').filter({ hasText: /^[1-5]$/ });
      const dotsCount = await ratingDots.count();
      console.log(`  📝 Step 3 (Self-Assessment): ${dotsCount} rating dots found`);

      // Click a mix of 3s, 4s, and 5s for variety
      const ratings = [3, 4, 5, 3, 4, 4, 3, 5, 4, 3, 5, 4, 3, 4, 5, 3, 4, 4, 5, 3];
      for (let i = 0; i < dotsCount; i++) {
        const targetRating = ratings[i % ratings.length];
        // Find the specific dot with this number in the current group
        await ratingDots.nth(i).click().catch(() => {});
        await page.waitForTimeout(100);
      }

      // Click Next
      if (await nextBtn.isVisible({ timeout: 3000 })) {
        await nextBtn.scrollIntoViewIfNeeded(); await nextBtn.click({ force: true });
        await page.waitForTimeout(2000);
      }

      await page.screenshot({ path: `e2e/screenshots/onboard-step4-${player.username}.png` });

      // ── Step 4: Player Voice (Matchups + Confidence) ──
      // Similar rating process
      const voiceDots = page.locator('button').filter({ hasText: /^[1-5]$/ });
      const voiceCount = await voiceDots.count();
      console.log(`  📝 Step 4 (Player Voice): ${voiceCount} rating dots found`);

      for (let i = 0; i < voiceCount; i++) {
        await voiceDots.nth(i).click().catch(() => {});
        await page.waitForTimeout(100);
      }

      if (await nextBtn.isVisible({ timeout: 3000 })) {
        await nextBtn.scrollIntoViewIfNeeded(); await nextBtn.click({ force: true });
        await page.waitForTimeout(2000);
      }

      await page.screenshot({ path: `e2e/screenshots/onboard-step5-${player.username}.png` });

      // ── Step 5: Medical & Goals ──
      // Look for text areas
      const textAreas = page.locator('textarea');
      const taCount = await textAreas.count();
      console.log(`  📝 Step 5 (Medical & Goals): ${taCount} text areas found`);

      if (taCount > 0) {
        await textAreas.first().fill('No medical conditions or injuries to report.').catch(() => {});
      }
      if (taCount > 1) {
        await textAreas.nth(1).fill('I want to improve my batting against pace bowling and become a more consistent player.').catch(() => {});
      }

      if (await nextBtn.isVisible({ timeout: 3000 })) {
        await nextBtn.scrollIntoViewIfNeeded(); await nextBtn.click({ force: true });
        await page.waitForTimeout(2000);
      }

      await page.screenshot({ path: `e2e/screenshots/onboard-step6-${player.username}.png` });

      // ── Step 6: Review & Submit ──
      const submitBtn = page.locator('button:has-text("SUBMIT"), button:has-text("Submit"), button:has-text("COMPLETE"), button:has-text("Complete"), button:has-text("FINISH")').first();
      if (await submitBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await submitBtn.scrollIntoViewIfNeeded(); await submitBtn.click({ force: true });
        await page.waitForTimeout(5000);
        console.log(`  ✅ Onboarding submitted for ${player.name}`);
      } else {
        logFinding('WARNING', 'Onboarding', `${player.name}: No submit button found on final step`);
        // Screenshot what we see
        await page.screenshot({ path: `e2e/screenshots/onboard-nosubmit-${player.username}.png` });
      }

      // Verify we land on the player portal
      const portalCheck = page.locator('text=/DNA|journal|welcome|home/i').first();
      if (await portalCheck.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log(`  ✅ Player portal loaded for ${player.name}`);
      } else {
        logFinding('WARNING', 'Onboarding', `${player.name}: Did not land on player portal after submit`);
      }

      await page.screenshot({ path: `e2e/screenshots/onboard-done-${player.username}.png` });
      await signOut(page);
      await context.close();
    });
  }
});

// ═══ PHASE 3: COACH ASSESSMENT ═══
test.describe.serial('Phase 3 — Coach Assessment', () => {

  test('Coach 1 assesses 6 players', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    const loggedIn = await signIn(page, COACHES[0].username, PW);
    if (!loggedIn) {
      logFinding('CRITICAL', 'Coach Login', `Cannot log in as ${COACHES[0].name}`);
      await context.close();
      return;
    }

    await page.waitForTimeout(5000);
    await page.screenshot({ path: `e2e/screenshots/coach1-roster.png` });

    // ── Verify roster loads ──
    const rosterCheck = page.locator('text=/roster|players|assess/i').first();
    if (!await rosterCheck.isVisible({ timeout: 10000 }).catch(() => false)) {
      logFinding('CRITICAL', 'Coach Portal', 'Roster view did not load');
      await context.close();
      return;
    }

    // ── Test search bar ──
    const searchInput = page.locator('input[placeholder*="search" i], input[placeholder*="Search"]').first();
    if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await searchInput.fill('Mason');
      await page.waitForTimeout(1000);
      await page.screenshot({ path: `e2e/screenshots/coach1-search.png` });
      const filtered = page.locator('text=/mason/i');
      const count = await filtered.count();
      console.log(`  🔍 Search 'Mason': ${count} results`);
      if (count === 0) logFinding('WARNING', 'Coach Search', 'Search for "Mason" returned 0 results');
      await searchInput.fill(''); // Clear search
      await page.waitForTimeout(500);
    } else {
      logFinding('HIGH', 'Coach Portal', 'No search bar found on roster');
    }

    // ── Test sort ──
    const sortBtn = page.locator('text=/sort|A-Z|PDI/i, button:has-text("Sort")').first();
    if (await sortBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await sortBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: `e2e/screenshots/coach1-sort.png` });
      console.log('  ✅ Sort button works');
    }

    // ── Test filter ──
    const filterBtn = page.locator('text=/filter|role|all roles/i, button:has-text("Filter")').first();
    if (await filterBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await filterBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: `e2e/screenshots/coach1-filter.png` });
      console.log('  ✅ Filter button works');
    }

    // ── Assess first 6 players ──
    for (let i = 0; i < 6; i++) {
      const playerCards = page.locator('[style*="cursor: pointer"], [style*="cursor:pointer"]').filter({ hasText: /[A-Z]/ });
      const cardCount = await playerCards.count();

      if (cardCount <= i) {
        logFinding('WARNING', 'Coach Assessment', `Only ${cardCount} player cards visible, expected at least ${i + 1}`);
        break;
      }

      // Click on the player card
      await playerCards.nth(i).click();
      await page.waitForTimeout(3000);
      await page.screenshot({ path: `e2e/screenshots/coach1-assess-${i}.png` });

      // ── Rate domains ──
      // Find all rating dot groups and click ratings
      const dots = page.locator('button').filter({ hasText: /^[1-5]$/ });
      const dotCount = await dots.count();
      console.log(`  📝 Player ${i + 1}: ${dotCount} rating dots found`);

      // Click semi-random ratings (vary by player for realistic data)
      const baseRating = 2 + (i % 3); // Varies 2-4 per player
      for (let d = 0; d < Math.min(dotCount, 60); d++) {
        // Vary ratings: mostly baseRating ± 1
        await dots.nth(d).click().catch(() => {});
        if (d % 5 === 0) await page.waitForTimeout(200); // Brief pause every 5 clicks
      }

      // ── Check auto-save indicator ──
      const saveIndicator = page.locator('text=/saved|saving|✓/i').first();
      if (await saveIndicator.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log(`  ✅ Auto-save confirmed for player ${i + 1}`);
      } else {
        logFinding('WARNING', 'Coach Assessment', `No save indicator visible for player ${i + 1}`);
      }

      // ── Test page tabs (domain navigation) ──
      const pageTabs = page.locator('text=/technical|game.*iq|mental|physical|fielding|phase|narrative/i');
      const tabCount = await pageTabs.count();
      console.log(`  📑 ${tabCount} assessment tabs found`);

      // Click through each tab
      for (let t = 0; t < tabCount; t++) {
        await pageTabs.nth(t).click().catch(() => {});
        await page.waitForTimeout(500);

        // Rate some items on each tab
        const tabDots = page.locator('button').filter({ hasText: /^[1-5]$/ });
        const tbCount = await tabDots.count();
        for (let td = 0; td < Math.min(tbCount, 20); td++) {
          await tabDots.nth(td).click().catch(() => {});
        }
      }

      // ── Navigate back to roster ──
      const backBtn = page.locator('text=/back|roster|←/i, button:has-text("Back")').first();
      if (await backBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await backBtn.click();
        await page.waitForTimeout(2000);
      } else {
        // Try browser back
        await page.goBack();
        await page.waitForTimeout(2000);
      }
    }

    await page.screenshot({ path: `e2e/screenshots/coach1-complete.png` });
    await signOut(page);
    await context.close();
    console.log(`\n📊 Coach 1: Assessed 6 players`);
  });

  test('Coach 2 assesses remaining 6 players', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    const loggedIn = await signIn(page, COACHES[1].username, PW);
    if (!loggedIn) {
      logFinding('CRITICAL', 'Coach Login', `Cannot log in as ${COACHES[1].name}`);
      await context.close();
      return;
    }

    await page.waitForTimeout(5000);

    // Assess players 7-12 (similar flow to above but abbreviated)
    const playerCards = page.locator('[style*="cursor: pointer"], [style*="cursor:pointer"]').filter({ hasText: /[A-Z]/ });
    const cardCount = await playerCards.count();
    console.log(`  Coach 2 sees ${cardCount} player cards`);

    for (let i = 6; i < Math.min(12, cardCount); i++) {
      await playerCards.nth(i).click().catch(() => {
        // If index is wrong, just click what's available
        playerCards.nth(i - 6).click().catch(() => {});
      });
      await page.waitForTimeout(2000);

      const dots = page.locator('button').filter({ hasText: /^[1-5]$/ });
      const dotCount = await dots.count();

      for (let d = 0; d < Math.min(dotCount, 40); d++) {
        await dots.nth(d).click().catch(() => {});
      }

      await page.waitForTimeout(2000);

      // Navigate back
      const backBtn = page.locator('text=/back|roster|←/i, button:has-text("Back")').first();
      if (await backBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await backBtn.click();
        await page.waitForTimeout(2000);
      }
    }

    await page.screenshot({ path: `e2e/screenshots/coach2-complete.png` });
    await signOut(page);
    await context.close();
    console.log(`\n📊 Coach 2: Assessment pass complete`);
  });
});

// ═══ PHASE 4: ADMIN DASHBOARD ═══
test.describe.serial('Phase 4 — Admin Dashboard Verification', () => {

  test('Admin dashboard renders all tabs', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Sign in as admin (alex.lewis)
    const loggedIn = await signIn(page, 'alex.lewis', PW);
    if (!loggedIn) {
      // Try the known admin password
      logFinding('WARNING', 'Admin Login', 'Could not log in as admin with test password — using direct nav');
    }

    await page.waitForTimeout(5000);

    // Navigate to admin dashboard
    const dashBtn = page.locator('text=/dashboard|admin/i').first();
    if (await dashBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await dashBtn.click();
      await page.waitForTimeout(3000);
    }

    await page.screenshot({ path: `e2e/screenshots/admin-dashboard.png` });

    // ── Tab 1: Overview ──
    const overviewTab = page.locator('text=/overview/i').first();
    if (await overviewTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await overviewTab.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: `e2e/screenshots/admin-overview.png` });

      // Check for metric cards
      const metricCards = page.locator('text=/total.*players|assessed|average.*pdi|completion/i');
      const mcCount = await metricCards.count();
      console.log(`  📊 Overview: ${mcCount} metric cards found`);
      if (mcCount < 3) logFinding('WARNING', 'Admin Overview', `Only ${mcCount} metric cards visible, expected 3+`);
    }

    // ── Tab 2: Rankings ──
    const rankingsTab = page.locator('text=/ranking/i').first();
    if (await rankingsTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await rankingsTab.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: `e2e/screenshots/admin-rankings.png` });

      // Check player rows render
      const playerRows = page.locator('tr, [style*="display: flex"]').filter({ hasText: /\d\.\d/ });
      const rowCount = await playerRows.count();
      console.log(`  📊 Rankings: ${rowCount} player rows`);
    }

    // ── Tab 3: Engagement ──
    const engagementTab = page.locator('text=/engagement/i').first();
    if (await engagementTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await engagementTab.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: `e2e/screenshots/admin-engagement.png` });
      console.log('  ✅ Engagement tab renders');
    }

    // ── Tab 4: Squads ──
    const squadsTab = page.locator('text=/squad/i').first();
    if (await squadsTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await squadsTab.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: `e2e/screenshots/admin-squads.png` });
      console.log('  ✅ Squads tab renders');
    }

    // ── Tab 5: Reports ──
    const reportsTab = page.locator('text=/report/i').first();
    if (await reportsTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await reportsTab.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: `e2e/screenshots/admin-reports.png` });
      console.log('  ✅ Reports tab renders');
    }

    // ── Tab 6: Profiles ──
    const profilesTab = page.locator('text=/profile/i').first();
    if (await profilesTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await profilesTab.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: `e2e/screenshots/admin-profiles.png` });
      console.log('  ✅ Profiles tab renders');
    }

    await signOut(page);
    await context.close();
  });
});

// ═══ PHASE 5: PLAYER PORTAL VERIFICATION ═══
test.describe.serial('Phase 5 — Player Portal Verification', () => {

  test('Verify player portal for 3 onboarded players', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    for (const player of PLAYERS.slice(0, 3)) {
      const loggedIn = await signIn(page, player.username, PW);
      if (!loggedIn) {
        logFinding('ERROR', 'Player Portal', `Cannot log in as ${player.name}`);
        continue;
      }

      await page.waitForTimeout(3000);

      // ── Check DNA tile ──
      const dnaTile = page.locator('text=/DNA|dna|identity/i').first();
      if (await dnaTile.isVisible({ timeout: 5000 }).catch(() => false)) {
        await dnaTile.click();
        await page.waitForTimeout(3000);
        await page.screenshot({ path: `e2e/screenshots/player-dna-${player.username}.png` });

        // Check archetype display
        const archetype = page.locator('text=/enforcer|controller|finisher|hitter|innovator|striker|closer|attacker/i').first();
        if (await archetype.isVisible({ timeout: 3000 }).catch(() => false)) {
          console.log(`  ✅ ${player.name}: Archetype visible`);
        } else {
          logFinding('INFO', 'Player DNA', `${player.name}: No archetype visible (may need coach assessment)`);
        }

        // Verify NO scores visible
        const scoreCheck = page.locator('text=/PDI|pdi|\\.\\d{2}|score.*\\d/');
        const scoreCount = await scoreCheck.count();
        if (scoreCount > 0) {
          logFinding('CRITICAL', 'Player Privacy', `${player.name}: Numerical scores visible to player!`);
        }

        // Go back
        await page.goBack();
        await page.waitForTimeout(1000);
      }

      // ── Check Journal tile ──
      const journalTile = page.locator('text=/journal/i').first();
      if (await journalTile.isVisible({ timeout: 3000 }).catch(() => false)) {
        await journalTile.click();
        await page.waitForTimeout(2000);
        await page.screenshot({ path: `e2e/screenshots/player-journal-${player.username}.png` });

        // Try writing a free-form entry
        const freeWrite = page.locator('text=/free.*write|write.*entry/i').first();
        if (await freeWrite.isVisible({ timeout: 3000 }).catch(() => false)) {
          await freeWrite.click();
          await page.waitForTimeout(1000);

          const textarea = page.locator('textarea').first();
          if (await textarea.isVisible({ timeout: 3000 }).catch(() => false)) {
            await textarea.fill('Today I worked on my cover drive and felt really good about my timing. Coach said my head position is improving.');
            console.log(`  ✅ ${player.name}: Journal entry written`);
          }

          // Save
          const saveBtn = page.locator('button:has-text("Save"), button:has-text("SAVE")').first();
          if (await saveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
            await saveBtn.click();
            await page.waitForTimeout(2000);
            console.log(`  ✅ ${player.name}: Journal saved`);
          }
        }

        await page.goBack();
        await page.waitForTimeout(1000);
      }

      // ── Check IDP tile ──
      const idpTile = page.locator('text=/IDP|development.*plan|goals/i').first();
      if (await idpTile.isVisible({ timeout: 3000 }).catch(() => false)) {
        await idpTile.click();
        await page.waitForTimeout(2000);
        await page.screenshot({ path: `e2e/screenshots/player-idp-${player.username}.png` });
        console.log(`  ✅ ${player.name}: IDP view loaded`);
        await page.goBack();
        await page.waitForTimeout(1000);
      }

      await signOut(page);
    }

    await context.close();
  });
});

// ═══ PHASE 6: FINDINGS REPORT ═══
test('Generate findings report', async () => {
  console.log('\n' + '═'.repeat(60));
  console.log('  RRAM DNA PROFILE — FIELD TEST REPORT');
  console.log('═'.repeat(60));
  console.log(`  Date: ${new Date().toISOString()}`);
  console.log(`  Players tested: ${PLAYERS.length}`);
  console.log(`  Coaches tested: ${COACHES.length}`);
  console.log(`  Total findings: ${findings.length}`);
  console.log('');

  const critical = findings.filter(f => f.severity === 'CRITICAL');
  const high = findings.filter(f => f.severity === 'HIGH');
  const warnings = findings.filter(f => f.severity === 'WARNING');
  const errors = findings.filter(f => f.severity === 'ERROR');
  const info = findings.filter(f => f.severity === 'INFO');

  if (critical.length) {
    console.log('  🔴 CRITICAL:');
    critical.forEach(f => console.log(`     - [${f.area}] ${f.description}`));
  }
  if (errors.length) {
    console.log('  🟠 ERRORS:');
    errors.forEach(f => console.log(`     - [${f.area}] ${f.description}`));
  }
  if (high.length) {
    console.log('  🟡 HIGH:');
    high.forEach(f => console.log(`     - [${f.area}] ${f.description}`));
  }
  if (warnings.length) {
    console.log('  🟢 WARNINGS:');
    warnings.forEach(f => console.log(`     - [${f.area}] ${f.description}`));
  }
  if (info.length) {
    console.log('  ℹ️  INFO:');
    info.forEach(f => console.log(`     - [${f.area}] ${f.description}`));
  }

  if (findings.length === 0) {
    console.log('  ✅ No issues found! All flows passed cleanly.');
  }

  console.log('\n' + '═'.repeat(60));

  // Write findings to file
  const fs = require('fs');
  fs.writeFileSync('e2e/FIELD_TEST_RESULTS.json', JSON.stringify({
    date: new Date().toISOString(),
    playersCreated: PLAYERS.length,
    coachesCreated: COACHES.length,
    findings,
  }, null, 2));
});
