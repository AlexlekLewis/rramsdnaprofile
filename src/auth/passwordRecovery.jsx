import React, { useState, useEffect } from "react";
import { B, F, LOGO, sGrad } from "../data/theme";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

async function callPublicFn(fnName, body) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${fnName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(body),
  });
  let data = {};
  try { data = await res.json(); } catch { /* ignore */ }
  return { ok: res.ok, status: res.status, data };
}

async function callAuthedFn(fnName, body) {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${fnName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  let data = {};
  try { data = await res.json(); } catch { /* ignore */ }
  return { ok: res.ok, status: res.status, data };
}

const inputStyle = (hasError) => ({
  width: "100%", padding: "14px 16px", borderRadius: 10,
  border: hasError ? `2px solid ${B.red}` : "2px solid rgba(255,255,255,0.2)",
  background: "rgba(255,255,255,0.1)", color: B.w, fontSize: 14, fontWeight: 600,
  fontFamily: F, outline: "none", boxSizing: "border-box", marginBottom: 8, letterSpacing: 0.5,
});

const primaryBtn = {
  width: "100%", marginTop: 4, padding: "14px 20px", borderRadius: 10, border: "none",
  background: `linear-gradient(135deg, ${B.bl}, ${B.pk})`, color: B.w, fontSize: 13,
  fontWeight: 800, fontFamily: F, cursor: "pointer", letterSpacing: 0.5,
  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
};

const linkStyle = {
  fontSize: 11, color: "rgba(255,255,255,0.5)", fontFamily: F,
  cursor: "pointer", textDecoration: "underline", background: "none", border: "none", padding: 0,
};

// ═══════════════════════════════════════════════════════════════════
// Modal shell — used by both forgot-password and forgot-username
// ═══════════════════════════════════════════════════════════════════
function ModalShell({ title, subtitle, onClose, children }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 1000,
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 360,
          background: "linear-gradient(135deg,#0a0a14,#1a1a2e)",
          border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16,
          padding: 24, position: "relative", boxShadow: "0 12px 48px rgba(0,0,0,0.5)",
        }}
      >
        <button
          type="button" onClick={onClose} aria-label="Close"
          style={{
            position: "absolute", top: 12, right: 12, background: "none", border: "none",
            color: "rgba(255,255,255,0.5)", cursor: "pointer", padding: 4,
            display: "flex", alignItems: "center",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        <div style={{ fontSize: 18, fontWeight: 800, color: B.w, fontFamily: F, marginBottom: 6 }}>
          {title}
        </div>
        {subtitle && (
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", fontFamily: F, marginBottom: 16, lineHeight: 1.5 }}>
            {subtitle}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Forgot Password modal
// ═══════════════════════════════════════════════════════════════════
export function ForgotPasswordModal({ onClose }) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const submit = async () => {
    if (submitting) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }
    setError("");
    setSubmitting(true);
    const { ok, status, data } = await callPublicFn("send-password-reset", { email: email.trim() });
    setSubmitting(false);
    if (status === 429) {
      setError(data?.error || "Too many attempts. Please wait and try again later.");
      return;
    }
    if (!ok && status !== 200) {
      setError("Something went wrong. Please try again.");
      return;
    }
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <ModalShell title="Check your email" onClose={onClose}>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", fontFamily: F, lineHeight: 1.6 }}>
          If an account exists for <strong style={{ color: B.w }}>{email.trim()}</strong>, we've sent a password reset link.
          The link expires in 1 hour and can only be used once.
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", fontFamily: F, marginTop: 12, lineHeight: 1.5 }}>
          Didn't get an email? Check your spam folder, or contact your RRA Melbourne coach.
        </div>
        <button onClick={onClose} style={{ ...primaryBtn, marginTop: 18 }}>Done</button>
      </ModalShell>
    );
  }

  return (
    <ModalShell
      title="Forgot password"
      subtitle="Enter the email address linked to your account. We'll send you a link to set a new password."
      onClose={onClose}
    >
      <input
        type="email" value={email} autoFocus autoCapitalize="off" autoCorrect="off"
        onChange={(e) => { setEmail(e.target.value); setError(""); }}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder="Email address" style={inputStyle(!!error)}
      />
      {error && (
        <div style={{ fontSize: 11, color: B.red, fontFamily: F, marginTop: 2, marginBottom: 4, fontWeight: 600 }}>
          ⚠ {error}
        </div>
      )}
      <button onClick={submit} disabled={submitting} style={{ ...primaryBtn, opacity: submitting ? 0.7 : 1 }}>
        {submitting ? "Sending..." : "Send reset link"}
      </button>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: F, marginTop: 14, lineHeight: 1.5, textAlign: "center" }}>
        Don't have a recovery email on file? Contact your RRA Melbourne coach.
      </div>
    </ModalShell>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Forgot Username modal
// ═══════════════════════════════════════════════════════════════════
export function ForgotUsernameModal({ onClose }) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const submit = async () => {
    if (submitting) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }
    setError("");
    setSubmitting(true);
    const { ok, status, data } = await callPublicFn("send-username-recovery", { email: email.trim() });
    setSubmitting(false);
    if (status === 429) {
      setError(data?.error || "Too many attempts. Please wait and try again later.");
      return;
    }
    if (!ok && status !== 200) {
      setError("Something went wrong. Please try again.");
      return;
    }
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <ModalShell title="Check your email" onClose={onClose}>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", fontFamily: F, lineHeight: 1.6 }}>
          If an account exists for <strong style={{ color: B.w }}>{email.trim()}</strong>, we've sent your username.
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", fontFamily: F, marginTop: 12, lineHeight: 1.5 }}>
          Didn't get an email? Check your spam folder, or contact your RRA Melbourne coach.
        </div>
        <button onClick={onClose} style={{ ...primaryBtn, marginTop: 18 }}>Done</button>
      </ModalShell>
    );
  }

  return (
    <ModalShell
      title="Forgot username"
      subtitle="Enter the email address linked to your account. We'll email you the username(s) we have on file."
      onClose={onClose}
    >
      <input
        type="email" value={email} autoFocus autoCapitalize="off" autoCorrect="off"
        onChange={(e) => { setEmail(e.target.value); setError(""); }}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder="Email address" style={inputStyle(!!error)}
      />
      {error && (
        <div style={{ fontSize: 11, color: B.red, fontFamily: F, marginTop: 2, marginBottom: 4, fontWeight: 600 }}>
          ⚠ {error}
        </div>
      )}
      <button onClick={submit} disabled={submitting} style={{ ...primaryBtn, opacity: submitting ? 0.7 : 1 }}>
        {submitting ? "Sending..." : "Send my username"}
      </button>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: F, marginTop: 14, lineHeight: 1.5, textAlign: "center" }}>
        Don't have a recovery email on file? Contact your RRA Melbourne coach.
      </div>
    </ModalShell>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Reset Password page (deep-linked from email)
