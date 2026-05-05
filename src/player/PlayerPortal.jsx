import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { B, F, getDkWrap, sCard } from "../data/theme";
import Journal from "./Journal";
import IDPView from "./IDPView";
import PlayerDNA from "./PlayerDNA";
import WeeklyReflection from "./WeeklyReflection";
import HeadshotUpload from "./HeadshotUpload";
import HeadshotPrompt from "./HeadshotPrompt";
import HeadshotAvatar from "../shared/HeadshotAvatar";
import { loadAttendanceForPlayer } from "../db/observationDb";
import { loadJournalHistory } from "../db/journalDb";
import { loadGoalsForPlayer } from "../db/idpDb";
import { computeGrowthStats } from "../db/assessmentDb";
import { supabase } from "../supabaseClient";

// ═══ FEATURE FLAG ═══
// Default ON. Set VITE_ENABLE_FITNESS_PLAYER="false" in Vercel to hide
// the player-side fitness tile + view without code changes.
const FITNESS_PLAYER_ENABLED = import.meta.env.VITE_ENABLE_FITNESS_PLAYER !== "false";

const FitnessHome = React.lazy(() => import("./FitnessHome"));
const Neurovision = React.lazy(() => import("./Neurovision"));

// Parse "Tue 5-7pm" → { dayLong: "Tuesday", dayShort: "Tue", time: "5–7 pm" }
function parseSession(raw) {
    if (!raw || typeof raw !== 'string') return null;
    const dayMap = { Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday' };
    const m = raw.trim().match(/^(\w{3,})\s+(.+)$/i);
    if (!m) return { dayLong: raw, dayShort: raw, time: '' };
    const dayShort = m[1].slice(0, 3);
    const dayKey = dayShort[0].toUpperCase() + dayShort.slice(1).toLowerCase();
    const time = m[2].trim().replace(/-/g, '\u2013');
    return { dayLong: dayMap[dayKey] || raw, dayShort: dayKey, time };
}

const SessionsBanner = React.memo(({ weekday, weekend, tentative }) => {
    if (!weekday && !weekend) return null;
    const wd = parseSession(weekday);
    const we = parseSession(weekend);
    const Cell = ({ label, accent, parsed }) => (
        <div style={{ flex: 1, padding: '14px 14px 16px', minWidth: 0 }}>
            <div style={{ fontSize: 9, fontWeight: 800, color: accent, letterSpacing: 1.4, fontFamily: F, textTransform: 'uppercase' }}>{label}</div>
            {parsed ? (
                <>
                    <div style={{ fontSize: 18, fontWeight: 800, color: B.nvD, fontFamily: F, marginTop: 6, lineHeight: 1.1, letterSpacing: -0.3 }}>{parsed.dayLong}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: B.nv, fontFamily: F, marginTop: 4 }}>{parsed.time}</div>
                </>
            ) : (
                <div style={{ fontSize: 13, fontWeight: 700, color: B.g400, fontFamily: F, marginTop: 8 }}>To be confirmed</div>
            )}
        </div>
    );
    return (
        <div style={{ background: B.w, borderRadius: 14, marginBottom: 16, border: `2px solid ${B.nvD}`, boxShadow: '0 4px 14px rgba(0, 29, 72, 0.10)', overflow: 'hidden' }}>
            <div style={{ background: `linear-gradient(90deg, ${B.nvD} 0%, ${B.bl} 70%, ${B.pk} 100%)`, padding: '9px 14px', color: B.w, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 11, fontWeight: 800, fontFamily: F, letterSpacing: 1.4, textTransform: 'uppercase' }}>🏏 Your Sessions</div>
                {tentative && (
                    <div style={{ fontSize: 9, fontWeight: 800, fontFamily: F, letterSpacing: 0.6, background: 'rgba(255,255,255,0.18)', padding: '3px 8px', borderRadius: 10, textTransform: 'uppercase' }}>Tentative</div>
                )}
            </div>
            <div style={{ display: 'flex' }}>
                <div style={{ flex: 1, background: `linear-gradient(180deg, ${B.bl}10 0%, ${B.w} 80%)`, borderRight: `1px solid ${B.g200}` }}>
                    <Cell label="Weekday" accent={B.bl} parsed={wd} />
                </div>
                <div style={{ flex: 1, background: `linear-gradient(180deg, ${B.pk}12 0%, ${B.w} 80%)` }}>
                    <Cell label="Weekend" accent={B.pk} parsed={we} />
                </div>
            </div>
        </div>
    );
});

