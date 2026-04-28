# Password & Username Recovery — Setup, Rollback, Tests

This file documents the password-recovery feature shipped on branch `preview/password-recovery`.

## What it does

Two self-service flows, available on the login screen behind the feature flag `VITE_ENABLE_PASSWORD_RECOVERY`:

- **Forgot password** — user enters an email; if it matches a verified recovery email on file, an email arrives with a 1-hour, single-use reset link. Clicking the link lets them set a new password.
- **Forgot username** — user enters an email; if matched, an email arrives listing the usernames linked to it.

A post-login banner prompts users without a verified recovery email to add one. The banner can be dismissed for the session.

## To turn it on in production

1. **Resend API key (one-time)**
   - Sign up free at https://resend.com (3,000 emails/month free).
   - Add and verify your sending domain (recommend `rramelbourne.com`). Resend gives you DNS records to add.
   - Create an API key with "Send" permission.

2. **Add three secrets to Supabase Edge Functions**
   - In Supabase Studio → Project Settings → Edge Functions → Secrets, add:
     - `RESEND_API_KEY` = the Resend key from step 1
     - `RECOVERY_EMAIL_FROM` = e.g. `RRA Melbourne <noreply@rramelbourne.com>`
     - `APP_URL` = `https://rramelbourne.com` (or whatever the production app URL is)
   - Optional tuning:
     - `RECOVERY_RATE_LIMIT_IP_PER_HOUR` (default `20`)
     - `RECOVERY_RATE_LIMIT_EMAIL_PER_DAY` (default `3`)

3. **Add the feature flag to Vercel**
   - Vercel Project → Settings → Environment Variables.
   - Add `VITE_ENABLE_PASSWORD_RECOVERY` = `true` for the environment(s) you want it live in (Preview first, then Production after canary).
   - Trigger a redeploy after adding (Vite bakes env vars at build time).

4. **Verify on Preview**
   - Open the Preview URL.
   - Login screen should now show "Forgot password?" and "Forgot username?" links.
   - Sign in as any test account → expect the "Add a recovery email" banner at the top.
   - Add a recovery email → check inbox for verification email.

## Rollback (any time, no data loss)

The feature is fully gated by `VITE_ENABLE_PASSWORD_RECOVERY`. To turn it off:

- Set `VITE_ENABLE_PASSWORD_RECOVERY=false` in Vercel and redeploy. The login screen reverts to the old "Contact your RRAM coordinator" copy. The banner stops appearing.

The Edge Functions and database tables remain in place — they are dormant when the flag is off. No data needs to be deleted.

If you want to delete *everything*, three additive tables can be dropped (in order):

```sql
DROP TABLE IF EXISTS public.password_reset_tokens CASCADE;
DROP TABLE IF EXISTS public.recovery_attempts CASCADE;
DROP TABLE IF EXISTS public.member_recovery CASCADE;
DROP FUNCTION IF EXISTS public.set_member_recovery_updated_at();
```

Edge Functions can be deleted from Supabase Studio → Edge Functions:
`send-password-reset`, `complete-password-reset`, `send-username-recovery`, `set-recovery-email`, `verify-recovery-email`.

## Architecture

- **Login identifier is username**, not email. Supabase Auth uses synthetic `{username}@rradna.app` emails. Real emails for recovery live in a separate `member_recovery` table.
- **Recovery email is per-user.** Multiple users (e.g. siblings) can share the same email — forgot-username will return all matched usernames; forgot-password sends one email with one reset link per matched account.
- **Token storage:** raw tokens (32 random bytes, hex-encoded) are sent to the user; only their SHA-256 hash is stored in the database. A leaked DB does not enable resets.
- **Rate limits:** 20 requests/hour per IP, 3/day per email, per attempt type. Configurable via Edge Function env vars.
- **No email enumeration:** every public endpoint returns the same generic success response, regardless of whether the email matched.
- **Service role only in Edge Functions.** No new client-side secrets.

## Testing

A Playwright spec covers all public flows + the post-login banner via dev bypass:

```bash
npx playwright test e2e/12-password-recovery.spec.js
```

24 tests covering: modal open/close/validation, generic-success enumeration prevention, deep-link reset page (form, password rules, mismatch, fake token, cancel), verify-email deep link, mobile viewports, post-login banner + dismissal, no fatal console errors.

**Manual end-to-end test (after Resend is configured):**

1. Sign in as the `tester` account on Preview.
2. Click "Add now" on the recovery banner. Enter a real email you can check.
3. Click the confirmation link from the email — verifies the recovery email.
4. Sign out. Click "Forgot password?" → enter the same email → check inbox.
5. Click the reset link → set a new password → log in with it.
6. Click "Forgot username?" → enter the same email → check inbox.
