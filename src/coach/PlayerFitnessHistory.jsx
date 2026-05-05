// ═══ COACH/ADMIN: PER-PLAYER FITNESS HISTORY ═══
// Week-by-week grid showing every session of the program — done, caught up,
// missed, pending, or future. Tap any logged cell to drill into the exact
// exercises ticked, sets/reps logged, and player's notes.
//
// Reads only — RLS policy "Coaches/admins read all logs" already permits this.

import React, { useEffect, useMemo, useState } from 'react';
import { B, F, sCard } from '../data/theme';
import { supabase } from '../supabaseClient';
import { computeCurrentWeek, loadProgramBlocks } from '../db/fitnessDb';

const STATUS = {
    done: { bg: '#ECFDF5', border: B.grn, fg: B.grn, label: 'Done', icon: '✓' },
    caught_up: { bg: `${B.amb}10`, border: B.amb, fg: '#92400E', label: 'Caught up', icon: '↺' },
    missed: { bg: '#FEF2F2', border: B.red, fg: B.red, label: 'Missed', icon: '○' },
    pending: { bg: B.g50, border: B.g200, fg: B.g600, label: 'Pending', icon: '·' },
    future: { bg: B.w, border: B.g200, fg: B.g400, label: '—', icon: '·' },
};

function statusFor(log, weekNumber, currentWeek) {
    if (log) {
        const setsCount = (log.exercise_logs || []).reduce((acc, el) => acc + (el.sets || []).filter(s => s.completed).length, 0);
        if (setsCount === 0) return 'pending';
        if (log.catch_up_for_week != null) return 'caught_up';
        return 'done';
    }
    if (weekNumber > currentWeek) return 'future';
    if (weekNumber === currentWeek) return 'pending';
    return 'missed';
}

function fmtDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const StatusPill = ({ status }) => {
    const s = STATUS[status];
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            background: s.bg, color: s.fg, border: `1px solid ${s.border}`,
            padding: '3px 8px', borderRadius: 6,
            fontSize: 9, fontWeight: 800, fontFamily: F, letterSpacing: 0.4, textTransform: 'uppercase',
        }}>
            <span aria-hidden="true">{s.icon}</span>
            {s.label}
        </span>
    );
};

