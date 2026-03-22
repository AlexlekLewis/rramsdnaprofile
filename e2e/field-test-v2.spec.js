/**
 * RRAM DNA Profile — E2E Field Test v2 (Final)
 * Tests real user flows on the live Vercel deployment.
 *
 * Run: npx playwright test e2e/field-test-v2.spec.js --reporter=list
 */
import { test, expect } from '@playwright/test';

const BASE = 'https://rramsdnaprofile.vercel.app';
const PW = 'Cr1cket#Dna9xQ';

const ROLE_MAP = {
  batter: 'Specialist Batter', pace: 'Pace Bowler', spin: 'Spin Bowler',
  keeper: 'WK-Batter', allrounder: 'Batting All-Rounder',
};
const SKILL_MAP = {
  batter: 'Batting', pace: 'Fast Bowling', spin: 'Spin Bowling',
  keeper: 'Wicket Keeping', allrounder: 'Batting',
};

const PLAYERS = [
  { u: 'ft.mason.reid',   name: 'Mason Reid',   dob: '15/06/2012', role: 'batter',     club: 'Melbourne CC' },
  { u: 'ft.priya.sharma', name: 'Priya Sharma',  dob: '22/03/2011', role: 'pace',       club: 'Eastern Stars' },
  { u: 'ft.liam.carter',  name: 'Liam Carter',   dob: '08/11/2013', role: 'allrounder', club: 'Bayside Tigers' },
];
const COACH = { u: 'ft.coach.sarah', name: 'Sarah Mitchell' };

const findings = [];
const log = (s, a, m) => { findings.push({ s, a, m }); console.log(`  [${s}] ${a}: ${m}`); };

// ═══ HELPERS ═══

async function freshLogin(page, username) {
  await page.goto(BASE);
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.goto(BASE);
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(2000);

  // Ensure login form (not register)
  const back = page.locator('text=/already have/i').first();
  if (await back.isVisible({ timeout: 1500 }).catch(() => false)) await back.click();
  await page.waitForTimeout(300);

  await page.locator('input[placeholder="Username"]').fill(username);
  await page.locator('input[placeholder="Password"]').fill(PW);
  await page.locator('button:has-text("SIGN IN")').click();
  await page.waitForTimeout(5000);

  const err = page.locator('text=/⚠/').first();
  if (await err.isVisible({ timeout: 1000 }).catch(() => false)) {
    log('ERROR', 'Login', `${username}: ${await err.textContent()}`);
    return false;
  }
  return true;
}

// Click the "Next →" button in the fixed bottom nav bar
async function clickNext(page) {
  // The button text is literally "Next →" — use exact text
  const btn = page.locator('button', { hasText: 'Next →' });
  await btn.waitFor({ state: 'visible', timeout: 5000 });
  await btn.click({ force: true });
  await page.waitForTimeout(1500);
}

// Check if a step error is showing
async function hasStepError(page) {
  // Step errors appear in a red banner with specific validation messages
  const errBanner = page.locator('div').filter({ hasText: /^(Please|Rate|Answer)/ }).first();
  return await errBanner.isVisible({ timeout: 500 }).catch(() => false);
}

// Get current step number from the breadcrumb ("STEP 1/7", "STEP 2/7", etc)
async function getCurrentStep(page) {
  const stepText = await page.locator('text=/STEP \\d/').first().textContent().catch(() => '');
  const match = stepText.match(/STEP (\d)/);
  return match ? parseInt(match[1]) : 0;
}

