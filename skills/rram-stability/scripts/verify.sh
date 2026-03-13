#!/bin/bash
# ═══ RRAM DNA Profile — Automated Stability Verification ═══
# Run from repo root: bash /path/to/verify.sh
# Returns exit code 0 if all checks pass, 1 if any fail.

FAIL=0
REPO="${1:-/home/claude/rramsdnaprofile}"
cd "$REPO"

echo "════════════════════════════════════════════════"
echo "  RRAM STABILITY VERIFICATION"
echo "  $(date +%Y-%m-%d\ %H:%M)"
echo "  Commit: $(git rev-parse --short HEAD)"
echo "════════════════════════════════════════════════"
echo ""

# ── TESTS ──
echo "► Running test suite..."
TEST_OUTPUT=$(npx vitest run 2>&1)
TEST_PASS=$(echo "$TEST_OUTPUT" | grep -oP '\d+ passed' | head -1 | grep -oP '\d+')
TEST_FAIL=$(echo "$TEST_OUTPUT" | grep -oP '\d+ failed' | head -1 | grep -oP '\d+' || echo "0")
echo "  Tests: ${TEST_PASS} passed, ${TEST_FAIL} failed"
if [ "${TEST_FAIL}" != "0" ] && [ "${TEST_FAIL}" != "" ]; then
    echo "  ❌ CRITICAL: Test failures detected"
    FAIL=1
else
    echo "  ✅ All tests pass"
fi
echo ""

# ── BUILD ──
echo "► Running production build..."
BUILD_OUTPUT=$(VITE_SUPABASE_URL=https://pudldzgmluwoocwxtzhw.supabase.co VITE_SUPABASE_ANON_KEY=dummy npx vite build 2>&1)
if echo "$BUILD_OUTPUT" | grep -q "✓ built"; then
    CHUNK=$(echo "$BUILD_OUTPUT" | grep "CoachAssessment" | grep -oP '[\d.]+\s*kB' | head -1)
    echo "  ✅ Build clean — CoachAssessment chunk: $CHUNK"
else
    echo "  ❌ CRITICAL: Build failed"
    FAIL=1
fi
echo ""

# ── DEPRECATED IMPORTS ──
echo "► Checking deprecated responsive imports..."
DEPRECATED=$(grep -rn "import.*_isDesktop\|import.*\bdkWrap\b\|import.*\bDSZ\b\|import.*\bDSF\b" --include="*.jsx" src/ 2>/dev/null | grep -v theme.js | wc -l)
if [ "$DEPRECATED" -gt 0 ]; then
    echo "  ❌ HIGH: $DEPRECATED deprecated static imports found"
    FAIL=1
else
    echo "  ✅ Dynamic responsive functions only"
fi

# ── WRONG COLUMN ──
echo "► Checking for userProfile.name (wrong column)..."
WRONG_COL=$(grep -rn "userProfile\.name\b" --include="*.jsx" src/ 2>/dev/null | wc -l)
if [ "$WRONG_COL" -gt 0 ]; then
    echo "  ❌ HIGH: $WRONG_COL references to userProfile.name (should be full_name)"
    FAIL=1
else
    echo "  ✅ Uses full_name correctly"
fi

# ── XSS ──
echo "► Checking XSS vectors..."
XSS=$(grep -rn "dangerouslySetInnerHTML\|innerHTML\|eval(" --include="*.jsx" --include="*.js" src/ 2>/dev/null | wc -l)
if [ "$XSS" -gt 0 ]; then
    echo "  ❌ CRITICAL: $XSS XSS vectors found"
    FAIL=1
else
    echo "  ✅ No XSS vectors"
fi

# ── SECRETS ──
echo "► Checking for exposed secrets..."
SECRETS=$(grep -rn "service_role\|sk_live\|sk_test" --include="*.jsx" --include="*.js" src/ 2>/dev/null | wc -l)
if [ "$SECRETS" -gt 0 ]; then
    echo "  ❌ CRITICAL: $SECRETS exposed secrets"
    FAIL=1
else
    echo "  ✅ No secrets in client code"
fi

# ── MOCK GUARD ──
echo "► Checking mock data DEV guard..."
MOCK_GUARD=$(grep -c "import.meta.env.DEV" src/coach/CoachAssessment.jsx 2>/dev/null)
if [ "$MOCK_GUARD" -lt 2 ]; then
    echo "  ❌ HIGH: Mock data may not be guarded (found $MOCK_GUARD DEV checks)"
    FAIL=1
else
    echo "  ✅ Mock data DEV-guarded ($MOCK_GUARD checks)"
fi

# ── SUBMITTED SYNC ──
echo "► Checking user_profiles.submitted sync..."
SUB_SYNC=$(grep -c "submitted.*true" src/player/PlayerOnboarding.jsx 2>/dev/null)
if [ "$SUB_SYNC" -lt 1 ]; then
    echo "  ❌ CRITICAL: user_profiles.submitted not set after onboarding"
    FAIL=1
else
    echo "  ✅ Submitted flag synced"
fi

# ── DEAD CODE ──
echo "► Checking for dead code..."
if [ -f "src/shared/useAutoSave.js" ]; then
    echo "  ⚠ LOW: useAutoSave.js still exists (unused)"
else
    echo "  ✅ No dead code files"
fi

# ── SAVE ERROR HANDLING ──
echo "► Checking save functions throw on error..."
SAVE_NULL=$(grep -c "return null" src/db/playerDb.js 2>/dev/null || true)
SAVE_NULL=${SAVE_NULL:-0}
if [ "$SAVE_NULL" -gt 0 ]; then
    echo "  ❌ HIGH: playerDb.js still returns null on error ($SAVE_NULL occurrences)"
    FAIL=1
else
    echo "  ✅ All save functions throw on error"
fi

echo ""
echo "════════════════════════════════════════════════"
if [ "$FAIL" -eq 0 ]; then
    echo "  ✅ ALL CHECKS PASSED — READY TO DEPLOY"
else
    echo "  ❌ CHECKS FAILED — FIX BEFORE DEPLOYING"
fi
echo "════════════════════════════════════════════════"

exit $FAIL
