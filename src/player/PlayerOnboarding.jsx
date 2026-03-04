import React, { useState, useRef, useEffect } from "react";
import { trackEvent, EVT } from "../analytics/tracker";
import { useAuth } from "../context/AuthContext";
import { useEngine } from "../context/EngineContext";

import { B, F, dkWrap, sCard } from "../data/theme";
import {
    ROLES, BAT_ARCH, BWL_ARCH, VOICE_QS, BAT_POSITIONS,
    BATTING_PHASE_PREFS, BOWLING_PHASE_PREFS, BOWLING_SPEEDS,
    GOTO_SHOTS, PACE_VARIATIONS, SPIN_VARIATIONS, PHASES, PH_MAP,
    IQ_ITEMS, MN_ITEMS
} from "../data/skillItems";
import { FMTS, BAT_H, BWL_T } from "../data/competitionData";
import { getAge, techItems } from "../engine/ratingEngine";
import { savePlayerToDB } from "../db/playerDb";
import { PLAYER_DEFS } from "../data/skillDefinitions";
import {
    Hdr, SecH, Inp, Sel, TArea, NumInp, Dots, AssGrid, CompLevelSel
} from "../shared/FormComponents";
import { useSessionState } from "../shared/useSessionState";

export default function PlayerOnboarding() {
    const { session, signOut, portal } = useAuth();
    const { compTiers, assocList, assocComps, vmcuAssocs } = useEngine();

    const [pStep, setPStep] = useSessionState('rra_pStep', 0);
    const [showOnboardGuide, setShowOnboardGuide] = useSessionState('rra_obGuide', true);

    const [pd, setPd] = useSessionState('rra_pd', { grades: [{}], topBat: [{}], topBowl: [{}] });
    const pu = (k, v) => setPd(d => ({ ...d, [k]: v }));
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');

    const stepStartRef = useRef(Date.now());

    // ── Abandon tracking: fire SURVEY_ABANDON if player leaves mid-onboarding ──
    useEffect(() => {
        const handleUnload = () => {
            if (portal === 'player' && pStep > 0 && pStep < 7) {
                trackEvent(EVT.SURVEY_ABANDON, { step: pStep, elapsed: Date.now() - stepStartRef.current });
            }
        };
        window.addEventListener('beforeunload', handleUnload);
        return () => window.removeEventListener('beforeunload', handleUnload);
    }, [portal, pStep]);

    const stpN = ["Profile", "Competition History", "T20 Identity", "Self-Assessment", "Player Voice", "Medical & Goals", "Review"];
    const age = getAge(pd.dob);
    const show16 = age && age >= 16;
    const rid = ROLES.find(r => r.label === pd.role)?.id || 'batter';
    const hasBowling = ['pace', 'spin', 'allrounder'].includes(rid);
    const isPace = ['pace', 'allrounder'].includes(rid);

    const goTop = () => window.scrollTo(0, 0);
    const btnSty = (ok, full) => ({ padding: full ? "14px 20px" : "8px 16px", borderRadius: 8, border: "none", background: ok ? `linear-gradient(135deg,${B.bl},${B.pk})` : B.g200, color: ok ? B.w : B.g400, fontSize: 13, fontWeight: 800, fontFamily: F, cursor: ok ? "pointer" : "default", letterSpacing: .5, textTransform: "uppercase", width: full ? "100%" : "auto", marginTop: 6 });

    const isValidDob = (dob) => {
        if (!dob) return false;
        const m = dob.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (!m) return false;
        const [, dd, mm, yyyy] = m;
        const d = new Date(+yyyy, +mm - 1, +dd);
        return d.getFullYear() === +yyyy && d.getMonth() === +mm - 1 && d.getDate() === +dd && d < new Date();
    };
    const dobInvalid = pd.dob && !isValidDob(pd.dob);

    // ── Onboarding step timer ──
    const advanceStep = (next) => {
        if (pStep === 0 && (!pd.name || !isValidDob(pd.dob))) return;
        const elapsed = Date.now() - stepStartRef.current;
        const progress = pd.onboardingProgress || { steps: {}, totalTimeMs: 0, lastStepReached: 0 };
        progress.steps[pStep] = { completed: true, durationMs: elapsed, completedAt: new Date().toISOString() };
        progress.totalTimeMs = (progress.totalTimeMs || 0) + elapsed;
        progress.lastStepReached = Math.max(progress.lastStepReached || 0, next);
        progress.percentComplete = Math.round((next / (stpN.length - 1)) * 100);
        pu('onboardingProgress', progress);
        trackEvent(EVT.SURVEY_STEP || 'survey_step', { step: pStep, stepName: stpN[pStep], durationMs: elapsed });
        stepStartRef.current = Date.now();
        setPStep(next);
        goTop();
    };

    const renderP = () => {
        if (pStep === 0) return (
            <div style={sCard}>
                <SecH title="Player Profile" sub="Tell us about yourself" />
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0 12px" }}>
                    <Inp half label="Full Name *" value={pd.name} onChange={v => pu("name", v)} ph="Your full name" />
                    <div style={{ flex: 1, minWidth: 130, marginBottom: 8 }}>
                        <div style={{ fontSize: 10, color: dobInvalid ? B.red : B.g600, fontFamily: F, marginBottom: 1 }}>Date of Birth *{dobInvalid ? ' (use DD/MM/YYYY)' : ''}</div>
                        <input type="text" value={pd.dob || ""} onChange={e => pu("dob", e.target.value)} placeholder="DD/MM/YYYY"
                            style={{ width: "100%", border: "none", borderBottom: `1.5px solid ${dobInvalid ? B.red : B.g200}`, padding: "5px 0", fontSize: 12, fontFamily: F, color: B.g800, outline: "none", background: "transparent", boxSizing: "border-box" }} />
                    </div>
                    <Inp half label="Phone" value={pd.phone} onChange={v => pu("phone", v)} ph="Mobile" />
                    <Inp half label="Email" value={pd.email} onChange={v => pu("email", v)} ph="Email" />
                    <Inp half label="Club" value={pd.club} onChange={v => pu("club", v)} ph="e.g. Doncaster CC" />
                    <Sel half label="Association" value={pd.assoc} onChange={v => pu("assoc", v)} opts={assocList} />
                    <Sel half label="Gender" value={pd.gender} onChange={v => pu("gender", v)} opts={['M', 'F']} />
                </div>
                <SecH title="Parent / Guardian" sub="Required for under 18" />
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0 12px" }}>
                    <Inp half label="Parent Name" value={pd.parentName} onChange={v => pu("parentName", v)} ph="Full name" />
                    <Inp half label="Parent Email" value={pd.parentEmail} onChange={v => pu("parentEmail", v)} ph="Email" />
                </div>
            </div>
        );

        if (pStep === 1) {
            const gs = pd.grades || [{}];
            const ug = (i, k, v) => { const n = [...gs]; n[i] = { ...n[i], [k]: v }; pu("grades", n); };
            const canAdd = gs.length < 3;
            return (<div>
                <SecH title="Competition History" sub="Your top competition levels from last season (2025/26). Up to 3, highest level first." />
                <div style={{ background: B.pkL, borderRadius: 8, padding: "8px 10px", marginBottom: 10, fontSize: 11, fontFamily: F, color: B.pk, lineHeight: 1.4 }}>
                    <strong>Start with your highest level played</strong> — Premier, Senior, Rep cricket first. Then add lower competition levels if you played at multiple levels.<br />
                    <span style={{ color: B.g600 }}>Only include competitions where you played <strong>6 or more matches</strong> in the season.</span>
                </div>
                {gs.map((g, gi) => {
                    const selTier = (compTiers || []).find(t => t.code === g.level);
                    return (<div key={gi} style={{ ...sCard, borderLeft: `3px solid ${[B.pk, B.bl, B.nv][gi] || B.pk}`, padding: 12 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                            <div style={{ fontSize: 11, fontWeight: 800, color: B.nvD, fontFamily: F }}>COMPETITION LEVEL {gi + 1}</div>
                            {gs.length > 1 && <button onClick={() => pu("grades", gs.filter((_, i) => i !== gi))} style={{ fontSize: 9, color: B.red, background: "none", border: "none", cursor: "pointer", fontFamily: F }}>✕ Remove</button>}
                        </div>
                        <CompLevelSel value={g.level} onChange={v => ug(gi, "level", v)} compTiers={compTiers} gender={pd.gender} assocComps={assocComps} vmcuAssocs={vmcuAssocs} />
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "0 8px", marginTop: 8 }}>
                            <Inp half label="Club / Team" value={g.team} onChange={v => ug(gi, "team", v)} ph="e.g. Doncaster U14" />
                            <Inp half label="Matches" value={g.matches} onChange={v => ug(gi, "matches", v)} type="number" ph="0" />
                            {show16 && <Sel half label="Format" value={g.format} onChange={v => ug(gi, "format", v)} opts={FMTS} />}
                        </div>
                        {/* Compact stat rows — side by side */}
                        <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                            <div style={{ flex: "1 1 0", minWidth: 160, padding: "8px 10px", background: B.pkL, borderRadius: 6 }}>
                                <div style={{ fontSize: 9, fontWeight: 700, color: B.pk, fontFamily: F, marginBottom: 6 }}>BAT</div>
                                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                    <NumInp label="Inn" value={g.batInn} onChange={v => ug(gi, "batInn", v)} w={40} />
                                    <NumInp label="Runs" value={g.runs} onChange={v => ug(gi, "runs", v)} />
                                    <NumInp label="NO" value={g.notOuts} onChange={v => ug(gi, "notOuts", v)} w={36} />
                                    <NumInp label="HS" value={g.hs} onChange={v => ug(gi, "hs", v)} w={44} />
                                    <NumInp label="Avg" value={g.avg} onChange={v => ug(gi, "avg", v)} w={48} />
                                    <NumInp label="BF" value={g.ballsFaced} onChange={v => ug(gi, "ballsFaced", v)} w={48} />
                                </div>
                                {/* HS Detail — expandable */}
                                <details style={{ marginTop: 6 }}>
                                    <summary style={{ fontSize: 8, color: B.pk, fontFamily: F, cursor: "pointer", fontWeight: 600 }}>HS Detail ▾</summary>
                                    <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                                        <NumInp label="HS BF" value={g.hsBallsFaced} onChange={v => ug(gi, "hsBallsFaced", v)} w={48} />
                                        <NumInp label="HS 4/6" value={g.hsBoundaries} onChange={v => ug(gi, "hsBoundaries", v)} w={48} />
                                    </div>
                                </details>
                            </div>
                            <div style={{ flex: "1.4 1 0", minWidth: 200, padding: "8px 10px", background: B.blL, borderRadius: 6 }}>
                                <div style={{ fontSize: 9, fontWeight: 700, color: B.bl, fontFamily: F, marginBottom: 6 }}>BOWL</div>
                                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                    <NumInp label="Inn" value={g.bowlInn} onChange={v => ug(gi, "bowlInn", v)} w={40} />
                                    <NumInp label="Ovrs" value={g.overs} onChange={v => ug(gi, "overs", v)} w={44} />
                                    <NumInp label="Wkts" value={g.wkts} onChange={v => ug(gi, "wkts", v)} w={44} />
                                    <NumInp label="SR" value={g.sr} onChange={v => ug(gi, "sr", v)} w={40} />
                                    <NumInp label="Avg" value={g.bAvg} onChange={v => ug(gi, "bAvg", v)} w={44} />
                                    <NumInp label="Econ" value={g.econ} onChange={v => ug(gi, "econ", v)} w={44} />
                                    <NumInp label="BB W" value={g.bestBowlWkts} onChange={v => ug(gi, "bestBowlWkts", v)} w={44} />
                                    <NumInp label="BB R" value={g.bestBowlRuns} onChange={v => ug(gi, "bestBowlRuns", v)} w={44} />
                                </div>
                            </div>
                            <div style={{ flex: "0.8 1 0", minWidth: 130, padding: "8px 10px", background: B.g100, borderRadius: 6 }}>
                                <div style={{ fontSize: 9, fontWeight: 700, color: B.nv, fontFamily: F, marginBottom: 6 }}>FIELD</div>
                                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                    <NumInp label="Ct" value={g.ct} onChange={v => ug(gi, "ct", v)} w={40} />
                                    <NumInp label="RO" value={g.ro} onChange={v => ug(gi, "ro", v)} w={40} />
                                    <NumInp label="St" value={g.st} onChange={v => ug(gi, "st", v)} w={40} />
                                    <NumInp label="KpCt" value={g.keeperCatches} onChange={v => ug(gi, "keeperCatches", v)} w={44} />
                                </div>
                            </div>
                        </div>
                    </div>);
                })}
                {canAdd && <button onClick={() => pu("grades", [...gs, {}])} style={{ ...btnSty(true, true), background: B.bl, fontSize: 12 }}>+ ADD COMPETITION LEVEL ({3 - gs.length} remaining)</button>}
                {!canAdd && <div style={{ fontSize: 10, color: B.g400, fontFamily: F, textAlign: "center", marginTop: 4 }}>Maximum 3 competition levels — choose your highest levels played</div>}

                {/* ═══ TOP PERFORMANCES ═══ */}
                <div style={{ marginTop: 20, borderTop: `2px solid ${B.g200}`, paddingTop: 16 }}>
                    <SecH title="Top Performances" sub="Your best individual batting scores and bowling figures from the season. Up to 3 each — easily found on your PlayCricket match summary." />

                    {/* ── TOP BATTING SCORES ── */}
                    <div style={{ fontSize: 11, fontWeight: 800, color: B.pk, fontFamily: F, marginBottom: 6, marginTop: 10 }}>🏏 BEST BATTING SCORES</div>
                    <div style={{ fontSize: 10, color: B.g400, fontFamily: F, marginBottom: 8, lineHeight: 1.4 }}>Enter your top innings — runs, balls faced, boundaries. Available from any playing stats page.</div>
                    {(pd.topBat || [{}]).map((b, bi) => {
                        const uB = (k, v) => { const n = [...(pd.topBat || [{}])]; n[bi] = { ...n[bi], [k]: v }; pu("topBat", n); };
                        const compOpts = gs.filter(g => g.level).map(g => {
                            const t = (compTiers || []).find(ct => ct.code === g.level);
                            return t ? t.competition_name : g.level;
                        });
                        return (<div key={bi} style={{ background: B.pkL, borderRadius: 8, padding: 10, marginBottom: 6, borderLeft: `3px solid ${B.pk}` }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: B.pk, fontFamily: F }}>SCORE {bi + 1}</div>
                                {(pd.topBat || []).length > 1 && <button onClick={() => pu("topBat", (pd.topBat || []).filter((_, i) => i !== bi))} style={{ fontSize: 9, color: B.red, background: "none", border: "none", cursor: "pointer", fontFamily: F }}>✕</button>}
                            </div>
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                                <NumInp label="R" value={b.runs} onChange={v => uB("runs", v)} w={44} />
                                <NumInp label="B" value={b.balls} onChange={v => uB("balls", v)} w={44} />
                                <NumInp label="4s" value={b.fours} onChange={v => uB("fours", v)} w={36} />
                                <NumInp label="6s" value={b.sixes} onChange={v => uB("sixes", v)} w={36} />
                                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                    <input type="checkbox" checked={!!b.notOut} onChange={e => uB("notOut", e.target.checked)} style={{ width: 14, height: 14, accentColor: B.pk }} />
                                    <span style={{ fontSize: 9, fontWeight: 600, color: B.g600, fontFamily: F }}>NO</span>
                                </div>
                            </div>
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                                {compOpts.length > 0 && <div style={{ flex: "1 1 100px" }}><div style={{ fontSize: 8, fontWeight: 600, color: B.g400, fontFamily: F, marginBottom: 2 }}>Competition</div>
                                    <select value={b.comp || ''} onChange={e => uB("comp", e.target.value)} style={{ width: "100%", border: `1px solid ${B.g200}`, borderRadius: 4, padding: "4px 6px", fontSize: 10, fontFamily: F, background: B.w }}>
                                        <option value="">Select...</option>
                                        {compOpts.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>}
                                <div style={{ flex: "1 1 100px" }}><Inp label="vs" value={b.vs} onChange={v => uB("vs", v)} ph="Opposition" /></div>
                                <div style={{ flex: "0 1 80px" }}><Sel label="Fmt" value={b.format} onChange={v => uB("format", v)} opts={FMTS} /></div>
                            </div>
                        </div>);
                    })}
                    {(pd.topBat || []).length < 3 && <button onClick={() => pu("topBat", [...(pd.topBat || []), {}])} style={{ ...btnSty(true, true), background: B.pk, fontSize: 11, marginTop: 2 }}>+ ADD BATTING SCORE ({3 - (pd.topBat || []).length} remaining)</button>}

                    {/* ── TOP BOWLING FIGURES ── */}
                    <div style={{ fontSize: 11, fontWeight: 800, color: B.bl, fontFamily: F, marginBottom: 6, marginTop: 16 }}>🎯 BEST BOWLING FIGURES</div>
                    <div style={{ fontSize: 10, color: B.g400, fontFamily: F, marginBottom: 8, lineHeight: 1.4 }}>Enter your best bowling spells — wickets, runs, overs. Available from any playing stats page.</div>
                    {(pd.topBowl || [{}]).map((b, bi) => {
                        const uW = (k, v) => { const n = [...(pd.topBowl || [{}])]; n[bi] = { ...n[bi], [k]: v }; pu("topBowl", n); };
                        const compOpts = gs.filter(g => g.level).map(g => {
                            const t = (compTiers || []).find(ct => ct.code === g.level);
                            return t ? t.competition_name : g.level;
                        });
                        return (<div key={bi} style={{ background: B.blL, borderRadius: 8, padding: 10, marginBottom: 6, borderLeft: `3px solid ${B.bl}` }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: B.bl, fontFamily: F }}>FIGURES {bi + 1}</div>
                                {(pd.topBowl || []).length > 1 && <button onClick={() => pu("topBowl", (pd.topBowl || []).filter((_, i) => i !== bi))} style={{ fontSize: 9, color: B.red, background: "none", border: "none", cursor: "pointer", fontFamily: F }}>✕</button>}
                            </div>
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                <NumInp label="W" value={b.wkts} onChange={v => uW("wkts", v)} w={40} />
                                <NumInp label="R" value={b.runs} onChange={v => uW("runs", v)} w={44} />
                                <NumInp label="O" value={b.overs} onChange={v => uW("overs", v)} w={44} />
                                <NumInp label="M" value={b.maidens} onChange={v => uW("maidens", v)} w={36} />
                            </div>
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                                {compOpts.length > 0 && <div style={{ flex: "1 1 100px" }}><div style={{ fontSize: 8, fontWeight: 600, color: B.g400, fontFamily: F, marginBottom: 2 }}>Competition</div>
                                    <select value={b.comp || ''} onChange={e => uW("comp", e.target.value)} style={{ width: "100%", border: `1px solid ${B.g200}`, borderRadius: 4, padding: "4px 6px", fontSize: 10, fontFamily: F, background: B.w }}>
                                        <option value="">Select...</option>
                                        {compOpts.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>}
                                <div style={{ flex: "1 1 100px" }}><Inp label="vs" value={b.vs} onChange={v => uW("vs", v)} ph="Opposition" /></div>
                                <div style={{ flex: "0 1 80px" }}><Sel label="Fmt" value={b.format} onChange={v => uW("format", v)} opts={FMTS} /></div>
                            </div>
                        </div>);
                    })}
                    {(pd.topBowl || []).length < 3 && <button onClick={() => pu("topBowl", [...(pd.topBowl || []), {}])} style={{ ...btnSty(true, true), background: B.bl, fontSize: 11, marginTop: 2 }}>+ ADD BOWLING FIGURES ({3 - (pd.topBowl || []).length} remaining)</button>}
                </div>
            </div>);
        }

        if (pStep === 2) {
            const ChipSelect = ({ options, selected, onToggle, color }) => (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4, marginBottom: 8 }}>
                    {options.map(o => {
                        const sel = (selected || []).includes(typeof o === 'string' ? o : o.id); return (
                            <button key={typeof o === 'string' ? o : o.id} onClick={() => { const id = typeof o === 'string' ? o : o.id; const cur = selected || []; onToggle(sel ? cur.filter(x => x !== id) : [...cur, id]); }}
                                style={{ padding: '6px 12px', borderRadius: 20, border: `1.5px solid ${sel ? color : B.g200}`, background: sel ? `${color}18` : B.w, color: sel ? color : B.g600, fontSize: 10, fontWeight: sel ? 700 : 500, fontFamily: F, cursor: 'pointer', transition: 'all 0.15s' }}
                            >{typeof o === 'string' ? o : `${o.icon || ''} ${o.label}`.trim()}</button>
                        );
                    })}
                </div>
            );
            const ArchCard = ({ arch, selected, onSelect }) => (
                <div onClick={() => onSelect(arch.id)} style={{ ...sCard, borderLeft: `3px solid ${selected === arch.id ? arch.c : B.g200}`, background: selected === arch.id ? `${arch.c}08` : B.w, cursor: 'pointer', padding: '10px 12px', transition: 'all 0.15s' }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: selected === arch.id ? arch.c : B.nvD, fontFamily: F }}>{arch.nm}</div>
                    <div style={{ fontSize: 9, color: B.g600, fontFamily: F, marginTop: 2 }}>{arch.sub}</div>
                </div>
            );
            return (<div>
                <div style={sCard}>
                    <SecH title="Playing Style" />
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0 12px' }}>
                        <Sel half label="Primary Role" value={pd.role} onChange={v => pu('role', v)} opts={ROLES.map(r => r.label)} />
                        <Sel half label="Batting Hand" value={pd.bat} onChange={v => pu('bat', v)} opts={BAT_H} />
                        <Sel half label="Bowling Type" value={pd.bowl} onChange={v => pu('bowl', v)} opts={BWL_T} />
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0 12px', marginTop: 12 }}>
                        <Sel half label="Primary Skill *" value={pd.primarySkill} onChange={v => pu('primarySkill', v)} opts={['Batting', 'Fast Bowling', 'Spin Bowling', 'Wicket Keeping']} />
                        <Sel half label="Secondary Skill" value={pd.secondarySkill} onChange={v => pu('secondarySkill', v)} opts={['None', 'Batting', 'Fast Bowling', 'Spin Bowling', 'Wicket Keeping']} />
                    </div>
                </div>

                {/* ═══ BATTING IDENTITY ═══ */}
                <div style={{ ...sCard, borderLeft: `3px solid ${B.pk}` }}>
                    <SecH title="Your Batting Game" sub="Help us understand your batting style and strengths" />
                    <div style={{ flex: 1, minWidth: 130, marginBottom: 8 }}>
                        <div style={{ fontSize: 10, color: B.g600, fontFamily: F, marginBottom: 1 }}>Batting Position</div>
                        <select value={pd.batPosition || ""} onChange={e => pu('batPosition', e.target.value)}
                            style={{ width: "100%", border: "none", borderBottom: `1.5px solid ${B.g200}`, padding: "5px 0", fontSize: 12, fontFamily: F, color: pd.batPosition ? B.g800 : B.g400, outline: "none", background: "transparent", boxSizing: "border-box" }}>
                            <option value="">Select...</option>
                            {BAT_POSITIONS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                        </select>
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: B.pk, fontFamily: F, marginTop: 10, marginBottom: 4 }}>Preferred Batting Phases</div>
                    <div style={{ fontSize: 9, color: B.g400, fontFamily: F, marginBottom: 4 }}>When do you feel most dangerous?</div>
                    <ChipSelect options={BATTING_PHASE_PREFS} selected={pd.batPhases} onToggle={v => pu('batPhases', v)} color={B.pk} />
                    <div style={{ fontSize: 10, fontWeight: 700, color: B.pk, fontFamily: F, marginTop: 8, marginBottom: 4 }}>Go-To Shots</div>
                    <div style={{ fontSize: 9, color: B.g400, fontFamily: F, marginBottom: 4 }}>Select the shots you back yourself to play under pressure</div>
                    <ChipSelect options={GOTO_SHOTS} selected={pd.gotoShots} onToggle={v => pu('gotoShots', v)} color={B.pk} />
                    <Inp label="Pressure Shot" value={pd.pressureShot} onChange={v => pu('pressureShot', v)} ph="What's your go-to shot when you need runs?" />
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
                        <div style={{ flex: '1 1 120px' }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: B.pk, fontFamily: F, marginBottom: 4 }}>Comfort vs Spin</div>
                            <Dots value={pd.spinComfort} onChange={v => pu('spinComfort', v)} color={B.pk} />
                        </div>
                        <div style={{ flex: '1 1 120px' }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: B.pk, fontFamily: F, marginBottom: 4 }}>Comfort vs Short Ball</div>
                            <Dots value={pd.shortBallComfort} onChange={v => pu('shortBallComfort', v)} color={B.pk} />
                        </div>
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: B.pk, fontFamily: F, marginTop: 12, marginBottom: 6 }}>Which batting archetype best describes you?</div>
                    {BAT_ARCH.map(a => <ArchCard key={a.id} arch={a} selected={pd.playerBatArch} onSelect={v => pu('playerBatArch', v)} />)}
                </div>

                {/* ═══ BOWLING IDENTITY (only if role includes bowling) ═══ */}
                {hasBowling && <div style={{ ...sCard, borderLeft: `3px solid ${B.bl}` }}>
                    <SecH title="Your Bowling Game" sub="Help us understand your bowling weapons" />
                    <div style={{ fontSize: 10, fontWeight: 700, color: B.bl, fontFamily: F, marginTop: 4, marginBottom: 4 }}>Preferred Bowling Phases</div>
                    <div style={{ fontSize: 9, color: B.g400, fontFamily: F, marginBottom: 4 }}>When do you want the ball?</div>
                    <ChipSelect options={BOWLING_PHASE_PREFS} selected={pd.bwlPhases} onToggle={v => pu('bwlPhases', v)} color={B.bl} />
                    {isPace && <div style={{ flex: 1, minWidth: 130, marginBottom: 8 }}>
                        <div style={{ fontSize: 10, color: B.g600, fontFamily: F, marginBottom: 1 }}>Bowling Speed</div>
                        <select value={pd.bwlSpeed || ""} onChange={e => pu('bwlSpeed', e.target.value)}
                            style={{ width: "100%", border: "none", borderBottom: `1.5px solid ${B.g200}`, padding: "5px 0", fontSize: 12, fontFamily: F, color: pd.bwlSpeed ? B.g800 : B.g400, outline: "none", background: "transparent", boxSizing: "border-box" }}>
                            <option value="">Select...</option>
                            {BOWLING_SPEEDS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                        </select>
                    </div>}
                    <div style={{ fontSize: 10, fontWeight: 700, color: B.bl, fontFamily: F, marginTop: 8, marginBottom: 4 }}>Bowling Variations</div>
                    <div style={{ fontSize: 9, color: B.g400, fontFamily: F, marginBottom: 4 }}>Which deliveries do you have in your toolkit?</div>
                    <ChipSelect options={isPace ? PACE_VARIATIONS : SPIN_VARIATIONS} selected={pd.bwlVariations} onToggle={v => pu('bwlVariations', v)} color={B.bl} />
                    <Inp label="Shut-Down Delivery" value={pd.shutdownDelivery} onChange={v => pu('shutdownDelivery', v)} ph="What's your go-to delivery under pressure?" />
                    <div style={{ fontSize: 10, fontWeight: 700, color: B.bl, fontFamily: F, marginTop: 12, marginBottom: 6 }}>Which bowling archetype best describes you?</div>
                    {BWL_ARCH.map(a => <ArchCard key={a.id} arch={a} selected={pd.playerBwlArch} onSelect={v => pu('playerBwlArch', v)} />)}
                </div>}

                {/* ═══ ABOUT YOU ═══ */}
                <div style={sCard}>
                    <SecH title="About You" />
                    <NumInp label="Height (cm)" value={pd.heightCm} onChange={v => pu('heightCm', v)} w={80} />
                </div>
            </div>);
        }

        if (pStep === 3) {
            const sT = techItems(rid);
            const phItems = PH_MAP[rid] || PH_MAP.batter;
            return (<div style={sCard}>
                <SecH title="Self-Assessment" sub="There are no wrong answers here — just rate yourself honestly based on where you feel your game is right now. Tap the ⓘ button next to any item to see what each level means." />
                <div style={{ background: B.g100, borderRadius: 8, padding: '8px 12px', marginBottom: 10, lineHeight: 1.6 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: B.nvD, fontFamily: F, marginBottom: 4 }}>Rating Guide</div>
                    <div style={{ fontSize: 10, color: B.g600, fontFamily: F }}>
                        <strong style={{ color: B.g800 }}>1 = Just Starting</strong> — I'm still learning what this is<br />
                        <strong style={{ color: B.g800 }}>2 = Developing</strong> — I can do it sometimes, but not every time<br />
                        <strong style={{ color: B.g800 }}>3 = Solid</strong> — I can do this most of the time<br />
                        <strong style={{ color: B.g800 }}>4 = Strong</strong> — I do this well, even under pressure<br />
                        <strong style={{ color: B.g800 }}>5 = Elite</strong> — This is one of the best parts of my game
                    </div>
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: B.pk, fontFamily: F, marginBottom: 6, marginTop: 10 }}>{sT.pL}</div>
                <AssGrid items={sT.pri} values={pd} onRate={pu} color={B.pk} SKILL_DEFS={PLAYER_DEFS} keyPrefix="sr_t1" />
                <div style={{ fontSize: 11, fontWeight: 700, color: B.bl, fontFamily: F, marginBottom: 6, marginTop: 16 }}>Game Intelligence</div>
                <AssGrid items={IQ_ITEMS} values={pd} onRate={pu} color={B.sky} SKILL_DEFS={PLAYER_DEFS} keyPrefix="sr_iq" />
                <div style={{ fontSize: 11, fontWeight: 700, color: B.prp, fontFamily: F, marginBottom: 6, marginTop: 16 }}>Mental & Character</div>
                <AssGrid items={MN_ITEMS} values={pd} onRate={pu} color={B.prp} SKILL_DEFS={PLAYER_DEFS} keyPrefix="sr_mn" />

                {/* ═══ PHYSICAL SELF-ASSESSMENT (v2) ═══ */}
                <div style={{ borderTop: `2px solid ${B.g200}`, marginTop: 16, paddingTop: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: B.org, fontFamily: F, marginBottom: 6 }}>Physical & Athletic</div>
                    <div style={{ fontSize: 9, color: B.g400, fontFamily: F, marginBottom: 6 }}>How would you rate your physical capabilities?</div>
                    <AssGrid items={phItems} values={pd} onRate={pu} color={B.org} SKILL_DEFS={PLAYER_DEFS} keyPrefix="sr_ph" />
                </div>

                {/* ═══ PHASE SELF-ASSESSMENT (v2) ═══ */}
                <div style={{ borderTop: `2px solid ${B.g200}`, marginTop: 16, paddingTop: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: B.grn, fontFamily: F, marginBottom: 6 }}>Phase Effectiveness</div>
                    <div style={{ fontSize: 9, color: B.g400, fontFamily: F, marginBottom: 6 }}>Rate your effectiveness in each phase of the game (1-5)</div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: B.pk, fontFamily: F, marginTop: 8, marginBottom: 4 }}>Batting</div>
                    <AssGrid items={PHASES.map(p => p.nm)} values={Object.fromEntries(PHASES.map((p, i) => [`sr_pb_${i}`, pd[`sr_pb_${p.id}`]]))} onRate={(k, v) => { const idx = parseInt(k.split('_').pop()); pu(`sr_pb_${PHASES[idx].id}`, v); }} color={B.pk} SKILL_DEFS={PLAYER_DEFS} keyPrefix="sr_pb" />
                    {hasBowling && <><div style={{ fontSize: 10, fontWeight: 600, color: B.bl, fontFamily: F, marginTop: 8, marginBottom: 4 }}>Bowling</div>
                        <AssGrid items={PHASES.map(p => p.nm)} values={Object.fromEntries(PHASES.map((p, i) => [`sr_pw_${i}`, pd[`sr_pw_${p.id}`]]))} onRate={(k, v) => { const idx = parseInt(k.split('_').pop()); pu(`sr_pw_${PHASES[idx].id}`, v); }} color={B.bl} SKILL_DEFS={PLAYER_DEFS} keyPrefix="sr_pw" /></>}
                </div>
            </div>);
        }

        if (pStep === 4) return (<div style={sCard}>
            <SecH title="Player Voice" sub="Tell us about your game" />
            {VOICE_QS.map((q, i) => <TArea key={i} label={q} value={pd[`v_${i}`]} onChange={v => pu(`v_${i}`, v)} rows={2} />)}
        </div>);

        if (pStep === 5) return (<div style={sCard}>
            <SecH title="Injury & Medical" />
            <TArea value={pd.injury} onChange={v => pu("injury", v)} ph="Current or past injuries..." rows={3} />
            <SecH title="Goals & Aspirations" />
            <TArea value={pd.goals} onChange={v => pu("goals", v)} ph="What do you want from the program?" rows={3} />
        </div>);

        if (pStep === 6) {
            const gc = (pd.grades || []).filter(g => g.level).length;
            const tb = (pd.topBat || []).filter(b => +b.runs > 0).length;
            const tw = (pd.topBowl || []).filter(b => +b.wkts > 0 || +b.runs > 0).length;
            return (<div>
                <SecH title="Review & Submit" />
                <div style={sCard}><div style={{ fontSize: 12, fontWeight: 700, color: B.nvD, fontFamily: F }}>{pd.name || "—"}</div><div style={{ fontSize: 11, color: B.g400, fontFamily: F }}>{pd.dob || "—"} • {pd.club || "—"} • {gc} competition level(s){tb > 0 ? ` • ${tb} top score(s)` : ''}{tw > 0 ? ` • ${tw} bowling fig(s)` : ''}</div></div>
                {submitError && <div style={{ fontSize: 11, color: B.red, fontFamily: F, marginBottom: 8, fontWeight: 600 }}>{submitError}</div>}
                <button disabled={submitting} onClick={async () => {
                    if (!pd.name || !pd.dob) return;
                    setSubmitting(true);
                    setSubmitError('');
                    try {
                        const saved = await savePlayerToDB(pd, session?.user?.id);
                        if (!saved) throw new Error('Save returned no data');
                        try { sessionStorage.removeItem('rra_pd'); sessionStorage.removeItem('rra_pStep'); } catch {}
                        setPStep(7);
                    } catch (e) {
                        console.error('Submit error:', e);
                        setSubmitError('Failed to submit. Please check your connection and try again.');
                    } finally {
                        setSubmitting(false);
                    }
                }} style={btnSty(pd.name && pd.dob && !submitting, true)}>{submitting ? 'SUBMITTING...' : 'SUBMIT SURVEY'}</button>
            </div>);
        }

        if (pStep === 7) return (<div style={{ textAlign: "center", padding: 40 }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>✓</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: B.grn, fontFamily: F }}>Survey Submitted!</div>
            <div style={{ fontSize: 12, color: B.g600, fontFamily: F, marginTop: 6 }}>Your coaching team will review your details.</div>
        </div>);
        return null;
    };

    return (<div style={{ minHeight: "100vh", fontFamily: F, background: B.g50 }}>

        <Hdr label="PLAYER ONBOARDING" onLogoClick={signOut} />
        {/* Sign-out bar */}
        <div style={{ padding: '4px 12px', background: B.g100, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 9, color: B.g400, fontFamily: F }}>{session?.user?.email}</div>
            <button onClick={signOut} style={{ fontSize: 9, fontWeight: 600, color: B.red, background: 'none', border: 'none', cursor: 'pointer', fontFamily: F }}>Sign Out</button>
        </div>

        {/* ═══ PROFILE UPDATE BANNER (v1 → v2) ═══ */}
        {pd.profileVersion === 1 && pd.submitted && pStep === 0 && <div style={{ margin: '8px 12px', padding: '12px 16px', background: `${B.bl}12`, border: `1px solid ${B.bl}40`, borderRadius: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: B.bl, fontFamily: F, marginBottom: 4 }}>🆕 New DNA Fields Available</div>
            <div style={{ fontSize: 10, color: B.g600, fontFamily: F, lineHeight: 1.5 }}>We've added new questions about your T20 game, physical profile, and phase preferences. Fill them in to give your coaches a better picture of who you are.</div>
            <button onClick={() => { trackEvent(EVT.PROFILE_UPDATE_START, {}); setPStep(2); goTop(); }} style={{ marginTop: 8, padding: '6px 14px', borderRadius: 6, border: 'none', background: `linear-gradient(135deg,${B.bl},${B.pk})`, fontSize: 10, fontWeight: 700, color: B.w, cursor: 'pointer', fontFamily: F }}>Update My Profile →</button>
        </div>}

        {/* ═══ PRE-ONBOARDING GUIDANCE MODAL ═══ */}
        {showOnboardGuide && pStep === 0 && <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', padding: 20 }}>
            <div style={{ background: B.w, borderRadius: 16, maxWidth: 420, width: '100%', padding: '32px 24px', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>🏏</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: B.nvD, fontFamily: F, marginBottom: 8 }}>Welcome to Your DNA Profile</div>
                <div style={{ fontSize: 12, color: B.g600, fontFamily: F, lineHeight: 1.6, marginBottom: 16, textAlign: 'left' }}>
                    This is <strong>not a test</strong>. There are no wrong answers.<br /><br />
                    What you're about to fill in helps your coaches understand you — your game, your style, and where you want to go. The more honest and accurate you are, the better we can tailor your coaching to help you grow.
                </div>
                <div style={{ background: B.g50, borderRadius: 10, padding: '14px 16px', textAlign: 'left', marginBottom: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: B.nvD, fontFamily: F, marginBottom: 8 }}>Before you start:</div>
                    <div style={{ fontSize: 11, color: B.g600, fontFamily: F, lineHeight: 1.8 }}>
                        📱 Have your <strong>PlayHQ profile</strong> open so you can reference your stats<br />
                        ⏱️ Set aside <strong>15–20 minutes</strong> to complete this properly<br />
                        💭 Be honest — this is about painting an accurate picture of your game <em>right now</em>
                    </div>
                </div>
                <div style={{ fontSize: 10, color: B.g400, fontFamily: F, marginBottom: 16, fontStyle: 'italic' }}>Everything you share stays between you and your coaching team.</div>
                <button onClick={() => setShowOnboardGuide(false)} style={{ ...btnSty(true, true), fontSize: 14, padding: '14px 24px' }}>Let's Go →</button>
            </div>
        </div>}

        {pStep < 7 && <div style={{ padding: "6px 12px", background: B.w, borderBottom: `1px solid ${B.g200}`, display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: B.pk, fontFamily: F }}>STEP {pStep + 1}/7</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: B.nvD, fontFamily: F }}>{stpN[pStep]}</div>
            <div style={{ flex: 1, height: 3, background: B.g200, borderRadius: 2, marginLeft: 6 }}>
                <div style={{ width: `${((pStep + 1) / 7) * 100}%`, height: "100%", background: `linear-gradient(90deg,${B.bl},${B.pk})`, borderRadius: 2, transition: "width 0.3s" }} />
            </div>
        </div>}

        <div style={{ padding: 12, paddingBottom: pStep < 7 ? 70 : 12, ...dkWrap }}>{renderP()}</div>

        {pStep < 7 && <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: B.w, borderTop: `1px solid ${B.g200}`, padding: "8px 12px", display: "flex", justifyContent: "space-between", zIndex: 100 }}>
            <button onClick={() => { if (pStep > 0) { setPStep(s => s - 1); goTop(); } else signOut(); }} style={{ padding: "8px 14px", borderRadius: 6, border: `1px solid ${B.g200}`, background: "transparent", fontSize: 11, fontWeight: 600, color: B.g600, cursor: "pointer", fontFamily: F }}>← {pStep === 0 ? 'Sign Out' : 'Back'}</button>
            <button onClick={() => advanceStep(Math.min(pStep + 1, 6))} style={{ padding: "8px 14px", borderRadius: 6, border: "none", background: `linear-gradient(135deg,${B.bl},${B.pk})`, fontSize: 11, fontWeight: 700, color: B.w, cursor: "pointer", fontFamily: F }}>Next →</button>
        </div>}
    </div>);
}