// ═══ PLAYER ONBOARDING ═══
test.describe.serial('Player Onboarding', () => {
  for (const p of PLAYERS) {
    test(`Onboard ${p.name}`, async ({ page }) => {
      test.setTimeout(180_000);

      const ok = await freshLogin(page, p.u);
      expect(ok).toBe(true);

      // Already on portal?
      if (await page.locator('text=Welcome back').isVisible({ timeout: 5000 }).catch(() => false)) {
        log('INFO', 'Skip', `${p.name} already onboarded`);
        return;
      }

      // Should see onboarding
      await expect(page.locator('text=PLAYER ONBOARDING')).toBeVisible({ timeout: 10000 });
      console.log(`\n  🏏 ${p.name} — onboarding`);

      // ── Dismiss welcome modal ──
      const letsGo = page.locator('button', { hasText: "LET'S GO" });
      if (await letsGo.isVisible({ timeout: 3000 }).catch(() => false)) {
        await letsGo.click();
        await page.waitForTimeout(1000);
      }

      // ═══ STEP 0: PROFILE ═══
      console.log(`  📝 Step 0: Profile`);
      await page.locator('input[placeholder="Your full name"]').fill(p.name);
      await page.locator('input[placeholder="DD/MM/YYYY"]').fill(p.dob);
      await page.locator('input[placeholder*="Doncaster"]').fill(p.club);
      await page.screenshot({ path: `e2e/screenshots/v2-s0-${p.u}.png` });
      await clickNext(page);
      console.log(`  ✅ Step 0 done (now on step ${await getCurrentStep(page)})`);

      // ═══ STEP 1: COMPETITION HISTORY ═══
      console.log(`  📝 Step 1: Competition`);
      // Click "Entry Level / None" group
      await page.locator('button', { hasText: 'Entry Level' }).click();
      await page.waitForTimeout(1000);
      // Click "No Recorded History" tier
      const noHist = page.locator('button', { hasText: 'No Recorded History' });
      if (await noHist.isVisible({ timeout: 3000 }).catch(() => false)) {
        await noHist.click();
        await page.waitForTimeout(500);
      } else {
        // Fallback: click first available tier
        const blast = page.locator('button', { hasText: 'Cricket Blast' });
        if (await blast.isVisible({ timeout: 1000 }).catch(() => false)) await blast.click();
      }
      await page.screenshot({ path: `e2e/screenshots/v2-s1-${p.u}.png` });
      await clickNext(page);
      console.log(`  ✅ Step 1 done (now on step ${await getCurrentStep(page)})`);

      // ═══ STEP 2: T20 IDENTITY ═══
      console.log(`  📝 Step 2: T20 Identity`);
      const selects = page.locator('select');
      const selCount = await selects.count();
      console.log(`    ${selCount} selects found`);

      // Fill selects by index: [0]=Role, [1]=BatHand, [2]=BowlType, [3]=PrimarySkill, [4]=SecondarySkill
      if (selCount >= 4) {
        await selects.nth(0).selectOption(ROLE_MAP[p.role]);
        await page.waitForTimeout(300);
        await selects.nth(1).selectOption({ index: 1 }); // Right-Hand Bat
        await selects.nth(2).selectOption({ index: 1 }); // First bowling type
        await selects.nth(3).selectOption(SKILL_MAP[p.role]);
        if (selCount > 4) await selects.nth(4).selectOption({ index: 1 });
        console.log(`    ✅ Selects filled (Role=${ROLE_MAP[p.role]}, Skill=${SKILL_MAP[p.role]})`);
      }

      // Answer archetype questions — they're scenario buttons inside question cards
      // Each question has 4 options. We need to be surgical: only click answer options, not nav buttons.
      await page.waitForTimeout(1000);

      // The archetype questions are rendered as 12 questions, each with 4 answer buttons.
      // Answer buttons contain scenario text (15+ chars) and are NOT nav/utility buttons.
      const allBtns = await page.locator('button').all();
      const NAV = /Next|Back|Sign|Save|LET|SUBMIT|ADD|Change|✕|←|→/i;
      let answered = 0;
      for (const btn of allBtns) {
        const txt = (await btn.textContent().catch(() => '')).trim();
        if (NAV.test(txt)) continue;
        if (txt.length < 12 || txt.length > 200) continue;
        if (!await btn.isVisible().catch(() => false)) continue;
        // Only click up to 12 answers (one per question)
        if (answered >= 12) break;
        await btn.click({ force: true }).catch(() => {});
        answered++;
        await page.waitForTimeout(150);
      }
      console.log(`    ✅ ${answered} archetype answers clicked`);

      await page.screenshot({ path: `e2e/screenshots/v2-s2-${p.u}.png` });
      await clickNext(page);
      console.log(`  ✅ Step 2 done (now on step ${await getCurrentStep(page)})`);

      // ═══ STEP 3: SELF-ASSESSMENT ═══
      console.log(`  📝 Step 3: Self-Assessment`);
      // Rating buttons contain a number div (1-5) + a label div
      // Use JavaScript to click rating buttons directly via the React state
      // This is more reliable than trying to click tiny UI buttons
      await page.evaluate(() => {
        // Find all buttons that look like rating dots (contain a single digit div)
        const btns = document.querySelectorAll('button');
        let clicked = 0;
        btns.forEach(btn => {
          const divs = btn.querySelectorAll('div');
          if (divs.length >= 2) {
            const numDiv = divs[0];
            const num = parseInt(numDiv.textContent);
            if (num >= 1 && num <= 5 && numDiv.textContent.trim().length <= 1) {
              // Click every "3" rating (good middle ground)
              if (num === 3 && clicked < 30) {
                btn.click();
                clicked++;
              }
            }
          }
        });
        return clicked;
      });
      console.log(`    ✅ Ratings clicked via JS`);

      await page.screenshot({ path: `e2e/screenshots/v2-s3-${p.u}.png` });
      // Soft nudge: first click shows message, second click skips
      await clickNext(page);
      if (await hasStepError(page)) {
        console.log(`    ℹ️ Nudge shown — clicking Next again to skip`);
        await clickNext(page);
      }
      console.log(`  ✅ Step 3 done (now on step ${await getCurrentStep(page)})`);

      // ═══ STEP 4: PLAYER VOICE / MATCHUPS ═══
      console.log(`  📝 Step 4: Player Voice`);
      // Same rating button approach
      await page.evaluate(() => {
        const btns = document.querySelectorAll('button');
        let clicked = 0;
        btns.forEach(btn => {
          const divs = btn.querySelectorAll('div');
          if (divs.length >= 2) {
            const num = parseInt(divs[0].textContent);
            if (num === 3 && divs[0].textContent.trim().length <= 1 && clicked < 20) {
              btn.click();
              clicked++;
            }
          }
        });
      });

      await page.screenshot({ path: `e2e/screenshots/v2-s4-${p.u}.png` });
      await clickNext(page);
      if (await hasStepError(page)) {
        console.log(`    ℹ️ Nudge shown — clicking Next again to skip`);
        await clickNext(page);
      }
      console.log(`  ✅ Step 4 done (now on step ${await getCurrentStep(page)})`);

      // ═══ STEP 5: MEDICAL & GOALS ═══
      console.log(`  📝 Step 5: Medical & Goals`);
      const textareas = page.locator('textarea');
      const taCount = await textareas.count();
      if (taCount >= 2) {
        await textareas.nth(0).fill('No injuries. Fully fit and healthy.');
        await textareas.nth(1).fill('Improve my batting and represent my state.');
      }
      await page.screenshot({ path: `e2e/screenshots/v2-s5-${p.u}.png` });
      await clickNext(page);
      // Double-check we advanced
      const step6 = await getCurrentStep(page);
      if (step6 < 7) {
        console.log(`    ⚠ Still on step ${step6}, clicking Next again`);
        await clickNext(page);
      }
      console.log(`  ✅ Step 5 done (now on step ${await getCurrentStep(page)})`);

      // ═══ STEP 6: REVIEW & SUBMIT ═══
      console.log(`  📝 Step 6: Review & Submit`);
      await page.screenshot({ path: `e2e/screenshots/v2-s6-${p.u}.png` });

      const submitBtn = page.locator('button', { hasText: 'SUBMIT SURVEY' });
      if (await submitBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await submitBtn.scrollIntoViewIfNeeded();
        await submitBtn.click();
        await page.waitForTimeout(6000);

        // Check for success
        if (await page.locator('text=Survey Submitted').isVisible({ timeout: 8000 }).catch(() => false)) {
          console.log(`  ✅✅ ${p.name} — ONBOARDING COMPLETE ✅✅`);
          log('PASS', 'Onboarding', `${p.name}: Completed`);
        } else {
          log('ERROR', 'Submit', `${p.name}: No success confirmation`);
        }
      } else {
        const currentStep = await getCurrentStep(page);
        log('ERROR', 'Submit', `${p.name}: Not on review page (step ${currentStep})`);
        await page.screenshot({ path: `e2e/screenshots/v2-stuck-${p.u}.png` });
      }

      await page.screenshot({ path: `e2e/screenshots/v2-done-${p.u}.png` });
    });
  }
});