// ═══════════════════════════════════════════════════════════════════
const pwRules = [
  { label: "At least 8 characters", test: (pw) => pw.length >= 8 },
  { label: "One uppercase letter (A–Z)", test: (pw) => /[A-Z]/.test(pw) },
  { label: "One lowercase letter (a–z)", test: (pw) => /[a-z]/.test(pw) },
  { label: "One number (0–9)", test: (pw) => /[0-9]/.test(pw) },
  { label: "One special character (!@#$…)", test: (pw) => /[^A-Za-z0-9]/.test(pw) },
];

export function ResetPasswordPage({ token, onDone }) {
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);

  const allValid = pw.length > 0 && pwRules.every((r) => r.test(pw));
  const matches = pw && confirm && pw === confirm;

  const submit = async () => {
    if (submitting) return;
    if (!allValid) { setError("Please meet all password requirements."); return; }
    if (!matches) { setError("Passwords do not match."); return; }
    setError("");
    setSubmitting(true);
    const { ok, status, data } = await callPublicFn("complete-password-reset", { token, new_password: pw });
    setSubmitting(false);
    if (!ok || status !== 200) {
      setError(data?.error || "Something went wrong. Please request a new reset link.");
      return;
    }
    setSuccess({ username: data?.username || "" });
  };

  if (success) {
    return (
      <div style={{ minHeight: "100vh", ...sGrad, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <img src={LOGO} alt="" style={{ width: 80, height: 80, objectFit: "contain", marginBottom: 16 }} />
        <div style={{ width: "100%", maxWidth: 320, textAlign: "center" }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: B.w, fontFamily: F, marginBottom: 8 }}>
            Password updated
          </div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", fontFamily: F, lineHeight: 1.6, marginBottom: 24 }}>
            {success.username
              ? <>Your new password is set for <strong style={{ color: B.w }}>{success.username}</strong>.</>
              : "Your new password is set."}
          </div>
          <button onClick={onDone} style={primaryBtn}>Continue to sign in</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", ...sGrad, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <img src={LOGO} alt="" style={{ width: 80, height: 80, objectFit: "contain", marginBottom: 16 }} />
      <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: 3, textTransform: "uppercase", fontFamily: F }}>
        Rajasthan Royals Academy
      </div>
      <div style={{ fontSize: 22, fontWeight: 900, color: B.w, fontFamily: F, marginTop: 4, marginBottom: 24 }}>
        Set a new password
      </div>

      <div style={{ width: "100%", maxWidth: 300 }}>
        <div style={{ position: "relative", width: "100%" }}>
          <input
            type={showPw ? "text" : "password"} value={pw} autoFocus
            onChange={(e) => { setPw(e.target.value); setError(""); }}
            placeholder="New password"
            style={{ ...inputStyle(!!error), paddingRight: 44 }}
          />
          <button
            type="button" onClick={() => setShowPw((v) => !v)}
            aria-label={showPw ? "Hide password" : "Show password"}
            style={{
              position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
              background: "none", border: "none", cursor: "pointer", padding: 4,
              color: "rgba(255,255,255,0.5)", display: "flex", alignItems: "center",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
        </div>
        {pw.length > 0 && (
          <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: 8, padding: "10px 12px", marginBottom: 8, marginTop: -4 }}>
            {pwRules.map((r) => {
              const pass = r.test(pw);
              return (
                <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: pass ? "#4ade80" : "rgba(255,255,255,0.35)", lineHeight: 1 }}>
                    {pass ? "✓" : "○"}
                  </span>
                  <span style={{ fontSize: 10, fontFamily: F, fontWeight: 600, color: pass ? "#4ade80" : "rgba(255,255,255,0.45)" }}>
                    {r.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
        <input
          type={showPw ? "text" : "password"} value={confirm}
          onChange={(e) => { setConfirm(e.target.value); setError(""); }}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Confirm password" style={inputStyle(!!error)}
        />
        {error && (
          <div style={{ fontSize: 11, color: B.red, fontFamily: F, marginTop: 2, marginBottom: 4, fontWeight: 600 }}>
            ⚠ {error}
          </div>
        )}
        <button onClick={submit} disabled={submitting} style={{ ...primaryBtn, opacity: submitting ? 0.7 : 1 }}>
          {submitting ? "Saving..." : "Save new password"}
        </button>
        <div style={{ textAlign: "center", marginTop: 16 }}>
          <button onClick={onDone} style={linkStyle}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Verify Recovery Email page (deep-linked from email)
// ═══════════════════════════════════════════════════════════════════
export function VerifyRecoveryEmailPage({ token, onDone }) {
  const [state, setState] = useState({ phase: "loading", email: "", error: "" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { ok, status, data } = await callPublicFn("verify-recovery-email", { token });
      if (cancelled) return;
      if (ok && status === 200 && data?.success) {
        setState({ phase: "success", email: data.email || "", error: "" });
      } else {
        setState({ phase: "error", email: "", error: data?.error || "We couldn't confirm this email. Please try again." });
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  return (
    <div style={{ minHeight: "100vh", ...sGrad, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <img src={LOGO} alt="" style={{ width: 80, height: 80, objectFit: "contain", marginBottom: 16 }} />
      <div style={{ width: "100%", maxWidth: 320, textAlign: "center" }}>
        {state.phase === "loading" && (
          <>
            <div style={{ fontSize: 18, fontWeight: 800, color: B.w, fontFamily: F, marginBottom: 8 }}>
              Confirming your email...
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontFamily: F }}>
              One moment.
            </div>
          </>
        )}
        {state.phase === "success" && (
          <>
            <div style={{ fontSize: 22, fontWeight: 900, color: B.w, fontFamily: F, marginBottom: 8 }}>
              Recovery email confirmed
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", fontFamily: F, lineHeight: 1.6, marginBottom: 24 }}>
              {state.email
                ? <><strong style={{ color: B.w }}>{state.email}</strong> is now set as your account recovery email.</>
                : "Your recovery email is now confirmed."}
            </div>
            <button onClick={onDone} style={primaryBtn}>Continue</button>
          </>
        )}
        {state.phase === "error" && (
          <>
            <div style={{ fontSize: 22, fontWeight: 900, color: B.w, fontFamily: F, marginBottom: 8 }}>
              Couldn't confirm
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", fontFamily: F, lineHeight: 1.6, marginBottom: 24 }}>
              {state.error}
            </div>
            <button onClick={onDone} style={primaryBtn}>Continue</button>
          </>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Recovery Email Prompt (banner + modal, shown post-login)
// ═══════════════════════════════════════════════════════════════════
export function RecoveryEmailPrompt() {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const [status, setStatus] = useState({ checked: false, hasVerified: false, hasPending: false, pendingEmail: "" });
  const [dismissed, setDismissed] = useState(() => {
    try { return sessionStorage.getItem("rra_recovery_prompt_dismissed") === "1"; } catch { return false; }
  });
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!userId) {
      setStatus({ checked: true, hasVerified: false, hasPending: false, pendingEmail: "" });
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase
          .from("member_recovery")
          .select("recovery_email, recovery_email_verified_at")
          .eq("auth_user_id", userId)
          .maybeSingle();
        if (cancelled) return;
        if (data?.recovery_email && data?.recovery_email_verified_at) {
          setStatus({ checked: true, hasVerified: true, hasPending: false, pendingEmail: "" });
        } else if (data?.recovery_email) {
          setStatus({ checked: true, hasVerified: false, hasPending: true, pendingEmail: data.recovery_email });
        } else {
          setStatus({ checked: true, hasVerified: false, hasPending: false, pendingEmail: "" });
        }
      } catch {
        if (!cancelled) setStatus({ checked: true, hasVerified: false, hasPending: false, pendingEmail: "" });
      }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  if (!status.checked || status.hasVerified || dismissed) return null;

  const dismiss = () => {
    try { sessionStorage.setItem("rra_recovery_prompt_dismissed", "1"); } catch { /* ignore */ }
    setDismissed(true);
  };

  return (
    <>
      <div
        role="status"
        style={{
          position: "sticky", top: 0, zIndex: 50,
          background: "linear-gradient(135deg, rgba(0,117,201,0.12), rgba(233,107,176,0.12))",
          borderBottom: "1px solid rgba(0,117,201,0.25)",
          padding: "10px 14px",
          display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={B.bl} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <polyline points="22,6 12,13 2,6" />
        </svg>
        <div style={{ fontSize: 12, fontFamily: F, color: B.g800, lineHeight: 1.4, flex: 1, minWidth: 200 }}>
          {status.hasPending
            ? <>Confirm your recovery email — we sent a link to <strong>{status.pendingEmail}</strong>.</>
            : <>Add a recovery email so you can reset your password if you ever get locked out.</>}
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{
            padding: "6px 14px", borderRadius: 8, border: "none",
            background: `linear-gradient(135deg, ${B.bl}, ${B.pk})`, color: B.w,
            fontSize: 11, fontWeight: 800, fontFamily: F, cursor: "pointer", letterSpacing: 0.3,
          }}
        >
          {status.hasPending ? "Resend email" : "Add now"}
        </button>
        <button
          onClick={dismiss} aria-label="Dismiss"
          style={{
            padding: 4, borderRadius: 6, border: "none", background: "transparent",
            color: B.g600, cursor: "pointer", display: "flex", alignItems: "center",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
      {showModal && (
        <SetRecoveryEmailModal
          initialEmail={status.pendingEmail}
          onClose={() => setShowModal(false)}
          onSent={(email) => {
            setStatus({ checked: true, hasVerified: false, hasPending: true, pendingEmail: email });
            setShowModal(false);
          }}
        />
      )}
    </>
  );
}

function SetRecoveryEmailModal({ initialEmail, onClose, onSent }) {
  const [email, setEmail] = useState(initialEmail || "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (submitting) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }
    setError("");
    setSubmitting(true);
    const { ok, status, data } = await callAuthedFn("set-recovery-email", { email: email.trim() });
    setSubmitting(false);
    if (!ok || status !== 200) {
      setError(data?.error || "Something went wrong. Please try again.");
      return;
    }
    onSent(email.trim());
  };

  return (
    <ModalShell
      title="Add a recovery email"
      subtitle="Use a real email you check often. We'll send a confirmation link to make sure it's yours."
      onClose={onClose}
    >
      <input
        type="email" value={email} autoFocus autoCapitalize="off" autoCorrect="off"
        onChange={(e) => { setEmail(e.target.value); setError(""); }}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder="Email address" style={inputStyle(!!error)}
      />
      {error && (
        <div style={{ fontSize: 11, color: B.red, fontFamily: F, marginTop: 2, marginBottom: 4, fontWeight: 600 }}>
          ⚠ {error}
        </div>
      )}
      <button onClick={submit} disabled={submitting} style={{ ...primaryBtn, opacity: submitting ? 0.7 : 1 }}>
        {submitting ? "Sending..." : "Send confirmation"}
      </button>
    </ModalShell>
  );
}
