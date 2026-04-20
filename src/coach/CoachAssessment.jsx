// ═══ COACH ASSESSMENT — DNA Profile Assessment Flow ═══
// Extracted from the monolith App.jsx for standalone DNA Profile system.
// Contains: player roster, survey view, assessment pages, PDI summary, report card generation.

import React, { useState, useEffect, useCallback, useRef, useMemo, Suspense } from "react";
import { useAuth } from "../context/AuthContext";
import { useEngine } from "../context/EngineContext";

// ═══ DATA & ENGINE ═══
import { B, F, LOGO, sGrad, sCard, getDkWrap, isDesktop } from "../data/theme";
import { ROLES, IQ_ITEMS, MN_ITEMS, PH_MAP, PHASES, VOICE_QS, BAT_ARCH, BWL_ARCH, BAT_MATCHUPS, BWL_MATCHUPS, MENTAL_MATCHUPS, CONFIDENCE_SCALE, FREQUENCY_SCALE, FLD_ITEMS } from "../data/skillItems";
import { getAge, getBracket, calcCCM, calcPDI, calcCohortPercentile, calcAgeScore, techItems } from "../engine/ratingEngine";
import { loadPlayersFromDB, saveAssessmentToDB, reopenPlayerProfile } from "../db/playerDb";
import { loadAssessmentRosters, buildRosterLookup, matchPlayerToSquad } from "../db/sessionDb";
import { loadProgramMembers, resetUserPassword } from "../db/adminDb";
import { generateDNAReport } from "../supabaseClient";
import { MOCK } from "../data/mockPlayers";
import { COACH_DEFS } from "../data/skillDefinitions";
// NOTE: sessionGroups.js has been replaced by src/db/sessionDb.js (reads from sp_squads live).
// Kept as a file for historical reference but no longer imported.

// ═══ SHARED UI ═══
import { Hdr, SecH, Inp, TArea, AssGrid, Ring } from "../shared/FormComponents";
import { SaveToast, SaveStatusBar, useSaveStatus } from "../shared/SaveToast";

// ═══ LAZY-LOADED COMPONENTS ═══
const ReportCard = React.lazy(() => import("./ReportCard"));
const EngineGuide = React.lazy(() => import("./EngineGuide"));
const AdminDashboard = React.lazy(() => import("./AdminDashboard"));
const AdminProfiles = React.lazy(() => import("./AdminProfiles"));
const SquadAssignment = React.lazy(() => import("./SquadAssignment"));

// ═══ BOTTOM NAV BAR ═══
const NAV_ITEMS_ADMIN = [
    { id: 'list', label: 'Roster', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
    { id: 'admin', label: 'Dashboard', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> },
    { id: 'profiles', label: 'Profiles', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
    { id: 'squads', label: 'Squads', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> },
];
const NAV_ITEMS_COACH = [NAV_ITEMS_ADMIN[0]]; // Coach only sees Roster

const CoachNavBar = React.memo(({ active, onNavigate, isAdmin: showAdmin }) => {
    const items = showAdmin ? NAV_ITEMS_ADMIN : NAV_ITEMS_COACH;
    return (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: 56, background: B.w, borderTop: `1px solid ${B.g200}`, display: 'flex', justifyContent: 'space-around', alignItems: 'center', zIndex: 100, fontFamily: F }}>
            {items.map(item => {
                const isActive = active === item.id;
                return (
                    <button key={item.id} onClick={() => onNavigate(item.id)}
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, background: 'none', border: 'none', cursor: 'pointer', padding: '6px 12px', color: isActive ? B.nvD : B.g400, minWidth: 56 }}>
                        <div style={{ color: isActive ? B.nvD : B.g400 }}>{item.icon}</div>
                        <div style={{ fontSize: 9, fontWeight: isActive ? 800 : 600, letterSpacing: 0.3 }}>{item.label}</div>
                    </button>
                );
            })}
        </div>
    );
});
import { useSessionState } from "../shared/useSessionState";

// ── Confidence dot color helper (extracted to module level) ──
const confDotColor = (v) => {
    if (!v || v === 0) return B.g200;
    if (v <= 2) return '#EF5350';
    if (v === 3) return B.org;
    return B.grn;
};

// ── Player Confidence Context Card (extracted to module level) ──
const ConfidenceContext = React.memo(({ matchups, domain, title, color, sr }) => {
    const hasData = matchups.some((_, i) => sr[`mc_${domain}_${i}_c`] > 0);
    if (!hasData) return null;
    return (
        <div style={{ background: `${color}06`, border: `1px solid ${color}20`, borderRadius: 10, padding: '10px 12px', marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color, fontFamily: F, letterSpacing: 0.5 }}>PLAYER SELF-VIEW: {title}</div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ fontSize: 8, color: B.g400, fontFamily: F }}>C = Confidence</div>
                    <div style={{ fontSize: 8, color: B.g400, fontFamily: F }}>F = Frequency</div>
                </div>
            </div>
            {matchups.map((m, i) => {
                const cv = sr[`mc_${domain}_${i}_c`] || 0;
                const fv = sr[`mc_${domain}_${i}_f`] || 0;
                if (cv === 0 && fv === 0) return null;
                const gap = cv > 0 && fv > 0 ? cv - fv : null;
                return (
                    <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0', borderBottom: i < matchups.length - 1 ? `1px solid ${color}10` : 'none' }}>
                        <div style={{ flex: 1, fontSize: 10, color: B.g700, fontFamily: F, lineHeight: 1.3 }}>{m.conf}</div>
                        <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0 }}>
                            <div title={`Confidence: ${cv}/5`} style={{ width: 22, height: 22, borderRadius: '50%', background: confDotColor(cv), color: B.w, fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F }}>{cv || '—'}</div>
                            <div title={`Frequency: ${fv}/5`} style={{ width: 22, height: 22, borderRadius: '50%', border: `2px solid ${confDotColor(fv)}`, color: confDotColor(fv), fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F, background: 'transparent' }}>{fv || '—'}</div>
                            {gap !== null && Math.abs(gap) >= 2 && <div style={{ fontSize: 8, fontWeight: 700, color: gap > 0 ? '#EF5350' : B.sky, fontFamily: F, minWidth: 14, textAlign: 'center' }}>{gap > 0 ? `+${gap}` : gap}</div>}
                        </div>
                    </div>
                );
            })}
        </div>
    );
});

// ── Combined confidence summary (extracted to module level) ──
const ConfidenceSummary = React.memo(({ sr, hasMC, hasBowling }) => {
    if (!hasMC) return null;
    let confSum = 0, confN = 0, freqSum = 0, freqN = 0;
    const allDomains = [
        { matchups: BAT_MATCHUPS, domain: 'bat' },
        ...(hasBowling ? [{ matchups: BWL_MATCHUPS, domain: 'bwl' }] : []),
        { matchups: MENTAL_MATCHUPS, domain: 'mnt' },
    ];
    allDomains.forEach(({ matchups, domain }) => {
        matchups.forEach((_, i) => {
            const cv = sr[`mc_${domain}_${i}_c`] || 0;
            const fv = sr[`mc_${domain}_${i}_f`] || 0;
            if (cv > 0) { confSum += cv; confN++; }
            if (fv > 0) { freqSum += fv; freqN++; }
        });
    });
    const confAvg = confN > 0 ? (confSum / confN).toFixed(1) : '—';
    const freqAvg = freqN > 0 ? (freqSum / freqN).toFixed(1) : '—';
    const gap = confN > 0 && freqN > 0 ? ((confSum / confN) - (freqSum / freqN)).toFixed(1) : null;
    let sagiLabel = 'Insufficient data';
    let sagiColor = B.g400;
    if (gap !== null) {
        const g = parseFloat(gap);
        if (g > 0.5) { sagiLabel = 'Over-estimates'; sagiColor = '#EF5350'; }
        else if (g < -0.5) { sagiLabel = 'Under-estimates'; sagiColor = B.sky; }
        else { sagiLabel = 'Self-aware'; sagiColor = B.grn; }
    }

    return (
        <div style={{ background: B.nvD, borderRadius: 10, padding: '12px 14px', marginBottom: 10, color: B.w }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.4)', fontFamily: F, letterSpacing: 1.5, marginBottom: 8 }}>PLAYER SELF-PERCEPTION</div>
            <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center', gap: 8 }}>
                <div>
                    <div style={{ fontSize: 22, fontWeight: 800, fontFamily: F }}>{confAvg}</div>
                    <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.5)', fontFamily: F }}>Confidence</div>
                </div>
                <div>
                    <div style={{ fontSize: 22, fontWeight: 800, fontFamily: F }}>{freqAvg}</div>
                    <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.5)', fontFamily: F }}>Frequency</div>
                </div>
                <div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: sagiColor, fontFamily: F }}>{gap !== null ? (parseFloat(gap) > 0 ? `+${gap}` : gap) : '—'}</div>
                    <div style={{ fontSize: 8, color: sagiColor, fontFamily: F, fontWeight: 600 }}>{sagiLabel}</div>
                </div>
            </div>
        </div>
    );
});

