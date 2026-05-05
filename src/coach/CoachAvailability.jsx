// ═══ COACH AVAILABILITY (SELF-SERVICE) — Mark yourself as out for upcoming sessions ═══
// Reads/writes: sp_coach_availability (per-session yes/no/tentative).
// Status semantics:
//   'available'   — coach is in. Stored as deletion (no row) when notes are empty.
//   'unavailable' — coach is out for that session. Surfaces in admin "unavailable today" list.
//   'tentative'   — coach probably in but not confirming yet.

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { B, F, sCard, isDesktop } from '../data/theme';
import { useAuth } from '../context/AuthContext';
import {
    DEFAULT_PROGRAM_ID,
    loadMyAvailability,
    setAvailability,
    bulkSetAvailability,
    loadSquadsCached,
} from '../db/coachScheduleDb';
import { todayKey, addDays, dayName, shortLabel, timeRange, isPast, isToday, weekStart, daysBetween } from '../lib/dates';

const HORIZON_DAYS = 60;

const STATUS_OPTIONS = [
    { id: 'available',   label: 'In',         color: '#10B981' },
    { id: 'tentative',   label: 'Maybe',      color: '#F59E0B' },
    { id: 'unavailable', label: 'Out',        color: '#EF4444' },
];

// ─── Bulk range editor ──────────────────────────────────────────────────
const RangeEditor = ({ start, end, onClose, sessions, onApply, busy }) => {
    const [from, setFrom] = useState(start);
    const [to, setTo] = useState(end);
    const [status, setStatus] = useState('unavailable');
    const [notes, setNotes] = useState('');

    const matched = useMemo(() => {
        if (from > to) return [];
        return sessions.filter(s => s.date >= from && s.date <= to);
    }, [from, to, sessions]);

    const apply = async () => {
        if (matched.length === 0) return;
        const entries = matched.map(s => ({ sessionId: s.id, date: s.date }));
        await onApply({ entries, status, notes: notes.trim() || null });
        onClose();
    };

    return (
        <div role="dialog" aria-label="Set availability for date range" onClick={onClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, fontFamily: F, padding: 16 }}>
            <div onClick={(e) => e.stopPropagation()}
                style={{ background: B.w, width: '100%', maxWidth: 460, borderRadius: 12, padding: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: B.nvD }}>Block out a date range</div>
                    <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', fontSize: 20, color: B.g400, cursor: 'pointer' }}>×</button>
                </div>
                <div style={{ fontSize: 11, color: B.g600, marginBottom: 12 }}>
                    All sessions falling between these dates will be marked.
                </div>

                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                    <label style={{ flex: 1, fontSize: 10, fontWeight: 700, color: B.g600 }}>
                        From
                        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
                            style={inputStyle} />
                    </label>
                    <label style={{ flex: 1, fontSize: 10, fontWeight: 700, color: B.g600 }}>
                        To
                        <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
                            style={inputStyle} />
                    </label>
                </div>

                <div style={{ fontSize: 10, fontWeight: 800, color: B.g600, letterSpacing: 1, marginBottom: 6 }}>SET TO</div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                    {STATUS_OPTIONS.map(o => (
                        <button key={o.id} onClick={() => setStatus(o.id)}
                            style={{
                                flex: 1, fontSize: 11, fontWeight: 700, padding: '8px 10px', borderRadius: 6,
                                border: `1.5px solid ${status === o.id ? o.color : B.g200}`,
                                background: status === o.id ? `${o.color}15` : B.w,
                                color: status === o.id ? o.color : B.g600,
                                cursor: 'pointer', fontFamily: F,
                            }}>{o.label}</button>
                    ))}
                </div>

                <label style={{ fontSize: 10, fontWeight: 700, color: B.g600, display: 'block' }}>
                    Reason (optional)
                    <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
                        placeholder="e.g. away on family holiday"
                        style={inputStyle} maxLength={140} />
                </label>

                <div style={{ marginTop: 10, padding: '8px 10px', borderRadius: 6, background: B.g50, fontSize: 11, color: B.g600 }}>
                    {matched.length === 0
                        ? 'No sessions in this range.'
                        : `Will update ${matched.length} session${matched.length > 1 ? 's' : ''}.`}
                </div>

                <button onClick={apply} disabled={busy || matched.length === 0}
                    style={{
                        width: '100%', marginTop: 12, padding: '10px 16px', borderRadius: 8,
                        border: 'none', background: matched.length === 0 ? B.g400 : `linear-gradient(135deg, ${B.bl}, ${B.pk})`,
                        color: B.w, fontSize: 13, fontWeight: 800, fontFamily: F,
                        cursor: matched.length === 0 ? 'default' : 'pointer',
                    }}>
                    {busy ? 'Saving…' : `Apply to ${matched.length} session${matched.length === 1 ? '' : 's'}`}
                </button>
            </div>
        </div>
    );
};

