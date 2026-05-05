// ═══ COACH: PER-PLAYER EXIT VELOCITY DRILL-IN ═══
// Sits inside the Admin Profiles expanded card. Lets a coach record a
// 3-attempt exit velocity test session, see best/average live, and view
// the player's full test history (e.g. baseline + end-of-program retest).

import React, { useEffect, useMemo, useState } from 'react';
import { B, F } from '../data/theme';
import { supabase } from '../supabaseClient';
import {
    METRIC_TYPES,
    METRIC_LABELS,
    loadSessionsFor,
    saveExitVelocitySession,
    replaceExitVelocitySession,
    deleteSession,
} from '../db/performanceMetricsDb';

const META = METRIC_LABELS[METRIC_TYPES.EXIT_VELOCITY];

function todayStr() {
    return new Date().toISOString().slice(0, 10);
}

function fmtDate(d) {
    if (!d) return '—';
    const dt = new Date(d);
    return dt.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

function parseAttempt(v) {
    if (v === '' || v === null || v === undefined) return null;
    const n = Number(v);
    return isNaN(n) ? null : n;
}

export default function ExitVelocityCard({ playerId }) {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState(null);

    // Form state
    const [showForm, setShowForm] = useState(false);
    const [editingDate, setEditingDate] = useState(null); // null = new test, date = editing existing
    const [date, setDate] = useState(todayStr());
    const [a1, setA1] = useState('');
    const [a2, setA2] = useState('');
    const [a3, setA3] = useState('');
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);
    const [feedback, setFeedback] = useState(null);

    const showFeedback = (type, text, ms = 2500) => {
        setFeedback({ type, text });
        setTimeout(() => setFeedback(null), ms);
    };

    const reload = async () => {
        if (!playerId) return;
        setLoading(true);
        setErr(null);
        try {
            const data = await loadSessionsFor(playerId, METRIC_TYPES.EXIT_VELOCITY);
            setSessions(data);
        } catch (e) {
            setErr(e.message || 'Failed to load');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { reload(); /* eslint-disable-next-line */ }, [playerId]);

    // Live best/avg from form inputs
    const liveStats = useMemo(() => {
        const vals = [parseAttempt(a1), parseAttempt(a2), parseAttempt(a3)].filter(v => v !== null);
        if (vals.length === 0) return { best: null, avg: null, count: 0 };
        const best = Math.max(...vals);
        const avg = +(vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(1);
        return { best, avg, count: vals.length };
    }, [a1, a2, a3]);

    const resetForm = () => {
        setEditingDate(null);
        setDate(todayStr());
        setA1(''); setA2(''); setA3('');
        setNotes('');
        setShowForm(false);
    };

    const startNewTest = () => {
        setEditingDate(null);
        setDate(todayStr());
        setA1(''); setA2(''); setA3('');
        setNotes('');
        setShowForm(true);
    };

    const startEditTest = (session) => {
        setEditingDate(session.date);
        setDate(session.date);
        const att = session.attempts;
        setA1(att.find(a => a.number === 1)?.value ?? '');
        setA2(att.find(a => a.number === 2)?.value ?? '');
        setA3(att.find(a => a.number === 3)?.value ?? '');
        setNotes(session.notes || '');
        setShowForm(true);
    };

    const handleSave = async () => {
        if (saving) return;
        const attempts = [parseAttempt(a1), parseAttempt(a2), parseAttempt(a3)];
        if (attempts.every(v => v === null)) {
            showFeedback('err', 'Enter at least one attempt');
            return;
        }
        // Sanity range: 20–200 km/h
        const out = attempts.find(v => v !== null && (v < 20 || v > 200));
        if (out !== undefined) {
            showFeedback('err', `${out} km/h looks off — check your number`);
            return;
        }

        setSaving(true);
        try {
            const { data: userResp } = await supabase.auth.getUser();
            const userId = userResp?.user?.id;
            if (!userId) throw new Error('Not signed in');

            if (editingDate) {
                await replaceExitVelocitySession({
                    playerId, recordedAt: editingDate, attempts,
                    notes: notes.trim() || null,
                    recordedBy: userId, recordedByRole: 'coach',
                });
                showFeedback('ok', 'Test updated');
            } else {
                await saveExitVelocitySession({
                    playerId, recordedAt: date, attempts,
                    notes: notes.trim() || null,
                    recordedBy: userId, recordedByRole: 'coach',
                });
                showFeedback('ok', 'Test saved');
            }
            resetForm();
            await reload();
        } catch (e) {
            console.error(e);
            showFeedback('err', e.message || 'Save failed', 4000);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (session) => {
        if (!window.confirm(`Delete the Exit Velocity test from ${fmtDate(session.date)}? This can't be undone.`)) return;
        try {
            await deleteSession(playerId, METRIC_TYPES.EXIT_VELOCITY, session.date);
            showFeedback('ok', 'Test deleted');
            await reload();
        } catch (e) {
            showFeedback('err', e.message || 'Delete failed', 4000);
        }
    };

    if (!playerId) return null;

    // Latest session = first item (sessions are sorted newest first)
    const latest = sessions[0] || null;

    return (
        <div style={{ padding: '4px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, marginBottom: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: B.bl, fontFamily: F, letterSpacing: 0.5 }}>EXIT VELOCITY</div>
                {!showForm && (
                    <button onClick={startNewTest}
                        style={{ padding: '5px 10px', borderRadius: 6, border: `1px solid ${B.bl}`, background: B.w, color: B.bl, fontSize: 10, fontWeight: 700, fontFamily: F, cursor: 'pointer' }}>
                        + New Test
                    </button>
                )}
            </div>

            {feedback && (
                <div style={{
                    padding: '8px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700, fontFamily: F, marginBottom: 8,
                    background: feedback.type === 'ok' ? `${B.grn}15` : '#fee2e2',
                    color: feedback.type === 'ok' ? B.grn : '#dc2626',
                    border: `1px solid ${feedback.type === 'ok' ? `${B.grn}30` : '#fca5a5'}`,
                }}>{feedback.text}</div>
            )}

            {/* HEADLINE: latest session at a glance */}
            {!showForm && latest && (
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                    marginBottom: 8, padding: '8px 12px',
                    background: `${B.bl}08`, border: `1px solid ${B.bl}25`, borderRadius: 8,
                }}>
                    <div>
                        <div style={{ fontSize: 11, fontWeight: 800, color: B.nvD, fontFamily: F }}>
                            Latest test · {fmtDate(latest.date)}
                        </div>
                        <div style={{ fontSize: 10, color: B.g600, fontFamily: F, marginTop: 2 }}>
                            Best <span style={{ fontWeight: 800, color: B.bl }}>{latest.best} km/h</span> · Avg {latest.avg} km/h · {latest.attempts.length} attempt{latest.attempts.length === 1 ? '' : 's'}
                        </div>
                    </div>
                </div>
            )}

            {!showForm && !latest && !loading && (
                <div style={{
                    padding: '12px 14px', background: B.g50, border: `1px dashed ${B.g200}`, borderRadius: 8,
                    fontSize: 11, color: B.g600, fontFamily: F, lineHeight: 1.5,
                }}>
                    No exit velocity test recorded yet. Click <span style={{ fontWeight: 700, color: B.bl }}>+ New Test</span> to add the player's baseline.
                </div>
            )}

            {/* INPUT FORM */}
            {showForm && (
                <div style={{ padding: 12, background: B.g50, border: `1px solid ${B.g200}`, borderRadius: 8, marginBottom: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: B.nvD, fontFamily: F, marginBottom: 10 }}>
                        {editingDate ? `Edit test from ${fmtDate(editingDate)}` : 'New Exit Velocity Test'}
                    </div>

                    {/* Date */}
                    <div style={{ marginBottom: 10 }}>
                        <label style={{ fontSize: 9, fontWeight: 700, color: B.g400, fontFamily: F, display: 'block', marginBottom: 4 }}>Test date</label>
                        <input type="date" value={date} onChange={e => setDate(e.target.value)}
                            disabled={!!editingDate}
                            style={{ padding: '8px 10px', borderRadius: 6, border: `1px solid ${B.g200}`, fontSize: 12, fontFamily: F, color: B.nvD, outline: 'none', background: editingDate ? B.g100 : B.w }} />
                    </div>

                    {/* 3 attempts */}
                    <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                        {[
                            { label: '1', val: a1, set: setA1 },
                            { label: '2', val: a2, set: setA2 },
                            { label: '3', val: a3, set: setA3 },
                        ].map((f, i) => (
                            <div key={i} style={{ flex: 1 }}>
                                <label style={{ fontSize: 9, fontWeight: 700, color: B.g400, fontFamily: F, display: 'block', marginBottom: 4 }}>Attempt {f.label} (km/h)</label>
                                <input
                                    type="number" inputMode="decimal" step="0.1" min="0" max="250"
                                    value={f.val} onChange={e => f.set(e.target.value)}
                                    placeholder="—"
                                    style={{ width: '100%', padding: '10px 10px', borderRadius: 6, border: `1px solid ${B.g200}`, fontSize: 14, fontFamily: F, color: B.nvD, outline: 'none', boxSizing: 'border-box', textAlign: 'center', fontWeight: 700 }}
                                />
                            </div>
                        ))}
                    </div>

                    {/* Live best/avg */}
                    {liveStats.count > 0 && (
                        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                            <div style={{ flex: 1, padding: '8px', textAlign: 'center', background: `${B.bl}10`, borderRadius: 6 }}>
                                <div style={{ fontSize: 16, fontWeight: 800, color: B.bl, fontFamily: F, lineHeight: 1.1 }}>{liveStats.best}</div>
                                <div style={{ fontSize: 8, fontWeight: 700, color: B.g400, fontFamily: F, letterSpacing: 0.4, marginTop: 2 }}>BEST (KM/H)</div>
                            </div>
                            <div style={{ flex: 1, padding: '8px', textAlign: 'center', background: `${B.prp}10`, borderRadius: 6 }}>
                                <div style={{ fontSize: 16, fontWeight: 800, color: B.prp, fontFamily: F, lineHeight: 1.1 }}>{liveStats.avg}</div>
                                <div style={{ fontSize: 8, fontWeight: 700, color: B.g400, fontFamily: F, letterSpacing: 0.4, marginTop: 2 }}>AVG (KM/H)</div>
                            </div>
                        </div>
                    )}

                    {/* Notes */}
                    <div style={{ marginBottom: 10 }}>
                        <label style={{ fontSize: 9, fontWeight: 700, color: B.g400, fontFamily: F, display: 'block', marginBottom: 4 }}>Notes (optional)</label>
                        <textarea value={notes} onChange={e => setNotes(e.target.value)}
                            rows={2} placeholder="Conditions, gear, observations…"
                            style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: `1px solid ${B.g200}`, fontSize: 11, fontFamily: F, color: B.nvD, outline: 'none', boxSizing: 'border-box', resize: 'vertical' }} />
                    </div>

                    {/* Buttons */}
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={handleSave} disabled={saving}
                            style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: saving ? B.g200 : B.bl, color: B.w, fontSize: 11, fontWeight: 800, fontFamily: F, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1 }}>
                            {saving ? 'Saving...' : (editingDate ? 'Update Test' : 'Save Test')}
                        </button>
                        <button onClick={resetForm} disabled={saving}
                            style={{ padding: '10px 14px', borderRadius: 8, border: `1px solid ${B.g200}`, background: B.w, color: B.g600, fontSize: 11, fontFamily: F, cursor: 'pointer' }}>
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* HISTORY */}
            {loading && (
                <div style={{ padding: '8px 0', fontSize: 11, color: B.g400, fontFamily: F }}>Loading exit velocity…</div>
            )}
            {err && (
                <div style={{ padding: '8px 0', fontSize: 11, color: B.red, fontFamily: F }}>Couldn't load: {err}</div>
            )}
            {!loading && !err && sessions.length > 0 && (
                <div style={{ marginTop: 6 }}>
                    <div style={{ fontSize: 9, fontWeight: 800, color: B.g400, fontFamily: F, marginBottom: 4, letterSpacing: 0.4 }}>HISTORY</div>
                    {sessions.map(s => (
                        <div key={s.date} style={{
                            padding: '8px 10px', borderBottom: `1px solid ${B.g100}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                        }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: B.nvD, fontFamily: F }}>{fmtDate(s.date)}</div>
                                <div style={{ fontSize: 10, color: B.g600, fontFamily: F, marginTop: 2 }}>
                                    Attempts: {s.attempts.map(a => `${a.value}`).join(' · ')} km/h
                                </div>
                                {s.notes && (
                                    <div style={{ fontSize: 10, color: B.g500, fontFamily: F, fontStyle: 'italic', marginTop: 2 }}>
                                        {s.notes.length > 80 ? s.notes.slice(0, 80) + '…' : s.notes}
                                    </div>
                                )}
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: 14, fontWeight: 800, color: B.bl, fontFamily: F, lineHeight: 1 }}>{s.best}</div>
                                <div style={{ fontSize: 8, color: B.g400, fontFamily: F }}>BEST · avg {s.avg}</div>
                            </div>
                            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                                <button onClick={() => startEditTest(s)}
                                    style={{ padding: '4px 8px', borderRadius: 4, border: `1px solid ${B.g200}`, background: B.w, color: B.g600, fontSize: 9, fontFamily: F, cursor: 'pointer' }}>Edit</button>
                                <button onClick={() => handleDelete(s)}
                                    style={{ padding: '4px 8px', borderRadius: 4, border: `1px solid ${B.red}40`, background: B.w, color: B.red, fontSize: 9, fontFamily: F, cursor: 'pointer' }}>Delete</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
