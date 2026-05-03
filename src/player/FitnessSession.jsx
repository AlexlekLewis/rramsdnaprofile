// ═══ PLAYER: FITNESS SESSION LOGGING ═══
// Player ticks off the activation block, logs each set per exercise, optionally
// enters actual reps, leaves notes/modifications, and saves.
//
// The "prescription_snapshot" frozen on save protects historical logs from
// later admin edits to the program.

import React, { useEffect, useState, useMemo } from 'react';
import { B, F, sCard } from '../data/theme';
import {
    saveSessionLog,
    loadSessionLogForBlockWeek,
} from '../db/fitnessDb';

const SET_ROWS_DEFAULT = 6; // Spreadsheet shows 6 numbered rows.

const Pill = ({ children, color = B.bl }) => (
    <span style={{
        display: 'inline-block', background: `${color}18`, color, borderRadius: 8,
        padding: '3px 8px', fontSize: 9, fontWeight: 800, letterSpacing: 0.5,
        fontFamily: F, textTransform: 'uppercase',
    }}>{children}</span>
);

const Toast = ({ kind, text, onClose }) => {
    if (!text) return null;
    const palette = kind === 'error'
        ? { bg: '#FEF2F2', border: B.red, fg: B.red }
        : kind === 'success'
            ? { bg: '#ECFDF5', border: B.grn, fg: B.grn }
            : { bg: B.g100, border: B.g200, fg: B.g600 };
    return (
        <div style={{
            position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
            zIndex: 200, background: palette.bg, border: `1px solid ${palette.border}`,
            color: palette.fg, padding: '10px 16px', borderRadius: 10,
            fontSize: 12, fontFamily: F, fontWeight: 700,
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            display: 'flex', alignItems: 'center', gap: 12, maxWidth: 'calc(100vw - 32px)',
        }}>
            <span>{text}</span>
            {onClose && (
                <button onClick={onClose} style={{ background: 'none', border: 'none', color: palette.fg, fontSize: 16, cursor: 'pointer', padding: 0, lineHeight: 1 }}>×</button>
            )}
        </div>
    );
};

const SetRow = React.memo(function SetRow({ rowNumber, set, onToggle, onRepsChange, isPrescribed }) {
    const completed = !!set?.completed;
    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
            background: completed ? `${B.grn}10` : (isPrescribed ? B.g50 : B.w),
            borderRadius: 8, marginBottom: 6, border: `1px solid ${completed ? B.grn : B.g200}`,
        }}>
            <button
                onClick={onToggle}
                aria-label={`Toggle set ${rowNumber}`}
                style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                    background: completed ? B.grn : B.w,
                    border: `2px solid ${completed ? B.grn : B.g200}`,
                    color: B.w, cursor: 'pointer', fontWeight: 800, fontSize: 14, fontFamily: F,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
            >
                {completed ? '✓' : ''}
            </button>
            <div style={{ fontSize: 12, fontWeight: 700, color: B.nvD, fontFamily: F, minWidth: 48 }}>
                Set {rowNumber}
                {!isPrescribed && <span style={{ fontSize: 9, color: B.g400, fontWeight: 600, marginLeft: 4 }}>extra</span>}
            </div>
            <input
                type="number"
                value={set?.actual_reps ?? ''}
                onChange={(e) => onRepsChange(e.target.value)}
                placeholder="reps"
                style={{
                    flex: 1, padding: '6px 10px', border: `1px solid ${B.g200}`,
                    borderRadius: 6, fontFamily: F, fontSize: 12, color: B.nvD,
                    background: B.w, minWidth: 0,
                }}
            />
        </div>
    );
});

