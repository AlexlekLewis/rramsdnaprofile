// ═══ ADMIN: FITNESS PROGRAM BUILDER ═══
// Coaches/admins view and edit the fitness program(s). Phase 2 ships with
// the seeded Kneadasoothe Royals Academy Home Program 2026 (1 program +
// 2 day blocks). This screen lets admin tweak exercises, prescriptions,
// activation block, and metadata before players see anything.
//
// Mirrors the Weekly Reflections admin pattern (mode-based: list / edit).

import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { B, F, sCard } from '../data/theme';
import {
    loadActivePrograms,
    loadProgramBlocks,
    updateProgram,
    updateBlock,
    validateExercises,
    validateActivationBlock,
    slugifyExerciseName,
    listExerciseCategories,
    listActivationCategories,
    groupExercisesByCategory,
} from '../db/fitnessDb';

// ─── Local helpers ──────────────────────────────────────────────────────

const blankExercise = (existingIds, category = '') => {
    let id = `exercise_${existingIds.size + 1}`;
    let i = existingIds.size + 1;
    while (existingIds.has(id)) { i++; id = `exercise_${i}`; }
    return {
        id,
        category,
        name: '',
        prescription: '',
        prescribed_sets: null,
        prescribed_reps: '',
        tip: '',
    };
};

const blankActivation = (existingIds, category = 'Warm Up') => {
    let id = `activation_${existingIds.size + 1}`;
    let i = existingIds.size + 1;
    while (existingIds.has(id)) { i++; id = `activation_${i}`; }
    return { id, category, name: '', prescription: '' };
};

// ─── Reusable bits ──────────────────────────────────────────────────────

const LabelInput = ({ label, value, onChange, placeholder, type = 'text', style = {} }) => (
    <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 10, color: B.g600, fontWeight: 700, fontFamily: F, letterSpacing: 0.5, marginBottom: 4 }}>{label}</div>
        <input
            type={type}
            value={value ?? ''}
            onChange={(e) => onChange(type === 'number' ? Number(e.target.value) : e.target.value)}
            placeholder={placeholder}
            style={{
                width: '100%', padding: '8px 10px', border: `1px solid ${B.g200}`, borderRadius: 8,
                fontFamily: F, fontSize: 13, color: B.nvD, background: B.w, ...style,
            }}
        />
    </div>
);

const SmallButton = ({ children, onClick, color = B.bl, disabled = false }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        style={{
            background: disabled ? B.g200 : color, color: B.w, border: 'none', borderRadius: 8,
            padding: '6px 12px', fontFamily: F, fontSize: 11, fontWeight: 700, cursor: disabled ? 'default' : 'pointer',
            letterSpacing: 0.3,
        }}
    >{children}</button>
);

const PrimaryButton = ({ children, onClick, disabled = false }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        style={{
            background: disabled ? B.g200 : B.nvD, color: B.w, border: 'none', borderRadius: 10,
            padding: '10px 18px', fontFamily: F, fontSize: 13, fontWeight: 700, cursor: disabled ? 'default' : 'pointer',
            letterSpacing: 0.5,
        }}
    >{children}</button>
);

const Feedback = ({ kind, text }) => {
    if (!text) return null;
    const palette = kind === 'error'
        ? { bg: '#FEF2F2', border: B.red, fg: B.red }
        : kind === 'success'
            ? { bg: '#ECFDF5', border: B.grn, fg: B.grn }
            : { bg: B.g100, border: B.g200, fg: B.g600 };
    return (
        <div style={{
            background: palette.bg, border: `1px solid ${palette.border}`, color: palette.fg,
            padding: '10px 14px', borderRadius: 10, fontSize: 12, fontFamily: F, fontWeight: 600,
            margin: '12px 0',
        }}>{text}</div>
    );
};

// ────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ────────────────────────────────────────────────────────────────────────

