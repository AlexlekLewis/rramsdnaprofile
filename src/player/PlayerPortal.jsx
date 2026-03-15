import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { B, F, getDkWrap, sCard } from "../data/theme";
import Journal from "./Journal";
import IDPView from "./IDPView";
import { loadAttendanceForPlayer } from "../db/observationDb";
import { supabase } from "../supabaseClient";

export default function PlayerPortal() {
    const { session, userProfile, signOut } = useAuth();
    const [view, setView] = useState("home"); // home | journal | idp
    const [recentAtt, setRecentAtt] = useState([]);
    const [playerId, setPlayerId] = useState(null);
    const [programInfo, setProgramInfo] = useState(null);

    useEffect(() => {
        if (!session?.user?.id) return;
        let cancelled = false;
        async function fetchData() {
            try {
                // Look up the player's players.id from auth_user_id
                const { data: playerRow } = await supabase
                    .from('players')
                    .select('id')
                    .eq('auth_user_id', session.user.id)
                    .eq('submitted', true)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();
                if (cancelled || !playerRow) return;
                setPlayerId(playerRow.id);
                const att = await loadAttendanceForPlayer(playerRow.id);
                if (!cancelled) setRecentAtt(att.slice(0, 5));
            } catch (err) {
                console.error("Error loading player dashboard data:", err);
            }
            try {
                const { data: member } = await supabase.from('program_members').select('role, season').eq('auth_user_id', session.user.id).eq('active', true).maybeSingle();
                const { data: program } = await supabase.from('programs').select('name, season').order('created_at', { ascending: false }).limit(1).maybeSingle();
                if (!cancelled && (member || program)) setProgramInfo({ programName: program?.name || null, season: member?.season || program?.season || null });
            } catch {}
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

    const Header = ({ title, showBack }) => (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: B.nvD }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {showBack && (
                    <button onClick={() => setView('home')} style={{ background: 'none', border: 'none', color: B.w, cursor: 'pointer', padding: 0 }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                    </button>
                )}
                <div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: B.w, fontFamily: F }}>{title}</div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", fontFamily: F }}>{userProfile?.full_name}</div>
                </div>
            </div>
            {!showBack && (
                <button onClick={handleSignOut} style={{ fontSize: 10, fontWeight: 700, color: B.red, background: 'rgba(239,68,68,0.1)', border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontFamily: F }}>Sign Out</button>
            )}
        </div>
    );

    if (view === "journal") return (
        <div style={{ minHeight: "100vh", background: B.g50, fontFamily: F }}>
            <Header title="My Journal" showBack />
            <Journal session={session} userProfile={userProfile} />
        </div>
    );

    if (view === "idp") return (
        <div style={{ minHeight: "100vh", background: B.g50, fontFamily: F }}>
            <Header title="My IDP" showBack />
            <IDPView session={session} userProfile={userProfile} />
        </div>
    );

    // HOME VIEW
    return (
        <div style={{ minHeight: "100vh", background: B.g50, fontFamily: F }}>
            <Header title="Player Portal" />

            <div style={{ padding: 16, ...getDkWrap() }}>

                {/* ═══ WELCOME BANNER ═══ */}
                <div style={{ background: `linear-gradient(135deg, ${B.nvD}, ${B.bl})`, borderRadius: 16, padding: 24, marginBottom: 20, color: B.w, position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'relative', zIndex: 2 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.7)", marginBottom: 4, fontFamily: F }}>Welcome back,</div>
                        <div style={{ fontSize: 24, fontWeight: 800, fontFamily: F, marginBottom: 12 }}>{userProfile?.full_name?.split(' ')[0] || 'Player'}</div>
                        <div style={{ display: 'flex', gap: 12 }}>
                            <div style={{ background: "rgba(255,255,255,0.1)", padding: '6px 12px', borderRadius: 8, backdropFilter: 'blur(10px)' }}>
                                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.6)", fontWeight: 700, fontFamily: F }}>PROGRAM</div>
                                <div style={{ fontSize: 11, fontWeight: 700, fontFamily: F }}>{programInfo?.programName || 'RRAM Academy'}</div>
                            </div>
                            {programInfo?.season && <div style={{ background: "rgba(255,255,255,0.1)", padding: '6px 12px', borderRadius: 8, backdropFilter: 'blur(10px)' }}>
                                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.6)", fontWeight: 700, fontFamily: F }}>SEASON</div>
                                <div style={{ fontSize: 11, fontWeight: 700, fontFamily: F }}>{programInfo.season}</div>
                            </div>}
                        </div>
                    </div>
                </div>

                {/* ═══ ACTION TILES ═══ */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                    <div onClick={() => setView('journal')} style={{ ...sCard, cursor: 'pointer', padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.2s', ':active': { transform: 'scale(0.98)' } }}>
                        <div style={{ fontSize: 32, marginBottom: 12 }}>📔</div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: B.nvD, fontFamily: F }}>Journal</div>
                        <div style={{ fontSize: 10, color: B.g400, fontFamily: F, textAlign: 'center', marginTop: 4 }}>Reflect on your latest sessions</div>
                    </div>
                    <div onClick={() => setView('idp')} style={{ ...sCard, cursor: 'pointer', padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.2s', ':active': { transform: 'scale(0.98)' } }}>
                        <div style={{ fontSize: 32, marginBottom: 12 }}>🎯</div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: B.nvD, fontFamily: F }}>My IDP</div>
                        <div style={{ fontSize: 10, color: B.g400, fontFamily: F, textAlign: 'center', marginTop: 4 }}>Track goals & coach focus areas</div>
                    </div>
                </div>

                {/* ═══ UPCOMING SESSIONS CARD ═══ */}
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