const SessionDetail = ({ log, block }) => {
    const exercises = block?.exercises || [];
    const exLogsById = Object.fromEntries((log?.exercise_logs || []).map(el => [el.exercise_id, el]));
    const activationDone = log?.activation_done || {};
    const activationCount = Object.values(activationDone).filter(Boolean).length;
    const activationTotal = Object.keys(activationDone).length;
    const isCoachLogged = log?.logged_by_role && log.logged_by_role !== 'player';

    return (
        <div style={{
            marginTop: 8, padding: 12, borderRadius: 8,
            background: B.g50, border: `1px solid ${B.g200}`,
        }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10, fontSize: 10, color: B.g600, fontFamily: F }}>
                <span><strong>Logged:</strong> {fmtDate(log?.completed_at)}</span>
                {log?.logged_on_time != null && (
                    <span style={{ color: log.logged_on_time ? B.grn : B.amb, fontWeight: 700 }}>
                        {log.logged_on_time ? 'On time' : 'Late'}
                    </span>
                )}
                {isCoachLogged && <span style={{ color: B.bl, fontWeight: 700 }}>Coach-logged</span>}
                {activationTotal > 0 && (
                    <span><strong>Warm-up:</strong> {activationCount} of {activationTotal} done</span>
                )}
            </div>

            <div style={{ fontSize: 10, fontWeight: 800, color: B.nvD, fontFamily: F, letterSpacing: 0.4, marginBottom: 6 }}>EXERCISES</div>
            {exercises.length === 0 && <div style={{ fontSize: 11, color: B.g400, fontStyle: 'italic' }}>No exercises in this session template.</div>}
            {exercises.map(ex => {
                const exLog = exLogsById[ex.id];
                const setsTicked = (exLog?.sets || []).filter(s => s.completed);
                const allReps = (exLog?.sets || []).map(s => s.actual_reps).filter(r => r != null);
                return (
                    <div key={ex.id} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                        padding: '6px 0', borderBottom: `1px solid ${B.g100}`,
                    }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: B.nvD, fontFamily: F }}>{ex.name}</div>
                            <div style={{ fontSize: 9, color: B.g400, fontFamily: F, marginTop: 1 }}>
                                Prescribed: {ex.prescription || `${ex.prescribed_sets || 4} sets`}
                            </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{
                                fontSize: 11, fontWeight: 800, fontFamily: F,
                                color: setsTicked.length === 0 ? B.g400 : (setsTicked.length >= (Number(ex.prescribed_sets) || 4) ? B.grn : B.amb),
                            }}>
                                {setsTicked.length} sets ticked
                            </div>
                            {allReps.length > 0 && (
                                <div style={{ fontSize: 9, color: B.g600, fontFamily: F, marginTop: 1 }}>
                                    Reps: {allReps.join(', ')}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}

            {(log?.notes || log?.modification_notes) && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${B.g200}` }}>
                    {log.notes && (
                        <div style={{ marginBottom: 6 }}>
                            <div style={{ fontSize: 9, fontWeight: 800, color: B.g600, fontFamily: F, letterSpacing: 0.4, marginBottom: 2 }}>PLAYER NOTES</div>
                            <div style={{ fontSize: 11, color: B.nvD, fontFamily: F, lineHeight: 1.4 }}>{log.notes}</div>
                        </div>
                    )}
                    {log.modification_notes && (
                        <div>
                            <div style={{ fontSize: 9, fontWeight: 800, color: B.amb, fontFamily: F, letterSpacing: 0.4, marginBottom: 2 }}>MODIFICATIONS</div>
                            <div style={{ fontSize: 11, color: B.nvD, fontFamily: F, lineHeight: 1.4 }}>{log.modification_notes}</div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default function PlayerFitnessHistory({ playerId }) {
    const [enrolment, setEnrolment] = useState(null);
    const [program, setProgram] = useState(null);
    const [blocks, setBlocks] = useState([]);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState(null);
    const [expandedKey, setExpandedKey] = useState(null); // `${weekNum}-${dayNum}`

    useEffect(() => {
        if (!playerId) return;
        let cancelled = false;
        (async () => {
            setLoading(true);
            setErr(null);
            try {
                const { data: en, error: e1 } = await supabase
                    .from('fitness_program_enrolment')
                    .select('*, program:program_id(*)')
                    .eq('player_id', playerId)
                    .eq('status', 'active')
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();
                if (e1) throw new Error(e1.message);
                if (cancelled) return;
                if (!en) {
                    setEnrolment(null); setProgram(null); setBlocks([]); setLogs([]);
                    setLoading(false); return;
                }
                setEnrolment(en);
                setProgram(en.program || null);

                const [blockRows, { data: logRows, error: e2 }] = await Promise.all([
                    loadProgramBlocks(en.program_id),
                    supabase.from('fitness_session_logs')
                        .select('*')
                        .eq('enrolment_id', en.id)
                        .order('completed_at', { ascending: false }),
                ]);
                if (cancelled) return;
                if (e2) throw new Error(e2.message);
                setBlocks(blockRows);
                setLogs(logRows || []);
            } catch (e) {
                if (!cancelled) setErr(e.message || 'Failed to load fitness history');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [playerId]);

    const currentWeek = useMemo(() => {
        if (!enrolment || !program) return 1;
        return computeCurrentWeek(enrolment.start_date, program.total_weeks || 10, new Date());
    }, [enrolment, program]);

    const totalWeeks = program?.total_weeks || 10;
    const orderedBlocks = useMemo(() => [...blocks].sort((a, b) => a.day_number - b.day_number), [blocks]);

    const logByKey = useMemo(() => {
        const map = {};
        (logs || []).forEach(l => {
            map[`${l.week_number}-${l.day_number}`] = l;
        });
        return map;
    }, [logs]);

    if (!playerId) return null;
    if (loading) {
        return <div style={{ padding: '12px 0', fontSize: 11, color: B.g400, fontFamily: F, textAlign: 'center' }}>Loading fitness history…</div>;
    }
    if (err) {
        return <div style={{ padding: '12px 0', fontSize: 11, color: B.red, fontFamily: F }}>Couldn't load history: {err}</div>;
    }
    if (!enrolment || orderedBlocks.length === 0) {
        return <div style={{ padding: '12px 0', fontSize: 11, color: B.g400, fontFamily: F }}>Not enrolled in a fitness program yet.</div>;
    }

    return (
        <div style={{ padding: '4px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, marginBottom: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: B.bl, fontFamily: F, letterSpacing: 0.5 }}>WEEK BY WEEK</div>
                <div style={{ fontSize: 9, color: B.g400, fontFamily: F }}>
                    Week {currentWeek} of {totalWeeks} · tap any session for details
                </div>
            </div>

            {Array.from({ length: totalWeeks }, (_, i) => i + 1).map(weekNum => {
                const isCurrent = weekNum === currentWeek;
                const isPast = weekNum < currentWeek;
                return (
                    <div key={weekNum} style={{
                        ...sCard, padding: 10, marginBottom: 6,
                        background: isCurrent ? `${B.bl}06` : B.w,
                        border: `1px solid ${isCurrent ? B.bl : B.g200}`,
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                            <div style={{ fontSize: 11, fontWeight: 800, color: isCurrent ? B.bl : B.nvD, fontFamily: F, letterSpacing: 0.5 }}>
                                Week {weekNum}{isCurrent ? ' · current' : ''}
                            </div>
                            <div style={{ fontSize: 9, color: B.g400, fontFamily: F }}>
                                {orderedBlocks.filter(block => {
                                    const log = logByKey[`${weekNum}-${block.day_number}`];
                                    const status = statusFor(log, weekNum, currentWeek);
                                    return status === 'done' || status === 'caught_up';
                                }).length}/{orderedBlocks.length} done
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {orderedBlocks.map(block => {
                                const key = `${weekNum}-${block.day_number}`;
                                const log = logByKey[key];
                                const status = statusFor(log, weekNum, currentWeek);
                                const isExpanded = expandedKey === key;
                                const canExpand = !!log;
                                return (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => canExpand ? setExpandedKey(isExpanded ? null : key) : null}
                                        style={{
                                            flex: '1 1 140px', minWidth: 0,
                                            padding: '8px 10px', borderRadius: 8,
                                            background: STATUS[status].bg,
                                            border: `1px solid ${STATUS[status].border}${isExpanded ? '' : '60'}`,
                                            cursor: canExpand ? 'pointer' : 'default',
                                            textAlign: 'left', fontFamily: F,
                                            display: 'flex', flexDirection: 'column', gap: 4,
                                        }}
                                    >
                                        <div style={{ fontSize: 10, fontWeight: 800, color: B.nvD, letterSpacing: 0.4 }}>
                                            Day {block.day_number} · {block.day_label}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                                            <StatusPill status={status} />
                                            {log && (
                                                <span style={{ fontSize: 9, color: B.g600, fontWeight: 700 }}>
                                                    {(log.exercise_logs || []).reduce((acc, el) => acc + (el.sets || []).filter(s => s.completed).length, 0)} sets
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                        {expandedKey?.startsWith(`${weekNum}-`) && (() => {
                            const [, dayStr] = expandedKey.split('-');
                            const dayNum = parseInt(dayStr, 10);
                            const block = orderedBlocks.find(b => b.day_number === dayNum);
                            const log = logByKey[expandedKey];
                            if (!log || !block) return null;
                            return <SessionDetail log={log} block={block} />;
                        })()}
                    </div>
                );
            })}
        </div>
    );
}
