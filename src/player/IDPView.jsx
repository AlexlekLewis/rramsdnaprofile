import React, { useState, useEffect, useRef, useCallback } from "react";
import { loadGoalsForPlayer, addGoal, updateGoalProgress, updateGoal, completeGoal, loadFocusAreas, loadNotes, addNote } from "../db/idpDb";
import { loadCoachAssessment, loadSelfRatings, buildAssessmentSummary } from "../db/assessmentDb";
import { loadSessionsFor, METRIC_TYPES } from "../db/performanceMetricsDb";
import { B, F, sCard } from "../data/theme";

const GOAL_CATEGORIES = [
    { id: 'technical', label: 'Technical', color: B.pk },
    { id: 'mental', label: 'Mental', color: B.prp },
    { id: 'physical', label: 'Physical', color: B.org },
    { id: 'tactical', label: 'Tactical', color: B.bl },
];

const PRIORITY_LEVELS = { high: { label: 'HIGH', color: B.red }, medium: { label: 'MED', color: B.amb }, low: { label: 'LOW', color: B.grn } };

const GAP_COLORS = { aligned: B.grn, slight: B.amb, significant: B.red };
const GAP_LABELS = { aligned: 'Aligned', slight: 'Slight Gap', significant: 'Big Gap' };

export default function IDPView({ session, userProfile, playerId }) {
    const [goals, setGoals] = useState([]);
    const [focusAreas, setFocusAreas] = useState([]);
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [assessmentSummary, setAssessmentSummary] = useState([]);
    const [assessmentLoaded, setAssessmentLoaded] = useState(false);
    const [evSessions, setEvSessions] = useState([]);
    const [evLoaded, setEvLoaded] = useState(false);
    const [showEv, setShowEv] = useState(true);

    const [newGoal, setNewGoal] = useState("");
    const [newGoalCategory, setNewGoalCategory] = useState("technical");
    const [newGoalDate, setNewGoalDate] = useState("");
    const [newNote, setNewNote] = useState("");
    const [savingGoal, setSavingGoal] = useState(false);
    const [savingNote, setSavingNote] = useState(false);
    const [feedback, setFeedback] = useState(null);
    const progressTimerRef = useRef(null);

    // Completion flow
    const [completingId, setCompletingId] = useState(null);
    const [reflectionNote, setReflectionNote] = useState("");

    // Goal filter
    const [goalFilter, setGoalFilter] = useState("all");

    // Section collapse
    const [showAssessment, setShowAssessment] = useState(true);

    const programId = null;

    useEffect(() => {
        if (!userProfile?.id) return;
        setLoading(true);
        Promise.all([
            loadGoalsForPlayer(userProfile.id, programId),
            loadFocusAreas(userProfile.id, programId),
            loadNotes(userProfile.id, programId)
        ]).then(([g, f, n]) => {
            setGoals(g || []);
            setFocusAreas(f || []);
            setNotes(n || []);
        }).catch(err => console.error("Error loading IDP:", err))
            .finally(() => setLoading(false));
    }, [userProfile?.id]);

    // Load assessment data (uses players.id, not auth_user_id)
    useEffect(() => {
        if (!playerId) return;
        Promise.all([
            loadCoachAssessment(playerId).catch(() => null),
            loadSelfRatings(playerId).catch(() => ({ selfRatings: {}, role: 'Batter' }))
        ]).then(([coachData, { selfRatings }]) => {
            const summary = buildAssessmentSummary(coachData, selfRatings);
            setAssessmentSummary(summary);
            setAssessmentLoaded(true);
        }).catch(err => {
            console.warn("Assessment load failed:", err.message);
            setAssessmentLoaded(true);
        });
    }, [playerId]);

    // Load Exit Velocity sessions (read-only for player)
    useEffect(() => {
        if (!playerId) return;
        loadSessionsFor(playerId, METRIC_TYPES.EXIT_VELOCITY)
            .then(s => { setEvSessions(s || []); setEvLoaded(true); })
            .catch(err => { console.warn("Exit velocity load failed:", err.message); setEvLoaded(true); });
    }, [playerId]);

    const showFeedback = (type, text, duration = 3000) => {
        setFeedback({ type, text });
        setTimeout(() => setFeedback(null), duration);
    };

    const handleAddGoal = async () => {
        if (!newGoal.trim() || savingGoal) return;
        setSavingGoal(true);
        try {
            const added = await addGoal({
                player_id: userProfile.id,
                program_id: programId,
                title: newGoal.trim(),
                status: 'active',
                progress: 0,
                category: newGoalCategory,
                target_date: newGoalDate || null,
            }, userProfile.id);
            setGoals([added, ...goals]);
            setNewGoal("");
            setNewGoalDate("");
            showFeedback('ok', 'Goal added!');
        } catch (e) {
            console.error(e);
            showFeedback('err', 'Failed to add goal', 5000);
        } finally { setSavingGoal(false); }
    };

    const handleUpdateProgress = useCallback((id, val) => {
        setGoals(prev => prev.map(g => g.id === id ? { ...g, progress: val } : g));
        if (progressTimerRef.current) clearTimeout(progressTimerRef.current);
        progressTimerRef.current = setTimeout(async () => {
            try {
                const updated = await updateGoalProgress(id, val);
                setGoals(prev => prev.map(g => g.id === id ? updated : g));
                if (val >= 100) setCompletingId(id);
            } catch (e) { console.error(e); }
        }, 500);
    }, []);

    const handleCompleteGoal = async (id) => {
        try {
            const updated = await completeGoal(id, reflectionNote);
            setGoals(prev => prev.map(g => g.id === id ? updated : g));
            setCompletingId(null);
            setReflectionNote("");
            showFeedback('ok', 'Goal completed!');
        } catch (e) {
            console.error(e);
            showFeedback('err', 'Failed to complete goal', 5000);
        }
    };

    const handleAddNote = async () => {
        if (!newNote.trim() || savingNote) return;
        setSavingNote(true);
        try {
            const added = await addNote({
                player_id: userProfile.id,
                program_id: programId,
                content: newNote.trim()
            }, userProfile.id, 'player');
            setNotes([added, ...notes]);
            setNewNote("");
            showFeedback('ok', 'Note posted!');
        } catch (e) {
            console.error(e);
            showFeedback('err', 'Failed to post note', 5000);
        } finally { setSavingNote(false); }
    };

    if (loading) return <div style={{ padding: 24, fontSize: 13, color: B.g400, fontFamily: F, textAlign: 'center' }}>Loading IDP...</div>;

    const filteredGoals = goals.filter(g => {
        if (goalFilter === 'all') return g.status !== 'completed';
        if (goalFilter === 'completed') return g.status === 'completed';
        return g.category === goalFilter && g.status !== 'completed';
    });

    const SectionH = ({ title, subtitle, toggle, isOpen }) => (
        <div
            onClick={toggle}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, cursor: toggle ? 'pointer' : 'default' }}
        >
            <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: B.nvD, fontFamily: F }}>{title}</div>
                {subtitle && <div style={{ fontSize: 10, color: B.g400, fontFamily: F, marginTop: 2 }}>{subtitle}</div>}
            </div>
            {toggle && (
                <div style={{ fontSize: 10, color: B.g400, fontFamily: F, fontWeight: 600 }}>
                    {isOpen ? 'Hide' : 'Show'}
                </div>
            )}
        </div>
    );

    // Assessment bar component
    const DomainBar = ({ domain }) => {
        const hasCoach = domain.coachAvg != null;
        const hasSelf = domain.selfAvg != null;
        if (!hasCoach && !hasSelf) return null;

        const gapColor = GAP_COLORS[domain.gapLevel] || B.g400;

        return (
            <div style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: B.g600, fontFamily: F }}>{domain.shortLabel}</div>
                    {domain.gap != null && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: gapColor }} />
                            <span style={{ fontSize: 9, fontWeight: 700, color: gapColor, fontFamily: F }}>{GAP_LABELS[domain.gapLevel]}</span>
                            <span style={{ fontSize: 9, color: B.g400, fontFamily: F }}>
                                ({domain.gap > 0 ? '+' : ''}{domain.gap})
                            </span>
                        </div>
                    )}
                </div>

                {/* Coach bar */}
                {hasCoach && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <div style={{ fontSize: 8, fontWeight: 700, color: B.bl, fontFamily: F, width: 40, textAlign: 'right' }}>COACH</div>
                        <div style={{ flex: 1, height: 8, background: B.g100, borderRadius: 4, overflow: 'hidden' }}>
                            <div style={{ width: `${(domain.coachAvg / 5) * 100}%`, height: '100%', background: B.bl, borderRadius: 4, transition: 'width 0.4s ease' }} />
                        </div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: B.bl, fontFamily: F, width: 28, textAlign: 'right' }}>{domain.coachAvg}</div>
                    </div>
                )}

                {/* Self bar */}
                {hasSelf && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ fontSize: 8, fontWeight: 700, color: B.pk, fontFamily: F, width: 40, textAlign: 'right' }}>SELF</div>
                        <div style={{ flex: 1, height: 8, background: B.g100, borderRadius: 4, overflow: 'hidden' }}>
                            <div style={{ width: `${(domain.selfAvg / 5) * 100}%`, height: '100%', background: B.pk, borderRadius: 4, transition: 'width 0.4s ease' }} />
                        </div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: B.pk, fontFamily: F, width: 28, textAlign: 'right' }}>{domain.selfAvg}</div>
                    </div>
                )}
            </div>
        );
    };

    // Overall PDI-like score from coach averages
    const overallCoach = assessmentSummary.filter(d => d.coachAvg != null);
    const overallAvg = overallCoach.length > 0
        ? +(overallCoach.reduce((s, d) => s + d.coachAvg, 0) / overallCoach.length).toFixed(1)
        : null;

    return (
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* FEEDBACK TOAST */}
            {feedback && (
                <div style={{ padding: '10px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, fontFamily: F, background: feedback.type === 'ok' ? `${B.grn}15` : '#fee2e2', color: feedback.type === 'ok' ? B.grn : '#dc2626', border: `1px solid ${feedback.type === 'ok' ? `${B.grn}30` : '#fca5a5'}` }}>
                    {feedback.text}
                </div>
            )}

            {/* ═══ ASSESSMENT OVERVIEW (SAGI) ═══ */}
            {assessmentLoaded && assessmentSummary.some(d => d.coachAvg != null || d.selfAvg != null) && (
                <div style={{ ...sCard, padding: 20 }}>
                    <SectionH
                        title="Assessment Overview"
                        subtitle="Coach ratings vs your self-assessment"
                        toggle={() => setShowAssessment(!showAssessment)}
                        isOpen={showAssessment}
                    />

                    {showAssessment && (
                        <>
                            {/* Overall score card */}
                            {overallAvg != null && (
                                <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                                    <div style={{
                                        width: 56, height: 56, borderRadius: '50%',
                                        background: `linear-gradient(135deg, ${B.bl}, ${B.pk})`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        flexShrink: 0,
                                    }}>
                                        <span style={{ fontSize: 18, fontWeight: 800, color: B.w, fontFamily: F }}>{overallAvg}</span>
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: 12, fontWeight: 800, color: B.nvD, fontFamily: F }}>Overall Domain Average</div>
                                        <div style={{ fontSize: 10, color: B.g400, fontFamily: F, marginTop: 2, lineHeight: 1.4 }}>
                                            Based on coach assessment across {overallCoach.length} domains. Your self-assessment is shown alongside to highlight perception gaps.
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* SAGI Legend */}
                            <div style={{ display: 'flex', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <div style={{ width: 8, height: 8, borderRadius: 2, background: B.bl }} />
                                    <span style={{ fontSize: 9, color: B.g600, fontFamily: F }}>Coach Rating</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <div style={{ width: 8, height: 8, borderRadius: 2, background: B.pk }} />
                                    <span style={{ fontSize: 9, color: B.g600, fontFamily: F }}>Self Rating</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: B.grn }} />
                                    <span style={{ fontSize: 9, color: B.g600, fontFamily: F }}>Aligned (gap &lt;0.5)</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: B.red }} />
                                    <span style={{ fontSize: 9, color: B.g600, fontFamily: F }}>Big gap (&gt;1.0)</span>
                                </div>
                            </div>

                            {/* Domain bars */}
                            {assessmentSummary.map(d => <DomainBar key={d.key} domain={d} />)}

                            {/* SAGI insight */}
                            {assessmentSummary.some(d => d.gapLevel === 'significant') && (
                                <div style={{ padding: 12, borderRadius: 8, background: `${B.amb}08`, border: `1px solid ${B.amb}25`, marginTop: 4 }}>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: B.amb, fontFamily: F, marginBottom: 4 }}>Self-Awareness Insight</div>
                                    <div style={{ fontSize: 11, color: B.g600, fontFamily: F, lineHeight: 1.5 }}>
                                        {assessmentSummary.filter(d => d.gapLevel === 'significant').map(d => {
                                            const dir = d.gap > 0 ? 'higher than' : 'lower than';
                                            return `Your ${d.shortLabel} self-rating is ${dir} your coach's assessment.`;
                                        }).join(' ')}
                                        {' '}This is normal and helps focus your development — discuss with your coach.
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* Assessment not yet available */}
            {assessmentLoaded && !assessmentSummary.some(d => d.coachAvg != null) && (
                <div style={{ ...sCard, padding: 20, textAlign: 'center' }}>
                    <div style={{ fontSize: 24, marginBottom: 8 }}>📊</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: B.nvD, fontFamily: F, marginBottom: 4 }}>Assessment Coming Soon</div>
                    <div style={{ fontSize: 11, color: B.g400, fontFamily: F, lineHeight: 1.5 }}>
                        Your coach assessment results will appear here after assessment week. In the meantime, set your goals below.
                    </div>
                </div>
            )}

            {/* ═══ EXIT VELOCITY (read-only) ═══ */}
            {evLoaded && (
                <div style={{ ...sCard, padding: 20 }}>
                    <SectionH
                        title="My Exit Velocity"
                        subtitle={evSessions.length > 0 ? "How hard you hit the ball — measured by radar" : "Coach will record this at training"}
                        toggle={evSessions.length > 0 ? () => setShowEv(!showEv) : null}
                        isOpen={showEv}
                    />

                    {evSessions.length === 0 ? (
                        <div style={{ padding: '12px 0', fontSize: 12, color: B.g500, fontFamily: F, lineHeight: 1.5 }}>
                            Your coach will record three shots and your best speed shows up here. We'll re-test at the end of the program so you can see your improvement.
                        </div>
                    ) : showEv ? (
                        <>
                            {/* Latest session — headline */}
                            <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                                <div style={{
                                    width: 64, height: 64, borderRadius: '50%',
                                    background: `linear-gradient(135deg, ${B.bl}, ${B.prp})`,
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                    flexShrink: 0,
                                }}>
                                    <span style={{ fontSize: 18, fontWeight: 800, color: B.w, fontFamily: F, lineHeight: 1 }}>{evSessions[0].best}</span>
                                    <span style={{ fontSize: 8, fontWeight: 700, color: B.w, fontFamily: F, marginTop: 2 }}>KM/H</span>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 12, fontWeight: 800, color: B.nvD, fontFamily: F }}>Best of {evSessions[0].attempts.length}</div>
                                    <div style={{ fontSize: 10, color: B.g400, fontFamily: F, marginTop: 2 }}>
                                        {new Date(evSessions[0].date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </div>
                                    <div style={{ fontSize: 10, color: B.g600, fontFamily: F, marginTop: 4 }}>
                                        Average: <span style={{ fontWeight: 700, color: B.prp }}>{evSessions[0].avg} km/h</span>
                                    </div>
                                </div>
                            </div>

                            {/* Attempts breakdown */}
                            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                                {evSessions[0].attempts.map((a, i) => (
                                    <div key={i} style={{ flex: 1, padding: 8, background: B.g50, borderRadius: 6, textAlign: 'center' }}>
                                        <div style={{ fontSize: 14, fontWeight: 800, color: B.nvD, fontFamily: F, lineHeight: 1.1 }}>{a.value}</div>
                                        <div style={{ fontSize: 8, fontWeight: 700, color: B.g400, fontFamily: F, marginTop: 2 }}>ATTEMPT {a.number || (i + 1)}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Improvement: compare latest vs first session if more than one */}
                            {evSessions.length > 1 && (() => {
                                const first = evSessions[evSessions.length - 1];
                                const latest = evSessions[0];
                                const delta = +(latest.best - first.best).toFixed(1);
                                const positive = delta > 0;
                                const sign = positive ? '+' : '';
                                return (
                                    <div style={{
                                        padding: 12, borderRadius: 8,
                                        background: positive ? `${B.grn}08` : `${B.amb}08`,
                                        border: `1px solid ${positive ? B.grn : B.amb}25`,
                                        marginBottom: 12,
                                    }}>
                                        <div style={{ fontSize: 11, fontWeight: 700, color: positive ? B.grn : B.amb, fontFamily: F, marginBottom: 4 }}>
                                            {positive ? 'Improvement' : 'Change'} since baseline
                                        </div>
                                        <div style={{ fontSize: 11, color: B.g600, fontFamily: F, lineHeight: 1.5 }}>
                                            Your best went from <span style={{ fontWeight: 700 }}>{first.best} km/h</span> on {new Date(first.date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} to <span style={{ fontWeight: 700 }}>{latest.best} km/h</span>{' '}
                                            (<span style={{ fontWeight: 800, color: positive ? B.grn : B.amb }}>{sign}{delta} km/h</span>).
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* History list */}
                            {evSessions.length > 1 && (
                                <div>
                                    <div style={{ fontSize: 9, fontWeight: 800, color: B.g400, fontFamily: F, marginBottom: 6, letterSpacing: 0.4 }}>HISTORY</div>
                                    {evSessions.map(s => (
                                        <div key={s.date} style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            padding: '6px 0', borderBottom: `1px solid ${B.g100}`,
                                            fontSize: 11, color: B.g600, fontFamily: F,
                                        }}>
                                            <span style={{ fontWeight: 600, color: B.nvD }}>
                                                {new Date(s.date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </span>
                                            <span>
                                                Best <span style={{ fontWeight: 800, color: B.bl }}>{s.best}</span> · Avg {s.avg} km/h
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    ) : null}
                </div>
            )}

            {/* ═══ GOALS ═══ */}
            <div style={{ ...sCard, padding: 20 }}>
                <SectionH title="My Goals" />

                {/* Add goal form */}
                <div style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                        <input value={newGoal} onChange={e => setNewGoal(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleAddGoal()}
                            placeholder="Add a new goal..."
                            style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: `1px solid ${B.g200}`, fontSize: 13, fontFamily: F, outline: 'none' }} />
                        <button onClick={handleAddGoal} disabled={savingGoal}
                            style={{ padding: '0 16px', borderRadius: 8, border: 'none', background: savingGoal ? B.g200 : B.bl, color: B.w, fontSize: 12, fontWeight: 700, fontFamily: F, cursor: savingGoal ? 'default' : 'pointer', opacity: savingGoal ? 0.6 : 1, minHeight: 40 }}>
                            {savingGoal ? '...' : 'ADD'}
                        </button>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', gap: 4 }}>
                            {GOAL_CATEGORIES.map(c => (
                                <button key={c.id} onClick={() => setNewGoalCategory(c.id)}
                                    style={{ padding: '3px 10px', borderRadius: 12, border: `1.5px solid ${newGoalCategory === c.id ? c.color : B.g200}`, background: newGoalCategory === c.id ? `${c.color}15` : 'transparent', fontSize: 9, fontWeight: newGoalCategory === c.id ? 700 : 500, color: newGoalCategory === c.id ? c.color : B.g400, fontFamily: F, cursor: 'pointer' }}>
                                    {c.label}
                                </button>
                            ))}
                        </div>
                        <input type="date" value={newGoalDate} onChange={e => setNewGoalDate(e.target.value)}
                            style={{ padding: '4px 8px', borderRadius: 8, border: `1px solid ${B.g200}`, fontSize: 10, fontFamily: F, color: B.g600, outline: 'none' }} />
                    </div>
                </div>

                {/* Category filter chips */}
                <div style={{ display: 'flex', gap: 4, marginBottom: 12, flexWrap: 'wrap' }}>
                    {[{ id: 'all', label: 'Active', color: B.nvD }, ...GOAL_CATEGORIES, { id: 'completed', label: 'Completed', color: B.grn }].map(f => (
                        <button key={f.id} onClick={() => setGoalFilter(f.id)}
                            style={{ padding: '4px 10px', borderRadius: 12, border: `1.5px solid ${goalFilter === f.id ? f.color : B.g200}`, background: goalFilter === f.id ? `${f.color}12` : 'transparent', fontSize: 9, fontWeight: goalFilter === f.id ? 700 : 500, color: goalFilter === f.id ? f.color : B.g400, fontFamily: F, cursor: 'pointer' }}>
                            {f.label}
                        </button>
                    ))}
                </div>

                {/* Goals list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {filteredGoals.length === 0 ? (
                        <div style={{ fontSize: 12, color: B.g400, fontFamily: F, textAlign: 'center', padding: 12 }}>
                            {goalFilter === 'completed' ? 'No completed goals yet.' : 'No goals in this category.'}
                        </div>
                    ) : (
                        filteredGoals.map(g => {
                            const cat = GOAL_CATEGORIES.find(c => c.id === g.category);
                            const isCompleting = completingId === g.id;
                            return (
                                <div key={g.id} style={{ padding: 12, border: `1px solid ${cat ? `${cat.color}30` : B.g200}`, borderRadius: 8, background: g.status === 'completed' ? `${B.grn}06` : B.g50, borderLeft: cat ? `3px solid ${cat.color}` : undefined }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                                            <div style={{ fontSize: 13, fontWeight: 600, color: B.nv, fontFamily: F, textDecoration: g.status === 'completed' ? 'line-through' : 'none' }}>{g.title}</div>
                                            {cat && <span style={{ fontSize: 8, fontWeight: 700, padding: '1px 6px', borderRadius: 6, background: `${cat.color}15`, color: cat.color, fontFamily: F }}>{cat.label}</span>}
                                        </div>
                                        <div style={{ fontSize: 10, fontWeight: 700, color: g.status === 'completed' ? B.grn : B.g400, fontFamily: F }}>
                                            {g.status === 'completed' ? 'DONE' : `${g.progress || 0}%`}
                                        </div>
                                    </div>

                                    {g.target_date && g.status !== 'completed' && (
                                        <div style={{ fontSize: 9, color: B.g400, fontFamily: F, marginBottom: 6 }}>
                                            Target: {new Date(g.target_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </div>
                                    )}

                                    {g.status !== 'completed' && (
                                        <div style={{ marginBottom: 4 }}>
                                            {/* Visual progress bar */}
                                            <div style={{ height: 6, background: B.g100, borderRadius: 3, overflow: 'hidden', marginBottom: 6 }}>
                                                <div style={{
                                                    width: `${g.progress || 0}%`, height: '100%',
                                                    background: (g.progress || 0) >= 75 ? B.grn : (g.progress || 0) >= 40 ? B.amb : cat?.color || B.bl,
                                                    borderRadius: 3, transition: 'width 0.3s ease'
                                                }} />
                                            </div>
                                            <input type="range" min="0" max="100" value={g.progress || 0}
                                                onChange={e => handleUpdateProgress(g.id, parseInt(e.target.value))}
                                                style={{ width: '100%', accentColor: cat?.color || B.bl }} />
                                        </div>
                                    )}

                                    {/* Completion prompt */}
                                    {isCompleting && (
                                        <div style={{ marginTop: 10, padding: 12, background: `${B.grn}08`, border: `1px solid ${B.grn}30`, borderRadius: 8 }}>
                                            <div style={{ fontSize: 11, fontWeight: 700, color: B.grn, fontFamily: F, marginBottom: 8 }}>Goal reached! Add a reflection:</div>
                                            <textarea value={reflectionNote} onChange={e => setReflectionNote(e.target.value)}
                                                placeholder="What did you learn? How did you grow?"
                                                rows={3} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: `1px solid ${B.g200}`, fontSize: 12, fontFamily: F, outline: 'none', boxSizing: 'border-box', resize: 'vertical' }} />
                                            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                                                <button onClick={() => handleCompleteGoal(g.id)}
                                                    style={{ flex: 1, padding: '8px', borderRadius: 8, border: 'none', background: B.grn, color: B.w, fontSize: 11, fontWeight: 700, fontFamily: F, cursor: 'pointer' }}>
                                                    Mark Complete
                                                </button>
                                                <button onClick={() => { setCompletingId(null); setReflectionNote(""); }}
                                                    style={{ padding: '8px 12px', borderRadius: 8, border: `1px solid ${B.g200}`, background: B.w, color: B.g600, fontSize: 11, fontFamily: F, cursor: 'pointer' }}>
                                                    Not Yet
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Show reflection for completed goals */}
                                    {g.status === 'completed' && g.reflection && (
                                        <div style={{ marginTop: 8, padding: '8px 12px', background: `${B.grn}08`, borderRadius: 6, fontSize: 11, color: B.g600, fontFamily: F, fontStyle: 'italic', lineHeight: 1.5 }}>
                                            {g.reflection}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* ═══ FOCUS AREAS ═══ */}
            <div style={{ ...sCard, padding: 20 }}>
                <SectionH title="Coach Focus Areas" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {focusAreas.length === 0 ? (
                        <div style={{ fontSize: 12, color: B.g400, fontFamily: F, textAlign: 'center' }}>No focus areas assigned yet.</div>
                    ) : (
                        focusAreas.map(f => {
                            const priority = PRIORITY_LEVELS[f.priority] || null;
                            return (
                                <div key={f.id} style={{ display: 'flex', gap: 12, padding: 12, borderLeft: `3px solid ${B.pk}`, background: B.g50, borderRadius: '0 8px 8px 0' }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <div style={{ fontSize: 13, fontWeight: 600, color: B.nv, fontFamily: F }}>{f.title}</div>
                                            {priority && <span style={{ fontSize: 8, fontWeight: 800, padding: '1px 6px', borderRadius: 4, background: `${priority.color}15`, color: priority.color, fontFamily: F }}>{priority.label}</span>}
                                        </div>
                                        {f.description && <div style={{ fontSize: 11, color: B.g500, fontFamily: F, lineHeight: 1.4, marginTop: 4 }}>{f.description}</div>}
                                        {f.domain && <div style={{ fontSize: 9, color: B.bl, fontFamily: F, marginTop: 4 }}>Domain: {f.domain}</div>}
                                        {f.created_at && <div style={{ fontSize: 9, color: B.g400, fontFamily: F, marginTop: 2 }}>Assigned: {new Date(f.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}</div>}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* ═══ NOTES ═══ */}
            <div style={{ ...sCard, padding: 20 }}>
                <SectionH title="IDP Notes" />

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                    {notes.length === 0 ? (
                        <div style={{ fontSize: 12, color: B.g400, fontFamily: F, textAlign: 'center' }}>No notes yet.</div>
                    ) : (
                        notes.map(n => (
                            <div key={n.id} style={{ padding: 12, background: n.author_role === 'player' ? B.w : B.g50, border: `1px solid ${B.g200}`, borderRadius: 8 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                    <div style={{ fontSize: 10, fontWeight: 700, color: n.author_role === 'player' ? B.bl : B.pk, fontFamily: F, textTransform: 'uppercase' }}>
                                        {n.author_role}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        {n.read_at && n.author_role === 'player' && <span style={{ fontSize: 8, color: B.grn, fontFamily: F }}>Read</span>}
                                        <div style={{ fontSize: 9, color: B.g400, fontFamily: F }}>
                                            {new Date(n.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ fontSize: 12, color: B.nv, fontFamily: F, lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>{n.content}</div>
                            </div>
                        ))
                    )}
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                    <input value={newNote} onChange={e => setNewNote(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAddNote()}
                        placeholder="Add a comment or note..."
                        style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: `1px solid ${B.g200}`, fontSize: 13, fontFamily: F, outline: 'none' }} />
                    <button onClick={handleAddNote} disabled={savingNote}
                        style={{ padding: '0 16px', borderRadius: 8, border: 'none', background: savingNote ? B.g200 : B.nvD, color: B.w, fontSize: 12, fontWeight: 700, fontFamily: F, cursor: savingNote ? 'default' : 'pointer', opacity: savingNote ? 0.6 : 1, minHeight: 40 }}>
                        {savingNote ? '...' : 'POST'}
                    </button>
                </div>
            </div>
        </div>
    );
}