// ─── Session row with status toggle ─────────────────────────────────────
const SessionRow = ({ session, currentStatus, currentNotes, squadsById, onSet, busy }) => {
    const [open, setOpen] = useState(false);
    const [draftNotes, setDraftNotes] = useState(currentNotes || '');
    useEffect(() => setDraftNotes(currentNotes || ''), [currentNotes]);

    const past = isPast(session.date);
    const today = isToday(session.date);
    const squadNames = (session.squad_ids || []).map(id => squadsById.get(id)?.name).filter(Boolean);
    const status = currentStatus || 'available';
    const statusOpt = STATUS_OPTIONS.find(o => o.id === status);

    return (
        <div style={{
            ...sCard,
            marginBottom: 8, padding: 10,
            opacity: past ? 0.55 : 1,
            borderLeft: `4px solid ${statusOpt?.color || B.g200}`,
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: B.nvD, fontFamily: F }}>
                        {dayName(session.date)} {shortLabel(session.date).split(' ').slice(1).join(' ')} · {timeRange(session.start_time, session.end_time)}
                        {today && <span style={{ marginLeft: 6, fontSize: 9, color: B.bl, background: `${B.bl}15`, padding: '1px 5px', borderRadius: 3 }}>TODAY</span>}
                    </div>
                    {squadNames.length > 0 && (
                        <div style={{ fontSize: 10, color: B.g600, fontFamily: F, marginTop: 2 }}>
                            {squadNames.join(' · ')}
                        </div>
                    )}
                    {currentNotes && <div style={{ fontSize: 10, color: B.g400, fontFamily: F, fontStyle: 'italic', marginTop: 2 }}>“{currentNotes}”</div>}
                </div>
            </div>

            {!past && (
                <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                    {STATUS_OPTIONS.map(o => (
                        <button key={o.id}
                            onClick={() => onSet({ sessionId: session.id, date: session.date, status: o.id, notes: o.id === 'available' ? null : currentNotes })}
                            disabled={busy}
                            style={{
                                flex: 1, fontSize: 11, fontWeight: 700, padding: '6px 8px', borderRadius: 6,
                                border: `1.5px solid ${status === o.id ? o.color : B.g200}`,
                                background: status === o.id ? `${o.color}15` : B.w,
                                color: status === o.id ? o.color : B.g600,
                                cursor: busy ? 'default' : 'pointer', fontFamily: F,
                            }}>{o.label}</button>
                    ))}
                    <button onClick={() => setOpen(v => !v)} disabled={busy}
                        style={{ fontSize: 11, fontWeight: 700, padding: '6px 8px', borderRadius: 6, border: `1px solid ${B.g200}`, background: B.w, color: B.g600, cursor: 'pointer', fontFamily: F }}
                        title="Add a reason">
                        💬
                    </button>
                </div>
            )}

            {open && !past && (
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                    <input type="text" value={draftNotes} onChange={(e) => setDraftNotes(e.target.value)}
                        placeholder="Reason (optional)" maxLength={140}
                        style={{ flex: 1, padding: '6px 10px', fontSize: 12, fontFamily: F, border: `1px solid ${B.g200}`, borderRadius: 6 }} />
                    <button onClick={() => { onSet({ sessionId: session.id, date: session.date, status, notes: draftNotes.trim() || null }); setOpen(false); }}
                        disabled={busy}
                        style={{ fontSize: 11, fontWeight: 700, padding: '6px 10px', borderRadius: 6, border: 'none', background: B.bl, color: B.w, cursor: 'pointer', fontFamily: F }}>
                        Save
                    </button>
                </div>
            )}
        </div>
    );
};

const inputStyle = {
    width: '100%', padding: '8px 10px', fontSize: 13, fontWeight: 600, fontFamily: F,
    border: `1px solid ${B.g200}`, borderRadius: 6, marginTop: 4, boxSizing: 'border-box',
};

