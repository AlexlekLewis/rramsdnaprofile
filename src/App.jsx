import React, { useState, Suspense } from "react";

// ═══ CONTEXT PROVIDERS ═══
import { AuthProvider, useAuth } from "./context/AuthContext";
import { EngineProvider, useEngine } from "./context/EngineContext";

// ═══ ERROR BOUNDARY ═══
import { ErrorBoundary } from "./shared/ErrorBoundary";

// ═══ LAZY-LOADED PORTAL COMPONENTS ═══
const PlayerOnboarding = React.lazy(() => import("./player/PlayerOnboarding"));
const PlayerPortal = React.lazy(() => import("./player/PlayerPortal"));
const CoachAssessment = React.lazy(() => import("./coach/CoachAssessment"));

// ═══ DATA & ENGINE ═══
import { B, F, LOGO, sGrad } from "./data/theme";

function MainApp() {
  const { session, authLoading, authStep, setAuthStep, portal, isAdmin, signIn, signUp, signOut, userProfile, joinRole, setJoinRole } = useAuth();
  const { engineLoading } = useEngine();

  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [showLoginPw, setShowLoginPw] = useState(false);

  // ═══ REGISTRATION STATE ═══
  const [showRegister, setShowRegister] = useState(!!joinRole);
  const [regName, setRegName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [showRegPw, setShowRegPw] = useState(false);
  const [showRegConfirmPw, setShowRegConfirmPw] = useState(false);
  const [regCode, setRegCode] = useState('');

  // ═══ PASSWORD STRENGTH RULES ═══
  const pwRules = [
    { label: 'At least 8 characters',         test: pw => pw.length >= 8 },
    { label: 'One uppercase letter (A–Z)',     test: pw => /[A-Z]/.test(pw) },
    { label: 'One lowercase letter (a–z)',     test: pw => /[a-z]/.test(pw) },
    { label: 'One number (0–9)',               test: pw => /[0-9]/.test(pw) },
    { label: 'One special character (!@#$…)',  test: pw => /[^A-Za-z0-9]/.test(pw) },
  ];
  const pwAllValid = regPassword.length > 0 && pwRules.every(r => r.test(regPassword));

  const handleLogin = async () => {
    if (!loginUsername || !loginPassword) {
      setAuthError('Please enter your username and password.');
      return;
    }
    setAuthError('');
    try {
      await signIn(loginUsername, loginPassword);
    } catch (e) {
      setAuthError(e.message || 'Login failed. Please try again.');
    }
  };

  const handleRegister = async () => {
    if (!regCode.trim()) {
      setAuthError('Please enter your registration code.');
      return;
    }
    if (!regName.trim() || !regUsername.trim() || !regPassword) {
      setAuthError('Please fill in all fields.');
      return;
    }
    if (regPassword !== regConfirm) {
      setAuthError('Passwords do not match.');
      return;
    }
    if (!pwAllValid) {
      setAuthError('Please meet all password requirements below.');
      return;
    }
    setAuthError('');
    try {
      await signUp(regUsername, regPassword, regName, joinRole || 'player', regCode.trim());
    } catch (e) {
      const msg = e.message || '';
      if (msg.toLowerCase().includes('weak') || msg.toLowerCase().includes('easy to guess') || msg.toLowerCase().includes('pwned')) {
        setAuthError('This password is too common or easy to guess. Try a longer passphrase or add random characters.');
      } else {
        setAuthError(msg || 'Registration failed. Please try again.');
      }
    }
  };

  const switchToRegister = (role) => {
    setJoinRole(role);
    setShowRegister(true);
    setAuthError('');
    setAuthStep('register');
  };

  const switchToLogin = () => {
    setShowRegister(false);
    setJoinRole(null);
    setAuthError('');
    setAuthStep('login');
  };

  // ═══ LOADING / SPLASH ═══
  if (authLoading || (portal && engineLoading)) return (
    <div style={{ minHeight: "100vh", ...sGrad, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <img src={LOGO} alt="" style={{ width: 80, height: 80, objectFit: "contain", marginBottom: 16, filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.3))" }} />
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", fontFamily: F, fontWeight: 600 }}>Loading...</div>
    </div>
  );

  // ═══ LOGIN / REGISTER SCREEN ═══
  const inputStyle = (hasError) => ({
    width: "100%", padding: "14px 16px", borderRadius: 10,
    border: hasError ? `2px solid ${B.red}` : '2px solid rgba(255,255,255,0.2)',
    background: "rgba(255,255,255,0.1)", color: B.w, fontSize: 14, fontWeight: 600,
    fontFamily: F, outline: "none", boxSizing: 'border-box', marginBottom: 8, letterSpacing: 0.5,
  });

  const EyeToggle = ({ show, onToggle }) => (
    <button type="button" onClick={onToggle} aria-label={show ? 'Hide password' : 'Show password'}
      style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center' }}>
      {show ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/></svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
      )}
    </button>
  );

  if (!portal) return (
    <div style={{ minHeight: "100vh", ...sGrad, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <img src={LOGO} alt="" style={{ width: 100, height: 100, objectFit: "contain", marginBottom: 20, filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.3))" }} />
      <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: 3, textTransform: "uppercase", fontFamily: F }}>Rajasthan Royals Academy</div>
      <div style={{ fontSize: 26, fontWeight: 900, color: B.w, fontFamily: F, textAlign: "center", marginTop: 4 }}>Player DNA Profile</div>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: F, marginTop: 4, marginBottom: 36 }}>Onboarding & Assessment System</div>

      {/* ── REGISTRATION FORM ── */}
      {showRegister && (authStep === 'register' || authStep === 'login') && <>
        <div style={{ width: "100%", maxWidth: 300 }}>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", fontFamily: F, marginBottom: 16, lineHeight: 1.4, textAlign: 'center' }}>
            Create your {joinRole || 'player'} account
          </div>
          <input type="text" value={regCode} onChange={e => { setRegCode(e.target.value.toUpperCase().replace(/[^A-Z0-9\-]/g, '')); setAuthError(''); }}
            placeholder="Registration Code" autoFocus autoCapitalize="characters" autoCorrect="off"
            style={{ ...inputStyle(authError), textAlign: 'center', letterSpacing: 2, fontWeight: 800, fontSize: 14 }} />
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", fontFamily: F, marginTop: -4, marginBottom: 10, textAlign: 'center' }}>
            Enter the code provided by your programme coordinator
          </div>
          <input type="text" value={regName} onChange={e => { setRegName(e.target.value); setAuthError(''); }}
            placeholder="Full Name" autoCapitalize="words" style={inputStyle(authError)} />
          <input type="text" value={regUsername} onChange={e => { setRegUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, '')); setAuthError(''); }}
            placeholder="Username" autoCapitalize="off" autoCorrect="off" style={inputStyle(authError)} />
          <div style={{ position: 'relative', width: '100%' }}>
            <input type={showRegPw ? 'text' : 'password'} value={regPassword} onChange={e => { setRegPassword(e.target.value); setAuthError(''); }}
              placeholder="Password" style={{ ...inputStyle(authError), paddingRight: 44 }} />
            <EyeToggle show={showRegPw} onToggle={() => setShowRegPw(v => !v)} />
          </div>
          {regPassword.length > 0 && (
            <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: '10px 12px', marginBottom: 8, marginTop: -4 }}>
              {pwRules.map(rule => {
                const pass = rule.test(regPassword);
                return (
                  <div key={rule.label} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: pass ? '#4ade80' : 'rgba(255,255,255,0.35)', lineHeight: 1 }}>
                      {pass ? '✓' : '○'}
                    </span>
                    <span style={{ fontSize: 10, fontFamily: F, fontWeight: 600, color: pass ? '#4ade80' : 'rgba(255,255,255,0.45)' }}>
                      {rule.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
          <div style={{ position: 'relative', width: '100%' }}>
            <input type={showRegConfirmPw ? 'text' : 'password'} value={regConfirm} onChange={e => { setRegConfirm(e.target.value); setAuthError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleRegister()}
              placeholder="Confirm Password" style={{ ...inputStyle(authError), paddingRight: 44 }} />
            <EyeToggle show={showRegConfirmPw} onToggle={() => setShowRegConfirmPw(v => !v)} />
          </div>
          {authError && <div style={{ fontSize: 11, color: B.red, fontFamily: F, marginTop: 2, marginBottom: 4, fontWeight: 600 }}>⚠ {authError}</div>}
          <button onClick={handleRegister}
            style={{ width: "100%", marginTop: 4, padding: "14px 20px", borderRadius: 10, border: "none", background: `linear-gradient(135deg, ${B.bl}, ${B.pk})`, color: B.w, fontSize: 13, fontWeight: 800, fontFamily: F, cursor: "pointer", letterSpacing: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
            CREATE ACCOUNT
          </button>
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <span onClick={switchToLogin}
              style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontFamily: F, cursor: "pointer", textDecoration: "underline" }}>
              Already have an account? Sign in
            </span>
          </div>
        </div>
      </>}

      {/* ── REGISTERING SPINNER ── */}
      {authStep === 'registering' && <>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", fontFamily: F, fontWeight: 600 }}>Creating your account...</div>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontFamily: F, marginTop: 6 }}>Please wait.</div>
      </>}

      {/* ── LOGIN FORM ── */}
      {!showRegister && authStep === 'login' && <>
        <div style={{ width: "100%", maxWidth: 300 }}>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", fontFamily: F, marginBottom: 16, lineHeight: 1.4, textAlign: 'center' }}>
            Sign in with your credentials
          </div>
          <input type="text" value={loginUsername} onChange={e => { setLoginUsername(e.target.value); setAuthError(''); }}
            placeholder="Username" autoFocus autoCapitalize="off" autoCorrect="off" style={inputStyle(authError)} />
          <div style={{ position: 'relative', width: '100%' }}>
            <input type={showLoginPw ? 'text' : 'password'} value={loginPassword} onChange={e => { setLoginPassword(e.target.value); setAuthError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="Password" style={{ ...inputStyle(authError), paddingRight: 44 }} />
            <EyeToggle show={showLoginPw} onToggle={() => setShowLoginPw(v => !v)} />
          </div>
          {authError && <div style={{ fontSize: 11, color: B.red, fontFamily: F, marginTop: 2, marginBottom: 4, fontWeight: 600 }}>⚠ {authError}</div>}
          <button onClick={handleLogin}
            style={{ width: "100%", marginTop: 4, padding: "14px 20px", borderRadius: 10, border: "none", background: `linear-gradient(135deg, ${B.bl}, ${B.pk})`, color: B.w, fontSize: 13, fontWeight: 800, fontFamily: F, cursor: "pointer", letterSpacing: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
            SIGN IN
          </button>
          <div style={{ textAlign: 'center', marginTop: 12 }}>
            <a href="/login-instructions.html" target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: F, textDecoration: 'underline', cursor: 'pointer' }}>
              Login Instructions
            </a>
          </div>
          <div style={{ textAlign: 'center', marginTop: 8 }}>
            <span onClick={() => switchToRegister('player')}
              style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontFamily: F, cursor: "pointer", textDecoration: "underline" }}>
              New player? Register here
            </span>
          </div>
        </div>
      </>}

      {/* ── SIGNING IN SPINNER ── */}
      {!showRegister && authStep === 'signing-in' && <>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", fontFamily: F, fontWeight: 600 }}>Signing in...</div>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontFamily: F, marginTop: 6 }}>Please wait.</div>
      </>}
    </div>
  );

  // ═══ PLAYER PORTAL ═══
  if (portal === "player") {
    if (userProfile?.submitted) return <PlayerPortal />;
    return <PlayerOnboarding />;
  }

  // ═══ COACH / ADMIN PORTAL ═══
  if (["coach", "admin", "super_admin"].includes(portal)) {
    return <CoachAssessment />;
  }

  return null;
}

// ═══ SUSPENSE FALLBACK ═══
const PortalLoader = () => (
  <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#0a0a14,#1a1a2e)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", fontFamily: "'Inter',sans-serif", fontWeight: 600 }}>Loading portal...</div>
  </div>
);

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <EngineProvider>
          <Suspense fallback={<PortalLoader />}>
            <MainApp />
          </Suspense>
        </EngineProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