// ═══ Extracted sub-components (module-level to prevent remount on parent re-render) ═══
const AccountRow = ({ m, resettingId, handleReset }) => (
    <div style={{ ...sCard, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: m.role === 'player' ? `${B.bl}20` : m.role === 'coach' ? `${B.pk}20` : `${B.prp}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: m.role === 'player' ? B.bl : m.role === 'coach' ? B.pk : B.prp, fontFamily: F }}>
                {(m.display_name || m.username || '?').charAt(0).toUpperCase()}
            </span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: B.nvD, fontFamily: F }}>{m.display_name || '—'}</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 2, flexWrap: 'wrap' }}>
                <div style={{ fontSize: 10, color: B.g600, fontFamily: F }}>
                    <span style={{ fontWeight: 600, color: B.bl }}>@{m.username}</span>
                </div>
                <div style={{ fontSize: 9, color: B.g400, fontFamily: F }}>
                    pw: <span style={{ fontFamily: 'monospace', fontWeight: 600, color: B.nvD, background: B.g100, padding: '1px 4px', borderRadius: 3, fontSize: 10 }}>{m.generated_password || '(self-set)'}</span>
                </div>
            </div>
            <div style={{ display: 'flex', gap: 4, marginTop: 3 }}>
                <div style={{ fontSize: 8, fontWeight: 700, color: B.w, background: m.role === 'player' ? B.bl : m.role === 'coach' ? B.pk : B.prp, borderRadius: 3, padding: '1px 6px', textTransform: 'uppercase', fontFamily: F }}>{m.role}</div>
                <div style={{ fontSize: 8, fontWeight: 600, color: m.active ? B.grn : B.red, fontFamily: F }}>{m.active ? '● Active' : '● Inactive'}</div>
            </div>
        </div>
        <button
            disabled={resettingId === m.auth_user_id}
            onClick={() => handleReset(m)}
            style={{ fontSize: 9, fontWeight: 700, color: B.w, background: resettingId === m.auth_user_id ? B.g400 : B.pk, border: 'none', borderRadius: 6, padding: '6px 12px', cursor: resettingId === m.auth_user_id ? 'default' : 'pointer', fontFamily: F, whiteSpace: 'nowrap', flexShrink: 0 }}
        >{resettingId === m.auth_user_id ? 'Resetting...' : 'Reset PW'}</button>
    </div>
);

const SectionLabel = ({ label, count, color }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '14px 0 6px' }}>
        <div style={{ fontSize: 10, fontWeight: 800, color, fontFamily: F, letterSpacing: 1 }}>{label}</div>
        <div style={{ fontSize: 9, fontWeight: 600, color: B.g400, fontFamily: F }}>({count})</div>
        <div style={{ flex: 1, height: 1, background: B.g200 }} />
    </div>
);

export default function CoachAssessment() {
    const { session, portal, isAdmin, signOut } = useAuth();
    const { compTiers, dbWeights, engineConst } = useEngine();

    const [players, setPlayers] = useState([]);
    const [loading, setLoading] = useState(false);

    const [selP, setSelP] = useSessionState('rra_selP', null);
    const [cView, setCView] = useSessionState('rra_cView', "list");
    const [cPage, setCPage] = useSessionState('rra_cPage', 0);
    const [reportPlayer, setReportPlayer] = useState(null);
    const [showGuide, setShowGuide] = useState(false);

    // Roster search/sort/filter
    const [rosterSearch, setRosterSearch] = useState('');
    const [rosterSort, setRosterSort] = useState('name'); // name | pdi-desc | ccm-desc | assessed
    const [rosterFilter, setRosterFilter] = useState('all'); // all | assessed | unassessed | role-ids
    const [groupBySession, setGroupBySession] = useState(true); // Default ON for assessment week
    const [rosterWeek, setRosterWeek] = useSessionState('rra_rosterWeek', 'skill'); // 'skill' | 'gameSense'
    const [dbRosters, setDbRosters] = useState({ skillWeek: [], gameSenseWeek: [] });
    const saveStatusHook = useSaveStatus();

    // Load live rosters from sp_squads / sp_squad_players. Source of truth.
    useEffect(() => {
        loadAssessmentRosters().then(setDbRosters).catch(e => console.error('Roster load failed:', e));
    }, []);

    // ── Admin accounts panel state ──
    const [accounts, setAccounts] = useState([]);
    const [accountsLoading, setAccountsLoading] = useState(false);
    const [resetResult, setResetResult] = useState(null); // { username, new_password }
    const [resettingId, setResettingId] = useState(null);

    const saveTimer = useRef(null);
    const pendingCdRef = useRef({});
    const retryCount = useRef(0);
    const currentPlayerIdRef = useRef(null);

    const goTop = () => window.scrollTo(0, 0);

    // ── Flush pending saves on tab close / navigate away ──
    // Combines master's "warn during active save" with main's "emergency flush via sendBeacon"
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            const pid = currentPlayerIdRef.current;
            const pending = pendingCdRef.current;
            const hasPending = pid && pending && Object.keys(pending).length > 0;
            const activeSave = saveStatusHook.status === 'saving' || saveStatusHook.status === 'error';
            if (hasPending || activeSave) {
                // Save draft to localStorage as safety net
                if (hasPending) {
                    try { localStorage.setItem(`rra_draft_${pid}`, JSON.stringify(pending)); } catch {}
                    // Attempt synchronous save via sendBeacon
                    try {
                        const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/coach_assessments?on_conflict=player_id`;
                        const payload = JSON.stringify({ player_id: pid, ...pending, updated_at: new Date().toISOString() });
                        navigator.sendBeacon(url, new Blob([payload], { type: 'application/json' }));
                    } catch {}
                }
                e.preventDefault();
                e.returnValue = 'You have unsaved assessment data.';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [saveStatusHook.status]);

    // ── Reopen player profile (admin/coach) ──
    const handleReopenProfile = async (e, playerId, playerName) => {
        e.stopPropagation(); // Don't trigger card click-through
        if (!confirm(`Reopen ${playerName}'s profile? They'll be able to edit their onboarding data next time they log in.`)) return;
        const result = await reopenPlayerProfile(playerId);
        if (result.success) {
            alert(`${playerName}'s profile has been reopened.`);
            refreshPlayers(); // Remove them from the submitted roster
        } else {
            alert(`Failed to reopen profile: ${result.error}`);
        }
    };

    const btnSty = (ok, full) => ({ padding: full ? "14px 20px" : "8px 16px", borderRadius: 8, border: "none", background: ok ? `linear-gradient(135deg,${B.bl},${B.pk})` : B.g200, color: ok ? B.w : B.g400, fontSize: 13, fontWeight: 800, fontFamily: F, cursor: ok ? "pointer" : "default", letterSpacing: .5, textTransform: "uppercase", width: full ? "100%" : "auto", marginTop: 6 });
    const backBtn = { marginTop: 8, padding: "10px 16px", border: `1px solid ${B.g200}`, borderRadius: 6, background: "transparent", fontSize: 11, fontWeight: 600, color: B.g600, cursor: "pointer", fontFamily: F, width: "100%" };

    const refreshPlayers = useCallback(async () => {
        setLoading(true);
        try {
            const ps = await loadPlayersFromDB();
            setPlayers(ps.length ? ps : (import.meta.env.DEV ? MOCK : []));
        } catch (e) {
            console.error(e);
            setPlayers(import.meta.env.DEV ? MOCK : []);
        }
        setLoading(false);
    }, []);

    useEffect(() => { refreshPlayers(); }, [refreshPlayers]);

    const sp = selP ? players.find(p => p.id === selP) : null;

    // Memoize PDI/CCM computation for roster — avoids recalculating on every search/filter/render
    const rosterScores = useMemo(() => {
        const map = {};
        players.filter(p => p.submitted).forEach(p => {
            const ccmR = calcCCM(p.grades, p.dob, compTiers, engineConst);
            const hasCd = Object.keys(p.cd || {}).some(k => k.startsWith('t1_'));
            const hasSelf = Object.keys(p.self_ratings || {}).some(k => k.startsWith('t1_'));
            const hasData = hasCd || hasSelf || (p.grades?.length > 0);
            const dn = hasData ? calcPDI({ ...p.cd, _dob: p.dob }, p.self_ratings, p.role, ccmR, dbWeights, engineConst, p.grades, {}, p.topBat, p.topBowl, compTiers) : null;
            let overallScore = null;
            if (dn && dn.pdi > 0) {
                const pathS = dn.pdiPct;
                const cohortS = calcCohortPercentile(dn.pdi, players, compTiers, dbWeights, engineConst);
                const ageS = calcAgeScore(ccmR.arm, engineConst);
                overallScore = Math.round((pathS + cohortS + ageS) / 3);
            }
            map[p.id] = { ccmR, dn, hasCd, hasSelf, hasData, overallScore };
        });
        return map;
    }, [players, compTiers, dbWeights, engineConst]);

    const handleNav = (viewId) => { setCView(viewId); goTop(); };
    const showNavBar = !['assess', 'survey', 'report'].includes(cView);

    // ═══ LOADING STATE — show spinner while players fetch ═══
    if (loading && players.length === 0) return (
        <div style={{ minHeight: "100vh", background: B.g50, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
            <img src={LOGO} alt="" style={{ width: 56, height: 56, objectFit: "contain", marginBottom: 12, opacity: 0.6 }} />
            <div style={{ fontSize: 13, color: B.g400, fontFamily: F, fontWeight: 600 }}>Loading roster...</div>
        </div>
    );

    // ═══ SAFETY: reset to roster if cView needs a player but sp is missing ═══
    if (['assess', 'survey'].includes(cView) && !sp && !loading) {
        // Player not found after load — bounce back to roster safely
        setCView("list");
        setSelP(null);
    }

    // ═══ ADMIN DASHBOARD ═══
    if (cView === "admin") return (
        <div style={{ minHeight: '100vh', background: B.g50, paddingBottom: 60 }}>
            <Suspense fallback={<div style={{ padding: 24, textAlign: 'center', color: B.g400, fontSize: 12, fontFamily: F }}>Loading dashboard...</div>}>
                <AdminDashboard onBack={() => setCView("list")} />
            </Suspense>
            {showNavBar && <CoachNavBar active={cView} onNavigate={handleNav} isAdmin={isAdmin} />}
        </div>
    );

    // ═══ ADMIN PROFILES ═══
    if (cView === "profiles" && isAdmin) return (
        <div style={{ minHeight: '100vh', background: B.g50, paddingBottom: 60 }}>
            <Hdr label="PLAYER PROFILES" onLogoClick={signOut} />
            <Suspense fallback={<div style={{ padding: 24, textAlign: 'center', color: B.g400, fontSize: 12, fontFamily: F }}>Loading profiles...</div>}>
                <AdminProfiles />
            </Suspense>
            <CoachNavBar active={cView} onNavigate={handleNav} isAdmin={isAdmin} />
        </div>
    );

    // ═══ SQUAD ASSIGNMENT ═══
    if (cView === "squads" && isAdmin) return (
        <div style={{ minHeight: '100vh', background: B.g50, paddingBottom: 60 }}>
            <Hdr label="SQUAD ALLOCATION" onLogoClick={signOut} />
            <Suspense fallback={<div style={{ padding: 24, textAlign: 'center', color: B.g400, fontSize: 12, fontFamily: F }}>Loading squad engine...</div>}>
                <SquadAssignment />
            </Suspense>
            <CoachNavBar active={cView} onNavigate={handleNav} isAdmin={isAdmin} />
        </div>
    );

    // ═══ PLAYER ROSTER ═══
    if (cView === "list") return (<div style={{ minHeight: "100vh", fontFamily: F, background: B.g50, paddingBottom: 60 }}>
        <Hdr label="COACH PORTAL" onLogoClick={signOut} />
        <div style={{ padding: '4px 12px', background: B.g100, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ fontSize: 9, color: B.g400, fontFamily: F }}>{session?.user?.email}</div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {isAdmin && <button onClick={() => { setAccountsLoading(true); setResetResult(null); loadProgramMembers().then(d => { setAccounts(d); setAccountsLoading(false); }).catch(() => setAccountsLoading(false)); setCView("accounts"); }} style={{ fontSize: 9, fontWeight: 700, color: B.bl, background: `${B.bl}12`, border: `1px solid ${B.bl}30`, borderRadius: 4, padding: '3px 10px', cursor: 'pointer', fontFamily: F }}>👤 Accounts</button>}
                <button onClick={signOut} style={{ fontSize: 9, fontWeight: 600, color: B.red, background: 'none', border: 'none', cursor: 'pointer', fontFamily: F }}>Sign Out</button>
            </div>
        </div>

        <div style={{ padding: 12, ...getDkWrap() }}>
            {/* ── Search, Sort, Filter ── */}
            <div style={{ marginBottom: 10 }}>
                <input value={rosterSearch} onChange={e => setRosterSearch(e.target.value)} placeholder="Search players..."
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: `1px solid ${B.g200}`, fontSize: 12, fontFamily: F, outline: 'none', boxSizing: 'border-box', marginBottom: 8 }} />
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    <button onClick={() => setGroupBySession(g => !g)}
                        style={{ padding: '4px 10px', borderRadius: 12, border: `1.5px solid ${groupBySession ? '#6366F1' : B.g200}`, background: groupBySession ? '#6366F110' : 'transparent', fontSize: 9, fontWeight: groupBySession ? 700 : 500, color: groupBySession ? '#6366F1' : B.g400, fontFamily: F, cursor: 'pointer' }}>
                        📅 Session
                    </button>
                    {groupBySession && (
                        <div style={{ display: 'inline-flex', borderRadius: 12, border: `1.5px solid ${B.g200}`, overflow: 'hidden' }}>
                            <button onClick={() => setRosterWeek('skill')}
                                style={{ padding: '4px 10px', border: 'none', background: rosterWeek === 'skill' ? B.bl : 'transparent', fontSize: 9, fontWeight: rosterWeek === 'skill' ? 800 : 500, color: rosterWeek === 'skill' ? B.w : B.g400, fontFamily: F, cursor: 'pointer' }}>
                                🏏 Skill Week
                            </button>
                            <button onClick={() => setRosterWeek('gameSense')}
                                style={{ padding: '4px 10px', border: 'none', background: rosterWeek === 'gameSense' ? B.pk : 'transparent', fontSize: 9, fontWeight: rosterWeek === 'gameSense' ? 800 : 500, color: rosterWeek === 'gameSense' ? B.w : B.g400, fontFamily: F, cursor: 'pointer' }}>
                                🎯 Game Sense
                            </button>
                        </div>
                    )}
                    {[{ id: 'name', label: 'A-Z' }, { id: 'pdi-desc', label: 'PDI ↓' }, { id: 'ccm-desc', label: 'CCM ↓' }, { id: 'assessed', label: 'Assessed' }].map(s => (
                        <button key={s.id} onClick={() => setRosterSort(s.id)}
                            style={{ padding: '4px 10px', borderRadius: 12, border: `1.5px solid ${rosterSort === s.id ? B.bl : B.g200}`, background: rosterSort === s.id ? `${B.bl}10` : 'transparent', fontSize: 9, fontWeight: rosterSort === s.id ? 700 : 500, color: rosterSort === s.id ? B.bl : B.g400, fontFamily: F, cursor: 'pointer' }}>
                            {s.label}
                        </button>
                    ))}
                    <select value={rosterFilter} onChange={e => setRosterFilter(e.target.value)}
                        style={{ padding: '4px 8px', borderRadius: 8, border: `1px solid ${B.g200}`, fontSize: 9, fontFamily: F, color: B.g600 }}>
                        <option value="all">All Players</option>
                        <option value="assessed">Assessed</option>
                        <option value="unassessed">Unassessed</option>
                        {ROLES.map(r => <option key={r.id} value={`role-${r.id}`}>{r.label}</option>)}
                    </select>
                </div>
            </div>

            {/* ── Batch progress ── */}
            {(() => {
                const submitted = players.filter(p => p.submitted);
                const assessed = submitted.filter(p => Object.keys(p.cd || {}).some(k => k.startsWith('t1_')));
                const pct = submitted.length > 0 ? Math.round((assessed.length / submitted.length) * 100) : 0;
                return (
                    <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 6, background: B.g200, borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: `linear-gradient(90deg, ${B.bl}, ${B.pk})`, borderRadius: 3, transition: 'width 0.3s' }} />
                        </div>
                        <div style={{ fontSize: 9, fontWeight: 700, color: B.g400, fontFamily: F, whiteSpace: 'nowrap' }}>{assessed.length}/{submitted.length} assessed</div>
                    </div>
                );
            })()}

            {/* ── Player Cards ── */}
            {(() => {
                const filteredSorted = players.filter(p => p.submitted).filter(p => {
                    if (rosterSearch && !p.name?.toLowerCase().includes(rosterSearch.toLowerCase())) return false;
                    if (rosterFilter === 'assessed') return Object.keys(p.cd || {}).some(k => k.startsWith('t1_'));
                    if (rosterFilter === 'unassessed') return !Object.keys(p.cd || {}).some(k => k.startsWith('t1_'));
                    if (rosterFilter.startsWith('role-')) return p.role === rosterFilter.replace('role-', '');
                    return true;
                }).sort((a, b) => {
                    if (rosterSort === 'name') return (a.name || '').localeCompare(b.name || '');
                    if (rosterSort === 'assessed') return (rosterScores[b.id]?.hasCd ? 1 : 0) - (rosterScores[a.id]?.hasCd ? 1 : 0);
                    if (rosterSort === 'pdi-desc') return (rosterScores[b.id]?.dn?.pdi || 0) - (rosterScores[a.id]?.dn?.pdi || 0);
                    if (rosterSort === 'ccm-desc') return (rosterScores[b.id]?.ccmR?.ccm || 0) - (rosterScores[a.id]?.ccmR?.ccm || 0);
                    return 0;
                });

                // ── Render a single player card ──
                const renderCard = (p) => {
                    const { ccmR, dn, hasCd, hasSelf, hasData, overallScore } = rosterScores[p.id] || {};
                    const a = getAge(p.dob), br = getBracket(p.dob), ro = ROLES.find(r => r.id === p.role);
                    const ini = p.name ? p.name.split(" ").map(w => w[0]).join("").slice(0, 2) : "?";
                    return (<div key={p.id} style={{ ...sCard, cursor: "pointer", display: "flex", gap: 10 }} onClick={() => { setSelP(p.id); setCView("survey"); goTop(); }}>
                        <div style={{ width: 40, height: 40, borderRadius: "50%", ...sGrad, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <span style={{ color: B.w, fontSize: 13, fontWeight: 800, fontFamily: F }}>{ini}</span>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div style={{ fontSize: 13, fontWeight: 700, color: B.nvD, fontFamily: F }}>{p.name}</div>
                                <div style={{ display: "flex", gap: 4 }}>
                                    {overallScore !== null && <div style={{ padding: "1px 6px", borderRadius: 3, fontSize: 9, fontWeight: 800, fontFamily: F, background: `linear-gradient(135deg,${B.bl}20,${B.pk}20)`, color: B.nvD, border: `1px solid ${B.g200}` }}>⭐ {overallScore}</div>}
                                    {dn && <div style={{ padding: "1px 6px", borderRadius: 3, fontSize: 9, fontWeight: 800, fontFamily: F, background: `${dn.gc}20`, color: dn.gc }}>PDI {dn.pdi.toFixed(1)}</div>}
                                    {ccmR?.ccm > 0 && <div style={{ padding: "1px 6px", borderRadius: 3, fontSize: 9, fontWeight: 800, fontFamily: F, background: `${B.bl}20`, color: B.bl }}>CCM {ccmR.ccm.toFixed(2)}</div>}
                                    {dn?.trajectory && <div style={{ padding: "1px 6px", borderRadius: 3, fontSize: 9, fontWeight: 800, fontFamily: F, background: `${B.grn}20`, color: B.grn }}>🚀</div>}
                                </div>
                            </div>
                            <div style={{ fontSize: 10, color: B.g400, fontFamily: F, marginTop: 1 }}>{a}yo • {br} • {ro?.sh || "?"} • {p.club}</div>
                            <div style={{ fontSize: 9, color: B.g400, fontFamily: F, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <span>{p.grades?.length || 0} competition level(s) • {hasCd ? "Coach assessed" : hasSelf ? "Self-assessed" : "Awaiting"}{dn?.provisional && hasSelf ? " (provisional)" : ""}</span>
                                {isAdmin && <button onClick={(e) => handleReopenProfile(e, p.id, p.name)} style={{ padding: "2px 8px", borderRadius: 4, border: `1px solid ${B.g200}`, background: "transparent", fontSize: 8, fontWeight: 700, color: B.g400, cursor: "pointer", fontFamily: F, textTransform: "uppercase", letterSpacing: .3 }}>Reopen</button>}
                            </div>
                        </div>
                    </div>);
                };

                if (loading) return <div style={{ textAlign: 'center', padding: '24px 0', color: B.g400, fontSize: 11, fontFamily: F }}>Loading players...</div>;
                if (filteredSorted.length === 0) return <div style={{ textAlign: 'center', padding: '24px 0', color: B.g400, fontSize: 11, fontFamily: F }}>No submitted players yet. Players will appear here once they complete onboarding.</div>;

                // ── SESSION GROUPED VIEW — reads from sp_squads (DB source of truth) ──
                if (groupBySession) {
                    const activeRoster = rosterWeek === 'gameSense' ? dbRosters.gameSenseWeek : dbRosters.skillWeek;
                    const lookup = buildRosterLookup(activeRoster);
                    const buckets = activeRoster.filter(g => g.playerNames.length > 0).map(g => ({
                        group: { id: g.id, label: g.label, color: g.color },
                        players: filteredSorted.filter(p => matchPlayerToSquad(lookup, activeRoster, p.name) === g.id),
                    })).filter(b => b.players.length > 0);
                    const assignedIds = new Set(buckets.flatMap(b => b.players.map(p => p.id)));
                    const ungrouped = filteredSorted.filter(p => !assignedIds.has(p.id));

                    return (<div>
                        {buckets.map(({ group: g, players: gPlayers }) => {
                            const assessed = gPlayers.filter(p => rosterScores[p.id]?.hasCd);
                            return (<div key={g.id} style={{ marginBottom: 16 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, padding: '8px 12px', background: `${g.color}08`, borderRadius: 10, border: `1.5px solid ${g.color}25` }}>
                                    <div style={{ width: 6, height: 28, borderRadius: 3, background: g.color, flexShrink: 0 }} />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: 12, fontWeight: 800, color: g.color, fontFamily: F, letterSpacing: 0.5 }}>{g.label}</div>
                                        <div style={{ fontSize: 9, color: B.g400, fontFamily: F, marginTop: 1 }}>{gPlayers.length} player{gPlayers.length !== 1 ? 's' : ''} • {assessed.length} assessed</div>
                                    </div>
                                    <div style={{ fontSize: 18, fontWeight: 900, color: g.color, fontFamily: F, opacity: 0.3 }}>{gPlayers.length}</div>
                                </div>
                                <div style={isDesktop() ? { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 } : {}}>
                                    {gPlayers.map(renderCard)}
                                </div>
                            </div>);
                        })}
                        {ungrouped.length > 0 && (<div style={{ marginBottom: 16 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, padding: '8px 12px', background: `${B.g400}08`, borderRadius: 10, border: `1.5px solid ${B.g200}` }}>
                                <div style={{ width: 6, height: 28, borderRadius: 3, background: B.g400, flexShrink: 0 }} />
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 12, fontWeight: 800, color: B.g400, fontFamily: F, letterSpacing: 0.5 }}>UNGROUPED</div>
                                    <div style={{ fontSize: 9, color: B.g400, fontFamily: F, marginTop: 1 }}>{ungrouped.length} player{ungrouped.length !== 1 ? 's' : ''} • Not yet matched to a session</div>
                                </div>
                            </div>
                            <div style={isDesktop() ? { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 } : {}}>
                                {ungrouped.map(renderCard)}
                            </div>
                        </div>)}
                    </div>);
                }

                // ── FLAT VIEW (original) ──
                return (<div style={isDesktop() ? { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 } : {}}>
                    {filteredSorted.map(renderCard)}
                </div>);
            })()}
        </div>
        <CoachNavBar active="list" onNavigate={handleNav} isAdmin={isAdmin} />
    </div>);

    // ═══ ACCOUNTS PANEL (admin only) ═══
    if (cView === "accounts" && isAdmin) {
        const handleReset = async (member) => {
            if (!confirm(`Reset password for ${member.display_name || member.username}? This will generate a new password immediately.`)) return;
            setResettingId(member.auth_user_id);
            setResetResult(null);
            try {
                const result = await resetUserPassword(member.auth_user_id, member.username);
                setResetResult({ username: result.username, new_password: result.new_password });
                // Refresh accounts list to show updated password
                const updated = await loadProgramMembers();
                setAccounts(updated);
            } catch (err) {
                alert(`Reset failed: ${err.message}`);
            } finally {
                setResettingId(null);
            }
        };

        const playerAccounts = accounts.filter(a => a.role === 'player');
        const coachAccounts = accounts.filter(a => a.role === 'coach');
        const adminAccounts = accounts.filter(a => ['admin', 'super_admin'].includes(a.role));

        // AccountRow and SectionLabel extracted to module-level (see top of file)

        return (<div style={{ minHeight: "100vh", fontFamily: F, background: B.g50 }}>
            <Hdr label="ADMIN — ACCOUNTS" onLogoClick={signOut} />
            <div style={{ padding: '4px 12px', background: B.g100, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button onClick={() => setCView("list")} style={{ fontSize: 10, fontWeight: 600, color: B.bl, background: 'none', border: 'none', cursor: 'pointer', fontFamily: F }}>← Back to Roster</button>
                <button onClick={signOut} style={{ fontSize: 9, fontWeight: 600, color: B.red, background: 'none', border: 'none', cursor: 'pointer', fontFamily: F }}>Sign Out</button>
            </div>

            <div style={{ padding: 12, ...getDkWrap() }}>
                {/* Reset result banner */}
                {resetResult && <div style={{ ...sCard, background: `${B.grn}12`, border: `2px solid ${B.grn}40`, marginBottom: 12, padding: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: B.grn, fontFamily: F, marginBottom: 4 }}>✓ Password Reset Successful</div>
                    <div style={{ fontSize: 10, color: B.nvD, fontFamily: F }}>
                        Username: <span style={{ fontWeight: 700 }}>@{resetResult.username}</span>
                    </div>
                    <div style={{ fontSize: 10, color: B.nvD, fontFamily: F, marginTop: 2 }}>
                        New Password: <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 14, color: B.pk, background: B.g100, padding: '2px 8px', borderRadius: 4 }}>{resetResult.new_password}</span>
                    </div>
                    <div style={{ fontSize: 9, color: B.g400, fontFamily: F, marginTop: 6 }}>Give this to the player/coach. They can log in with it immediately.</div>
                    <button onClick={() => setResetResult(null)} style={{ marginTop: 8, fontSize: 9, fontWeight: 600, color: B.g400, background: 'none', border: `1px solid ${B.g200}`, borderRadius: 4, padding: '3px 10px', cursor: 'pointer', fontFamily: F }}>Dismiss</button>
                </div>}

                {accountsLoading && <div style={{ textAlign: 'center', padding: '24px 0', color: B.g400, fontSize: 11, fontFamily: F }}>Loading accounts...</div>}

                {!accountsLoading && <>
                    <div style={{ fontSize: 9, color: B.g400, fontFamily: F, marginBottom: 6 }}>{accounts.length} total accounts</div>

                    {adminAccounts.length > 0 && <>
                        <SectionLabel label="ADMIN" count={adminAccounts.length} color={B.prp} />
                        {adminAccounts.map(m => <AccountRow key={m.id} m={m} resettingId={resettingId} handleReset={handleReset} />)}
                    </>}

                    {coachAccounts.length > 0 && <>
                        <SectionLabel label="COACHES" count={coachAccounts.length} color={B.pk} />
                        {coachAccounts.map(m => <AccountRow key={m.id} m={m} resettingId={resettingId} handleReset={handleReset} />)}
                    </>}

                    {playerAccounts.length > 0 && <>
                        <SectionLabel label="PLAYERS" count={playerAccounts.length} color={B.bl} />
                        {playerAccounts.map(m => <AccountRow key={m.id} m={m} resettingId={resettingId} handleReset={handleReset} />)}
                    </>}

                    {accounts.length === 0 && <div style={{ textAlign: 'center', padding: '24px 0', color: B.g400, fontSize: 11, fontFamily: F }}>No accounts found.</div>}
                </>}

                <button onClick={() => setCView("list")} style={{ ...sCard, textAlign: 'center', cursor: 'pointer', marginTop: 12, fontSize: 11, fontWeight: 600, color: B.bl, fontFamily: F, border: `1px solid ${B.bl}30` }}>← Back to Player Roster</button>
            </div>
        </div>);
    }

    // ═══ SURVEY VIEW ═══
    if (cView === "survey" && sp) {
        const ccmR = calcCCM(sp.grades, sp.dob, compTiers, engineConst);
        const a = getAge(sp.dob), br = getBracket(sp.dob), ro = ROLES.find(r => r.id === sp.role);

        return (<div style={{ minHeight: "100vh", fontFamily: F, background: B.g50 }}>
            <Hdr label="COACH PORTAL" onLogoClick={signOut} />
            <div style={{ padding: 12, ...getDkWrap() }}>
                <div style={{ background: `linear-gradient(135deg,${B.nvD},${B.nv})`, borderRadius: 14, padding: 16, marginBottom: 12, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 140 }}>
                        <div style={{ fontSize: 16, fontWeight: 800, color: B.w, fontFamily: F }}>{sp.name}</div>
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontFamily: F, marginTop: 2 }}>{a}yo • {br} • {ro?.label} • {sp.club}</div>
                        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontFamily: F, marginTop: 1 }}>{sp.bat} • {sp.bowl}</div>
                    </div>
                    {ccmR.ccm > 0 && <Ring value={Math.round(ccmR.ccm * 100)} size={70} color={B.bl} label="CCM" />}
                </div>

                <SecH title="Competition History" sub={`${sp.grades?.length || 0} competition level(s)`} />
                {(sp.grades || []).map((g, gi) => {
                    const gTier = (compTiers || []).find(t => t.code === g.level);
                    return (<div key={gi} style={{ ...sCard, borderLeft: `3px solid ${gi % 2 === 0 ? B.pk : B.bl}` }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: B.nvD, fontFamily: F }}>{gTier?.competition_name || g.level}</div>
                            <div style={{ padding: "1px 6px", borderRadius: 3, fontSize: 9, fontWeight: 800, background: `${B.pk}15`, color: B.pk, fontFamily: F }}>CTI {gTier?.cti_value || "—"}</div>
                        </div>
                        <div style={{ fontSize: 10, color: B.g400, fontFamily: F }}>{g.team} • {g.matches}m{g.format ? ` • ${g.format}` : ""}</div>
                        <div style={{ display: "flex", gap: 12, marginTop: 6, flexWrap: "wrap" }}>
                            {+g.runs > 0 && <div style={{ fontSize: 10, fontFamily: F }}><span style={{ color: B.pk, fontWeight: 700 }}>BAT</span> <span style={{ color: B.g600 }}>{+g.batInn > 0 ? `${g.batInn}inn ` : ""}{g.runs}r{+g.notOuts > 0 ? ` ${g.notOuts}no` : ""} HS {g.hs}{+g.hsBallsFaced > 0 ? `(${g.hsBallsFaced}bf ${g.hsBoundaries || 0}bdy)` : ""} @ {g.avg}{+g.ballsFaced > 0 ? ` BF ${g.ballsFaced}` : ""}</span></div>}
                            {+g.overs > 0 && <div style={{ fontSize: 10, fontFamily: F }}><span style={{ color: B.bl, fontWeight: 700 }}>BOWL</span> <span style={{ color: B.g600 }}>{+g.bowlInn > 0 ? `${g.bowlInn}inn ` : ""}{g.wkts}w SR {g.sr} Avg {g.bAvg} Ec {g.econ}{+g.bestBowlWkts > 0 ? ` BB ${g.bestBowlWkts}/${g.bestBowlRuns}` : ""}</span></div>}
                            {(+g.ct > 0 || +g.st > 0 || +g.keeperCatches > 0) && <div style={{ fontSize: 10, fontFamily: F }}><span style={{ color: B.nv, fontWeight: 700 }}>FIELD</span> <span style={{ color: B.g600 }}>{g.ct || 0}ct {+g.ro > 0 ? `${g.ro}ro ` : ""}{+g.st > 0 ? `${g.st}st ` : ""}{+g.keeperCatches > 0 ? `${g.keeperCatches}kpct` : ""}</span></div>}
                        </div>
                    </div>);
                })}

                {/* ═══ TOP PERFORMANCES ═══ */}
                {((sp.topBat && sp.topBat.length > 0) || (sp.topBowl && sp.topBowl.length > 0)) && <>
                    <SecH title="Top Performances" sub="Best individual innings and bowling figures" />
                    {sp.topBat && sp.topBat.filter(b => +b.runs > 0).length > 0 && <div style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: 10, fontWeight: 800, color: B.pk, fontFamily: F, marginBottom: 4 }}>🏏 BATTING</div>
                        {sp.topBat.filter(b => +b.runs > 0).map((b, i) => (
                            <div key={i} style={{ ...sCard, borderLeft: `3px solid ${B.pk}`, padding: "8px 10px", marginBottom: 4 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <div style={{ fontSize: 14, fontWeight: 900, color: B.nvD, fontFamily: F }}>{b.runs}{b.notOut ? '*' : ''}<span style={{ fontSize: 10, fontWeight: 400, color: B.g400 }}> ({b.balls}b, {b.fours}×4, {b.sixes}×6)</span></div>
                                    {+b.balls > 0 && <div style={{ fontSize: 10, fontWeight: 700, color: B.pk, fontFamily: F }}>SR {((+b.runs / +b.balls) * 100).toFixed(1)}</div>}
                                </div>
                                <div style={{ fontSize: 9, color: B.g400, fontFamily: F, marginTop: 2 }}>{b.comp}{b.vs ? ` vs ${b.vs}` : ''}{b.format ? ` • ${b.format}` : ''}</div>
                            </div>
                        ))}
                    </div>}
                    {sp.topBowl && sp.topBowl.filter(b => +b.wkts > 0 || +b.runs > 0).length > 0 && <div style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: 10, fontWeight: 800, color: B.bl, fontFamily: F, marginBottom: 4 }}>🎯 BOWLING</div>
                        {sp.topBowl.filter(b => +b.wkts > 0 || +b.runs > 0).map((b, i) => (
                            <div key={i} style={{ ...sCard, borderLeft: `3px solid ${B.bl}`, padding: "8px 10px", marginBottom: 4 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <div style={{ fontSize: 14, fontWeight: 900, color: B.nvD, fontFamily: F }}>{b.wkts}/{b.runs}<span style={{ fontSize: 10, fontWeight: 400, color: B.g400 }}> ({b.overs}ov{+b.maidens > 0 ? `, ${b.maidens}m` : ''})</span></div>
                                    {+b.overs > 0 && <div style={{ fontSize: 10, fontWeight: 700, color: B.bl, fontFamily: F }}>Econ {(+b.runs / +b.overs).toFixed(1)}</div>}
                                </div>
                                <div style={{ fontSize: 9, color: B.g400, fontFamily: F, marginTop: 2 }}>{b.comp}{b.vs ? ` vs ${b.vs}` : ''}{b.format ? ` • ${b.format}` : ''}</div>
                            </div>
                        ))}
                    </div>}
                </>}

                <SecH title="Player Voice" />
                <div style={sCard}>{VOICE_QS.map((q, i) => (<div key={i} style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: B.g400, fontFamily: F }}>{q}</div>
                    <div style={{ fontSize: 12, color: B.g800, fontFamily: F, marginTop: 1 }}>{sp.voice?.[i] || "—"}</div>
                </div>))}</div>

                <SecH title="Medical & Goals" />
                <div style={sCard}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: B.g400, fontFamily: F }}>Injury</div>
                    <div style={{ fontSize: 12, color: B.g800, fontFamily: F, marginBottom: 8 }}>{sp.injury || "None"}</div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: B.g400, fontFamily: F }}>Goals</div>
                    <div style={{ fontSize: 12, color: B.g800, fontFamily: F }}>{sp.goals || "—"}</div>
                </div>

                <button onClick={() => { currentPlayerIdRef.current = sp.id; setCView("assess"); setCPage(0); goTop(); }} style={btnSty(true, true)}>BEGIN ASSESSMENT →</button>
                <button onClick={() => { setCView("list"); setSelP(null); }} style={backBtn}>← Back to roster</button>
            </div>
        </div>);
    }

    // ═══ ASSESSMENT PAGES ═══
    if (cView === "assess" && sp) {
        // Recover any unsaved draft from localStorage (e.g. after tab crash / accidental close)
        let cd = sp.cd || {};
        try {
            const draft = localStorage.getItem(`rra_draft_${sp.id}`);
            if (draft) {
                const parsed = JSON.parse(draft);
                // Merge draft over existing — draft is newer
                cd = { ...cd, ...parsed };
                // Remove the draft now that it's loaded
                localStorage.removeItem(`rra_draft_${sp.id}`);
            }
        } catch {}
        // Inject player voice data for persistence
        if (sp.self_ratings && Object.keys(sp.self_ratings).length > 0 && !cd._playerVoice) {
            cd._playerVoice = sp.self_ratings;
        }
        pendingCdRef.current = cd;
        currentPlayerIdRef.current = sp.id; // for emergency save in beforeunload

        // ── Compute and inject derived scores into cd before save ──
        // Accepts a snapshot of player data to avoid stale closure over sp
        const enrichCdWithScores = (currentCd, playerSnap) => {
            try {
                const ccm = calcCCM(playerSnap.grades, playerSnap.dob, compTiers, engineConst);
                const dnResult = calcPDI({ ...currentCd, _dob: playerSnap.dob }, playerSnap.self_ratings, playerSnap.role, ccm, dbWeights, engineConst, playerSnap.grades, {}, playerSnap.topBat, playerSnap.topBowl, compTiers);

                if (dnResult && dnResult.pdi > 0) {
                    const pathS = dnResult.pdiPct;
                    const cohortS = calcCohortPercentile(dnResult.pdi, players, compTiers, dbWeights, engineConst);
                    const ageS = calcAgeScore(ccm.arm, engineConst);
                    currentCd._overallRating = Math.round((pathS + cohortS + ageS) / 3);

                    // Batting domain score
                    const batDomain = dnResult.domains.find(d => d.k === 'tech_primary' || d.l === 'Technical');
                    currentCd._overallBatting = batDomain ? Math.round(batDomain.s100) : null;

                    // Batting qualities breakdown
                    const secDomain = dnResult.domains.find(d => d.k === 'tech_secondary');
                    currentCd._battingQualities = {
                        technique: Math.round(batDomain?.s100 || 0),
                        secondary: Math.round(secDomain?.s100 || 0),
                        phases: Object.fromEntries(
                            ['pb_pp', 'pb_mid', 'pb_death'].filter(k => currentCd[k]).map(k => [k, currentCd[k]])
                        )
                    };
                } else {
                    currentCd._overallRating = null;
                    currentCd._overallBatting = null;
                    currentCd._battingQualities = null;
                }

                // Inject player voice (self-perception matchup data) for DB persistence
                const sr = playerSnap.self_ratings || {};
                const mcKeys = Object.keys(sr).filter(k => k.startsWith('mc_'));
                if (mcKeys.length > 0) {
                    currentCd._playerVoice = Object.fromEntries(mcKeys.map(k => [k, sr[k]]));
                }
            } catch (e) {
                console.warn('Score enrichment failed (non-blocking):', e.message);
            }
            return currentCd;
        };

        // ── Session gating: derive from the roster toggle ──
        // 'skill' = weekday (Skill Week / WD1-4), 'gameSense' = weekend (Game Sense / WE1-4)
        const activeSession = rosterWeek === 'gameSense' ? 'weekend' : 'weekday';

        const cU = (k, v) => {
            // Capture player identity + data at call time to prevent stale closure
            const playerId = sp.id;
            const playerSnap = { grades: sp.grades, dob: sp.dob, self_ratings: sp.self_ratings, role: sp.role, topBat: sp.topBat, topBowl: sp.topBowl };
            const savingSession = activeSession;

            setPlayers(ps => ps.map(p => p.id === playerId ? { ...p, cd: { ...p.cd, [k]: v } } : p));
            pendingCdRef.current = { ...pendingCdRef.current, [k]: v };
            if (saveTimer.current) clearTimeout(saveTimer.current);
            saveTimer.current = setTimeout(async () => {
                saveStatusHook.setSaving();
                retryCount.current = 0;
                // Enrich with computed scores before saving — uses captured playerSnap
                const enrichedCd = enrichCdWithScores({ ...pendingCdRef.current }, playerSnap);
                let lastRetryLog = 0;
                const doSave = async () => {
                    try {
                        await saveAssessmentToDB(playerId, enrichedCd, { session: savingSession });
                        saveStatusHook.setSaved();
                        retryCount.current = 0;
                        try { localStorage.removeItem(`rra_draft_${playerId}`); } catch { }
                    } catch (err) {
                        retryCount.current++;
                        // Rate-limit console output to avoid flooding during repeated failures
                        const now = Date.now();
                        if (now - lastRetryLog > 5000) {
                            console.warn(`Save retry ${retryCount.current}/3:`, err.message);
                            lastRetryLog = now;
                        }
                        if (retryCount.current <= 3) {
                            saveStatusHook.setError(`Retrying (${retryCount.current}/3)…`);
                            setTimeout(doSave, 1000 * Math.pow(2, retryCount.current - 1));
                        } else {
                            try { localStorage.setItem(`rra_draft_${playerId}`, JSON.stringify(pendingCdRef.current)); } catch { }
                            saveStatusHook.setOffline();
                        }
                    }
                };
                doSave();
            }, 2000);
        };

        const t = techItems(sp.role);
        const ccmR = calcCCM(sp.grades, sp.dob, compTiers, engineConst);
        const dn = calcPDI({ ...cd, _dob: sp.dob }, sp.self_ratings, sp.role, ccmR, dbWeights, engineConst, sp.grades, {}, sp.topBat, sp.topBowl, compTiers);
        const pgN = ["Identity", "Technical", "Tactical/Mental/Physical", "PDI Summary"];

        const hasBowling = ['pace', 'spin', 'allrounder', 'bowlrounder'].includes(sp.role);
        const sr = sp.self_ratings || {};
        const hasMC = Object.keys(sr).some(k => k.startsWith('mc_'));

        const renderAP = () => {
            if (cPage === 0) return (<div style={{ padding: "0 12px 16px", ...getDkWrap() }}>
                <ConfidenceSummary sr={sr} hasMC={hasMC} hasBowling={hasBowling} />
                <SecH title="Batting Archetype" sub="Select the one archetype that best describes this player's batting identity" />
                {sp.playerBatArch && <div style={{ background: `${B.pk}08`, border: `1px solid ${B.pk}30`, borderRadius: 8, padding: '8px 12px', marginBottom: 8 }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: B.pk, fontFamily: F, letterSpacing: 0.5 }}>PLAYER SELF-ID: {BAT_ARCH.find(a => a.id === sp.playerBatArch)?.nm || sp.playerBatArch}{sp.playerBatArchSecondary ? ` + ${BAT_ARCH.find(a => a.id === sp.playerBatArchSecondary)?.nm || sp.playerBatArchSecondary}` : ''}</div>
                </div>}
                <div style={{ display: "grid", gap: 6, ...(isDesktop() ? { gridTemplateColumns: 'repeat(2, 1fr)' } : {}) }}>{BAT_ARCH.map(a => (<div key={a.id} onClick={() => cU("batA", a.id)}
                    style={{ background: cd.batA === a.id ? B.pkL : B.w, border: `2px solid ${cd.batA === a.id ? a.c : B.g200}`, borderLeft: `4px solid ${a.c}`, borderRadius: 8, padding: 10, cursor: "pointer" }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: B.nvD, fontFamily: F }}>{a.nm}{sp.playerBatArch === a.id ? ' 👤' : ''}</div>
                    <div style={{ fontSize: 10, color: B.g600, fontFamily: F }}>{a.sub}</div>
                </div>))}</div>
                <SecH title="Bowling Archetype" sub="Select the one archetype that best describes this player's bowling identity" />
                {sp.playerBwlArch && <div style={{ background: `${B.bl}08`, border: `1px solid ${B.bl}30`, borderRadius: 8, padding: '8px 12px', marginBottom: 8 }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: B.bl, fontFamily: F, letterSpacing: 0.5 }}>PLAYER SELF-ID: {BWL_ARCH.find(a => a.id === sp.playerBwlArch)?.nm || sp.playerBwlArch}{sp.playerBwlArchSecondary ? ` + ${BWL_ARCH.find(a => a.id === sp.playerBwlArchSecondary)?.nm || sp.playerBwlArchSecondary}` : ''}</div>
                </div>}
                <div style={{ display: "grid", gap: 6, ...(isDesktop() ? { gridTemplateColumns: 'repeat(2, 1fr)' } : {}) }}>{BWL_ARCH.map(a => (<div key={a.id} onClick={() => cU("bwlA", a.id)}
                    style={{ background: cd.bwlA === a.id ? B.blL : B.w, border: `2px solid ${cd.bwlA === a.id ? a.c : B.g200}`, borderLeft: `4px solid ${a.c}`, borderRadius: 8, padding: 10, cursor: "pointer" }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: B.nvD, fontFamily: F }}>{a.nm}{sp.playerBwlArch === a.id ? ' 👤' : ''}</div>
                    <div style={{ fontSize: 10, color: B.g600, fontFamily: F }}>{a.sub}</div>
                </div>))}</div>
                <SecH title="Phase Effectiveness" />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, marginBottom: 6 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: B.pk, fontFamily: F }}>Batting</div>
                    <div style={{ fontSize: 9, color: B.g400, fontFamily: F }}>{PHASES.filter(p => cd[`pb_${p.id}`] > 0).length}/{PHASES.length} rated</div>
                </div>
                <AssGrid items={PHASES.map(p => p.nm)} values={Object.fromEntries(PHASES.map((p, i) => [`pb_${i}`, cd[`pb_${p.id}`]]))} onRate={(k, v) => { const idx = parseInt(k.split('_').pop()); cU(`pb_${PHASES[idx].id}`, v); }} color={B.pk} SKILL_DEFS={COACH_DEFS} keyPrefix="pb" activeSession={activeSession} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, marginBottom: 6 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: B.bl, fontFamily: F }}>Bowling</div>
                    <div style={{ fontSize: 9, color: B.g400, fontFamily: F }}>{PHASES.filter(p => cd[`pw_${p.id}`] > 0).length}/{PHASES.length} rated</div>
                </div>
                <AssGrid items={PHASES.map(p => p.nm)} values={Object.fromEntries(PHASES.map((p, i) => [`pw_${i}`, cd[`pw_${p.id}`]]))} onRate={(k, v) => { const idx = parseInt(k.split('_').pop()); cU(`pw_${PHASES[idx].id}`, v); }} color={B.bl} SKILL_DEFS={COACH_DEFS} keyPrefix="pw" activeSession={activeSession} />
            </div>);

            if (cPage === 1) return (<div style={{ padding: "0 12px 16px", ...getDkWrap() }}>
                <ConfidenceContext matchups={BAT_MATCHUPS} domain="bat" title="BATTING" color={B.pk} sr={sr} />
                {hasBowling && <ConfidenceContext matchups={BWL_MATCHUPS} domain="bwl" title="BOWLING" color={B.bl} sr={sr} />}
                <SecH title={t.pL} sub="Rate 1-5" />
                <div style={{ background: B.g100, borderRadius: 8, padding: '8px 12px', marginBottom: 10, lineHeight: 1.6 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: B.nvD, fontFamily: F, marginBottom: 4 }}>Standardised Rating Rubric</div>
                    <div style={{ fontSize: 10, color: B.g600, fontFamily: F }}>
                        <strong style={{ color: B.g800 }}>1 = Novice</strong> — Fundamental skill gaps. Needs direct instruction.<br />
                        <strong style={{ color: B.g800 }}>2 = Developing</strong> — Shows understanding but inconsistent execution.<br />
                        <strong style={{ color: B.g800 }}>3 = Competent</strong> — Reliable execution under moderate pressure.<br />
                        <strong style={{ color: B.g800 }}>4 = Advanced</strong> — Consistent execution under high pressure. Above-age-group standard.<br />
                        <strong style={{ color: B.g800 }}>5 = Elite</strong> — Exceptional. Pathway-ready or representative standard.
                    </div>
                    <div style={{ fontSize: 9, color: B.pk, fontFamily: F, marginTop: 4, fontWeight: 600 }}>Tap ⓘ next to each item for detailed scoring criteria.</div>
                </div>
                {activeSession === 'weekday' && sp.role !== 'pace' && sp.role !== 'spin' && sp.role !== 'bowlrounder' && (
                    <div style={{ background: `${B.bl}08`, border: `1px solid ${B.bl}25`, borderRadius: 8, padding: '8px 10px', marginBottom: 10 }}>
                        <div style={{ fontSize: 9, fontWeight: 800, color: B.bl, fontFamily: F, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 4 }}>🏏 Drill Lens · Weekday Session</div>
                        <div style={{ fontSize: 10, color: B.g600, fontFamily: F, lineHeight: 1.45 }}>
                            <strong style={{ color: B.g800 }}>Hour 1 · Technical Testing (3 Ball Drill):</strong> Spin feet/sweeps → <em>Playing Spin, Sweep &amp; Reverse Sweep</em>. Pace Full/Short → <em>Stance, Trigger, Front-Foot Drive, Back-Foot Play, Playing Pace</em>.<br/>
                            <strong style={{ color: B.g800 }}>Hour 1 · Problem Solving:</strong> 360 Drill, Opposite Hand Hitting, Must Go For 6 → <em>Power Hitting, Death-Over Hitting</em> + observable courage / curiosity / coachability.<br/>
                            <strong style={{ color: B.g800 }}>Hour 2 · Access &amp; Creativity (6 Balls 6 Zones):</strong> Zone range &amp; creativity — sharpens <em>Sweep &amp; Reverse Sweep, Power Hitting, Playing Spin</em>.<br/>
                            <strong style={{ color: B.g800 }}>Hour 2 · Hand Speed &amp; Length (Ping balls):</strong> Tracking genuine pace — feeds <em>Playing Pace, Back-Foot Play</em>.
                        </div>
                    </div>
                )}
                <div style={{ fontSize: 9, color: B.g400, fontFamily: F, marginBottom: 4, textAlign: 'right' }}>{t.pri.filter((_, i) => cd[`t1_${i}`] > 0).length}/{t.pri.length} rated</div>
                <AssGrid items={t.pri} values={cd} onRate={cU} color={B.pk} SKILL_DEFS={COACH_DEFS} keyPrefix="t1" activeSession={activeSession} />
                <SecH title={t.sL} />
                <div style={{ fontSize: 9, color: B.g400, fontFamily: F, marginBottom: 4, textAlign: 'right' }}>{t.sec.filter((_, i) => cd[`t2_${i}`] > 0).length}/{t.sec.length} rated</div>
                <AssGrid items={t.sec} values={cd} onRate={cU} color={B.bl} SKILL_DEFS={COACH_DEFS} keyPrefix="t2" activeSession={activeSession} />
            </div>);

            if (cPage === 2) return (<div style={{ padding: "0 12px 16px", ...getDkWrap() }}>
                <ConfidenceContext matchups={MENTAL_MATCHUPS} domain="mnt" title="MENTAL & CHARACTER" color={B.prp} sr={sr} />
                <SecH title="Game Intelligence" />
                <div style={{ fontSize: 9, color: B.g400, fontFamily: F, marginBottom: 4, textAlign: 'right' }}>{IQ_ITEMS.filter((_, i) => cd[`iq_${i}`] > 0).length}/{IQ_ITEMS.length} rated</div>
                <AssGrid items={IQ_ITEMS} values={cd} onRate={cU} color={B.sky} SKILL_DEFS={COACH_DEFS} keyPrefix="iq" activeSession={activeSession} />
                <SecH title="Mental & Character" sub="Royals Way aligned" />
                <div style={{ fontSize: 9, color: B.g400, fontFamily: F, marginBottom: 4, textAlign: 'right' }}>{MN_ITEMS.filter((_, i) => cd[`mn_${i}`] > 0).length}/{MN_ITEMS.length} rated</div>
                <AssGrid items={MN_ITEMS} values={cd} onRate={cU} color={B.prp} SKILL_DEFS={COACH_DEFS} keyPrefix="mn" activeSession={activeSession} />
                <SecH title="Physical & Athletic" />
                <div style={{ fontSize: 9, color: B.g400, fontFamily: F, marginBottom: 4, textAlign: 'right' }}>{(PH_MAP[sp.role] || PH_MAP.batter).filter((_, i) => cd[`ph_${i}`] > 0).length}/{(PH_MAP[sp.role] || PH_MAP.batter).length} rated</div>
                <AssGrid items={PH_MAP[sp.role] || PH_MAP.batter} values={cd} onRate={cU} color={B.nv} SKILL_DEFS={COACH_DEFS} keyPrefix="ph" activeSession={activeSession} />
                <SecH title="Athletic Fielding" sub="Universal across all roles" />
                <div style={{ fontSize: 9, color: B.g400, fontFamily: F, marginBottom: 4, textAlign: 'right' }}>{FLD_ITEMS.filter((_, i) => cd[`fld_${i}`] > 0).length}/{FLD_ITEMS.length} rated</div>
                <AssGrid items={FLD_ITEMS} values={cd} onRate={cU} color={B.grn} SKILL_DEFS={COACH_DEFS} keyPrefix="fld" activeSession={activeSession} />
            </div>);

            if (cPage === 3) {
                const pathwayScore = dn.pdiPct;
                const cohortScore = calcCohortPercentile(dn.pdi, players, compTiers, dbWeights, engineConst);
                const ageScore = calcAgeScore(ccmR.arm, engineConst);
                const overallScore = Math.round((pathwayScore + cohortScore + ageScore) / 3);
                const coreScores = [
                    { label: "Pathway", value: pathwayScore, color: B.pk, icon: "🛤️", sub: "vs. whole pathway" },
                    { label: "Cohort", value: cohortScore, color: B.bl, icon: "👥", sub: "vs. RRA players" },
                    { label: "Age", value: ageScore, color: B.prp, icon: "🎂", sub: "vs. age group" },
                    { label: "Overall", value: overallScore, color: B.grn, icon: "⭐", sub: "total average" },
                ];
                return (<div style={{ padding: "0 12px 16px", ...getDkWrap() }}>
                    <SecH title="Score Dashboard" sub="Coach-eyes only" />

                    {/* CORE SCORES */}
                    <div style={{ background: `linear-gradient(135deg,${B.nvD} 0%,${B.nv} 100%)`, borderRadius: 14, padding: 16, marginBottom: 12 }}>
                        <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.4)', fontFamily: F, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12, textAlign: 'center' }}>CORE SCORES</div>
                        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                            {coreScores.map(sc => (
                                <div key={sc.label} style={{ textAlign: 'center', minWidth: 70 }}>
                                    <Ring value={sc.value} size={sc.label === 'Overall' ? 80 : 68} color={sc.color} label={null} />
                                    <div style={{ fontSize: 9, fontWeight: 800, color: B.w, fontFamily: F, marginTop: 4 }}>{sc.icon} {sc.label}</div>
                                    <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.4)', fontFamily: F, marginTop: 1 }}>{sc.sub}</div>
                                </div>
                            ))}
                        </div>
                        <div style={{ textAlign: 'center', padding: '8px 0', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                            <div style={{ fontSize: 20, fontWeight: 900, color: B.w, fontFamily: F }}>{overallScore}<span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)' }}>/100</span></div>
                            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.5)', fontFamily: F, marginTop: 2 }}>OVERALL PLAYER SCORE</div>
                        </div>
                    </div>

                    {/* PDI DETAIL */}
                    <div style={{ background: `linear-gradient(135deg,${B.nvD},${B.nv})`, borderRadius: 14, padding: 16, marginBottom: 12 }}>
                        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
                            <Ring value={dn.pdiPct} size={90} color={dn.gc} label="PDI" />
                            <Ring value={Math.round(ccmR.ccm * 100)} size={70} color={B.bl} label="CCM" />
                            <div style={{ flex: 1, minWidth: 100 }}>
                                <div style={{ fontSize: 16, fontWeight: 800, color: dn.gc, fontFamily: F }}>{dn.g}</div>
                                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", fontFamily: F }}>{dn.tr}/{dn.ti} rated ({dn.cp}%){dn.provisional ? ' • Provisional' : ''}</div>
                                <div style={{ fontSize: 11, fontWeight: 700, color: B.w, fontFamily: F, marginTop: 4 }}>PDI: {dn.pdi.toFixed(2)} / 5.00</div>
                            </div>
                        </div>
                        {/* CCM Breakdown */}
                        <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 8, padding: 10, marginBottom: 6 }}>
                            <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.4)', fontFamily: F, marginBottom: 4 }}>CCM BREAKDOWN</div>
                            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                                <div><div style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', fontFamily: F }}>CTI</div><div style={{ fontSize: 14, fontWeight: 800, color: B.w, fontFamily: F }}>{ccmR.cti.toFixed(2)}</div></div>
                                <div><div style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', fontFamily: F }}>ARM</div><div style={{ fontSize: 14, fontWeight: 800, color: B.w, fontFamily: F }}>{ccmR.arm.toFixed(2)}</div></div>
                                <div><div style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', fontFamily: F }}>CCM</div><div style={{ fontSize: 14, fontWeight: 800, color: B.bl, fontFamily: F }}>{ccmR.ccm.toFixed(3)}</div></div>
                                {ccmR.code && <div><div style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', fontFamily: F }}>Top Comp</div><div style={{ fontSize: 10, fontWeight: 600, color: B.w, fontFamily: F }}>{ccmR.code}</div></div>}
                            </div>
                        </div>
                        {/* SAGI — dual layer */}
                        {dn.sagi !== null && <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 8, padding: 10, marginBottom: 6 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.4)', fontFamily: F }}>SELF-AWARENESS (SAGI)</div>
                                <div style={{ padding: '3px 8px', borderRadius: 4, fontSize: 10, fontWeight: 800, background: `${dn.sagiColor}20`, color: dn.sagiColor, fontFamily: F }}>{dn.sagiLabel}</div>
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                {dn.internalSAGI !== null && <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', borderRadius: 6, padding: '6px 8px' }}>
                                    <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.35)', fontFamily: F }}>Internal (Conf vs Freq)</div>
                                    <div style={{ fontSize: 14, fontWeight: 800, color: B.w, fontFamily: F }}>{dn.internalSAGI > 0 ? '+' : ''}{dn.internalSAGI.toFixed(2)}</div>
                                </div>}
                                {dn.crossSAGI !== null && <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', borderRadius: 6, padding: '6px 8px' }}>
                                    <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.35)', fontFamily: F }}>Cross-Layer (Player vs Coach)</div>
                                    <div style={{ fontSize: 14, fontWeight: 800, color: B.w, fontFamily: F }}>{dn.crossSAGI > 0 ? '+' : ''}{dn.crossSAGI.toFixed(2)}</div>
                                </div>}
                            </div>
                            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontFamily: F, marginTop: 4 }}>Combined: {dn.sagi > 0 ? '+' : ''}{dn.sagi.toFixed(2)}</div>
                        </div>}
                        {/* Trajectory */}
                        {dn.trajectory && <div style={{ background: `${B.grn}20`, borderRadius: 8, padding: 10, marginBottom: 6 }}>
                            <div style={{ fontSize: 11, fontWeight: 800, color: B.grn, fontFamily: F }}>🚀 TRAJECTORY FLAG</div>
                            <div style={{ fontSize: 10, color: B.grn, fontFamily: F, marginTop: 2 }}>Young for competition level with strong PDI — accelerated development candidate</div>
                        </div>}
                    </div>

                    {/* Domain bars */}
                    {dn.domains.map(d => (<div key={d.k} style={{ marginBottom: 6 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: B.g800, fontFamily: F }}>{d.l} <span style={{ fontSize: 8, color: B.g400 }}>×{Math.round(d.wt * 100)}%</span></span>
                            <span style={{ fontSize: 12, fontWeight: 800, color: d.r > 0 ? d.c : B.g400, fontFamily: F }}>{d.r > 0 ? Math.round(d.s100) : "—"}</span>
                        </div>
                        <div style={{ height: 5, borderRadius: 3, background: B.g100 }}>
                            <div style={{ height: "100%", borderRadius: 3, background: d.r > 0 ? d.c : "transparent", width: `${d.s100}%`, transition: "width 0.8s" }} />
                        </div>
                    </div>))}

                    {/* AI Generation Button */}
                    <button disabled={sp._aiGenerating} onClick={async () => {
                        setPlayers(ps => ps.map(p => p.id === sp.id ? { ...p, _aiGenerating: true } : p));
                        try {
                            const payload = {
                                player: { name: sp.name, dob: sp.dob, club: sp.club, association: sp.assoc, role: sp.role, gender: sp.gender, batting_hand: sp.bat, bowling_type: sp.bowl, height_cm: sp.heightCm, batting_position: sp.batPosition },
                                grades: (sp.grades || []).map(g => ({ level: g.level, matches: g.matches, runs: g.runs, batting_avg: g.avg, wickets: g.wkts, bowling_avg: g.bAvg })),
                                selfRatings: sp.self_ratings || {},
                                coachRatings: cd,
                                archetype: { batting: cd.batA || sp.playerBatArch, bowling: cd.bwlA || sp.playerBwlArch },
                                engine: { pdi: dn.pdi, grade: dn.g, domains: dn.domains.map(d => ({ label: d.l, score: Math.round(d.s100) })) },
                                phaseScores: { pb_pp: cd.pb_pp, pb_mid: cd.pb_mid, pb_death: cd.pb_death, pw_pp: cd.pw_pp, pw_mid: cd.pw_mid, pw_death: cd.pw_death },
                            };
                            const ai = await generateDNAReport(payload);
                            if (ai.narrative) cU("narrative", ai.narrative);
                            if (ai.str1) cU("str1", ai.str1);
                            if (ai.str2) cU("str2", ai.str2);
                            if (ai.str3) cU("str3", ai.str3);
                            if (ai.pri1) cU("pri1", ai.pri1);
                            if (ai.pri2) cU("pri2", ai.pri2);
                            if (ai.pri3) cU("pri3", ai.pri3);
                            if (ai.pl_explore) cU("pl_explore", ai.pl_explore);
                            if (ai.pl_challenge) cU("pl_challenge", ai.pl_challenge);
                            if (ai.pl_execute) cU("pl_execute", ai.pl_execute);
                            if (ai.sqRec) cU("sqRec", ai.sqRec);
                        } catch (e) {
                            console.error('AI generation error:', e);
                            saveStatusHook.setError('AI generation failed — try again');
                        } finally {
                            setPlayers(ps => ps.map(p => p.id === sp.id ? { ...p, _aiGenerating: false } : p));
                        }
                    }} style={{ width: '100%', padding: '10px 16px', borderRadius: 8, border: `1.5px solid ${B.bl}`, background: sp._aiGenerating ? B.g100 : `${B.bl}08`, color: B.bl, fontSize: 12, fontWeight: 700, fontFamily: F, cursor: sp._aiGenerating ? 'default' : 'pointer', marginBottom: 12, transition: 'all 0.2s' }}>
                        {sp._aiGenerating ? '🔄 Generating with AI...' : '✨ Generate All with AI'}
                    </button>

                    <SecH title="DNA Narrative" sub="Archetype, phase fit, character, ceiling" />
                    <TArea value={cd.narrative} onChange={v => cU("narrative", v)} ph="Who is this player right now?" rows={3} />
                    <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                        <div style={{ flex: 1 }}>
                            <SecH title="Strengths" />
                            <div style={{ background: B.pkL, borderRadius: 6, padding: 8 }}>{[1, 2, 3].map(n => <Inp key={n} label={`${n}.`} value={cd[`str${n}`]} onChange={v => cU(`str${n}`, v)} />)}</div>
                        </div>
                        <div style={{ flex: 1 }}>
                            <SecH title="Priorities" />
                            <div style={{ background: B.blL, borderRadius: 6, padding: 8 }}>{[1, 2, 3].map(n => <Inp key={n} label={`${n}.`} value={cd[`pri${n}`]} onChange={v => cU(`pri${n}`, v)} />)}</div>
                        </div>
                    </div>

                    <SecH title="12-Week Plan" />
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 8 }}>
                        {[{ k: "explore", l: "EXPLORE (1-4)", c: B.pk }, { k: "challenge", l: "CHALLENGE (5-8)", c: B.bl }, { k: "execute", l: "EXECUTE (9-12)", c: B.nvD }].map(ph => (
                            <div key={ph.k} style={{ background: B.g100, borderRadius: 6, padding: 8, borderTop: `3px solid ${ph.c}` }}>
                                <div style={{ fontSize: 10, fontWeight: 800, color: ph.c, fontFamily: F, marginBottom: 3 }}>{ph.l}</div>
                                <TArea value={cd[`pl_${ph.k}`]} onChange={v => cU(`pl_${ph.k}`, v)} ph="Focus..." rows={2} />
                            </div>
                        ))}
                    </div>

                    <SecH title="Squad Recommendation" />
                    <Inp value={cd.sqRec} onChange={v => cU("sqRec", v)} ph="e.g. Squad 3 — U14/U16 advanced" />
                </div>);
            }
            return null;
        };

        const ro = ROLES.find(r => r.id === sp.role);
        const ini = sp.name ? sp.name.split(" ").map(w => w[0]).join("").slice(0, 2) : "?";

        return (<div style={{ minHeight: "100vh", fontFamily: F, background: B.g50 }}>
            <Hdr label="COACH PORTAL" onLogoClick={signOut} />
            <SaveToast status={saveStatusHook.status} message={saveStatusHook.message} />
            {showGuide && <Suspense fallback={null}><EngineGuide onClose={() => setShowGuide(false)} /></Suspense>}
            {/* Player nav bar with prev/next */}
            {(() => {
                const submitted = players.filter(p => p.submitted);
                const currentIdx = submitted.findIndex(p => p.id === sp.id);
                const prevP = currentIdx > 0 ? submitted[currentIdx - 1] : null;
                const nextP = currentIdx < submitted.length - 1 ? submitted[currentIdx + 1] : null;
                return (<>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", background: B.w, borderBottom: `1px solid ${B.g200}` }}>
                        <button disabled={!prevP} onClick={() => { if (prevP) { setSelP(prevP.id); setCPage(0); goTop(); } }}
                            style={{ width: 28, height: 28, borderRadius: '50%', border: `1px solid ${prevP ? B.g200 : 'transparent'}`, background: 'transparent', color: prevP ? B.g600 : B.g200, fontSize: 14, cursor: prevP ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, flexShrink: 0 }}>←</button>
                        <div style={{ width: 30, height: 30, borderRadius: "50%", ...sGrad, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <span style={{ color: B.w, fontSize: 11, fontWeight: 800, fontFamily: F }}>{ini}</span>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: B.nvD, fontFamily: F }}>{sp.name}</div>
                            <div style={{ fontSize: 9, color: B.g400, fontFamily: F }}>{ro?.label} • {sp.club} • {currentIdx + 1}/{submitted.length}</div>
                        </div>
                        <button onClick={() => setShowGuide(true)} style={{ width: 28, height: 28, borderRadius: '50%', border: `1.5px solid ${B.bl}`, background: `${B.bl}10`, color: B.bl, fontSize: 13, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F, padding: 0, flexShrink: 0 }} title="How the engine works">ⓘ</button>
                        <button onClick={() => setCView("survey")} style={{ fontSize: 9, fontWeight: 600, color: B.bl, background: "none", border: `1px solid ${B.bl}`, borderRadius: 4, padding: "3px 6px", cursor: "pointer", fontFamily: F }}>Survey</button>
                        <SaveStatusBar status={saveStatusHook.status} message={saveStatusHook.message} />
                        <button disabled={!nextP} onClick={() => { if (nextP) { setSelP(nextP.id); setCPage(0); goTop(); } }}
                            style={{ width: 28, height: 28, borderRadius: '50%', border: `1px solid ${nextP ? B.g200 : 'transparent'}`, background: 'transparent', color: nextP ? B.g600 : B.g200, fontSize: 14, cursor: nextP ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, flexShrink: 0 }}>→</button>
                    </div>
                    <div style={{ padding: '4px 12px', background: B.g50, borderBottom: `1px solid ${B.g100}`, display: 'flex', justifyContent: 'center' }}>
                        <button onClick={() => {
                            if (saveStatusHook.status === 'saving' || saveStatusHook.status === 'error') {
                                if (!confirm('Changes are still saving. Leave anyway?')) return;
                            }
                            setCView("list"); setSelP(null); goTop();
                        }}
                            style={{ fontSize: 9, fontWeight: 600, color: B.bl, background: 'none', border: 'none', cursor: 'pointer', fontFamily: F, textDecoration: 'underline' }}>← Back to Roster</button>
                    </div>
                </>);
            })()}

            <div style={{ padding: isDesktop() ? '8px 16px' : '6px 12px', background: B.g50, borderBottom: `1px solid ${B.g200}`, display: "flex", gap: isDesktop() ? 6 : 4, overflowX: "auto", justifyContent: isDesktop() ? 'center' : 'flex-start' }}>
                {pgN.map((n, i) => (<button key={i} onClick={() => { setCPage(i); goTop(); }}
                    style={{ padding: isDesktop() ? '8px 18px' : '5px 10px', borderRadius: 20, border: "none", background: i === cPage ? B.pk : "transparent", color: i === cPage ? B.w : B.g400, fontSize: isDesktop() ? 12 : 10, fontWeight: 700, fontFamily: F, cursor: "pointer", whiteSpace: "nowrap" }}>{n}</button>))}
            </div>

            {/* ── Session mode banner — makes it explicit which session a coach is scoring ── */}
            {(() => {
                const isWeekday = activeSession === 'weekday';
                const bannerColor = isWeekday ? B.bl : B.pk;
                const title = isWeekday ? 'Weekday · Skill Session' : 'Weekend · Game Sense Session';
                const emoji = isWeekday ? '🏏' : '🎯';
                const sub = isWeekday
                    ? 'Hour 1 — Technical Testing + Problem Solving · Hour 2 — Access & Creativity + Hand Speed / Length. Weekend-only items are locked.'
                    : 'Game sense, fielding, pressure mental and match-context items unlock in this session. Weekday-only items are locked.';
                return (
                    <div style={{ padding: isDesktop() ? '10px 16px' : '8px 12px', background: `${bannerColor}08`, borderBottom: `1px solid ${bannerColor}25`, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ fontSize: 18, flexShrink: 0 }}>{emoji}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 10, fontWeight: 800, color: bannerColor, fontFamily: F, letterSpacing: 0.4, textTransform: 'uppercase' }}>{title}</div>
                            <div style={{ fontSize: 10, color: B.g600, fontFamily: F, lineHeight: 1.35 }}>{sub}</div>
                        </div>
                        <button onClick={() => setRosterWeek(isWeekday ? 'gameSense' : 'skill')}
                            title="Switch session view"
                            style={{ flexShrink: 0, fontSize: 9, fontWeight: 700, color: bannerColor, background: `${bannerColor}15`, border: `1px solid ${bannerColor}40`, borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontFamily: F, whiteSpace: 'nowrap' }}>
                            Switch
                        </button>
                    </div>
                );
            })()}

            <div style={{ paddingBottom: 60 }}>{renderAP()}</div>

            <div className="rra-fixed-bottom" style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: B.w, borderTop: `1px solid ${B.g200}`, padding: "8px 12px", display: "flex", justifyContent: "space-between", zIndex: 100 }}>
                <button onClick={() => {
                    if (cPage > 0) { setCPage(p => p - 1); goTop(); }
                    else { setCView("survey"); goTop(); }
                }} style={{ padding: isDesktop() ? "8px 14px" : "12px 18px", borderRadius: 6, border: `1px solid ${B.g200}`, background: "transparent", fontSize: 11, fontWeight: 600, color: B.g600, cursor: "pointer", fontFamily: F }}>
                    ← {cPage > 0 ? "Back" : "Survey"}
                </button>

                {cPage < 3 && <button onClick={() => { setCPage(p => p + 1); goTop(); }} style={{ padding: isDesktop() ? "8px 14px" : "12px 18px", borderRadius: 6, border: "none", background: `linear-gradient(135deg,${B.bl},${B.pk})`, fontSize: 11, fontWeight: 700, color: B.w, cursor: "pointer", fontFamily: F }}>Next →</button>}

                {cPage === 3 && <button onClick={async () => {
                    setReportPlayer(sp);
                    await new Promise(r => setTimeout(r, 300));
                    const el = document.getElementById('rra-report-card');
                    if (el) { try { const { generateReportPDF } = await import("./reportGenerator"); await generateReportPDF(el, sp.name); } catch (e) { console.error('PDF generation error:', e); saveStatusHook.setError('PDF generation failed — try again'); } }
                    setReportPlayer(null);
                }} style={{ padding: isDesktop() ? '8px 14px' : '12px 18px', borderRadius: 6, border: `1px solid ${B.bl}`, background: 'transparent', fontSize: 11, fontWeight: 700, color: B.bl, cursor: 'pointer', fontFamily: F }}>📄 Generate Report</button>}

                {cPage === 3 && <button onClick={() => { setCView("list"); setSelP(null); goTop(); }} style={{ padding: isDesktop() ? "8px 14px" : "12px 18px", borderRadius: 6, border: "none", background: B.grn, fontSize: 11, fontWeight: 700, color: B.w, cursor: "pointer", fontFamily: F }}>✓ Done</button>}
            </div>

            {/* Hidden ReportCard for PDF capture */}
            {reportPlayer && (() => {
                const rCd = reportPlayer.cd || {};
                const rCcm = calcCCM(reportPlayer.grades, reportPlayer.dob, compTiers, engineConst);
                const rDn = calcPDI({ ...rCd, _dob: reportPlayer.dob }, reportPlayer.self_ratings, reportPlayer.role, rCcm, dbWeights, engineConst, reportPlayer.grades, {}, reportPlayer.topBat, reportPlayer.topBowl, compTiers);
                const rPathway = rDn.pdiPct;
                const rCohort = calcCohortPercentile(rDn.pdi, players, compTiers, dbWeights, engineConst);
                const rAge = calcAgeScore(rCcm.arm, engineConst);
                const rOverall = Math.round((rPathway + rCohort + rAge) / 3);
                const rGrade = rDn.pdi >= 4 ? 5 : rDn.pdi >= 3 ? 4 : rDn.pdi >= 2 ? 3 : rDn.pdi >= 1 ? 2 : 1;
                const rDomains = (rDn.domains || []).map(d => ({ label: d.l, value: Math.round(d.s100), color: d.c }));
                const rStrengths = [rCd.str1, rCd.str2, rCd.str3].filter(Boolean);
                const rGrowth = [rCd.pri1, rCd.pri2, rCd.pri3].filter(Boolean);
                const rPhase = {};
                PHASES.forEach(p => { rPhase[`batting_${p.id}`] = rCd[`pb_${p.id}`]; rPhase[`bowling_${p.id}`] = rCd[`pw_${p.id}`]; });
                const rPlan = {
                    explore: (rCd.pl_explore || '').split('\n').filter(Boolean),
                    challenge: (rCd.pl_challenge || '').split('\n').filter(Boolean),
                    execute: (rCd.pl_execute || '').split('\n').filter(Boolean),
                };
                return <Suspense fallback={null}><ReportCard player={reportPlayer} assessment={rCd} isAdmin={isAdmin} engine={{
                    overall: rOverall, pathway: rPathway, cohort: rCohort, agePct: rAge,
                    pdi: rDn.pdi, grade: rGrade, domains: rDomains,
                    strengths: rStrengths, growthAreas: rGrowth,
                    sagi: { alignment: rDn.sagiLabel },
                    phaseScores: rPhase, narrative: rCd.narrative,
                    plan: rPlan, squad: rCd.sqRec,
                }} /></Suspense>;
            })()}
        </div>);
    }

    // ═══ FALLBACK — should never reach here, but show safe recovery UI ═══
    return (
        <div style={{ minHeight: "100vh", background: B.g50, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
            <div style={{ fontSize: 13, color: B.g400, fontFamily: F, fontWeight: 600, marginBottom: 12 }}>Something unexpected happened.</div>
            <button onClick={() => { setCView("list"); setSelP(null); goTop(); }}
                style={{ padding: "12px 24px", borderRadius: 8, border: "none", background: `linear-gradient(135deg,${B.bl},${B.pk})`, color: B.w, fontSize: 13, fontWeight: 700, fontFamily: F, cursor: "pointer" }}>
                Back to Roster
            </button>
        </div>
    );
}
