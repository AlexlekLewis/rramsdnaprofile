// ═══ ENGINE GUIDE — Plain-English explainer for coaches ═══
import React, { useState, useEffect, useRef } from 'react';
import { B, F, sGrad } from '../data/theme';
import { FALLBACK_RW } from '../data/fallbacks';

const PILLARS = [
    {
        key: 'tm', name: 'Technical Mastery', icon: '🏏', color: B.pk,
        desc: 'How well the player executes core batting or bowling skills under pressure. This measures mechanics, shot selection, and consistency.'
    },
    {
        key: 'te', name: 'Tactical Execution', icon: '🧠', color: '#0ea5e9',
        desc: 'Game awareness and decision-making. Can the player read match situations, adapt plans, and execute strategy under pressure?'
    },
    {
        key: 'pc', name: 'Physical Conditioning', icon: '💪', color: B.nv,
        desc: 'Physical readiness — explosive power, core stability, endurance, and injury resilience. Weighted heavier for pace bowlers.'
    },
    {
        key: 'mr', name: 'Mental Resilience', icon: '🧘', color: '#8b5cf6',
        desc: 'Emotional control, competitive drive, coachability, and the ability to perform under pressure. The "Royals Way" character pillars.'
    },
    {
        key: 'af', name: 'Athletic Fielding', icon: '🤸', color: '#14b8a6',
        desc: 'Ground fielding, catching, throwing accuracy, and overall athleticism in the field. Weighted heavier for wicketkeepers.'
    },
    {
        key: 'mi', name: 'Match Impact', icon: '⚡', color: '#f97316',
        desc: 'Real match performance — runs scored, wickets taken, and contributions relative to competition level. Uses statistical benchmarks adjusted by age and competition tier.'
    },
    {
        key: 'pw', name: 'Power Hitting', icon: '💥', color: '#ef4444',
        desc: 'Ability to clear boundaries, hit through the line, and access the scoring areas. Includes death-over hitting and six-hitting range.'
    },
    {
        key: 'sa', name: 'Self-Awareness', icon: '🪞', color: '#6366f1',
        desc: 'How aligned is the player\'s self-rating with the coach\'s assessment? A small gap = high self-awareness. Measures maturity and honest self-reflection.'
    },
];

const SCORES = [
    {
        name: 'PDI', full: 'Player Development Index', icon: '📊', color: B.pk,
        desc: 'The weighted average of all 8 pillars on a 1-5 scale. Each pillar\'s weight varies by the player\'s role — e.g. Technical Mastery is weighted higher for spinners than for pace bowlers.'
    },
    {
        name: 'CCM', full: 'Competition Context Multiplier', icon: '🎯', color: B.bl,
        desc: 'Adjusts the PDI based on what level the player competes at and how old they are relative to that level. A young player performing in a high-level competition gets an uplift.'
    },
    {
        name: 'CTI', full: 'Competition Tier Index', icon: '🏆', color: '#f59e0b',
        desc: 'A numeric value (0.5–2.0) assigned to each competition level. Premier Cricket is higher than Community cricket. This is the "what level" component of CCM.'
    },
    {
        name: 'ARM', full: 'Age Relativity Multiplier', icon: '🎂', color: '#8b5cf6',
        desc: 'How young or old the player is relative to their competition age group. Younger players in higher groups get a boost (0.8–1.5 range).'
    },
];

const RATING_RUBRIC = [
    { level: 1, label: 'Novice', desc: 'Fundamental skill gaps. Needs direct instruction on basics.', color: '#ef4444' },
    { level: 2, label: 'Developing', desc: 'Shows understanding but inconsistent execution. Needs guided practice.', color: '#f97316' },
    { level: 3, label: 'Competent', desc: 'Reliable execution under moderate pressure. Age-group standard.', color: '#eab308' },
    { level: 4, label: 'Advanced', desc: 'Consistent execution under high pressure. Above-age-group standard.', color: '#22c55e' },
    { level: 5, label: 'Elite', desc: 'Exceptional. Pathway-ready or representative standard.', color: '#3b82f6' },
];

function Section({ title, icon, children }) {
    return (
        <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <span style={{ fontSize: 16 }}>{icon}</span>
                <div style={{ fontSize: 13, fontWeight: 800, color: B.w, fontFamily: F, letterSpacing: 0.5, textTransform: 'uppercase' }}>{title}</div>
            </div>
            {children}
        </div>
    );
}

function Card({ children, style }) {
    return (
        <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: '10px 14px', marginBottom: 6, border: '1px solid rgba(255,255,255,0.08)', ...style }}>
            {children}
        </div>
    );
}

