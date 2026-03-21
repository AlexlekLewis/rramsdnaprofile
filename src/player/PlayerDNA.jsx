// ═══ PLAYER DNA VIEW — My DNA identity (player-safe, no raw scores) ═══
import React, { useState, useEffect, lazy, Suspense } from "react";
import { useAuth } from "../context/AuthContext";
import { loadPlayerDNAData } from "../db/playerDb";
import { BAT_ARCH, BWL_ARCH, scoreBatArchetype, scoreBwlArchetype } from "../data/skillItems";
import { B, F, sCard } from "../data/theme";

const ReportCard = lazy(() => import("../coach/ReportCard"));

// ── Archetype bar chart (reused from onboarding ArchReveal pattern) ──
const ArchBars = ({ scores, primaryId, color, archList }) => (
    <div style={{ display: 'flex', gap: 4, justifyContent: 'center', flexWrap: 'wrap' }}>
        {archList.map(a => (
            <div key={a.id} style={{ flex: '1 0 0', minWidth: 50, maxWidth: 80 }}>
                <div style={{ height: 48, background: B.g100, borderRadius: 4, position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${scores[a.id] || 0}%`, background: a.id === primaryId ? color : `${color}40`, borderRadius: 4, transition: 'height 0.5s' }} />
                </div>
                <div style={{ fontSize: 7, color: B.g500, fontFamily: F, marginTop: 2, textAlign: 'center' }}>{a.nm.split(' ').pop()}</div>
                <div style={{ fontSize: 8, fontWeight: 700, color: a.id === primaryId ? color : B.g400, fontFamily: F, textAlign: 'center' }}>{scores[a.id] || 0}%</div>
            </div>
        ))}
    </div>
);

// ── Archetype identity card ──
const ArchCard = ({ primary, secondary, scores, color, label, archList }) => {
    if (!primary) return null;
    return (
        <div style={{ background: `${color}08`, border: `2px solid ${color}40`, borderRadius: 12, padding: '16px 14px', textAlign: 'center' }}>
            <div style={{ fontSize: 9, fontWeight: 700, color, fontFamily: F, letterSpacing: 1.5, marginBottom: 4 }}>YOUR {label} DNA</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: B.nvD, fontFamily: F }}>{primary.nm}</div>
            <div style={{ fontSize: 10, color: B.g600, fontFamily: F, marginTop: 4, lineHeight: 1.5 }}>{primary.sub}</div>
            {secondary && (
                <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${color}30` }}>
                    <div style={{ fontSize: 9, color: B.g400, fontFamily: F }}>Secondary identity</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: B.nvD, fontFamily: F }}>{secondary.nm}</div>
                </div>
            )}
            {scores && <div style={{ marginTop: 12 }}><ArchBars scores={scores} primaryId={primary.id} color={color} archList={archList} /></div>}
        </div>
    );
};

// ── Strengths / Priorities cards ──
const ItemList = ({ items, icon, color, title }) => {
    if (!items || items.length === 0) return null;
    return (
        <div style={{ background: `${color}08`, border: `1px solid ${color}30`, borderRadius: 10, padding: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color, fontFamily: F, marginBottom: 8 }}>{icon} {title}</div>
            {items.map((s, i) => (
                <div key={i} style={{ fontSize: 12, color: B.g600, fontFamily: F, marginBottom: 6, lineHeight: 1.5 }}>{icon} {s}</div>
            ))}
        </div>
    );
};