const PortalHeader = React.memo(({ title, showBack, onBack, onSignOut, userName }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: B.nvD }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {showBack && (
                <button onClick={onBack} style={{ background: 'none', border: 'none', color: B.w, cursor: 'pointer', padding: 0 }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                </button>
            )}
            <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: B.w, fontFamily: F }}>{title}</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", fontFamily: F }}>{userName}</div>
            </div>
        </div>
        {!showBack && (
            <button onClick={onSignOut} style={{ fontSize: 10, fontWeight: 700, color: B.red, background: 'rgba(239,68,68,0.1)', border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontFamily: F }}>Sign Out</button>
        )}
    </div>
));

export default function PlayerPortal() {
    const { session, userProfile, signOut } = useAuth();
    const [view, setView] = useState("home"); // home | journal | idp | dna | reflection
    const [recentAtt, setRecentAtt] = useState([]);
    const [playerId, setPlayerId] = useState(null);
    const [programInfo, setProgramInfo] = useState(null);
    const [growthStats, setGrowthStats] = useState(null);
    const [schedule, setSchedule] = useState(null);
    const [headshotUrl, setHeadshotUrl] = useState(null);
    // Per-session "Later" dismissal so the prompt doesn't nag mid-session,
    // but still nudges the player on next login until they upload.
    const [promptDismissed, setPromptDismissed] = useState(() => {
        try { return sessionStorage.getItem('rra_headshot_prompt_dismissed') === '1'; }
        catch { return false; }
    });

    useEffect(() => {
        if (!session?.user?.id) return;
        let cancelled = false;
        async function fetchData() {
            try {
                // Look up the player's players.id from auth_user_id
                const { data: playerRow } = await supabase
                    .from('players')
                    .select('id, weekday_session, weekend_session, schedule_tentative, headshot_url')
                    .eq('auth_user_id', session.user.id)
                    .eq('submitted', true)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();
                if (cancelled || !playerRow) return;
                setPlayerId(playerRow.id);
                setSchedule({
                    weekday: playerRow.weekday_session,
                    weekend: playerRow.weekend_session,
                    tentative: !!playerRow.schedule_tentative,
                });
                setHeadshotUrl(playerRow.headshot_url || null);
                const att = await loadAttendanceForPlayer(playerRow.id);
                if (!cancelled) setRecentAtt(att.slice(0, 5));
            } catch (err) {
                console.error("Error loading player dashboard data:", err);
            }
            // Load growth stats (goals + journal entries)
            try {
                const [goals, journalEntries] = await Promise.all([
                    loadGoalsForPlayer(session.user.id, null),
                    loadJournalHistory(session.user.id),
                ]);
                if (!cancelled) {
                    setGrowthStats(computeGrowthStats(goals, journalEntries));
                }
            } catch (err) {
                console.warn("Growth stats load failed:", err.message);
            }
            try {
                const { data: member } = await supabase.from('program_members').select('role, season').eq('auth_user_id', session.user.id).eq('active', true).maybeSingle();
                const { data: program } = await supabase.from('programs').select('name, season').order('created_at', { ascending: false }).limit(1).maybeSingle();
                if (!cancelled && (member || program)) setProgramInfo({ programName: program?.name || null, season: member?.season || program?.season || null });
            } catch (e) { console.warn('Program info fetch failed:', e.message); }
        }
        fetchData();
        return () => { cancelled = true; };
    }, [session?.user?.id]);

    const handleSignOut = async () => {
        try {
            await signOut();
        } catch (e) {
            console.error(e);
        }
    };


    if (view === "dna") return (
        <div style={{ minHeight: "100vh", background: B.g50, fontFamily: F }}>
            <PortalHeader title="My DNA" showBack onBack={() => setView('home')} onSignOut={handleSignOut} userName={userProfile?.full_name} />
            <PlayerDNA />
        </div>
    );

    if (view === "journal") return (
        <div style={{ minHeight: "100vh", background: B.g50, fontFamily: F }}>
            <PortalHeader title="My Journal" showBack onBack={() => setView('home')} onSignOut={handleSignOut} userName={userProfile?.full_name} />
            <Journal session={session} userProfile={userProfile} playerId={playerId} />
        </div>
    );

    if (view === "idp") return (
        <div style={{ minHeight: "100vh", background: B.g50, fontFamily: F }}>
            <PortalHeader title="My IDP" showBack onBack={() => setView('home')} onSignOut={handleSignOut} userName={userProfile?.full_name} />
            <IDPView session={session} userProfile={userProfile} playerId={playerId} />
        </div>
    );

    if (view === "reflection") return (
        <div style={{ minHeight: "100vh", background: B.g50, fontFamily: F }}>
            <PortalHeader title="Weekly Review" showBack onBack={() => setView('home')} onSignOut={handleSignOut} userName={userProfile?.full_name} />
            <WeeklyReflection session={session} userProfile={userProfile} playerId={playerId} />
        </div>
    );

    if (view === "photo") return (
        <div style={{ minHeight: "100vh", background: B.g50, fontFamily: F }}>
            <PortalHeader title="Profile Photo" showBack onBack={() => setView('home')} onSignOut={handleSignOut} userName={userProfile?.full_name} />
            <HeadshotUpload
                playerId={playerId}
                playerName={userProfile?.full_name}
                currentUrl={headshotUrl}
                onSaved={(url) => setHeadshotUrl(url)}
                onClose={() => setView('home')}
            />
        </div>
    );

    if (view === "fitness" && FITNESS_PLAYER_ENABLED) return (
        <div style={{ minHeight: "100vh", background: B.g50, fontFamily: F }}>
            <PortalHeader title="Fitness" showBack onBack={() => setView('home')} onSignOut={handleSignOut} userName={userProfile?.full_name} />
            <React.Suspense fallback={<div style={{ padding: 24, textAlign: 'center', color: B.g400, fontFamily: F, fontSize: 13 }}>Loading fitness…</div>}>
                <FitnessHome session={session} userProfile={userProfile} playerId={playerId} />
            </React.Suspense>
        </div>
    );

    if (view === "neurovision") return (
        <div style={{ minHeight: "100vh", background: B.g50, fontFamily: F }}>
            <PortalHeader title="Neurovision" showBack onBack={() => setView('home')} onSignOut={handleSignOut} userName={userProfile?.full_name} />
            <React.Suspense fallback={<div style={{ padding: 24, textAlign: 'center', color: B.g400, fontFamily: F, fontSize: 13 }}>Loading…</div>}>
                <Neurovision />
            </React.Suspense>
        </div>
    );

    // ── Stat card helper ──
    const StatCard = ({ value, label, color, icon }) => (
        <div style={{ ...sCard, flex: 1, padding: 14, marginBottom: 0, textAlign: 'center', minWidth: 0 }}>
            <div style={{ fontSize: 10, marginBottom: 4 }}>{icon}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: color || B.nvD, fontFamily: F }}>{value}</div>
            <div style={{ fontSize: 9, fontWeight: 700, color: B.g400, fontFamily: F, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 }}>{label}</div>
        </div>
    );

    // HOME VIEW
    // Headshot prompt — only renders when:
    //  1. The player has loaded (playerId set), AND
    //  2. They have no headshot saved yet (headshotUrl is null), AND
    //  3. They haven't dismissed it for this session
    // As soon as a successful upload sets headshotUrl to a real URL, this stops rendering for good.
    const showHeadshotPrompt = !!playerId && !headshotUrl && !promptDismissed;
    const handlePromptUpload = () => {
        setPromptDismissed(true);
        try { sessionStorage.setItem('rra_headshot_prompt_dismissed', '1'); } catch {}
        setView('photo');
    };
    const handlePromptLater = () => {
        setPromptDismissed(true);
        try { sessionStorage.setItem('rra_headshot_prompt_dismissed', '1'); } catch {}
    };

    return (
        <div style={{ minHeight: "100vh", background: B.g50, fontFamily: F }}>
            <PortalHeader title="Player Portal" onSignOut={handleSignOut} userName={userProfile?.full_name} />

            <HeadshotPrompt open={showHeadshotPrompt} onUpload={handlePromptUpload} onLater={handlePromptLater} />

            <div style={{ padding: 16, ...getDkWrap() }}>

                {/* ═══ MY SESSIONS — pinned to the very top so day/time is the first thing every player sees ═══ */}
                <SessionsBanner weekday={schedule?.weekday} weekend={schedule?.weekend} tentative={schedule?.tentative} />

                {/* ═══ WELCOME BANNER ═══ */}
                <div style={{ background: `linear-gradient(135deg, ${B.nvD}, ${B.bl})`, borderRadius: 16, padding: 24, marginBottom: 20, color: B.w, position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                        <div style={{ cursor: 'pointer', flexShrink: 0 }} onClick={() => setView('photo')} title={headshotUrl ? 'Tap to update your photo' : 'Tap to add your photo'}>
                            <HeadshotAvatar url={headshotUrl} name={userProfile?.full_name} size={64} ringColor="rgba(255,255,255,0.6)" />
                            {!headshotUrl && (
                                <div style={{ fontSize: 8, fontWeight: 800, color: B.pk, background: B.w, padding: '2px 6px', borderRadius: 8, marginTop: 4, textAlign: 'center', letterSpacing: 0.5, textTransform: 'uppercase' }}>Add photo</div>
                            )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.7)", marginBottom: 4, fontFamily: F }}>Welcome back,</div>
                        <div style={{ fontSize: 24, fontWeight: 800, fontFamily: F, marginBottom: 12 }}>{userProfile?.full_name?.split(' ')[0] || 'Player'}</div>
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                            <div style={{ background: "rgba(255,255,255,0.1)", padding: '6px 12px', borderRadius: 8, backdropFilter: 'blur(10px)' }}>
                                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.6)", fontWeight: 700, fontFamily: F }}>PROGRAM</div>
                                <div style={{ fontSize: 11, fontWeight: 700, fontFamily: F }}>{programInfo?.programName || 'RRAM Academy'}</div>
                            </div>
                            {programInfo?.season && <div style={{ background: "rgba(255,255,255,0.1)", padding: '6px 12px', borderRadius: 8, backdropFilter: 'blur(10px)' }}>
                                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.6)", fontWeight: 700, fontFamily: F }}>SEASON</div>
                                <div style={{ fontSize: 11, fontWeight: 700, fontFamily: F }}>{programInfo.season}</div>
                            </div>}
                            {growthStats?.streak > 0 && (
                                <div style={{ background: "rgba(255,130,50,0.2)", padding: '6px 12px', borderRadius: 8 }}>
                                    <div style={{ fontSize: 9, color: "rgba(255,255,255,0.6)", fontWeight: 700, fontFamily: F }}>STREAK</div>
                                    <div style={{ fontSize: 11, fontWeight: 700, fontFamily: F }}>🔥 {growthStats.streak} week{growthStats.streak !== 1 ? 's' : ''}</div>
                                </div>
                            )}
                        </div>
                        </div>
                    </div>
                </div>

                {/* ═══ GROWTH STATS ROW ═══ */}
                {growthStats && (
                    <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                        <StatCard value={growthStats.totalEntries} label="Journal Entries" color={B.prp} icon="📔" />
                        <StatCard value={growthStats.activeGoals} label="Active Goals" color={B.bl} icon="🎯" />
                        <StatCard value={growthStats.completedGoals} label="Goals Done" color={B.grn} icon="✅" />
                    </div>
                )}

                {/* ═══ ACTIVE GOAL PROGRESS ═══ */}
                {growthStats?.topGoals?.length > 0 && (
                    <div style={{ ...sCard, padding: 16, marginBottom: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <div style={{ fontSize: 13, fontWeight: 800, color: B.nvD, fontFamily: F }}>Goal Progress</div>
                            <div style={{ fontSize: 10, fontWeight: 700, color: B.bl, fontFamily: F, cursor: 'pointer' }} onClick={() => setView('idp')}>View All</div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {growthStats.topGoals.map(g => (
                                <div key={g.id}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                        <div style={{ fontSize: 11, fontWeight: 600, color: B.nv, fontFamily: F, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.title}</div>
                                        <div style={{ fontSize: 10, fontWeight: 700, color: B.g400, fontFamily: F, marginLeft: 8 }}>{g.progress || 0}%</div>
                                    </div>
                                    <div style={{ height: 6, background: B.g100, borderRadius: 3, overflow: 'hidden' }}>
                                        <div style={{
                                            width: `${g.progress || 0}%`, height: '100%',
                                            background: (g.progress || 0) >= 75 ? B.grn : (g.progress || 0) >= 40 ? B.amb : B.bl,
                                            borderRadius: 3, transition: 'width 0.4s ease'
                                        }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ═══ ACTION TILES (2×2) ═══ */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                    <div onClick={() => setView('dna')} style={{ ...sCard, cursor: 'pointer', padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.2s' }}>
                        <div style={{ fontSize: 32, marginBottom: 12 }}>🧬</div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: B.nvD, fontFamily: F }}>My DNA</div>
                        <div style={{ fontSize: 10, color: B.g400, fontFamily: F, textAlign: 'center', marginTop: 4 }}>Your T20 identity</div>
                    </div>
                    <div onClick={() => setView('reflection')} style={{ ...sCard, cursor: 'pointer', padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.2s' }}>
                        <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: B.nvD, fontFamily: F }}>Weekly Review</div>
                        <div style={{ fontSize: 10, color: B.g400, fontFamily: F, textAlign: 'center', marginTop: 4 }}>End of week reflection</div>
                    </div>
                    <div onClick={() => setView('journal')} style={{ ...sCard, cursor: 'pointer', padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.2s' }}>
                        <div style={{ fontSize: 32, marginBottom: 12 }}>📔</div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: B.nvD, fontFamily: F }}>Journal</div>
                        <div style={{ fontSize: 10, color: B.g400, fontFamily: F, textAlign: 'center', marginTop: 4 }}>Your thoughts, anytime</div>
                    </div>
                    <div onClick={() => setView('idp')} style={{ ...sCard, cursor: 'pointer', padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.2s' }}>
                        <div style={{ fontSize: 32, marginBottom: 12 }}>🎯</div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: B.nvD, fontFamily: F }}>My IDP</div>
                        <div style={{ fontSize: 10, color: B.g400, fontFamily: F, textAlign: 'center', marginTop: 4 }}>Goals & coach feedback</div>
                    </div>
                </div>

                {FITNESS_PLAYER_ENABLED && (
                    <div onClick={() => setView('fitness')} style={{
                        cursor: 'pointer', padding: 20, marginBottom: 20, borderRadius: 14,
                        background: `linear-gradient(135deg, ${B.pk} 0%, ${B.bl} 100%)`,
                        color: B.w, display: 'flex', alignItems: 'center', gap: 16,
                        boxShadow: '0 4px 14px rgba(0,29,72,0.15)',
                    }}>
                        <div style={{ fontSize: 36, flexShrink: 0 }}>🏋️</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 16, fontWeight: 800, fontFamily: F }}>Fitness</div>
                            <div style={{ fontSize: 11, fontFamily: F, opacity: 0.9, marginTop: 2 }}>10-week home program · 3 sessions/week · strength + conditioning</div>
                        </div>
                        <div style={{ fontSize: 22, opacity: 0.8 }}>›</div>
                    </div>
                )}

                {/* ═══ NEUROVISION — partnership with Shah Neurovision Sports Training ═══ */}
                <div style={{ fontSize: 11, fontWeight: 800, color: B.g600, fontFamily: F, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8, marginTop: 4 }}>
                    Neurovision
                </div>
                <div onClick={() => setView('neurovision')} style={{
                    cursor: 'pointer', padding: 16, marginBottom: 20, borderRadius: 14,
                    background: '#000', color: B.w, display: 'flex', alignItems: 'center', gap: 14,
                    boxShadow: '0 4px 14px rgba(0,0,0,0.18)', border: '1px solid #1a1a1a',
                }}>
                    <img
                        src="/neurovision-logo.png"
                        alt="Shah Neurovision Sports Training"
                        style={{ height: 52, width: 'auto', objectFit: 'contain', flexShrink: 0 }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 9, fontWeight: 800, color: '#3FCFC2', fontFamily: F, letterSpacing: 1.2, textTransform: 'uppercase' }}>Week 0</div>
                        <div style={{ fontSize: 15, fontWeight: 800, fontFamily: F, marginTop: 2 }}>Cricket Neural Warm-Up</div>
                        <div style={{ fontSize: 11, fontFamily: F, opacity: 0.8, marginTop: 2 }}>5–7 minutes · 5 vision drills before batting</div>
                    </div>
                    <div style={{ fontSize: 22, opacity: 0.8 }}>›</div>
                </div>

                {/* ═══ RECENT SESSIONS CARD ═══ */}
                <div style={{ ...sCard, padding: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: B.nvD, fontFamily: F }}>Recent Sessions</div>
                    </div>
                    {recentAtt.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: "24px 0", color: B.g400, fontSize: 11, fontFamily: F }}>
                            No sessions recorded yet.
                        </div>
                    ) : (
                        <div>
                            {recentAtt.map(att => (
                                <div key={att.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${B.g100}` }}>
                                    <div>
                                        <div style={{ fontSize: 12, fontWeight: 700, color: B.nvD, fontFamily: F }}>{att.sessions?.title || 'Unknown Session'}</div>
                                        <div style={{ fontSize: 10, color: B.g400, fontFamily: F }}>{att.sessions?.session_date ? new Date(att.sessions.session_date).toLocaleDateString() : ''}</div>
                                    </div>
                                    <span style={{ fontSize: 10, fontWeight: 800, padding: "4px 8px", borderRadius: 4, background: att.status === 'present' ? `${B.grn}20` : att.status === 'excused' ? `${B.amb}20` : `${B.pk}20`, color: att.status === 'present' ? B.grn : att.status === 'excused' ? '#b45309' : B.red, fontFamily: F }}>
                                        {(att.status || 'unknown').toUpperCase()}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