// ─── Main component ──────────────────────────────────────────────────────
export default function CoachAvailability() {
    const { session } = useAuth();
    const userId = session?.user?.id || null;

    const [windowStart, setWindowStart] = useState(todayKey());
    const horizonEnd = useMemo(() => addDays(windowStart, HORIZON_DAYS - 1), [windowStart]);

    const [sessions, setSessions] = useState([]);
    const [byId, setById] = useState({});
    const [squads, setSquads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);
    const [savedMsg, setSavedMsg] = useState(null);
    const [showRange, setShowRange] = useState(false);

    const squadsById = useMemo(() => {
        const m = new Map();
        squads.forEach(s => m.set(s.id, s));
        return m;
    }, [squads]);

    const refresh = useCallback(async () => {
        if (!userId) return;
        setError(null);
        try {
            const [{ sessions: ss, byId: bi }, sq] = await Promise.all([
                loadMyAvailability(userId, windowStart, horizonEnd),
                loadSquadsCached(),
            ]);
            setSessions(ss);
            setById(bi);
            setSquads(sq);
        } catch (e) {
            setError(e.message || 'Could not load your availability.');
            console.warn('CoachAvailability load failed:', e?.message || e);
        }
    }, [userId, windowStart, horizonEnd]);

    useEffect(() => {
        setLoading(true);
        refresh().finally(() => setLoading(false));
    }, [refresh]);

    const setOne = async ({ sessionId, date, status, notes }) => {
        setBusy(true); setError(null); setSavedMsg(null);
        try {
            await setAvailability({ userId, programId: DEFAULT_PROGRAM_ID, sessionId, date, status, notes });
            setSavedMsg('Saved');
            setTimeout(() => setSavedMsg(null), 1800);
            await refresh();
        } catch (e) { setError(e.message || 'Save failed'); }
        finally { setBusy(false); }
    };

    const applyRange = async ({ entries, status, notes }) => {
        setBusy(true); setError(null); setSavedMsg(null);
        try {
            const { ok, failed } = await bulkSetAvailability({ userId, programId: DEFAULT_PROGRAM_ID, entries, status, notes });
            setSavedMsg(`${ok} updated${failed > 0 ? ` · ${failed} failed` : ''}`);
            setTimeout(() => setSavedMsg(null), 2500);
            await refresh();
        } catch (e) { setError(e.message || 'Bulk save failed'); }
        finally { setBusy(false); }
    };

    // Group sessions by week for the list view
    const sessionsByWeek = useMemo(() => {
        const groups = new Map();
        sessions.forEach(s => {
            const wk = weekStart(s.date);
            if (!groups.has(wk)) groups.set(wk, []);
            groups.get(wk).push(s);
        });
        return groups;
    }, [sessions]);

    return (
        <div data-testid="coach-availability" style={{ minHeight: '100vh', background: B.g50, fontFamily: F, paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}>
            <div style={{ position: 'sticky', top: 0, zIndex: 50, background: B.w, borderBottom: `1px solid ${B.g200}`, padding: '12px 14px' }}>
                <div style={{ fontSize: 9, fontWeight: 800, color: B.g400, letterSpacing: 1.5 }}>MY AVAILABILITY</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: B.nvD }}>Mark yourself in or out of upcoming sessions</div>
                <div style={{ fontSize: 10, color: B.g600, marginTop: 2 }}>Default is "In" — only mark sessions you can't make.</div>

                <div style={{ display: 'flex', gap: 6, marginTop: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    <button onClick={() => setShowRange(true)}
                        style={{ fontSize: 11, fontWeight: 800, color: B.w, background: `linear-gradient(135deg, ${B.bl}, ${B.pk})`, border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontFamily: F }}>
                        + Block out date range
                    </button>
                    <div style={{ flex: 1 }} />
                    <button onClick={() => setWindowStart(addDays(windowStart, -14))} style={navBtn}>‹ 2 weeks</button>
                    <button onClick={() => setWindowStart(todayKey())} style={{ ...navBtn, background: B.bl, color: B.w, borderColor: B.bl }}>Today</button>
                    <button onClick={() => setWindowStart(addDays(windowStart, 14))} style={navBtn}>2 weeks ›</button>
                </div>

                {savedMsg && (
                    <div style={{ marginTop: 8, padding: 6, borderRadius: 6, background: `${B.grn}15`, color: B.grn, fontSize: 11, fontWeight: 700 }}>
                        ✓ {savedMsg}
                    </div>
                )}
                {error && (
                    <div style={{ marginTop: 8, padding: 8, borderRadius: 6, background: `${B.red}10`, border: `1px solid ${B.red}40`, color: B.red, fontSize: 11 }}>
                        {error}
                    </div>
                )}
            </div>

            {!userId ? (
                <div style={{ padding: 40, textAlign: 'center', color: B.g400, fontSize: 12 }}>Sign in to manage your availability.</div>
            ) : loading ? (
                <div style={{ padding: 40, textAlign: 'center', color: B.g400, fontSize: 12 }}>Loading sessions…</div>
            ) : sessions.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: B.g400, fontSize: 12 }}>
                    No sessions in this window. Try the date nav above.
                </div>
            ) : (
                <div style={{ padding: '12px 14px' }}>
                    {Array.from(sessionsByWeek.entries()).map(([wk, weekSessions]) => (
                        <div key={wk} style={{ marginBottom: 14 }}>
                            <div style={{ fontSize: 10, fontWeight: 800, color: B.g400, letterSpacing: 1, marginBottom: 6, padding: '4px 0', borderBottom: `1px solid ${B.g200}` }}>
                                Week of {shortLabel(wk)}
                            </div>
                            {weekSessions.map(s => (
                                <SessionRow key={s.id}
                                    session={s}
                                    currentStatus={byId[s.id]?.status}
                                    currentNotes={byId[s.id]?.notes}
                                    squadsById={squadsById}
                                    onSet={setOne}
                                    busy={busy}
                                />
                            ))}
                        </div>
                    ))}
                </div>
            )}

            {showRange && (
                <RangeEditor
                    start={windowStart}
                    end={horizonEnd}
                    sessions={sessions}
                    onApply={applyRange}
                    onClose={() => setShowRange(false)}
                    busy={busy}
                />
            )}
        </div>
    );
}

const navBtn = {
    fontSize: 11, fontWeight: 700, color: B.g600, background: B.w,
    border: `1px solid ${B.g200}`, borderRadius: 6, padding: '5px 10px',
    cursor: 'pointer', fontFamily: F,
};
