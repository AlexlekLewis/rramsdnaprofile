// ═══ ADMIN: WEEKLY REVIEW AUTHORING ═══
// Coaches/admins author each week's questions (text or multiple choice),
// publish them to players at end-of-week, and review responses.

import React, { useEffect, useMemo, useState } from 'react';
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
    groupQuestionsByCategory,
    questionType,
} from '../db/weeklyReflectionDb';

const SUGGESTED_CATEGORIES = ['Short Ball', 'Sweeps', 'Fielding', 'Batting', 'Bowling', 'Mindset'];
const CATEGORY_COLOR = { 'Short Ball': B.org, 'Sweeps': B.bl, 'Fielding': B.grn };
const colorForCategory = (cat) => CATEGORY_COLOR[cat] || B.nvD;

// Generate a stable, slug-ish id from a category name. "Short Ball" → "sb",
// "Sweeps" → "sw", "Fielding" → "f", anything else → first 2 letters lowercased.
const categoryPrefix = (cat) => {
    if (!cat) return 'q';
    const words = cat.trim().split(/\s+/);
    if (words.length >= 2) return (words[0][0] + words[1][0]).toLowerCase();
    return cat.slice(0, 2).toLowerCase();
};

// Allocate the next free question id for a given category. Uses prefix + integer.
const nextQuestionId = (existingIds, category) => {
    const prefix = categoryPrefix(category);
    let i = 1;
    while (existingIds.has(`${prefix}${i}`)) i++;
    return `${prefix}${i}`;
};

const blankTextQuestion = (existingIds, category = '') => ({
    id: nextQuestionId(existingIds, category),
    category,
    type: 'text',
    question: '',
});

const blankChoiceQuestion = (existingIds, category = '') => ({
    id: nextQuestionId(existingIds, category),
    category,
    type: 'choice',
    question: '',
    options: [
        { id: 'a', label: '' },
        { id: 'b', label: '' },
    ],
});

const blankForm = () => ({
    weekNumber: 2,
    weekLabel: '',
    questions: [blankTextQuestion(new Set(), 'Short Ball')],
});

// Coerce a legacy question object into the new shape (used when loading rows
// authored under the previous schema). Always preserves the id.
const normaliseQuestion = (q) => {
    const out = { ...q };
    out.id = q?.id || `q${Math.random().toString(36).slice(2, 6)}`;
    out.category = q?.category || '';
    out.type = questionType(q);
    out.question = q?.question || q?.text || '';
    if (out.type === 'choice') {
        out.options = Array.isArray(q?.options) ? q.options.map((o, i) => {
            if (o && typeof o === 'object') return { id: o.id || String.fromCharCode(97 + i), label: o.label || '' };
            // Legacy choice options were plain strings; promote them.
            return { id: String.fromCharCode(97 + i), label: String(o ?? '') };
        }) : [{ id: 'a', label: '' }, { id: 'b', label: '' }];
    } else {
        delete out.options;
    }
    return out;
};