const ExerciseCard = React.memo(function ExerciseCard({ exercise, exLog, onToggleSet, onRepsChange }) {
    const prescribedSets = Number(exercise.prescribed_sets) || 4;
    const totalRows = Math.max(prescribedSets, SET_ROWS_DEFAULT);
    const sets = exLog?.sets || [];
    return (
        <div style={{ ...sCard, padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                    {exercise.category && <div style={{ marginBottom: 4 }}><Pill color={B.bl}>{exercise.category}</Pill></div>}
                    <div style={{ fontSize: 14, fontWeight: 800, color: B.nvD, fontFamily: F, lineHeight: 1.3 }}>{exercise.name}</div>
                </div>
                <Pill color={B.pk}>{exercise.prescription || `${prescribedSets} sets`}</Pill>
            </div>
            {exercise.tip && (
                <div style={{
                    background: `${B.amb}10`, border: `1px solid ${B.amb}40`, borderRadius: 8,
                    padding: '8px 10px', fontSize: 11, color: B.g600, fontFamily: F, lineHeight: 1.4,
                    marginBottom: 10,
                }}>
                    <strong style={{ color: B.amb, fontSize: 9, letterSpacing: 0.5, textTransform: 'uppercase' }}>Form tip · </strong>
                    {exercise.tip}
                </div>
            )}
            <div>
                {Array.from({ length: totalRows }, (_, i) => {
                    const setNumber = i + 1;
                    const set = sets.find(s => s?.set_number === setNumber);
                    const isPrescribed = setNumber <= prescribedSets;
                    return (
                        <SetRow
                            key={setNumber}
                            rowNumber={setNumber}
                            set={set}
                            isPrescribed={isPrescribed}
                            onToggle={() => onToggleSet(exercise.id, setNumber)}
                            onRepsChange={(v) => onRepsChange(exercise.id, setNumber, v)}
                        />
                    );
                })}
            </div>
        </div>
    );
});

function makeInitialExerciseLogs(exercises) {
    return (exercises || []).map(ex => ({
        exercise_id: ex.id,
        sets: [],
    }));
}

function mergeExerciseLogsWithExisting(exercises, existing) {
    if (!existing || !Array.isArray(existing)) return makeInitialExerciseLogs(exercises);
    const byId = Object.fromEntries(existing.map(e => [e.exercise_id, e]));
    return (exercises || []).map(ex => byId[ex.id] || { exercise_id: ex.id, sets: [] });
}

export default function FitnessSession({
    enrolment,
    block,
    weekNumber,
    activationBlock,
    currentWeek,
    authUserId,
    playerId,
    onBack,
    onSaved,
}) {
    const exercises = useMemo(() => Array.isArray(block?.exercises) ? block.exercises : [], [block]);
    const activation = useMemo(() => Array.isArray(activationBlock) ? activationBlock : [], [activationBlock]);

    const [existingLog, setExistingLog] = useState(null);
    const [exerciseLogs, setExerciseLogs] = useState(() => makeInitialExerciseLogs(exercises));
    const [activationDone, setActivationDone] = useState({});
    const [notes, setNotes] = useState('');
    const [modificationNotes, setModificationNotes] = useState('');
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState(null);
    const [loadingExisting, setLoadingExisting] = useState(true);

    // Load existing log if any
    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoadingExisting(true);
            try {
                const log = await loadSessionLogForBlockWeek({
                    enrolmentId: enrolment.id,
                    blockId: block.id,
                    weekNumber,
                });
                if (cancelled) return;
                if (log) {
                    setExistingLog(log);
                    setExerciseLogs(mergeExerciseLogsWithExisting(exercises, log.exercise_logs));
                    setActivationDone(log.activation_done || {});
                    setNotes(log.notes || '');
                    setModificationNotes(log.modification_notes || '');
                } else {
                    setExerciseLogs(makeInitialExerciseLogs(exercises));
                }
            } catch (e) {
                console.error('Loading existing session log:', e);
            } finally {
                if (!cancelled) setLoadingExisting(false);
            }
        })();
        return () => { cancelled = true; };
    }, [enrolment?.id, block?.id, weekNumber, exercises]);

    const toggleSet = (exerciseId, setNumber) => {
        setExerciseLogs(prev => prev.map(el => {
            if (el.exercise_id !== exerciseId) return el;
            const sets = Array.isArray(el.sets) ? [...el.sets] : [];
            const idx = sets.findIndex(s => s?.set_number === setNumber);
            if (idx === -1) {
                sets.push({ set_number: setNumber, completed: true, actual_reps: null });
            } else {
                sets[idx] = { ...sets[idx], completed: !sets[idx].completed };
                if (!sets[idx].completed && sets[idx].actual_reps == null) {
                    sets.splice(idx, 1);
                }
            }
            sets.sort((a, b) => a.set_number - b.set_number);
            return { ...el, sets };
        }));
    };

    const setReps = (exerciseId, setNumber, value) => {
        const reps = value === '' ? null : Number(value);
        if (value !== '' && (Number.isNaN(reps) || reps < 0)) return;
        setExerciseLogs(prev => prev.map(el => {
            if (el.exercise_id !== exerciseId) return el;
            const sets = Array.isArray(el.sets) ? [...el.sets] : [];
            const idx = sets.findIndex(s => s?.set_number === setNumber);
            if (idx === -1) {
                sets.push({ set_number: setNumber, completed: false, actual_reps: reps });
            } else {
                sets[idx] = { ...sets[idx], actual_reps: reps };
            }
            sets.sort((a, b) => a.set_number - b.set_number);
            return { ...el, sets };
        }));
    };

    const toggleActivation = (id) => {
        setActivationDone(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const totalTickedSets = exerciseLogs.reduce((acc, el) => acc + (el.sets || []).filter(s => s.completed).length, 0);
    const exercisesTouched = exerciseLogs.filter(el => (el.sets || []).some(s => s.completed)).length;
    const isCatchUp = weekNumber !== currentWeek;

    const save = async () => {
        if (totalTickedSets === 0) {
            setToast({ kind: 'error', text: 'Tick at least one set before saving.' });
            return;
        }
        setSaving(true);
        setToast(null);
        try {
            const prescriptionSnapshot = {
                exercises: exercises.map(ex => ({
                    id: ex.id, category: ex.category, name: ex.name,
                    prescription: ex.prescription, prescribed_sets: ex.prescribed_sets,
                    prescribed_reps: ex.prescribed_reps,
                })),
                activation: activation,
                day_label: block.day_label,
                rest_seconds: block.rest_seconds,
            };
            const saved = await saveSessionLog({
                enrolmentId: enrolment.id,
                blockId: block.id,
                authUserId,
                playerId,
                weekNumber,
                dayNumber: block.day_number,
                exerciseLogs,
                activationDone,
                notes,
                modificationNotes,
                prescriptionSnapshot,
                currentWeek,
                loggedByRole: 'player',
                loggedByUserId: authUserId,
                existingLogId: existingLog?.id,
            });
            setToast({ kind: 'success', text: existingLog ? 'Session updated.' : 'Session logged. Nice work.' });
            if (onSaved) onSaved(saved);
        } catch (e) {
            setToast({ kind: 'error', text: e.message || 'Save failed — please try again.' });
        } finally {
            setSaving(false);
        }
    };

    if (loadingExisting) {
        return (
            <div style={{ padding: 24, textAlign: 'center', color: B.g400, fontFamily: F, fontSize: 13 }}>
                Loading session…
            </div>
        );
    }

    return (
        <div style={{ padding: '12px 16px 90px', fontFamily: F, maxWidth: 720, margin: '0 auto' }}>
            <Toast kind={toast?.kind} text={toast?.text} onClose={() => setToast(null)} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <button onClick={onBack} style={{ background: 'none', border: 'none', color: B.bl, fontSize: 13, fontFamily: F, cursor: 'pointer', fontWeight: 700, padding: '4px 8px' }}>← Back</button>
            </div>

            <div style={{
                background: `linear-gradient(135deg, ${B.nvD} 0%, ${B.bl} 100%)`,
                color: B.w, borderRadius: 14, padding: 18, marginBottom: 16,
            }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, opacity: 0.85, textTransform: 'uppercase' }}>
                    Week {weekNumber} · Day {block.day_number}
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4, lineHeight: 1.2 }}>{block.day_label}</div>
                <div style={{ fontSize: 11, marginTop: 6, opacity: 0.85 }}>
                    {block.duration_minutes_target} min target · {block.rest_seconds}s rest between sets
                </div>
                {isCatchUp && (
                    <div style={{
                        marginTop: 10, display: 'inline-block', background: `${B.amb}30`,
                        border: `1px solid ${B.amb}80`, color: B.w,
                        padding: '4px 10px', borderRadius: 8, fontSize: 10, fontWeight: 800, letterSpacing: 0.4,
                    }}>
                        CATCH-UP · saving as week {weekNumber}
                    </div>
                )}
            </div>

            {activation.length > 0 && (
                <div style={{ ...sCard }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: B.nvD, fontFamily: F, marginBottom: 8, letterSpacing: 0.4 }}>ACTIVATION (warm-up)</div>
                    {activation.map(a => {
                        const done = !!activationDone[a.id];
                        return (
                            <button
                                key={a.id}
                                onClick={() => toggleActivation(a.id)}
                                style={{
                                    width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                                    padding: '10px 12px', marginBottom: 6, borderRadius: 8,
                                    background: done ? `${B.grn}12` : B.g50,
                                    border: `1px solid ${done ? B.grn : B.g200}`,
                                    cursor: 'pointer', fontFamily: F, textAlign: 'left',
                                }}
                            >
                                <div style={{
                                    width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                                    background: done ? B.grn : B.w,
                                    border: `2px solid ${done ? B.grn : B.g200}`,
                                    color: B.w, fontSize: 12, fontWeight: 800,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>{done ? '✓' : ''}</div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: B.nvD }}>{a.name}</div>
                                    <div style={{ fontSize: 10, color: B.g600 }}>{a.prescription}</div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, marginBottom: 8 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: B.nvD, fontFamily: F }}>Exercises</div>
                <div style={{ fontSize: 11, color: B.g600, fontWeight: 700, fontFamily: F }}>
                    {exercisesTouched} of {exercises.length} touched · {totalTickedSets} sets ticked
                </div>
            </div>

            {exercises.map(ex => {
                const exLog = exerciseLogs.find(el => el.exercise_id === ex.id);
                return (
                    <ExerciseCard
                        key={ex.id}
                        exercise={ex}
                        exLog={exLog}
                        onToggleSet={toggleSet}
                        onRepsChange={setReps}
                    />
                );
            })}

            <div style={{ ...sCard, marginTop: 8 }}>
                <div style={{ fontSize: 10, color: B.g600, fontWeight: 700, fontFamily: F, letterSpacing: 0.5, marginBottom: 6 }}>NOTES (OPTIONAL)</div>
                <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="How did it feel? Any wins or things to work on?"
                    rows={3}
                    style={{ width: '100%', padding: '8px 10px', border: `1px solid ${B.g200}`, borderRadius: 8, fontFamily: F, fontSize: 12, color: B.nvD, background: B.w, resize: 'vertical', boxSizing: 'border-box' }}
                />
            </div>

            <div style={{ ...sCard, marginTop: 8 }}>
                <div style={{ fontSize: 10, color: B.g600, fontWeight: 700, fontFamily: F, letterSpacing: 0.5, marginBottom: 6 }}>MODIFICATIONS (OPTIONAL)</div>
                <textarea
                    value={modificationNotes}
                    onChange={(e) => setModificationNotes(e.target.value)}
                    placeholder="Did you swap an exercise for an injury or other reason? Note it here."
                    rows={2}
                    style={{ width: '100%', padding: '8px 10px', border: `1px solid ${B.g200}`, borderRadius: 8, fontFamily: F, fontSize: 12, color: B.nvD, background: B.w, resize: 'vertical', boxSizing: 'border-box' }}
                />
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button
                    onClick={save}
                    disabled={saving}
                    style={{
                        flex: 1, padding: '14px 18px', borderRadius: 12,
                        background: saving ? B.g200 : `linear-gradient(135deg, ${B.pk} 0%, ${B.bl} 100%)`,
                        color: B.w, border: 'none', fontFamily: F, fontSize: 14, fontWeight: 800,
                        cursor: saving ? 'default' : 'pointer', letterSpacing: 0.5,
                    }}
                >{saving ? 'Saving…' : (existingLog ? 'Update session' : 'Save session')}</button>
            </div>
        </div>
    );
}