export default function FitnessProgramAdmin() {
    const { isAdmin } = useAuth();
    const [programs, setPrograms] = useState([]);
    const [blocksByProgram, setBlocksByProgram] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [mode, setMode] = useState('list'); // list | edit_program | edit_block
    const [programForm, setProgramForm] = useState(null);
    const [blockForm, setBlockForm] = useState(null);
    const [saving, setSaving] = useState(false);
    const [feedback, setFeedback] = useState(null);

    const refresh = async () => {
        setLoading(true);
        setError(null);
        try {
            const ps = await loadActivePrograms();
            setPrograms(ps);
            const blockMap = {};
            for (const p of ps) {
                const blocks = await loadProgramBlocks(p.id);
                blockMap[p.id] = blocks;
            }
            setBlocksByProgram(blockMap);
        } catch (e) {
            setError(e.message || 'Failed to load programs');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { refresh(); }, []);

    // Auto-clear success feedback after a few seconds
    useEffect(() => {
        if (feedback?.kind === 'success') {
            const t = setTimeout(() => setFeedback(null), 3500);
            return () => clearTimeout(t);
        }
    }, [feedback]);

    if (!isAdmin) return (
        <div style={{ padding: 24, textAlign: 'center', color: B.g400, fontFamily: F, fontSize: 13 }}>
            Admin only.
        </div>
    );

    if (loading) return (
        <div style={{ padding: 24, textAlign: 'center', color: B.g400, fontFamily: F, fontSize: 13 }}>
            Loading fitness programs…
        </div>
    );

    if (error) return (
        <div style={{ padding: 24, fontFamily: F }}>
            <Feedback kind="error" text={error} />
            <PrimaryButton onClick={refresh}>Try again</PrimaryButton>
        </div>
    );

    // ════════════════════════════════════════════════════════════════════
    // LIST MODE — Show all programs and their blocks
    // ════════════════════════════════════════════════════════════════════
    if (mode === 'list') {
        return (
            <div style={{ padding: '12px 16px 80px', fontFamily: F, maxWidth: 900, margin: '0 auto' }}>
                <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: B.nvD, marginBottom: 4 }}>Fitness Programs</div>
                    <div style={{ fontSize: 12, color: B.g600 }}>Edit the program players follow. Changes apply to new sessions logged after save; existing logs are protected.</div>
                </div>

                {feedback && <Feedback kind={feedback.kind} text={feedback.text} />}

                {programs.length === 0 && (
                    <div style={{ ...sCard, textAlign: 'center', color: B.g400, padding: 32 }}>
                        No programs yet.
                    </div>
                )}

                {programs.map(program => {
                    const blocks = blocksByProgram[program.id] || [];
                    const activationCount = Array.isArray(program.activation_block) ? program.activation_block.length : 0;
                    return (
                        <div key={program.id} style={sCard}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                                <div>
                                    <div style={{ fontSize: 16, fontWeight: 800, color: B.nvD }}>{program.name}</div>
                                    <div style={{ fontSize: 11, color: B.g600, marginTop: 2 }}>
                                        {program.total_weeks} weeks · {program.sessions_per_week} sessions/week · {activationCount} activation movements
                                    </div>
                                    {program.is_active
                                        ? <div style={{ display: 'inline-block', marginTop: 6, fontSize: 9, fontWeight: 700, color: B.grn, background: '#ECFDF5', padding: '3px 8px', borderRadius: 6, letterSpacing: 0.4 }}>ACTIVE</div>
                                        : <div style={{ display: 'inline-block', marginTop: 6, fontSize: 9, fontWeight: 700, color: B.g400, background: B.g100, padding: '3px 8px', borderRadius: 6, letterSpacing: 0.4 }}>HIDDEN</div>}
                                </div>
                                <SmallButton onClick={() => {
                                    setProgramForm({
                                        id: program.id,
                                        name: program.name,
                                        description: program.description || '',
                                        total_weeks: program.total_weeks,
                                        sessions_per_week: program.sessions_per_week,
                                        is_active: program.is_active,
                                        activation_block: Array.isArray(program.activation_block) ? program.activation_block : [],
                                    });
                                    setMode('edit_program');
                                    setFeedback(null);
                                }}>Edit program</SmallButton>
                            </div>

                            {program.description && (
                                <div style={{ fontSize: 12, color: B.g600, marginBottom: 12, lineHeight: 1.5 }}>{program.description}</div>
                            )}

                            <div style={{ borderTop: `1px solid ${B.g100}`, paddingTop: 12, marginTop: 8 }}>
                                <div style={{ fontSize: 10, fontWeight: 800, color: B.nvD, letterSpacing: 0.5, marginBottom: 8 }}>SESSION TEMPLATES</div>
                                {blocks.length === 0 && (
                                    <div style={{ fontSize: 12, color: B.g400, padding: 12, textAlign: 'center' }}>No session templates yet.</div>
                                )}
                                {blocks.map(block => {
                                    const exCount = Array.isArray(block.exercises) ? block.exercises.length : 0;
                                    return (
                                        <div key={block.id} style={{
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                            padding: '10px 12px', background: B.g50, borderRadius: 8, marginBottom: 6,
                                        }}>
                                            <div>
                                                <div style={{ fontSize: 13, fontWeight: 700, color: B.nvD }}>
                                                    Day {block.day_number} — {block.day_label}
                                                </div>
                                                <div style={{ fontSize: 11, color: B.g600, marginTop: 2 }}>
                                                    {exCount} exercise{exCount === 1 ? '' : 's'} · {block.duration_minutes_target} min target · {block.rest_seconds}s rest
                                                </div>
                                            </div>
                                            <SmallButton color={B.bl} onClick={() => {
                                                setBlockForm({
                                                    id: block.id,
                                                    program_id: block.program_id,
                                                    day_number: block.day_number,
                                                    day_label: block.day_label,
                                                    duration_minutes_target: block.duration_minutes_target,
                                                    rest_seconds: block.rest_seconds,
                                                    is_active: block.is_active,
                                                    exercises: Array.isArray(block.exercises) ? block.exercises : [],
                                                });
                                                setMode('edit_block');
                                                setFeedback(null);
                                            }}>Edit</SmallButton>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    }

    // ════════════════════════════════════════════════════════════════════
    // EDIT PROGRAM MODE
    // ════════════════════════════════════════════════════════════════════
    if (mode === 'edit_program' && programForm) {
        const activation = programForm.activation_block || [];
        const activationIds = new Set(activation.map(a => a.id));
        const activationCategories = listActivationCategories();

        const updateActivation = (idx, patch) => {
            const next = [...activation];
            next[idx] = { ...next[idx], ...patch };
            setProgramForm({ ...programForm, activation_block: next });
        };

        const addActivation = () => {
            setProgramForm({ ...programForm, activation_block: [...activation, blankActivation(activationIds)] });
        };

        const removeActivation = (idx) => {
            const next = activation.filter((_, i) => i !== idx);
            setProgramForm({ ...programForm, activation_block: next });
        };

        const save = async () => {
            const v = validateActivationBlock(programForm.activation_block);
            if (!v.ok) { setFeedback({ kind: 'error', text: v.error }); return; }
            if (!programForm.name?.trim()) { setFeedback({ kind: 'error', text: 'Program name is required' }); return; }

            setSaving(true);
            setFeedback(null);
            try {
                await updateProgram(programForm.id, {
                    name: programForm.name.trim(),
                    description: programForm.description?.trim() || null,
                    total_weeks: programForm.total_weeks,
                    sessions_per_week: programForm.sessions_per_week,
                    is_active: !!programForm.is_active,
                    activation_block: programForm.activation_block,
                });
                await refresh();
                setMode('list');
                setFeedback({ kind: 'success', text: 'Program saved.' });
            } catch (e) {
                setFeedback({ kind: 'error', text: e.message || 'Save failed' });
            } finally {
                setSaving(false);
            }
        };

        return (
            <div style={{ padding: '12px 16px 80px', fontFamily: F, maxWidth: 900, margin: '0 auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <button onClick={() => { setMode('list'); setFeedback(null); }} style={{ background: 'none', border: 'none', color: B.bl, fontSize: 13, fontFamily: F, cursor: 'pointer', fontWeight: 700 }}>← Back to programs</button>
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: B.nvD, marginBottom: 4 }}>Edit program</div>
                <div style={{ fontSize: 12, color: B.g600, marginBottom: 16 }}>Tweak metadata and the activation block (warm-up).</div>

                {feedback && <Feedback kind={feedback.kind} text={feedback.text} />}

                <div style={sCard}>
                    <LabelInput label="PROGRAM NAME" value={programForm.name} onChange={(v) => setProgramForm({ ...programForm, name: v })} placeholder="e.g. Royals Academy Home Program 2026" />
                    <div style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: 10, color: B.g600, fontWeight: 700, fontFamily: F, letterSpacing: 0.5, marginBottom: 4 }}>DESCRIPTION</div>
                        <textarea
                            value={programForm.description}
                            onChange={(e) => setProgramForm({ ...programForm, description: e.target.value })}
                            placeholder="Short description for admin reference"
                            rows={3}
                            style={{
                                width: '100%', padding: '8px 10px', border: `1px solid ${B.g200}`, borderRadius: 8,
                                fontFamily: F, fontSize: 13, color: B.nvD, background: B.w, resize: 'vertical',
                            }}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: 12 }}>
                        <div style={{ flex: 1 }}>
                            <LabelInput label="TOTAL WEEKS" type="number" value={programForm.total_weeks} onChange={(v) => setProgramForm({ ...programForm, total_weeks: Math.max(1, Math.min(52, v || 1)) })} placeholder="10" />
                        </div>
                        <div style={{ flex: 1 }}>
                            <LabelInput label="SESSIONS / WEEK" type="number" value={programForm.sessions_per_week} onChange={(v) => setProgramForm({ ...programForm, sessions_per_week: Math.max(1, Math.min(7, v || 1)) })} placeholder="2" />
                        </div>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, fontSize: 12, color: B.g600, fontFamily: F, cursor: 'pointer' }}>
                        <input type="checkbox" checked={!!programForm.is_active} onChange={(e) => setProgramForm({ ...programForm, is_active: e.target.checked })} />
                        Visible to players (active)
                    </label>
                </div>

                <div style={{ ...sCard, marginTop: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: B.nvD }}>Activation block (warm-up)</div>
                        <SmallButton onClick={addActivation} color={B.grn} disabled={activation.length >= 6}>+ Add movement</SmallButton>
                    </div>
                    <div style={{ fontSize: 11, color: B.g600, marginBottom: 10 }}>Done before every session. Up to 6 movements.</div>

                    {activation.length === 0 && (
                        <div style={{ padding: 16, textAlign: 'center', color: B.g400, fontSize: 12 }}>No activation movements yet.</div>
                    )}

                    {activation.map((a, idx) => (
                        <div key={a.id || idx} style={{ background: B.g50, borderRadius: 10, padding: 12, marginBottom: 8 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: B.nvD, letterSpacing: 0.4 }}>MOVEMENT {idx + 1}</div>
                                <button onClick={() => removeActivation(idx)} style={{ background: 'none', border: 'none', color: B.red, fontSize: 11, fontFamily: F, fontWeight: 700, cursor: 'pointer' }}>Remove</button>
                            </div>
                            <div style={{ marginBottom: 8 }}>
                                <div style={{ fontSize: 10, color: B.g600, fontWeight: 700, fontFamily: F, letterSpacing: 0.5, marginBottom: 4 }}>CATEGORY</div>
                                <input
                                    list="activation_cat_list"
                                    value={a.category || ''}
                                    onChange={(e) => updateActivation(idx, { category: e.target.value })}
                                    placeholder="e.g. Warm Up"
                                    style={{ width: '100%', padding: '8px 10px', border: `1px solid ${B.g200}`, borderRadius: 8, fontFamily: F, fontSize: 13, color: B.nvD, background: B.w }}
                                />
                                <datalist id="activation_cat_list">
                                    {activationCategories.map(c => <option key={c} value={c} />)}
                                </datalist>
                            </div>
                            <LabelInput label="NAME" value={a.name} onChange={(v) => {
                                const next = { name: v };
                                if (!a.id || a.id.startsWith('activation_')) next.id = slugifyExerciseName(v);
                                updateActivation(idx, next);
                            }} placeholder="e.g. Hip Bridges" />
                            <LabelInput label="PRESCRIPTION" value={a.prescription} onChange={(v) => updateActivation(idx, { prescription: v })} placeholder="e.g. 12 reps or 60 seconds" />
                        </div>
                    ))}
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                    <PrimaryButton onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save program'}</PrimaryButton>
                    <button onClick={() => { setMode('list'); setFeedback(null); }} disabled={saving} style={{ background: 'none', border: `1px solid ${B.g200}`, color: B.g600, padding: '10px 18px', borderRadius: 10, fontFamily: F, fontSize: 13, fontWeight: 700, cursor: 'pointer', letterSpacing: 0.5 }}>Cancel</button>
                </div>
            </div>
        );
    }

    // ════════════════════════════════════════════════════════════════════
    // EDIT BLOCK MODE
    // ════════════════════════════════════════════════════════════════════
    if (mode === 'edit_block' && blockForm) {
        const exercises = blockForm.exercises || [];
        const exerciseIds = new Set(exercises.map(e => e.id));
        const exerciseCategories = listExerciseCategories();
        const grouped = groupExercisesByCategory(exercises);

        const updateExercise = (idx, patch) => {
            const next = [...exercises];
            next[idx] = { ...next[idx], ...patch };
            setBlockForm({ ...blockForm, exercises: next });
        };

        const addExercise = () => {
            setBlockForm({ ...blockForm, exercises: [...exercises, blankExercise(exerciseIds)] });
        };

        const removeExercise = (idx) => {
            const next = exercises.filter((_, i) => i !== idx);
            setBlockForm({ ...blockForm, exercises: next });
        };

        const save = async () => {
            const v = validateExercises(blockForm.exercises);
            if (!v.ok) { setFeedback({ kind: 'error', text: v.error }); return; }
            if (!blockForm.day_label?.trim()) { setFeedback({ kind: 'error', text: 'Day label is required (e.g. "Full Body 1")' }); return; }

            setSaving(true);
            setFeedback(null);
            try {
                await updateBlock(blockForm.id, {
                    day_label: blockForm.day_label.trim(),
                    duration_minutes_target: blockForm.duration_minutes_target,
                    rest_seconds: blockForm.rest_seconds,
                    is_active: !!blockForm.is_active,
                    exercises: blockForm.exercises,
                });
                await refresh();
                setMode('list');
                setFeedback({ kind: 'success', text: `Day ${blockForm.day_number} saved.` });
            } catch (e) {
                setFeedback({ kind: 'error', text: e.message || 'Save failed' });
            } finally {
                setSaving(false);
            }
        };

        return (
            <div style={{ padding: '12px 16px 80px', fontFamily: F, maxWidth: 900, margin: '0 auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <button onClick={() => { setMode('list'); setFeedback(null); }} style={{ background: 'none', border: 'none', color: B.bl, fontSize: 13, fontFamily: F, cursor: 'pointer', fontWeight: 700 }}>← Back to programs</button>
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: B.nvD, marginBottom: 4 }}>Edit Day {blockForm.day_number}</div>
                <div style={{ fontSize: 12, color: B.g600, marginBottom: 16 }}>{exercises.length} exercise{exercises.length === 1 ? '' : 's'} · session template applies to every week of the program.</div>

                {feedback && <Feedback kind={feedback.kind} text={feedback.text} />}

                <div style={sCard}>
                    <LabelInput label="DAY LABEL" value={blockForm.day_label} onChange={(v) => setBlockForm({ ...blockForm, day_label: v })} placeholder='e.g. "Full Body 1"' />
                    <div style={{ display: 'flex', gap: 12 }}>
                        <div style={{ flex: 1 }}>
                            <LabelInput label="TARGET DURATION (MIN)" type="number" value={blockForm.duration_minutes_target} onChange={(v) => setBlockForm({ ...blockForm, duration_minutes_target: Math.max(5, Math.min(120, v || 5)) })} placeholder="25" />
                        </div>
                        <div style={{ flex: 1 }}>
                            <LabelInput label="REST BETWEEN SETS (SEC)" type="number" value={blockForm.rest_seconds} onChange={(v) => setBlockForm({ ...blockForm, rest_seconds: Math.max(0, Math.min(300, v || 0)) })} placeholder="45" />
                        </div>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, fontSize: 12, color: B.g600, fontFamily: F, cursor: 'pointer' }}>
                        <input type="checkbox" checked={!!blockForm.is_active} onChange={(e) => setBlockForm({ ...blockForm, is_active: e.target.checked })} />
                        Visible to players (active)
                    </label>
                </div>

                <div style={{ ...sCard, marginTop: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: B.nvD }}>Exercises</div>
                        <SmallButton onClick={addExercise} color={B.grn} disabled={exercises.length >= 12}>+ Add exercise</SmallButton>
                    </div>
                    <div style={{ fontSize: 11, color: B.g600, marginBottom: 10 }}>Up to 12 exercises. Order matters — players see them top-down.</div>

                    {exercises.length === 0 && (
                        <div style={{ padding: 16, textAlign: 'center', color: B.g400, fontSize: 12 }}>No exercises yet.</div>
                    )}

                    {exercises.map((ex, idx) => (
                        <div key={ex.id || idx} style={{ background: B.g50, borderRadius: 10, padding: 12, marginBottom: 8 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: B.nvD, letterSpacing: 0.4 }}>EXERCISE {idx + 1}</div>
                                <button onClick={() => removeExercise(idx)} style={{ background: 'none', border: 'none', color: B.red, fontSize: 11, fontFamily: F, fontWeight: 700, cursor: 'pointer' }}>Remove</button>
                            </div>
                            <div style={{ marginBottom: 8 }}>
                                <div style={{ fontSize: 10, color: B.g600, fontWeight: 700, fontFamily: F, letterSpacing: 0.5, marginBottom: 4 }}>CATEGORY</div>
                                <input
                                    list="exercise_cat_list"
                                    value={ex.category || ''}
                                    onChange={(e) => updateExercise(idx, { category: e.target.value })}
                                    placeholder="e.g. Lower Body Power"
                                    style={{ width: '100%', padding: '8px 10px', border: `1px solid ${B.g200}`, borderRadius: 8, fontFamily: F, fontSize: 13, color: B.nvD, background: B.w }}
                                />
                                <datalist id="exercise_cat_list">
                                    {exerciseCategories.map(c => <option key={c} value={c} />)}
                                </datalist>
                            </div>
                            <LabelInput label="NAME" value={ex.name} onChange={(v) => {
                                const next = { name: v };
                                if (!ex.id || ex.id.startsWith('exercise_')) next.id = slugifyExerciseName(v);
                                updateExercise(idx, next);
                            }} placeholder="e.g. Jumping Squats" />
                            <div style={{ display: 'flex', gap: 12 }}>
                                <div style={{ flex: 1 }}>
                                    <LabelInput label="PRESCRIPTION" value={ex.prescription} onChange={(v) => updateExercise(idx, { prescription: v })} placeholder='e.g. "4x8" or "3x10es"' />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <LabelInput label="PRESCRIBED SETS" type="number" value={ex.prescribed_sets ?? ''} onChange={(v) => updateExercise(idx, { prescribed_sets: v || null })} placeholder="4" />
                                </div>
                            </div>
                            <LabelInput label="PRESCRIBED REPS (TEXT)" value={ex.prescribed_reps || ''} onChange={(v) => updateExercise(idx, { prescribed_reps: v })} placeholder='e.g. "8" or "10 each side"' />
                            <div style={{ marginBottom: 0 }}>
                                <div style={{ fontSize: 10, color: B.g600, fontWeight: 700, fontFamily: F, letterSpacing: 0.5, marginBottom: 4 }}>FORM TIP (OPTIONAL)</div>
                                <textarea
                                    value={ex.tip || ''}
                                    onChange={(e) => updateExercise(idx, { tip: e.target.value })}
                                    placeholder="e.g. Keep your front knee tracking over your toe"
                                    rows={2}
                                    style={{ width: '100%', padding: '8px 10px', border: `1px solid ${B.g200}`, borderRadius: 8, fontFamily: F, fontSize: 12, color: B.nvD, background: B.w, resize: 'vertical' }}
                                />
                            </div>
                        </div>
                    ))}
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                    <PrimaryButton onClick={save} disabled={saving}>{saving ? 'Saving…' : `Save Day ${blockForm.day_number}`}</PrimaryButton>
                    <button onClick={() => { setMode('list'); setFeedback(null); }} disabled={saving} style={{ background: 'none', border: `1px solid ${B.g200}`, color: B.g600, padding: '10px 18px', borderRadius: 10, fontFamily: F, fontSize: 13, fontWeight: 700, cursor: 'pointer', letterSpacing: 0.5 }}>Cancel</button>
                </div>
            </div>
        );
    }

    return null;
}
