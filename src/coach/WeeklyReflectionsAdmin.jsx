// ═══ ADMIN: WEEKLY REFLECTIONS AUTHORING ═══
// Coaches/admins create a weekly reflection (up to 3 multi-choice questions),
// publish it to players at the end of the week, and review responses.

import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { B, F, sCard } from '../data/theme';
import {
    loadAllReflections,
    createReflection,
    updateReflection,
    publishReflection,
    unpublishReflection,
    deleteReflection,
    loadResponsesForReflection,
    validateQuestions,
} from '../db/reflectionsDb';

// Empty-question template
const BLANK_Q = () => ({ text: '', options: ['', ''] });

// Starter form state for a new week
const blankForm = () => ({
    weekNumber: 2,
    weekLabel: '',
    questions: [BLANK_Q()],
});

export default function WeeklyReflectionsAdmin() {
    const { session } = useAuth();
    const [reflections, setReflections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [mode, setMode] = useState('list'); // list | create | edit | view
    const [form, setForm] = useState(blankForm());
    const [editingId, setEditingId] = useState(null);
    const [viewingReflection, setViewingReflection] = useState(null);
    const [viewingResponses, setViewingResponses] = useState([]);
    const [saving, setSaving] = useState(false);
    const [feedback, setFeedback] = useState(null);

    const refresh = async () => {
        setLoading(true);
        try {
            const data = await loadAllReflections();
            setReflections(data);
            setError(null);
        } catch (e) {
            setError(e.message || 'Failed to load');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { refresh(); }, []);

    const showMsg = (type, text) => {
        setFeedback({ type, text });
        setTimeout(() => setFeedback(null), 3500);
    };

    const startNew = () => {
        const nextWeek = reflections.length > 0 ? Math.max(...reflections.map(r => r.week_number)) + 1 : 2;
        setForm({ ...blankForm(), weekNumber: nextWeek });
        setEditingId(null);
        setMode('create');
    };

    const startEdit = (r) => {
        setForm({
            weekNumber: r.week_number,
            weekLabel: r.week_label || '',
            questions: r.questions && r.questions.length > 0 ? r.questions : [BLANK_Q()],
        });
        setEditingId(r.id);
        setMode('edit');
    };

    const startView = async (r) => {
        setViewingReflection(r);
        const resp = await loadResponsesForReflection(r.id);
        setViewingResponses(resp);
        setMode('view');
    };

    const addQuestion = () => {
        if (form.questions.length >= 3) return;
        setForm(f => ({ ...f, questions: [...f.questions, BLANK_Q()] }));
    };

    const removeQuestion = (idx) => {
        setForm(f => ({ ...f, questions: f.questions.filter((_, i) => i !== idx) }));
    };

    const updateQuestionText = (idx, text) => {
        setForm(f => ({ ...f, questions: f.questions.map((q, i) => i === idx ? { ...q, text } : q) }));
    };

    const updateOption = (qIdx, oIdx, text) => {
        setForm(f => ({ ...f, questions: f.questions.map((q, i) => i === qIdx ? { ...q, options: q.options.map((o, j) => j === oIdx ? text : o) } : q) }));
    };

    const addOption = (qIdx) => {
        setForm(f => ({ ...f, questions: f.questions.map((q, i) => {
            if (i !== qIdx || q.options.length >= 5) return q;
            return { ...q, options: [...q.options, ''] };
        }) }));
    };

    const removeOption = (qIdx, oIdx) => {
        setForm(f => ({ ...f, questions: f.questions.map((q, i) => {
            if (i !== qIdx || q.options.length <= 2) return q;
            return { ...q, options: q.options.filter((_, j) => j !== oIdx) };
        }) }));
    };

    const handleSave = async (publishAfter = false) => {
        const v = validateQuestions(form.questions);
        if (!v.ok) { showMsg('err', v.error); return; }
        setSaving(true);
        try {
            let saved;
            const payload = {
                weekNumber: form.weekNumber,
                weekLabel: form.weekLabel?.trim() || null,
                questions: form.questions.map(q => ({ text: q.text.trim(), options: q.options.map(o => o.trim()) })),
                createdBy: session?.user?.id,
            };
            if (editingId) {
                saved = await updateReflection(editingId, {
                    week_number: payload.weekNumber,
                    week_label: payload.weekLabel,
                    questions: payload.questions,
                });
            } else {
                saved = await createReflection(payload);
            }
            if (publishAfter && saved) {
                await publishReflection(saved.id);
            }
            showMsg('ok', publishAfter ? 'Published to players ✓' : 'Saved as draft ✓');
            setMode('list');
            setForm(blankForm());
            setEditingId(null);
            await refresh();
        } catch (e) {
            showMsg('err', e.message || 'Save failed');
        } finally {
            setSaving(false);
        }
    };

    const togglePublish = async (r) => {
        try {
            if (r.published_at) {
                if (!confirm(`Unpublish Week ${r.week_number}? Players won't see it anymore, but their existing answers are kept.`)) return;
                await unpublishReflection(r.id);
                showMsg('ok', 'Unpublished');
            } else {
                const v = validateQuestions(r.questions || []);
                if (!v.ok) { showMsg('err', `Cannot publish: ${v.error}`); return; }
                if (!confirm(`Publish Week ${r.week_number} to all players now?`)) return;
                await publishReflection(r.id);
                showMsg('ok', 'Published to players ✓');
            }
            await refresh();
        } catch (e) { showMsg('err', e.message || 'Failed'); }
    };

    const handleDelete = async (r) => {
        const responseCount = r.response_count || 0; // not loaded here but informational
        const warn = r.published_at
            ? `⚠ Delete Week ${r.week_number}? It is PUBLISHED and any player responses will also be deleted. This cannot be undone.`
            : `Delete draft for Week ${r.week_number}?`;
        if (!confirm(warn)) return;
        try {
            await deleteReflection(r.id);
            showMsg('ok', 'Deleted');
            await refresh();
        } catch (e) { showMsg('err', e.message || 'Delete failed'); }
    };

    // ═══ VIEW MODES ═══

    if (loading) return <div style={{ padding: 24, color: B.g400, fontSize: 11, fontFamily: F, textAlign: 'center' }}>Loading reflections…</div>;

    return (
        <div style={{ padding: 12, fontFamily: F }}>
            {/* Feedback toast */}
            {feedback && (
                <div style={{ position: 'sticky', top: 0, zIndex: 10, padding: '8px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: feedback.type === 'ok' ? `${B.grn}15` : '#fee2e2', color: feedback.type === 'ok' ? B.grn : '#dc2626', border: `1px solid ${feedback.type === 'ok' ? `${B.grn}30` : '#fca5a5'}`, marginBottom: 10 }}>
                    {feedback.text}
                </div>
            )}

            {/* ═══ LIST MODE ═══ */}
            {mode === 'list' && (
                <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <div>
                            <div style={{ fontSize: 14, fontWeight: 800, color: B.nvD }}>Weekly Reflections</div>
                            <div style={{ fontSize: 10, color: B.g400, marginTop: 2 }}>3 multi-choice questions each week · players answer at week-end</div>
                        </div>
                        <button onClick={startNew} style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: B.bl, color: B.w, fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>
                            + New Week
                        </button>
                    </div>

                    {error && <div style={{ padding: 12, color: B.red, fontSize: 11 }}>⚠ {error}</div>}

                    {reflections.length === 0 && !error && (
                        <div style={{ ...sCard, padding: 24, textAlign: 'center' }}>
                            <div style={{ fontSize: 24, marginBottom: 8 }}>📝</div>
                            <div style={{ fontSize: 13, fontWeight: 800, color: B.nvD, marginBottom: 4 }}>No reflections yet</div>
                            <div style={{ fontSize: 11, color: B.g400, marginBottom: 16 }}>
                                Create the first week's reflection questions. Players will see them once you publish.
                            </div>
                            <button onClick={startNew} style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: B.bl, color: B.w, fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>
                                Create Week's Reflection
                            </button>
                        </div>
                    )}

                    {reflections.map(r => (
                        <div key={r.id} style={{ ...sCard, padding: 14, marginBottom: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                                        <div style={{ fontSize: 14, fontWeight: 800, color: B.nvD }}>Week {r.week_number}</div>
                                        {r.week_label && <div style={{ fontSize: 10, color: B.g400 }}>· {r.week_label}</div>}
                                        <div style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: r.published_at ? `${B.grn}15` : `${B.g200}40`, color: r.published_at ? B.grn : B.g600 }}>
                                            {r.published_at ? 'PUBLISHED' : 'DRAFT'}
                                        </div>
                                    </div>
                                    <div style={{ fontSize: 10, color: B.g400, marginTop: 4 }}>
                                        {(r.questions || []).length} question{r.questions?.length !== 1 ? 's' : ''}
                                        {r.published_at && ` · published ${new Date(r.published_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}`}
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                                <button onClick={() => startView(r)} style={{ fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 6, border: `1px solid ${B.g200}`, background: 'transparent', color: B.g600, cursor: 'pointer' }}>View Responses</button>
                                <button onClick={() => startEdit(r)} style={{ fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 6, border: `1px solid ${B.bl}`, background: `${B.bl}10`, color: B.bl, cursor: 'pointer' }}>Edit</button>
                                <button onClick={() => togglePublish(r)} style={{ fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 6, border: 'none', background: r.published_at ? B.amb : B.grn, color: B.w, cursor: 'pointer' }}>
                                    {r.published_at ? 'Unpublish' : 'Publish'}
                                </button>
                                <button onClick={() => handleDelete(r)} style={{ fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 6, border: `1px solid ${B.red}30`, background: 'transparent', color: B.red, cursor: 'pointer' }}>Delete</button>
                            </div>
                        </div>
                    ))}
                </>
            )}

            {/* ═══ CREATE / EDIT MODE ═══ */}
            {(mode === 'create' || mode === 'edit') && (
                <>
                    <button onClick={() => { setMode('list'); setForm(blankForm()); setEditingId(null); }}
                        style={{ fontSize: 10, fontWeight: 600, color: B.bl, background: 'none', border: 'none', cursor: 'pointer', marginBottom: 12 }}>← Back to list</button>

                    <div style={{ ...sCard, padding: 16, marginBottom: 12 }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: B.nvD, marginBottom: 12 }}>
                            {mode === 'edit' ? `Editing Week ${form.weekNumber}` : 'Create Weekly Reflection'}
                        </div>

                        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                            <div style={{ flex: '0 0 90px' }}>
                                <div style={{ fontSize: 9, fontWeight: 700, color: B.g600, textTransform: 'uppercase', marginBottom: 4 }}>Week #</div>
                                <input type="number" min="1" max="52" value={form.weekNumber}
                                    onChange={e => setForm(f => ({ ...f, weekNumber: parseInt(e.target.value) || 1 }))}
                                    style={{ width: '100%', padding: '8px 10px', fontSize: 12, fontFamily: F, borderRadius: 6, border: `1px solid ${B.g200}`, outline: 'none', boxSizing: 'border-box' }} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 9, fontWeight: 700, color: B.g600, textTransform: 'uppercase', marginBottom: 4 }}>Label (optional)</div>
                                <input type="text" value={form.weekLabel} placeholder="e.g. Skill Development Week 1"
                                    onChange={e => setForm(f => ({ ...f, weekLabel: e.target.value }))}
                                    style={{ width: '100%', padding: '8px 10px', fontSize: 12, fontFamily: F, borderRadius: 6, border: `1px solid ${B.g200}`, outline: 'none', boxSizing: 'border-box' }} />
                            </div>
                        </div>

                        {form.questions.map((q, qIdx) => (
                            <div key={qIdx} style={{ padding: 12, border: `1px solid ${B.g200}`, borderRadius: 8, marginBottom: 10, background: B.g50 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                    <div style={{ fontSize: 11, fontWeight: 800, color: B.bl }}>Question {qIdx + 1}</div>
                                    {form.questions.length > 1 && (
                                        <button onClick={() => removeQuestion(qIdx)} style={{ marginLeft: 'auto', fontSize: 9, fontWeight: 700, color: B.red, background: 'none', border: 'none', cursor: 'pointer' }}>Remove</button>
                                    )}
                                </div>
                                <textarea value={q.text} rows={2} placeholder="Type the question players will see..."
                                    onChange={e => updateQuestionText(qIdx, e.target.value)}
                                    style={{ width: '100%', padding: '8px 10px', fontSize: 12, fontFamily: F, borderRadius: 6, border: `1px solid ${B.g200}`, outline: 'none', boxSizing: 'border-box', resize: 'vertical', marginBottom: 8 }} />

                                <div style={{ fontSize: 9, fontWeight: 700, color: B.g600, textTransform: 'uppercase', marginBottom: 4 }}>Options ({q.options.length})</div>
                                {q.options.map((o, oIdx) => (
                                    <div key={oIdx} style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                                        <input value={o} placeholder={`Option ${String.fromCharCode(65 + oIdx)}`}
                                            onChange={e => updateOption(qIdx, oIdx, e.target.value)}
                                            style={{ flex: 1, padding: '6px 10px', fontSize: 11, fontFamily: F, borderRadius: 6, border: `1px solid ${B.g200}`, outline: 'none' }} />
                                        {q.options.length > 2 && (
                                            <button onClick={() => removeOption(qIdx, oIdx)} style={{ fontSize: 10, fontWeight: 700, color: B.red, background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px' }}>✕</button>
                                        )}
                                    </div>
                                ))}
                                {q.options.length < 5 && (
                                    <button onClick={() => addOption(qIdx)} style={{ marginTop: 4, fontSize: 10, fontWeight: 700, color: B.bl, background: 'none', border: `1px dashed ${B.bl}`, borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>+ Add option</button>
                                )}
                            </div>
                        ))}

                        {form.questions.length < 3 && (
                            <button onClick={addQuestion} style={{ width: '100%', fontSize: 11, fontWeight: 800, color: B.bl, background: `${B.bl}08`, border: `1.5px dashed ${B.bl}`, borderRadius: 8, padding: 10, cursor: 'pointer', marginBottom: 12 }}>
                                + Add Question ({form.questions.length}/3)
                            </button>
                        )}

                        <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => handleSave(false)} disabled={saving}
                                style={{ flex: 1, padding: '10px', borderRadius: 8, border: `1px solid ${B.g200}`, background: B.w, color: B.g700, fontSize: 12, fontWeight: 800, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1 }}>
                                💾 Save as Draft
                            </button>
                            <button onClick={() => handleSave(true)} disabled={saving}
                                style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: B.grn, color: B.w, fontSize: 12, fontWeight: 800, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1 }}>
                                🚀 Save & Publish Now
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* ═══ VIEW RESPONSES MODE ═══ */}
            {mode === 'view' && viewingReflection && (
                <>
                    <button onClick={() => { setMode('list'); setViewingReflection(null); setViewingResponses([]); }}
                        style={{ fontSize: 10, fontWeight: 600, color: B.bl, background: 'none', border: 'none', cursor: 'pointer', marginBottom: 12 }}>← Back to list</button>

                    <div style={{ ...sCard, padding: 14, marginBottom: 12 }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: B.nvD }}>Week {viewingReflection.week_number} Responses</div>
                        {viewingReflection.week_label && <div style={{ fontSize: 10, color: B.g400, marginTop: 2 }}>{viewingReflection.week_label}</div>}
                        <div style={{ fontSize: 10, color: B.g400, marginTop: 6 }}>
                            {viewingResponses.length} response{viewingResponses.length !== 1 ? 's' : ''} from players
                        </div>
                    </div>

                    {(viewingReflection.questions || []).map((q, qIdx) => {
                        // Tally answer counts per option
                        const tally = (q.options || []).map((opt, oIdx) => {
                            const count = viewingResponses.filter(resp =>
                                (resp.answers || []).some(a => a.question_index === qIdx && a.option_index === oIdx)
                            ).length;
                            return { label: opt, count };
                        });
                        const total = tally.reduce((sum, t) => sum + t.count, 0);
                        return (
                            <div key={qIdx} style={{ ...sCard, padding: 14, marginBottom: 10 }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: B.nvD, marginBottom: 10 }}>
                                    Q{qIdx + 1}. {q.text}
                                </div>
                                {tally.map((t, oIdx) => {
                                    const pct = total > 0 ? Math.round((t.count / total) * 100) : 0;
                                    return (
                                        <div key={oIdx} style={{ marginBottom: 6 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 3 }}>
                                                <span style={{ color: B.g700, fontWeight: 600 }}>{String.fromCharCode(65 + oIdx)}. {t.label}</span>
                                                <span style={{ color: B.g400, fontWeight: 700 }}>{t.count} ({pct}%)</span>
                                            </div>
                                            <div style={{ height: 6, background: B.g100, borderRadius: 3, overflow: 'hidden' }}>
                                                <div style={{ width: `${pct}%`, height: '100%', background: B.bl, transition: 'width 0.3s' }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}

                    {viewingResponses.length > 0 && (
                        <details style={{ ...sCard, padding: 10 }}>
                            <summary style={{ cursor: 'pointer', fontSize: 11, fontWeight: 700, color: B.g600 }}>See individual responses ({viewingResponses.length})</summary>
                            <div style={{ marginTop: 10 }}>
                                {viewingResponses.map(r => (
                                    <div key={r.id} style={{ padding: 8, borderBottom: `1px solid ${B.g100}`, fontSize: 10 }}>
                                        <div style={{ fontWeight: 700, color: B.nvD }}>{r.player?.name || 'Unknown player'}</div>
                                        <div style={{ color: B.g400, fontSize: 9, marginTop: 2 }}>
                                            Submitted {new Date(r.submitted_at).toLocaleString('en-AU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                        <div style={{ marginTop: 4 }}>
                                            {(r.answers || []).map((a, i) => (
                                                <div key={i} style={{ color: B.g700 }}>• {a.option_text || `Option ${String.fromCharCode(65 + a.option_index)}`}</div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </details>
                    )}
                </>
            )}
        </div>
    );
}