export default function PlayerDNA() {
    const { session } = useAuth();
    const [dnaData, setDnaData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showReport, setShowReport] = useState(false);

    useEffect(() => {
        if (!session?.user?.id) return;
        let cancelled = false;
        setLoading(true);
        loadPlayerDNAData(session.user.id)
            .then(data => { if (!cancelled) setDnaData(data); })
            .catch(err => console.error("Error loading DNA data:", err))
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [session?.user?.id]);

    if (loading) return <div style={{ padding: 24, fontSize: 13, color: B.g400, fontFamily: F, textAlign: 'center' }}>Loading your DNA profile...</div>;

    if (!dnaData) return (
        <div style={{ padding: 32, textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🧬</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: B.nvD, fontFamily: F, marginBottom: 8 }}>Your DNA Profile</div>
            <div style={{ fontSize: 12, color: B.g400, fontFamily: F, lineHeight: 1.6 }}>
                Your coaches haven't completed your assessment yet — check back soon.
            </div>
        </div>
    );

    const { player, assessment } = dnaData;

    // Score archetypes from player's onboarding answers
    const batResult = player.batArchAnswers ? scoreBatArchetype(player.batArchAnswers) : null;
    const bwlResult = player.bwlArchAnswers ? scoreBwlArchetype(player.bwlArchAnswers) : null;
    const batPrimary = BAT_ARCH.find(a => a.id === (player.playerBatArch || batResult?.primary));
    const batSecondary = BAT_ARCH.find(a => a.id === (player.playerBatArchSecondary || batResult?.secondary));
    const bwlPrimary = BWL_ARCH.find(a => a.id === (player.playerBwlArch || bwlResult?.primary));
    const bwlSecondary = BWL_ARCH.find(a => a.id === (player.playerBwlArchSecondary || bwlResult?.secondary));

    const hasAssessment = !!assessment;
    const hasNarrative = assessment?.narrative;
    const hasStrengths = assessment?.strengths?.length > 0;
    const hasPriorities = assessment?.priorities?.length > 0;
    const hasPlan = assessment?.planExplore || assessment?.planChallenge || assessment?.planExecute;

    return (
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* ═══ T20 ARCHETYPE IDENTITY ═══ */}
            <div style={{ ...sCard, padding: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: B.nvD, fontFamily: F, marginBottom: 16 }}>T20 Identity</div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {batPrimary && (
                        <ArchCard
                            primary={batPrimary}
                            secondary={batSecondary}
                            scores={batResult?.scores}
                            color={B.pk}
                            label="BATTING"
                            archList={BAT_ARCH}
                        />
                    )}
                    {bwlPrimary && (
                        <ArchCard
                            primary={bwlPrimary}
                            secondary={bwlSecondary}
                            scores={bwlResult?.scores}
                            color={B.bl}
                            label="BOWLING"
                            archList={BWL_ARCH}
                        />
                    )}
                    {!batPrimary && !bwlPrimary && (
                        <div style={{ fontSize: 12, color: B.g400, fontFamily: F, textAlign: 'center', padding: 16 }}>
                            Archetype data not available — complete your onboarding to discover your T20 DNA.
                        </div>
                    )}
                </div>
            </div>

            {/* ═══ PLAYING STYLE SUMMARY ═══ */}
            <div style={{ ...sCard, padding: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: B.nvD, fontFamily: F, marginBottom: 16 }}>Playing Style</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                    {player.role && (
                        <div style={{ background: B.g50, padding: '8px 14px', borderRadius: 8, flex: '1 1 140px' }}>
                            <div style={{ fontSize: 9, fontWeight: 700, color: B.g400, fontFamily: F, textTransform: 'uppercase', letterSpacing: 0.5 }}>Role</div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: B.nvD, fontFamily: F, marginTop: 2 }}>{player.role}</div>
                        </div>
                    )}
                    {player.bat && (
                        <div style={{ background: B.g50, padding: '8px 14px', borderRadius: 8, flex: '1 1 140px' }}>
                            <div style={{ fontSize: 9, fontWeight: 700, color: B.g400, fontFamily: F, textTransform: 'uppercase', letterSpacing: 0.5 }}>Batting</div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: B.nvD, fontFamily: F, marginTop: 2 }}>{player.bat}</div>
                        </div>
                    )}
                    {player.bowl && (
                        <div style={{ background: B.g50, padding: '8px 14px', borderRadius: 8, flex: '1 1 140px' }}>
                            <div style={{ fontSize: 9, fontWeight: 700, color: B.g400, fontFamily: F, textTransform: 'uppercase', letterSpacing: 0.5 }}>Bowling</div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: B.nvD, fontFamily: F, marginTop: 2 }}>{player.bowl}</div>
                        </div>
                    )}
                    {player.batPosition && (
                        <div style={{ background: B.g50, padding: '8px 14px', borderRadius: 8, flex: '1 1 140px' }}>
                            <div style={{ fontSize: 9, fontWeight: 700, color: B.g400, fontFamily: F, textTransform: 'uppercase', letterSpacing: 0.5 }}>Position</div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: B.nvD, fontFamily: F, marginTop: 2 }}>{player.batPosition}</div>
                        </div>
                    )}
                </div>

                {/* Phase preferences */}
                {(player.batPhases?.length > 0 || player.bwlPhases?.length > 0) && (
                    <div style={{ marginTop: 12 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: B.g400, fontFamily: F, textTransform: 'uppercase', marginBottom: 6 }}>Phase Preferences</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {(player.batPhases || []).map(p => (
                                <span key={`bat-${p}`} style={{ padding: '3px 10px', borderRadius: 12, background: `${B.pk}15`, border: `1px solid ${B.pk}40`, fontSize: 9, fontWeight: 600, color: B.pk, fontFamily: F }}>Bat: {p}</span>
                            ))}
                            {(player.bwlPhases || []).map(p => (
                                <span key={`bwl-${p}`} style={{ padding: '3px 10px', borderRadius: 12, background: `${B.bl}15`, border: `1px solid ${B.bl}40`, fontSize: 9, fontWeight: 600, color: B.bl, fontFamily: F }}>Bowl: {p}</span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Toolkit: shots + variations */}
                {(player.gotoShots?.length > 0 || player.bwlVariations?.length > 0) && (
                    <div style={{ marginTop: 12 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: B.g400, fontFamily: F, textTransform: 'uppercase', marginBottom: 6 }}>Toolkit</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {(player.gotoShots || []).map(s => (
                                <span key={s} style={{ padding: '3px 10px', borderRadius: 12, background: `${B.pk}15`, border: `1px solid ${B.pk}40`, fontSize: 9, fontWeight: 600, color: B.pk, fontFamily: F }}>{s}</span>
                            ))}
                            {(player.bwlVariations || []).map(v => (
                                <span key={v} style={{ padding: '3px 10px', borderRadius: 12, background: `${B.bl}15`, border: `1px solid ${B.bl}40`, fontSize: 9, fontWeight: 600, color: B.bl, fontFamily: F }}>{v}</span>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* ═══ COACH NARRATIVE ═══ */}
            {hasNarrative && (
                <div style={{ ...sCard, padding: 20 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: B.nvD, fontFamily: F, marginBottom: 12 }}>Coach's Assessment</div>
                    <div style={{ borderLeft: `3px solid ${B.pk}`, background: B.pkL, borderRadius: '0 10px 10px 0', padding: '14px 18px' }}>
                        <div style={{ fontSize: 12, color: B.g600, fontFamily: F, lineHeight: 1.7, fontStyle: 'italic', whiteSpace: 'pre-wrap' }}>{assessment.narrative}</div>
                        <div style={{ fontSize: 9, fontWeight: 700, color: B.nvD, fontFamily: F, marginTop: 10 }}>— Head Coach, Royals Academy Melbourne</div>
                    </div>
                </div>
            )}

            {/* ═══ STRENGTHS & PRIORITIES ═══ */}
            {(hasStrengths || hasPriorities) && (
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {hasStrengths && (
                        <div style={{ flex: '1 1 200px' }}>
                            <ItemList items={assessment.strengths} icon="+" color={B.grn} title="STRENGTHS" />
                        </div>
                    )}
                    {hasPriorities && (
                        <div style={{ flex: '1 1 200px' }}>
                            <ItemList items={assessment.priorities} icon=">" color={B.amb} title="DEVELOPMENT PRIORITIES" />
                        </div>
                    )}
                </div>
            )}

            {/* ═══ 12-WEEK PLAN ═══ */}
            {hasPlan && (
                <div style={{ ...sCard, padding: 20 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: B.nvD, fontFamily: F, marginBottom: 16 }}>12-Week Development Plan</div>
                    <div style={{ display: 'flex', gap: 10, flexDirection: 'column' }}>
                        {[
                            { phase: 'EXPLORE', weeks: '1-4', color: B.pk, content: assessment.planExplore },
                            { phase: 'CHALLENGE', weeks: '5-8', color: B.bl, content: assessment.planChallenge },
                            { phase: 'EXECUTE', weeks: '9-12', color: B.nvD, content: assessment.planExecute },
                        ].filter(p => p.content).map(p => (
                            <div key={p.phase} style={{ borderRadius: 10, overflow: 'hidden', border: `1px solid ${B.g200}` }}>
                                <div style={{ background: p.color, padding: '8px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ fontSize: 10, fontWeight: 800, color: '#FFF', letterSpacing: 0.5, fontFamily: F }}>{p.phase}</div>
                                    <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.7)', fontFamily: F }}>Weeks {p.weeks}</div>
                                </div>
                                <div style={{ padding: '12px 14px' }}>
                                    <div style={{ fontSize: 11, color: B.g600, fontFamily: F, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{p.content}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ═══ VIEW REPORT CARD BUTTON ═══ */}
            {hasAssessment && (
                <button
                    onClick={() => setShowReport(!showReport)}
                    style={{ width: '100%', padding: '14px 20px', borderRadius: 10, border: `2px solid ${B.pk}`, background: showReport ? B.pk : 'transparent', color: showReport ? B.w : B.pk, fontSize: 13, fontWeight: 800, fontFamily: F, cursor: 'pointer', letterSpacing: 0.5, transition: 'all 0.2s' }}
                >
                    {showReport ? 'HIDE REPORT CARD' : 'VIEW REPORT CARD'}
                </button>
            )}

            {/* Report Card (rendered inline for viewing, no admin data shown) */}
            {showReport && hasAssessment && (
                <Suspense fallback={<div style={{ padding: 24, textAlign: 'center', color: B.g400, fontSize: 12, fontFamily: F }}>Loading report...</div>}>
                    <div style={{ border: `1px solid ${B.g200}`, borderRadius: 12, overflow: 'hidden', background: B.w }}>
                        <div style={{ position: 'relative', left: 0 }}>
                            <ReportCard
                                player={player}
                                assessment={assessment}
                                engine={{
                                    narrative: assessment.narrative,
                                    strengths: assessment.strengths,
                                    growthAreas: assessment.priorities,
                                    plan: { explore: assessment.planExplore, challenge: assessment.planChallenge, execute: assessment.planExecute },
                                }}
                                isAdmin={false}
                            />
                        </div>
                    </div>
                </Suspense>
            )}

            {/* ═══ NOT ASSESSED YET STATE ═══ */}
            {!hasAssessment && (
                <div style={{ ...sCard, padding: 24, textAlign: 'center' }}>
                    <div style={{ fontSize: 13, color: B.g400, fontFamily: F, lineHeight: 1.6 }}>
                        Your coaches haven't completed your full assessment yet — check back soon.
                        <br />Your T20 archetype is ready above based on your onboarding responses.
                    </div>
                </div>
            )}
        </div>
    );
}
