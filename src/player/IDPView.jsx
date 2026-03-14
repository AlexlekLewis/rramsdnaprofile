import React, { useState, useEffect, useRef, useCallback } from "react";
import { loadGoalsForPlayer, addGoal, updateGoalProgress, loadFocusAreas, loadNotes, addNote } from "../db/idpDb";
import { B, F, sCard } from "../data/theme";

export default function IDPView({ session, userProfile }) {
    const [goals, setGoals] = useState([]);
    const [focusAreas, setFocusAreas] = useState([]);
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);

    const [newGoal, setNewGoal] = useState("");
    const [newNote, setNewNote] = useState("");
    const [savingGoal, setSavingGoal] = useState(false);
    const [savingNote, setSavingNote] = useState(false);
    const [feedback, setFeedback] = useState(null); // { type: 'ok'|'err', text }
    const progressTimerRef = useRef(null);

    // Program selector (defaults to null meaning all programs)
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

    const handleAddGoal = async () => {
        if (!newGoal.trim() || savingGoal) return;
        setSavingGoal(true);
        try {
            const added = await addGoal({
                player_id: userProfile.id,
                program_id: programId,
                title: newGoal.trim(),
                status: 'active',
                progress: 0
            }, userProfile.id);
            setGoals([added, ...goals]);
            setNewGoal("");
            setFeedback({ type: 'ok', text: '✓ Goal added!' });
            setTimeout(() => setFeedback(null), 3000);
        } catch (e) {
            console.error(e);
            setFeedback({ type: 'err', text: '⚠ Failed to add goal' });
            setTimeout(() => setFeedback(null), 5000);
        } finally { setSavingGoal(false); }
    };

    const handleUpdateProgress = useCallback((id, val) => {
        setGoals(prev => prev.map(g => g.id === id ? { ...g, progress: val } : g));
        if (progressTimerRef.current) clearTimeout(progressTimerRef.current);
        progressTimerRef.current = setTimeout(async () => {
            try {
                const updated = await updateGoalProgress(id, val);
                setGoals(prev => prev.map(g => g.id === id ? updated : g));
            } catch (e) { console.error(e); }
        }, 500);
    }, []);

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
            setFeedback({ type: 'ok', text: '✓ Note posted!' });
            setTimeout(() => setFeedback(null), 3000);
        } catch (e) {
            console.error(e);
            setFeedback({ type: 'err', text: '⚠ Failed to post note' });
            setTimeout(() => setFeedback(null), 5000);
        } finally { setSavingNote(false); }
    };

    if (loading) return <div style={{ padding: 24, fontSize: 13, color: B.g400, fontFamily: F, textAlign: 'center' }}>Loading IDP...</div>;

    const SectionH = ({ title }) => (
        <div style={{ fontSize: 14, fontWeight: 800, color: B.nvD, fontFamily: F, marginBottom: 16 }}>{title}</div>
    );

    return (
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* FEEDBACK TOAST */}
            {feedback && (
                <div style={{ padding: '10px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, fontFamily: F, background: feedback.type === 'ok' ? `${B.grn}15` : '#fee2e2', color: feedback.type === 'ok' ? B.grn : '#dc2626', border: `1px solid ${feedback.type === 'ok' ? `${B.grn}30` : '#fca5a5'}`, transition: 'all 0.3s' }}>
                    {feedback.text}
                </div>
            )}

            {/* ═══ GOALS ═══ */}
            <div style={{ ...sCard, padding: 20 }}>
                <SectionH title="My Goals" />

                <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                    <input
                        value={newGoal}
                        onChange={e => setNewGoal(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAddGoal()}
                        placeholder="Add a new goal..."
                        style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: `1px solid ${B.g200}`, fontSize: 13, fontFamily: F, outline: 'none' }}
                    />
                    <button
                        onClick={handleAddGoal}
                        disabled={savingGoal}
                        style={{ padding: '0 16px', borderRadius: 8, border: 'none', background: savingGoal ? B.g200 : B.bl, color: B.w, fontSize: 12, fontWeight: 700, fontFamily: F, cursor: savingGoal ? 'default' : 'pointer', opacity: savingGoal ? 0.6 : 1, minHeight: 40 }}
                    >{savingGoal ? '...' : 'ADD'}</button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {goals.length === 0 ? (
                        <div style={{ fontSize: 12, color: B.g400, fontFamily: F, textAlign: 'center' }}>No goals set yet.</div>
                    ) : (
                        goals.map(g => (
                            <div key={g.id} style={{ padding: 12, border: `1px solid ${B.g200}`, borderRadius: 8, background: B.g50 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: B.nv, fontFamily: F }}>{g.title}</div>
                                    <div style={{ fontSize: 10, fontWeight: 700, color: g.status === 'completed' ? B.grn : B.g400 }}>{(g.status || 'active').toUpperCase()}</div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <input
                                        type="range" min="0" max="100" value={g.progress || 0}
                                        onChange={e => handleUpdateProgress(g.id, parseInt(e.target.value))}
                                        style={{ flex: 1 }}
                                    />
                                    <div style={{ fontSize: 11, fontWeight: 700, color: B.g500, fontFamily: F, width: 40, textAlign: 'right' }}>{g.progress || 0}%</div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* ═══ FOCUS AREAS ═══ */}
            <div style={{ ...sCard, padding: 20 }}>
                <SectionH title="Coach Focus Areas" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {focusAreas.length === 0 ? (
                        <div style={{ fontSize: 12, color: B.g400, fontFamily: F, textAlign: 'center' }}>No focus areas assigned yet.</div>
                    ) : (
                        focusAreas.map(f => (
                            <div key={f.id} style={{ display: 'flex', gap: 12, padding: 12, borderLeft: `3px solid ${B.pk}`, background: B.g50, borderRadius: '0 8px 8px 0' }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: B.nv, fontFamily: F, marginBottom: 4 }}>{f.title}</div>
                                    {f.description && <div style={{ fontSize: 11, color: B.g500, fontFamily: F, lineHeight: 1.4 }}>{f.description}</div>}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* ═══ NOTES ═══ */}
            <div style={{ ...sCard, padding: 20 }}>
                <SectionH title="IDP Notes" />

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                    {notes.length === 0 ? (
                        <div style={{ fontSize: 12, color: B.g400, fontFamily: F, textAlign: 'center' }}>No notes yet.</div>
                    ) : (
                        notes.map(n => (
                            <div key={n.id} style={{ padding: 12, background: n.author_role === 'player' ? B.w : B.g50, border: `1px solid ${B.g200}`, borderRadius: 8 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                    <div style={{ fontSize: 10, fontWeight: 700, color: n.author_role === 'player' ? B.bl : B.pk, fontFamily: F, textTransform: 'uppercase' }}>
                                        {n.author_role}
                                    </div>
                                    <div style={{ fontSize: 9, color: B.g400, fontFamily: F }}>
                                        {new Date(n.created_at).toLocaleDateString()}
                                    </div>
                                </div>
                                <div style={{ fontSize: 12, color: B.nv, fontFamily: F, lineHeight: 1.4 }}>{n.content}</div>
                            </div>
                        ))
                    )}
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                    <input
                        value={newNote}
                        onChange={e => setNewNote(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAddNote()}
                        placeholder="Add a comment or note..."
                        style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: `1px solid ${B.g200}`, fontSize: 13, fontFamily: F, outline: 'none' }}
                    />
                    <button
                        onClick={handleAddNote}
                        disabled={savingNote}
                        style={{ padding: '0 16px', borderRadius: 8, border: 'none', background: savingNote ? B.g200 : B.nvD, color: B.w, fontSize: 12, fontWeight: 700, fontFamily: F, cursor: savingNote ? 'default' : 'pointer', opacity: savingNote ? 0.6 : 1, minHeight: 40 }}
                    >{savingNote ? '...' : 'POST'}</button>
                </div>
            </div>

        </div>
    );
}