export default function WeeklyReflectionsAdmin() {
    const { session } = useAuth();
    const [reflections, setReflections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [mode, setMode] = useState('list'); // list | create | edit | view
    const [form, setForm] = useState(blankForm());
    const [editingId, setEditingId] = useState(null);
    const [editingPublished, setEditingPublished] = useState(false);
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
        setEditingPublished(false);
        setMode('create');
    };

    const startEdit = (r) => {
        const normalised = (r.questions || []).map(normaliseQuestion);
        setForm({
            weekNumber: r.week_number,
            weekLabel: r.week_label || '',
            questions: normalised.length > 0 ? normalised : [blankTextQuestion(new Set(), 'Short Ball')],
        });
        setEditingId(r.id);
        setEditingPublished(!!r.published_at);
        setMode('edit');
    };

    const startView = async (r) => {
        setViewingReflection(r);
        try {
            const resp = await loadResponsesForReflection(r.id);
            setViewingResponses(resp);
        } catch (e) {
            showMsg('err', e.message || 'Failed to load responses');
            setViewingResponses([]);
        }
        setMode('view');
    };

    const existingIds = useMemo(() => new Set(form.questions.map(q => q.id)), [form.questions]);

    // ── Question editing ──
    const addTextQuestion = (category = '') => {
        if (form.questions.length >= 20) return;
        setForm(f => ({ ...f, questions: [...f.questions, blankTextQuestion(new Set(f.questions.map(q => q.id)), category)] }));
    };
    const addChoiceQuestion = (category = '') => {
        if (form.questions.length >= 20) return;
        setForm(f => ({ ...f, questions: [...f.questions, blankChoiceQuestion(new Set(f.questions.map(q => q.id)), category)] }));
    };
    const removeQuestion = (idx) => {
        setForm(f => ({ ...f, questions: f.questions.filter((_, i) => i !== idx) }));
    };
    const moveQuestion = (idx, dir) => {
        setForm(f => {
            const target = idx + dir;
            if (target < 0 || target >= f.questions.length) return f;
            const list = [...f.questions];
            [list[idx], list[target]] = [list[target], list[idx]];
            return { ...f, questions: list };
        });
    };
    const updateQuestion = (idx, patch) => {
        setForm(f => ({ ...f, questions: f.questions.map((q, i) => i === idx ? { ...q, ...patch } : q) }));
    };
    const switchType = (idx, newType) => {
        setForm(f => ({
            ...f,
            questions: f.questions.map((q, i) => {
                if (i !== idx) return q;
                if (newType === 'choice') {
                    return { ...q, type: 'choice', options: q.options || [{ id: 'a', label: '' }, { id: 'b', label: '' }] };
                }
                const { options, ...rest } = q;
                return { ...rest, type: 'text' };
            }),
        }));
    };
    const updateOption = (qIdx, oIdx, patch) => {
        setForm(f => ({
            ...f,
            questions: f.questions.map((q, i) => i !== qIdx ? q : {
                ...q,
                options: q.options.map((o, j) => j === oIdx ? { ...o, ...patch } : o),
            }),
        }));
    };
    const addOption = (qIdx) => {
        setForm(f => ({
            ...f,
            questions: f.questions.map((q, i) => {
                if (i !== qIdx) return q;
                if (q.options.length >= 8) return q;
                const usedIds = new Set(q.options.map(o => o.id));
                let nextId = '';
                for (const c of 'abcdefghijklmnopqrstuvwxyz') if (!usedIds.has(c)) { nextId = c; break; }
                return { ...q, options: [...q.options, { id: nextId || `o${q.options.length + 1}`, label: '' }] };
            }),
        }));
    };
    const removeOption = (qIdx, oIdx) => {
        setForm(f => ({
            ...f,
            questions: f.questions.map((q, i) => {
                if (i !== qIdx || q.options.length <= 2) return q;
                return { ...q, options: q.options.filter((_, j) => j !== oIdx) };
            }),
        }));
    };

    const handleSave = async (publishAfter = false) => {
        // Trim before validating
        const trimmed = form.questions.map(q => {
            const out = { id: (q.id || '').trim(), category: (q.category || '').trim(), type: questionType(q), question: (q.question || '').trim() };
            if (out.type === 'choice') {
                out.options = (q.options || []).map(o => ({ id: (o.id || '').trim(), label: (o.label || '').trim() }));
            }
            return out;
        });
        const v = validateQuestions(trimmed);
        if (!v.ok) { showMsg('err', v.error); return; }
        setSaving(true);
        try {
            const payload = {
                weekNumber: form.weekNumber,
                weekLabel: form.weekLabel?.trim() || null,
                questions: trimmed,
                createdBy: session?.user?.id,
            };
            let saved;
            if (editingId) {
                saved = await updateReflection(editingId, {
                    week_number: payload.weekNumber,
                    week_label: payload.weekLabel,
                    questions: payload.questions,
                });
            } else {
                saved = await createReflection(payload);
            }
            if (publishAfter && saved && !saved.published_at) {
                await publishReflection(saved.id);
            }
            showMsg('ok', publishAfter ? 'Published to players ✓' : 'Saved as draft ✓');
            setMode('list');
            setForm(blankForm());
            setEditingId(null);
            setEditingPublished(false);
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
                if (!window.confirm(`Unpublish Week ${r.week_number}? Players won't see it on their portal anymore, but their existing answers are kept.`)) return;
                await unpublishReflection(r.id);
                showMsg('ok', 'Unpublished');
            } else {
                const v = validateQuestions((r.questions || []).map(normaliseQuestion));
                if (!v.ok) { showMsg('err', `Cannot publish: ${v.error}`); return; }
                if (!window.confirm(`Publish Week ${r.week_number} to all players now?`)) return;
                await publishReflection(r.id);
                showMsg('ok', 'Published to players ✓');
            }
            await refresh();
        } catch (e) { showMsg('err', e.message || 'Failed'); }
    };

    const handleDelete = async (r) => {
        const warn = r.published_at
            ? `⚠ Delete Week ${r.week_number}? It is PUBLISHED and any player responses will also be deleted. This cannot be undone.`
            : `Delete draft for Week ${r.week_number}?`;
        if (!window.confirm(warn)) return;
        try {
            await deleteReflection(r.id);
            showMsg('ok', 'Deleted');
            await refresh();
        } catch (e) { showMsg('err', e.message || 'Delete failed'); }
    };

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
                            <div style={{ fontSize: 14, fontWeight: 800, color: B.nvD }}>Weekly Review</div>
                            <div style={{ fontSize: 10, color: B.g400, marginTop: 2 }}>
                                Author each week's questions (text or multiple choice), publish at week-end, view responses.
                            </div>
                        </div>
                        <button onClick={startNew} style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: B.bl, color: B.w, fontSize: 11, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                            + New Week
                        </button>
                    </div>

                    {error && <div style={{ padding: 12, color: B.red, fontSize: 11 }}>⚠ {error}</div>}

                    {reflections.length === 0 && !error && (
                        <div style={{ ...sCard, padding: 24, textAlign: 'center' }}>
                            <div style={{ fontSize: 24, marginBottom: 8 }}>📝</div>
                            <div style={{ fontSize: 13, fontWeight: 800, color: B.nvD, marginBottom: 4 }}>No reflections yet</div>
                            <div style={{ fontSize: 11, color: B.g400, marginBottom: 16 }}>
                                Create the first week's questions. Players will see them once you publish.
                            </div>
                            <button onClick={startNew} style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: B.bl, color: B.w, fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>
                                Create Week's Reflection
                            </button>
                        </div>
                    )}

                    {reflections.map(r => {
                        const qCount = (r.questions || []).length;
                        const choiceCount = (r.questions || []).filter(q => questionType(q) === 'choice').length;
                        return (
                            <div key={r.id} style={{ ...sCard, padding: 14, marginBottom: 8 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                                            <div style={{ fontSize: 14, fontWeight: 800, color: B.nvD }}>Week {r.week_number}</div>
                                            {r.week_label && <div style={{ fontSize: 10, color: B.g400 }}>· {r.week_label}</div>}
                                            <div style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: r.published_at ? `${B.grn}15` : `${B.g200}40`, color: r.published_at ? B.grn : B.g600 }}>
                                                {r.published_at ? 'PUBLISHED' : 'DRAFT'}
                                            </div>
                                        </div>
                                        <div style={{ fontSize: 10, color: B.g400, marginTop: 4 }}>
                                            {qCount} question{qCount !== 1 ? 's' : ''}
                                            {choiceCount > 0 && ` · ${choiceCount} multiple choice`}
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
                        );
                    })}
                </>
            )}

            {/* ═══ CREATE / EDIT MODE ═══ */}
            {(mode === 'create' || mode === 'edit') && (
                <>
                    <button onClick={() => { setMode('list'); setForm(blankForm()); setEditingId(null); setEditingPublished(false); }}
                        style={{ fontSize: 10, fontWeight: 600, color: B.bl, background: 'none', border: 'none', cursor: 'pointer', marginBottom: 12 }}>← Back to list</button>

                    <div style={{ ...sCard, padding: 16, marginBottom: 12 }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: B.nvD, marginBottom: 4 }}>
                            {mode === 'edit' ? `Editing Week ${form.weekNumber}` : 'Create Weekly Review'}
                        </div>
                        {editingPublished && (
                            <div style={{ padding: '8px 12px', borderRadius: 6, background: `${B.amb}15`, border: `1px solid ${B.amb}40`, color: '#92400e', fontSize: 10, fontWeight: 700, marginTop: 6, marginBottom: 8 }}>
                                ⚠ This week is already published. Removing or renaming a question id may make existing player answers unreadable.
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: 8, marginBottom: 12, marginTop: 8 }}>
                            <div style={{ flex: '0 0 90px' }}>
                                <div style={{ fontSize: 9, fontWeight: 700, color: B.g600, textTransform: 'uppercase', marginBottom: 4 }}>Week #</div>
                                <input type="number" min="1" max="52" value={form.weekNumber}
                                    onChange={e => setForm(f => ({ ...f, weekNumber: parseInt(e.target.value) || 1 }))}
                                    style={{ width: '100%', padding: '8px 10px', fontSize: 12, fontFamily: F, borderRadius: 6, border: `1px solid ${B.g200}`, outline: 'none', boxSizing: 'border-box' }} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 9, fontWeight: 700, color: B.g600, textTransform: 'uppercase', marginBottom: 4 }}>Label (optional)</div>
                                <input type="text" value={form.weekLabel} placeholder="e.g. Skill Development Week 2"
                                    onChange={e => setForm(f => ({ ...f, weekLabel: e.target.value }))}
                                    style={{ width: '100%', padding: '8px 10px', fontSize: 12, fontFamily: F, borderRadius: 6, border: `1px solid ${B.g200}`, outline: 'none', boxSizing: 'border-box' }} />
                            </div>
                        </div>

                        {form.questions.map((q, qIdx) => {
                            const t = questionType(q);
                            const accent = colorForCategory(q.category);
                            return (
                                <div key={qIdx} style={{ padding: 12, border: `1px solid ${B.g200}`, borderRadius: 8, marginBottom: 10, background: B.g50, borderLeft: `3px solid ${accent}` }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                        <div style={{ fontSize: 11, fontWeight: 800, color: B.bl }}>Question {qIdx + 1}</div>
                                        <code style={{ fontSize: 9, color: B.g400, background: B.g100, padding: '1px 6px', borderRadius: 4 }}>id: {q.id}</code>
                                        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                                            <button onClick={() => moveQuestion(qIdx, -1)} disabled={qIdx === 0}
                                                style={{ fontSize: 10, fontWeight: 700, color: qIdx === 0 ? B.g200 : B.g600, background: 'none', border: 'none', cursor: qIdx === 0 ? 'default' : 'pointer', padding: '0 4px' }}>↑</button>
                                            <button onClick={() => moveQuestion(qIdx, 1)} disabled={qIdx === form.questions.length - 1}
                                                style={{ fontSize: 10, fontWeight: 700, color: qIdx === form.questions.length - 1 ? B.g200 : B.g600, background: 'none', border: 'none', cursor: qIdx === form.questions.length - 1 ? 'default' : 'pointer', padding: '0 4px' }}>↓</button>
                                            {form.questions.length > 1 && (
                                                <button onClick={() => removeQuestion(qIdx)} style={{ fontSize: 9, fontWeight: 700, color: B.red, background: 'none', border: 'none', cursor: 'pointer', marginLeft: 4 }}>Remove</button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Category + type pickers */}
                                    <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: 9, fontWeight: 700, color: B.g600, textTransform: 'uppercase', marginBottom: 4 }}>Category</div>
                                            <input list={`cat-list-${qIdx}`} value={q.category || ''}
                                                onChange={e => updateQuestion(qIdx, { category: e.target.value })}
                                                placeholder="e.g. Short Ball"
                                                style={{ width: '100%', padding: '6px 10px', fontSize: 11, fontFamily: F, borderRadius: 6, border: `1px solid ${B.g200}`, outline: 'none', boxSizing: 'border-box' }} />
                                            <datalist id={`cat-list-${qIdx}`}>
                                                {SUGGESTED_CATEGORIES.map(c => <option key={c} value={c} />)}
                                            </datalist>
                                        </div>
                                        <div style={{ flex: '0 0 160px' }}>
                                            <div style={{ fontSize: 9, fontWeight: 700, color: B.g600, textTransform: 'uppercase', marginBottom: 4 }}>Type</div>
                                            <select value={t} onChange={e => switchType(qIdx, e.target.value)}
                                                style={{ width: '100%', padding: '6px 10px', fontSize: 11, fontFamily: F, borderRadius: 6, border: `1px solid ${B.g200}`, outline: 'none', boxSizing: 'border-box', background: B.w }}>
                                                <option value="text">Written answer</option>
                                                <option value="choice">Multiple choice</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Question text */}
                                    <div style={{ fontSize: 9, fontWeight: 700, color: B.g600, textTransform: 'uppercase', marginBottom: 4 }}>Question</div>
                                    <textarea value={q.question || ''} rows={2} placeholder="Type the question players will see..."
                                        onChange={e => updateQuestion(qIdx, { question: e.target.value })}
                                        style={{ width: '100%', padding: '8px 10px', fontSize: 12, fontFamily: F, borderRadius: 6, border: `1px solid ${B.g200}`, outline: 'none', boxSizing: 'border-box', resize: 'vertical', marginBottom: 8 }} />

                                    {/* Options for choice type */}
                                    {t === 'choice' && (
                                        <>
                                            <div style={{ fontSize: 9, fontWeight: 700, color: B.g600, textTransform: 'uppercase', marginBottom: 4 }}>Options ({(q.options || []).length})</div>
                                            {(q.options || []).map((o, oIdx) => (
                                                <div key={oIdx} style={{ display: 'flex', gap: 6, marginBottom: 4, alignItems: 'center' }}>
                                                    <code style={{ fontSize: 9, color: B.g400, background: B.w, padding: '2px 6px', borderRadius: 4, border: `1px solid ${B.g200}`, minWidth: 24, textAlign: 'center' }}>{o.id}</code>
                                                    <input value={o.label || ''} placeholder={`Option ${o.id?.toUpperCase() || ''}`}
                                                        onChange={e => updateOption(qIdx, oIdx, { label: e.target.value })}
                                                        style={{ flex: 1, padding: '6px 10px', fontSize: 11, fontFamily: F, borderRadius: 6, border: `1px solid ${B.g200}`, outline: 'none' }} />
                                                    {(q.options || []).length > 2 && (
                                                        <button onClick={() => removeOption(qIdx, oIdx)} style={{ fontSize: 10, fontWeight: 700, color: B.red, background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px' }}>✕</button>
                                                    )}
                                                </div>
                                            ))}
                                            {(q.options || []).length < 8 && (
                                                <button onClick={() => addOption(qIdx)} style={{ marginTop: 4, fontSize: 10, fontWeight: 700, color: B.bl, background: 'none', border: `1px dashed ${B.bl}`, borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>+ Add option</button>
                                            )}
                                        </>
                                    )}
                                </div>
                            );
                        })}

                        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                            <button onClick={() => addTextQuestion(form.questions[form.questions.length - 1]?.category || '')}
                                disabled={form.questions.length >= 20}
                                style={{ flex: 1, fontSize: 11, fontWeight: 800, color: B.bl, background: `${B.bl}08`, border: `1.5px dashed ${B.bl}`, borderRadius: 8, padding: 10, cursor: form.questions.length >= 20 ? 'default' : 'pointer', opacity: form.questions.length >= 20 ? 0.4 : 1 }}>
                                + Written Answer
                            </button>
                            <button onClick={() => addChoiceQuestion(form.questions[form.questions.length - 1]?.category || '')}
                                disabled={form.questions.length >= 20}
                                style={{ flex: 1, fontSize: 11, fontWeight: 800, color: B.prp, background: `${B.prp}08`, border: `1.5px dashed ${B.prp}`, borderRadius: 8, padding: 10, cursor: form.questions.length >= 20 ? 'default' : 'pointer', opacity: form.questions.length >= 20 ? 0.4 : 1 }}>
                                + Multiple Choice
                            </button>
                        </div>

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

                    {groupQuestionsByCategory((viewingReflection.questions || []).map(normaliseQuestion)).map(({ category, questions }) => (
                        <div key={category}>
                            <div style={{
                                display: 'inline-block', marginBottom: 8, marginTop: 6,
                                padding: '4px 10px', borderRadius: 6,
                                background: `${colorForCategory(category)}12`, border: `1px solid ${colorForCategory(category)}30`,
                                fontSize: 10, fontWeight: 800, color: colorForCategory(category),
                                textTransform: 'uppercase', letterSpacing: 1,
                            }}>{category}</div>
                            {questions.map(q => {
                                const t = questionType(q);
                                if (t === 'choice') {
                                    // Tally option counts
                                    const tally = (q.options || []).map(opt => {
                                        const count = viewingResponses.filter(r => (r.answers || {})[q.id] === opt.id).length;
                                        return { id: opt.id, label: opt.label, count };
                                    });
                                    const total = tally.reduce((s, t) => s + t.count, 0);
                                    return (
                                        <div key={q.id} style={{ ...sCard, padding: 14, marginBottom: 10 }}>
                                            <div style={{ fontSize: 12, fontWeight: 700, color: B.nvD, marginBottom: 10 }}>{q.question}</div>
                                            {tally.map(t => {
                                                const pct = total > 0 ? Math.round((t.count / total) * 100) : 0;
                                                return (
                                                    <div key={t.id} style={{ marginBottom: 6 }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 3 }}>
                                                            <span style={{ color: B.g700, fontWeight: 600 }}>{t.label || t.id}</span>
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
                                }
                                // Text question — list each answer
                                const textAnswers = viewingResponses
                                    .map(r => ({ player: r.player?.name || 'Player', when: r.submitted_at, ans: (r.answers || {})[q.id] }))
                                    .filter(x => x.ans && String(x.ans).trim());
                                return (
                                    <div key={q.id} style={{ ...sCard, padding: 14, marginBottom: 10 }}>
                                        <div style={{ fontSize: 12, fontWeight: 700, color: B.nvD, marginBottom: 6 }}>{q.question}</div>
                                        <div style={{ fontSize: 9, color: B.g400, marginBottom: 8 }}>{textAnswers.length} answer{textAnswers.length !== 1 ? 's' : ''}</div>
                                        {textAnswers.length === 0 ? (
                                            <div style={{ fontSize: 11, color: B.g400, fontStyle: 'italic' }}>No answers yet.</div>
                                        ) : (
                                            textAnswers.map((a, i) => (
                                                <div key={i} style={{ padding: 8, background: B.g50, borderRadius: 6, marginBottom: 6, borderLeft: `2px solid ${B.bl}40` }}>
                                                    <div style={{ fontSize: 10, fontWeight: 700, color: B.nvD, marginBottom: 2 }}>{a.player}</div>
                                                    <div style={{ fontSize: 11, color: B.g700, whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>{a.ans}</div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ))}

                    {viewingResponses.length === 0 && (
                        <div style={{ ...sCard, padding: 24, textAlign: 'center' }}>
                            <div style={{ fontSize: 24, marginBottom: 8 }}>⏳</div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: B.nvD, marginBottom: 4 }}>No responses yet</div>
                            <div style={{ fontSize: 10, color: B.g400 }}>Players will appear here once they answer.</div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
