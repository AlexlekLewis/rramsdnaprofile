import React, { useState, useEffect, useRef, useCallback } from "react";
import { loadGoalsForPlayer, addGoal, updateGoalProgress, updateGoal, completeGoal, loadFocusAreas, loadNotes, addNote } from "../db/idpDb";
import { B, F, sCard } from "../data/theme";

const GOAL_CATEGORIES = [
    { id: 'technical', label: 'Technical', color: B.pk },
    { id: 'mental', label: 'Mental', color: B.prp },
    { id: 'physical', label: 'Physical', color: B.org },
    { id: 'tactical', label: 'Tactical', color: B.bl },
];

const PRIORITY_LEVELS = { high: { label: 'HIGH', color: B.red }, medium: { label: 'MED', color: B.amb }, low: { label: 'LOW', color: B.grn } };

export default function IDPView({ session, userProfile }) {
    const [goals, setGoals] = useState([]);
    const [focusAreas, setFocusAreas] = useState([]);
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);

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
    const [goalFilter, setGoalFilter] = useState("all"); // all | technical | mental | physical | tactical | completed

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
                // Prompt completion when hitting 100%
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

    const SectionH = ({ title }) => (
        <div style={{ fontSize: 14, fontWeight: 800, color: B.nvD, fontFamily: F, marginBottom: 16 }}>{title}</div>
    );

    return (
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* FEEDBACK TOAST */}
            {feedback && (
                <div style={{ padding: '10px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, fontFamily: F, background: feedback.type === 'ok' ? `${B.grn}15` : '#fee2e2', color: feedback.type === 'ok' ? B.grn : '#dc2626', border: `1px solid ${feedback.type === 'ok' ? `${B.grn}30` : '#fca5a5'}` }}>
                    {feedback.text}
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
                        {/* Category selector */}
                        <div style={{ display: 'flex', gap: 4 }}>
                            {GOAL_CATEGORIES.map(c => (
                                <button key={c.id} onClick={() => setNewGoalCategory(c.id)}
                                    style={{ padding: '3px 10px', borderRadius: 12, border: `1.5px solid ${newGoalCategory === c.id ? c.color : B.g200}`, background: newGoalCategory === c.id ? `${c.color}15` : 'transparent', fontSize: 9, fontWeight: newGoalCategory === c.id ? 700 : 500, color: newGoalCategory === c.id ? c.color : B.g400, fontFamily: F, cursor: 'pointer' }}>
                                    {c.label}
                                </button>
                            ))}
                        </div>
                        {/* Target date */}
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
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <input type="range" min="0" max="100" value={g.progress || 0}
                                                onChange={e => handleUpdateProgress(g.id, parseInt(e.target.value))}
                                                style={{ flex: 1, accentColor: cat?.color || B.bl }} />
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
