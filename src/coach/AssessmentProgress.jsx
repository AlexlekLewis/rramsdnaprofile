// ═══ ADMIN: ASSESSMENT PROGRESS VIEW ═══
// Shows which coaches have completed assessments and who still owes what.
// Two lenses: per-coach (accountability) and per-session (coverage).

import React, { useEffect, useState } from 'react';
import { B, F, sCard } from '../data/theme';
import { loadAssessmentProgress } from '../db/assessmentProgressDb';

const ProgressBar = ({ done, total, color = B.bl }) => {
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, height: 6, background: B.g100, borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: color, transition: 'width 0.3s' }} />
            </div>
            <div style={{ fontSize: 10, fontWeight: 700, color: B.g600, fontFamily: F, minWidth: 46, textAlign: 'right' }}>
                {done}/{total} ({pct}%)
            </div>
        </div>
    );
};

const PlayerPill = ({ name, assessed }) => (
    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 9, fontWeight: 600, fontFamily: F, margin: '2px 3px 2px 0', background: assessed ? `${B.grn}18` : `${B.g200}40`, color: assessed ? B.grn : B.g600, border: `1px solid ${assessed ? `${B.grn}40` : B.g200}` }}>
        {assessed ? '✓ ' : ''}{name}
    </span>
);

export default function AssessmentProgress() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lens, setLens] = useState('coach'); // 'coach' | 'session'
    const [expanded, setExpanded] = useState(new Set());

    useEffect(() => {
        loadAssessmentProgress()
            .then(d => { setData(d); setLoading(false); })
            .catch(e => { setError(e.message || 'Failed to load'); setLoading(false); });
    }, []);

    const toggle = (key) => {
        setExpanded(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key); else next.add(key);
            return next;
        });
    };

    if (loading) return <div style={{ padding: 24, textAlign: 'center', color: B.g400, fontSize: 12, fontFamily: F }}>Loading progress…</div>;
    if (error) return <div style={{ padding: 24, textAlign: 'center', color: B.red, fontSize: 12, fontFamily: F }}>⚠ {error}</div>;
    if (!data) return null;

    const { coaches, squads, totalProgress } = data;

    return (
        <div style={{ padding: 12, fontFamily: F }}>
            {/* Overall progress banner */}
            <div style={{ ...sCard, padding: 16, marginBottom: 14, background: `linear-gradient(135deg, ${B.nvD}, ${B.bl})`, color: B.w }}>
                <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Overall Assessment Progress</div>
                <div style={{ fontSize: 28, fontWeight: 900, marginTop: 4 }}>
                    {totalProgress.done} / {totalProgress.total}
                    <span style={{ fontSize: 14, fontWeight: 700, opacity: 0.7, marginLeft: 10 }}>({totalProgress.pct}%)</span>
                </div>
                <div style={{ marginTop: 10 }}>
                    <div style={{ height: 6, background: 'rgba(255,255,255,0.2)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${totalProgress.pct}%`, height: '100%', background: B.w, transition: 'width 0.4s' }} />
                    </div>
                </div>
                <div style={{ fontSize: 9, opacity: 0.75, marginTop: 8 }}>
                    Each player gets 2 assessments (Skill Week + Game Sense Weekend)
                </div>
            </div>

            {/* Lens toggle */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 12, background: B.g100, padding: 4, borderRadius: 10, width: 'fit-content' }}>
                <button onClick={() => setLens('coach')}
                    style={{ padding: '6px 14px', border: 'none', borderRadius: 7, background: lens === 'coach' ? B.w : 'transparent', fontSize: 10, fontWeight: lens === 'coach' ? 800 : 600, color: lens === 'coach' ? B.nvD : B.g600, cursor: 'pointer' }}>
                    👥 By Coach
                </button>
                <button onClick={() => setLens('session')}
                    style={{ padding: '6px 14px', border: 'none', borderRadius: 7, background: lens === 'session' ? B.w : 'transparent', fontSize: 10, fontWeight: lens === 'session' ? 800 : 600, color: lens === 'session' ? B.nvD : B.g600, cursor: 'pointer' }}>
                    📅 By Session
                </button>
            </div>

            {/* BY-COACH LENS */}
            {lens === 'coach' && (
                <div>
                    {coaches.length === 0 && <div style={{ color: B.g400, fontSize: 11, padding: 16, textAlign: 'center' }}>No coaches assigned to sessions yet.</div>}
                    {coaches.map(c => {
                        const key = `coach-${c.id}`;
                        const open = expanded.has(key);
                        const pending = c.players.filter(p => !p.assessed);
                        const done = c.players.filter(p => p.assessed);
                        return (
                            <div key={c.id} style={{ ...sCard, padding: 12, marginBottom: 8 }}>
                                <div onClick={() => toggle(key)} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                                            <div style={{ fontSize: 13, fontWeight: 800, color: B.nvD }}>{c.name}</div>
                                            {c.role && <div style={{ fontSize: 9, color: B.g400, textTransform: 'uppercase' }}>{c.role}</div>}
                                        </div>
                                        <div style={{ fontSize: 9, color: B.g400, marginTop: 2 }}>
                                            {c.squadLabels.length ? c.squadLabels.join(' · ') : 'No squad assignments yet'}
                                        </div>
                                        <div style={{ marginTop: 8 }}>
                                            <ProgressBar done={c.assessedCount} total={c.totalCount} color={c.assessedCount === c.totalCount && c.totalCount > 0 ? B.grn : B.bl} />
                                        </div>
                                    </div>
                                    <div style={{ fontSize: 11, color: B.g400 }}>{open ? '▴' : '▾'}</div>
                                </div>
                                {open && (
                                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${B.g100}` }}>
                                        {done.length > 0 && (
                                            <div style={{ marginBottom: 8 }}>
                                                <div style={{ fontSize: 9, fontWeight: 700, color: B.grn, textTransform: 'uppercase', marginBottom: 4 }}>Assessed ({done.length})</div>
                                                <div>{done.map(p => <PlayerPill key={p.name + p.squadType} name={`${p.name} · ${p.squadType}`} assessed={true} />)}</div>
                                            </div>
                                        )}
                                        {pending.length > 0 && (
                                            <div>
                                                <div style={{ fontSize: 9, fontWeight: 700, color: B.g600, textTransform: 'uppercase', marginBottom: 4 }}>Pending ({pending.length})</div>
                                                <div>{pending.map(p => <PlayerPill key={p.name + p.squadType} name={`${p.name} · ${p.squadType}`} assessed={false} />)}</div>
                                            </div>
                                        )}
                                        {c.totalCount === 0 && (
                                            <div style={{ fontSize: 10, color: B.g400, fontStyle: 'italic' }}>
                                                This coach has no squad assignments yet. Allocate sessions in the admin panel.
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* BY-SESSION LENS */}
            {lens === 'session' && (
                <div>
                    {/* Group squads into Skill Week and Game Sense Week */}
                    {['WD', 'WE'].map(type => {
                        const group = squads.filter(s => s.type === type);
                        if (group.length === 0) return null;
                        const heading = type === 'WD' ? '🏏 Skill Week' : '🎯 Game Sense Weekend';
                        const headingColor = type === 'WD' ? B.bl : B.pk;
                        return (
                            <div key={type} style={{ marginBottom: 18 }}>
                                <div style={{ fontSize: 11, fontWeight: 800, color: headingColor, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>
                                    {heading}
                                </div>
                                {group.map(s => {
                                    const key = `squad-${s.id}`;
                                    const open = expanded.has(key);
                                    const pending = s.players.filter(p => !p.assessed);
                                    const done = s.players.filter(p => p.assessed);
                                    return (
                                        <div key={s.id} style={{ ...sCard, padding: 12, marginBottom: 8, borderLeft: `4px solid ${s.color}` }}>
                                            <div onClick={() => toggle(key)} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontSize: 13, fontWeight: 800, color: s.color }}>{s.label}</div>
                                                    <div style={{ fontSize: 9, color: B.g400, marginTop: 2 }}>
                                                        Coaches: {s.coachNames.length ? s.coachNames.join(', ') : 'unassigned'}
                                                    </div>
                                                    <div style={{ marginTop: 8 }}>
                                                        <ProgressBar done={s.assessedCount} total={s.totalCount} color={s.assessedCount === s.totalCount && s.totalCount > 0 ? B.grn : s.color} />
                                                    </div>
                                                </div>
                                                <div style={{ fontSize: 11, color: B.g400 }}>{open ? '▴' : '▾'}</div>
                                            </div>
                                            {open && (
                                                <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${B.g100}` }}>
                                                    {done.length > 0 && (
                                                        <div style={{ marginBottom: 8 }}>
                                                            <div style={{ fontSize: 9, fontWeight: 700, color: B.grn, textTransform: 'uppercase', marginBottom: 4 }}>Assessed ({done.length})</div>
                                                            <div>{done.map(p => <PlayerPill key={p.name} name={p.name} assessed={true} />)}</div>
                                                        </div>
                                                    )}
                                                    {pending.length > 0 && (
                                                        <div>
                                                            <div style={{ fontSize: 9, fontWeight: 700, color: B.g600, textTransform: 'uppercase', marginBottom: 4 }}>Pending ({pending.length})</div>
                                                            <div>{pending.map(p => <PlayerPill key={p.name} name={p.name} assessed={false} />)}</div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