export default function EngineGuide({ onClose }) {
    const [activeTab, setActiveTab] = useState('overview');
    const modalRef = useRef(null);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') { onClose(); return; }
            if (e.key === 'Tab' && modalRef.current) {
                const focusable = modalRef.current.querySelectorAll('button, [tabindex]:not([tabindex="-1"])');
                if (focusable.length === 0) return;
                const first = focusable[0];
                const last = focusable[focusable.length - 1];
                if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
                else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        modalRef.current?.querySelector('button')?.focus();
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const tabs = [
        { id: 'overview', label: 'Overview', icon: '📋' },
        { id: 'pillars', label: '8 Pillars', icon: '🏛️' },
        { id: 'scores', label: 'Scores', icon: '📊' },
        { id: 'rubric', label: 'Rating Guide', icon: '⭐' },
    ];

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 10000,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
            display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
            padding: '20px 8px', overflowY: 'auto',
        }}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div ref={modalRef} style={{
                width: '100%', maxWidth: 640,
                background: `linear-gradient(135deg, ${B.nvD} 0%, #1a2744 50%, ${B.nv} 100%)`,
                borderRadius: 16, overflow: 'hidden',
                boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                maxHeight: '90vh', display: 'flex', flexDirection: 'column',
            }}>
                {/* Header */}
                <div style={{
                    ...sGrad, padding: '16px 16px 12px',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    borderBottom: `2px solid ${B.pk}`,
                }}>
                    <div>
                        <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: 2, fontFamily: F }}>HOW THE ENGINE WORKS</div>
                        <div style={{ fontSize: 17, fontWeight: 800, color: B.w, fontFamily: F }}>DNA Profile Engine Guide</div>
                    </div>
                    <button onClick={onClose} style={{
                        width: 32, height: 32, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.2)',
                        background: 'rgba(255,255,255,0.1)', color: B.w, fontSize: 16,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>✕</button>
                </div>

                {/* Tabs */}
                <div style={{
                    display: 'flex', gap: 2, padding: '8px 12px',
                    background: 'rgba(0,0,0,0.2)', overflowX: 'auto',
                }}>
                    {tabs.map(t => (
                        <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
                            padding: '6px 12px', borderRadius: 20, border: 'none',
                            background: activeTab === t.id ? B.pk : 'transparent',
                            color: activeTab === t.id ? B.w : 'rgba(255,255,255,0.5)',
                            fontSize: 10, fontWeight: 700, fontFamily: F, cursor: 'pointer',
                            whiteSpace: 'nowrap', transition: 'all 0.2s',
                        }}>{t.icon} {t.label}</button>
                    ))}
                </div>

                {/* Content */}
                <div style={{ padding: '16px 16px 20px', overflowY: 'auto', flex: 1 }}>

                    {/* ═══ OVERVIEW ═══ */}
                    {activeTab === 'overview' && <>
                        <Section title="What is the DNA Profile?" icon="🧬">
                            <Card>
                                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', fontFamily: F, lineHeight: 1.7 }}>
                                    The DNA Profile is an <strong style={{ color: B.w }}>8-pillar assessment engine</strong> that creates a complete picture of a player's cricket ability, character, and potential.
                                    <br /><br />
                                    It combines <strong style={{ color: B.pk }}>coach ratings</strong> (1-5 per skill), <strong style={{ color: B.bl }}>competition data</strong> (grades, stats), and <strong style={{ color: '#8b5cf6' }}>player self-assessment</strong> into a single score — the <strong style={{ color: B.w }}>PDI (Player Development Index)</strong>.
                                </div>
                            </Card>
                        </Section>

                        <Section title="How Scores Are Calculated" icon="⚙️">
                            <Card>
                                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', fontFamily: F, lineHeight: 1.7 }}>
                                    <strong style={{ color: B.w }}>Step 1:</strong> Rate each skill 1-5 across 8 domains<br />
                                    <strong style={{ color: B.w }}>Step 2:</strong> Each domain is weighted by the player's role<br />
                                    <strong style={{ color: B.w }}>Step 3:</strong> The weighted average = <strong style={{ color: B.pk }}>PDI (1-5 scale)</strong><br />
                                    <strong style={{ color: B.w }}>Step 4:</strong> Competition level and age multiply the PDI → <strong style={{ color: B.bl }}>CCM</strong><br />
                                    <strong style={{ color: B.w }}>Step 5:</strong> Three final scores — Pathway, Cohort, and Age — are averaged into an <strong style={{ color: B.grn }}>Overall Score (0-100)</strong>
                                </div>
                            </Card>
                        </Section>

                        <Section title="Score Dashboard" icon="📊">
                            {[
                                { label: 'Pathway Score', icon: '🛤️', color: B.pk, desc: 'Where the player sits on the 0-100 scale based on their raw PDI. Higher = closer to elite pathway standard.' },
                                { label: 'Cohort Score', icon: '👥', color: B.bl, desc: 'How the player ranks against all other RRA Academy players. 50 = average for the cohort.' },
                                { label: 'Age Score', icon: '🎂', color: '#8b5cf6', desc: 'Bonus for players who are young relative to their competition level. A 15-year-old in U19s gets a higher age score.' },
                                { label: 'Overall Score', icon: '⭐', color: B.grn, desc: 'The average of Pathway + Cohort + Age. This is the headline number on each player card.' },
                            ].map(s => (
                                <Card key={s.label}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                        <span style={{ fontSize: 14 }}>{s.icon}</span>
                                        <div style={{ fontSize: 11, fontWeight: 800, color: s.color, fontFamily: F }}>{s.label}</div>
                                    </div>
                                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', fontFamily: F, lineHeight: 1.6 }}>{s.desc}</div>
                                </Card>
                            ))}
                        </Section>

                        <Section title="Special Flags" icon="🚩">
                            <Card>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                    <span style={{ fontSize: 14 }}>🚀</span>
                                    <div style={{ fontSize: 11, fontWeight: 800, color: B.grn, fontFamily: F }}>Trajectory Flag</div>
                                </div>
                                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', fontFamily: F, lineHeight: 1.6 }}>
                                    Appears when a player is young for their competition level AND has a strong PDI. This flags them as an accelerated development candidate — someone who may be ready for higher-level opportunities.
                                </div>
                            </Card>
                            <Card>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                    <span style={{ fontSize: 14 }}>📊</span>
                                    <div style={{ fontSize: 11, fontWeight: 800, color: '#f59e0b', fontFamily: F }}>Provisional Tag</div>
                                </div>
                                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', fontFamily: F, lineHeight: 1.6 }}>
                                    Shown when a player has only self-assessed (no coach assessment yet). The PDI is calculated from self-ratings blended at a lower weight (25%) until the coach completes their assessment.
                                </div>
                            </Card>
                        </Section>
                    </>}

                    {/* ═══ 8 PILLARS ═══ */}
                    {activeTab === 'pillars' && <>
                        <Section title="The 8 Pillars" icon="🏛️">
                            <Card style={{ marginBottom: 12 }}>
                                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', fontFamily: F, lineHeight: 1.7 }}>
                                    Every player is assessed across 8 domains. Each domain has a <strong style={{ color: B.w }}>weight</strong> that varies by playing role — so a pace bowler's Physical Conditioning matters more than a batter's.
                                </div>
                            </Card>
                            {PILLARS.map(p => (
                                <Card key={p.key}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <span style={{ fontSize: 14 }}>{p.icon}</span>
                                            <div style={{ fontSize: 11, fontWeight: 800, color: p.color, fontFamily: F }}>{p.name}</div>
                                        </div>
                                        <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.4)', fontFamily: F }}>
                                            {Math.round((FALLBACK_RW.batter[p.key] || 0) * 100)}% BAT
                                        </div>
                                    </div>
                                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', fontFamily: F, lineHeight: 1.6 }}>{p.desc}</div>
                                </Card>
                            ))}
                        </Section>

                        <Section title="Weights by Role" icon="⚖️">
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 9, fontFamily: F }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.15)' }}>
                                            <th style={{ padding: '6px 8px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>Pillar</th>
                                            {Object.keys(FALLBACK_RW).map(role => (
                                                <th key={role} style={{ padding: '6px 4px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase' }}>{role.slice(0, 3)}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {PILLARS.map(p => (
                                            <tr key={p.key} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                <td style={{ padding: '4px 8px', color: p.color, fontWeight: 600 }}>{p.icon} {p.name}</td>
                                                {Object.keys(FALLBACK_RW).map(role => {
                                                    const w = FALLBACK_RW[role][p.key] || 0;
                                                    return (
                                                        <td key={role} style={{ padding: '4px', textAlign: 'center', color: B.w, fontWeight: w >= 0.14 ? 800 : 400, opacity: w >= 0.14 ? 1 : 0.5 }}>
                                                            {Math.round(w * 100)}%
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Section>
                    </>}

                    {/* ═══ SCORES ═══ */}
                    {activeTab === 'scores' && <>
                        <Section title="Key Metrics" icon="📊">
                            {SCORES.map(s => (
                                <Card key={s.name}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                        <span style={{ fontSize: 14 }}>{s.icon}</span>
                                        <div>
                                            <div style={{ fontSize: 12, fontWeight: 800, color: s.color, fontFamily: F }}>{s.name}</div>
                                            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontFamily: F }}>{s.full}</div>
                                        </div>
                                    </div>
                                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', fontFamily: F, lineHeight: 1.6 }}>{s.desc}</div>
                                </Card>
                            ))}
                        </Section>

                        <Section title="SAGI (Self-Awareness)" icon="🪞">
                            <Card>
                                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', fontFamily: F, lineHeight: 1.7 }}>
                                    <strong style={{ color: B.w }}>SAGI</strong> = the average gap between a player's self-rating and the coach's rating across all skills.
                                    <br /><br />
                                    <strong style={{ color: B.grn }}>Aligned (±0.5):</strong> Player sees themselves accurately<br />
                                    <strong style={{ color: '#f59e0b' }}>Over-rates (+0.5 to +2):</strong> Player overestimates their ability<br />
                                    <strong style={{ color: B.bl }}>Under-rates (-0.5 to -2):</strong> Player underestimates themselves<br />
                                    <br />
                                    This converts to a 1-5 pillar score: perfect alignment = 5/5, large gap = 1/5.
                                </div>
                            </Card>
                        </Section>

                        <Section title="Archetype DNA" icon="🧬">
                            <Card>
                                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', fontFamily: F, lineHeight: 1.7 }}>
                                    Each player's profile is expressed as a <strong style={{ color: B.w }}>percentage blend</strong> of all archetypes.
                                    For example: 45% Firestarter, 25% 360°, 20% Controller, 10% Closer.
                                    <br /><br />
                                    This is calculated from:<br />
                                    • <strong style={{ color: B.pk }}>Coach-assigned archetype</strong> (strongest signal, ~50% weight)<br />
                                    • <strong style={{ color: B.bl }}>Player's go-to shots</strong> — drives → Controller, pulls → Firestarter<br />
                                    • <strong style={{ color: '#8b5cf6' }}>Preferred batting phase</strong> — powerplay → Firestarter, death → Closer<br />
                                    • <strong style={{ color: '#14b8a6' }}>Batting position</strong> — top order → Firestarter, lower → Closer<br />
                                    • <strong style={{ color: '#f59e0b' }}>Comfort vs spin/pace</strong> — high spin comfort → Spin Dominator
                                </div>
                            </Card>
                        </Section>
                    </>}

                    {/* ═══ RATING GUIDE ═══ */}
                    {activeTab === 'rubric' && <>
                        <Section title="Rating Scale (1-5)" icon="⭐">
                            <Card style={{ marginBottom: 12 }}>
                                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', fontFamily: F, lineHeight: 1.7 }}>
                                    Use this standardised scale for every skill rating. The goal is <strong style={{ color: B.w }}>consistency across coaches</strong> — a "3" should mean the same thing regardless of who's assessing.
                                </div>
                            </Card>
                            {RATING_RUBRIC.map(r => (
                                <Card key={r.level}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <div style={{
                                            width: 32, height: 32, borderRadius: '50%',
                                            background: r.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: 14, fontWeight: 900, color: B.w, fontFamily: F, flexShrink: 0,
                                        }}>{r.level}</div>
                                        <div>
                                            <div style={{ fontSize: 12, fontWeight: 800, color: r.color, fontFamily: F }}>{r.label}</div>
                                            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', fontFamily: F, lineHeight: 1.5 }}>{r.desc}</div>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </Section>

                        <Section title="Tips for Accurate Rating" icon="💡">
                            <Card>
                                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', fontFamily: F, lineHeight: 1.8 }}>
                                    ✅ Rate based on <strong style={{ color: B.w }}>match performance</strong>, not just training<br />
                                    ✅ Compare against <strong style={{ color: B.w }}>age-group peers</strong>, not senior players<br />
                                    ✅ Use the <strong style={{ color: B.w }}>full scale</strong> — most players should be 2-4<br />
                                    ✅ Be honest — accurate ratings produce better development plans<br />
                                    ⚠️ Avoid giving all 5s — only use for truly exceptional skills<br />
                                    ⚠️ Don't rush — take time to expand each skill and read the definition
                                </div>
                            </Card>
                        </Section>
                    </>}
                </div>
            </div>
        </div>
    );
}