// ═══ RETURNING PLAYER → PORTAL ═══
test('Returning player → Player Portal', async ({ page }) => {
  test.setTimeout(30_000);
  const ok = await freshLogin(page, PLAYERS[0].u);
  expect(ok).toBe(true);

  const isPortal = await page.locator('text=Welcome back').isVisible({ timeout: 10000 }).catch(() => false);
  const isOnboarding = await page.locator('text=PLAYER ONBOARDING').isVisible({ timeout: 2000 }).catch(() => false);

  if (isPortal) log('PASS', 'Routing', `${PLAYERS[0].name}: Goes to Player Portal ✅`);
  else if (isOnboarding) log('CRITICAL', 'Routing', `${PLAYERS[0].name}: SENT BACK TO ONBOARDING`);
  else log('ERROR', 'Routing', `${PLAYERS[0].name}: Neither portal nor onboarding`);

  await page.screenshot({ path: 'e2e/screenshots/v2-returning.png' });
  expect(isPortal).toBe(true);
});

// ═══ COACH → COACH PORTAL ═══
test('Coach → Coach Portal', async ({ page }) => {
  test.setTimeout(30_000);
  const ok = await freshLogin(page, COACH.u);
  expect(ok).toBe(true);

  const isCoach = await page.locator('text=/Roster|Dashboard|COACH/i').first()
    .isVisible({ timeout: 10000 }).catch(() => false);

  if (isCoach) log('PASS', 'Routing', `${COACH.name}: Coach Portal ✅`);
  else log('ERROR', 'Routing', `Coach: Wrong portal`);

  await page.screenshot({ path: 'e2e/screenshots/v2-coach.png' });
  expect(isCoach).toBe(true);
});

// ═══ SUMMARY ═══
test.afterAll(() => {
  console.log('\n' + '═'.repeat(60));
  console.log('FIELD TEST — FINAL RESULTS');
  console.log('═'.repeat(60));
  const g = {};
  findings.forEach(f => { (g[f.s] ||= []).push(f); });
  for (const s of ['CRITICAL', 'ERROR', 'WARNING', 'INFO', 'PASS']) {
    if (g[s]) { console.log(`\n${s} (${g[s].length}):`); g[s].forEach(f => console.log(`  ${f.a}: ${f.m}`)); }
  }
  console.log('\n' + '═'.repeat(60));
});
