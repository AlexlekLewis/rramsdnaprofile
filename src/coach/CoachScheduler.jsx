// ═══ COACH SCHEDULER (ADMIN) — 60-day calendar of sessions, coach assignments, gap detection ═══
// Reads:  RPC public.get_staffing_status(start, end, program_id)
// Writes: sp_session_coaches (assign / remove), sp_session_staffing_rules (edit min counts)
// Auth:   Admin / super_admin / head_coach only — gated in the parent + by RLS + by RPC role-check.

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { B, F, sCard, isDesktop } from '../data/theme';
import {
    DEFAULT_PROGRAM_ID,
    loadActiveCoaches,
    loadStaffingStatus,
    loadSquadsCached,
    loadStaffingRules,
    upsertStaffingRule,
    assignCoachToSession,
    removeAssignment,
    setAssignmentConfirmed,
    listCoachRoles,
    coachRoleLabel,
    coachRoleColor,
} from '../db/coachScheduleDb';
import { todayKey, addDays, daysBetween, shortLabel, longLabel, dayName, timeRange, weekStart, isPast, isToday } from '../lib/dates';

const HORIZON_DAYS = 60;

// ─── Sub-components ──────────────────────────────────────────────────────
const RoleChip = ({ role, name, confirmed, onRemove }) => (
    <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        background: `${coachRoleColor(role)}15`, border: `1px solid ${coachRoleColor(role)}50`,
        borderRadius: 12, padding: '2px 6px 2px 8px', fontSize: 10, fontFamily: F, fontWeight: 700,
        color: coachRoleColor(role), marginRight: 4, marginBottom: 4,
    }} title={`${coachRoleLabel(role)}${confirmed ? ' (confirmed)' : ' (pending)'}`}>
        <span style={{ opacity: confirmed ? 1 : 0.7 }}>{name || '(unknown)'}</span>
        {!confirmed && <span style={{ fontSize: 8, opacity: 0.6 }}>?</span>}
        {onRemove && (
            <button onClick={(e) => { e.stopPropagation(); onRemove(); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: coachRoleColor(role),
                    fontSize: 12, fontWeight: 700, padding: 0, marginLeft: 2, lineHeight: 1, opacity: 0.7 }}
                aria-label={`Remove ${name}`}>×</button>
        )}
    </div>
);

const GapBadge = ({ gaps }) => {
    const entries = Object.entries(gaps || {}).filter(([, n]) => n > 0);
    if (entries.length === 0) return null;
    const text = entries.map(([role, n]) => `${n} ${coachRoleLabel(role).toLowerCase()}${n > 1 ? 's' : ''}`).join(' · ');
    return (
        <div style={{
            display: 'inline-block', background: `${B.red}15`, border: `1px solid ${B.red}40`,
            color: B.red, fontSize: 10, fontWeight: 700, fontFamily: F,
            borderRadius: 6, padding: '2px 8px', marginTop: 4,
        }} title="Sessions need more coaches">
            ⚠ Short {text}
        </div>
    );
};

const SessionCard = ({ row, squadsById, onClick }) => {
    const past = isPast(row.session_date);
    const today = isToday(row.session_date);
    const squadNames = (row.squad_ids || []).map(id => squadsById.get(id)?.name).filter(Boolean);
    const time = timeRange(row.start_time, row.end_time);
    const totalGaps = row.total_gaps || 0;
    return (
        <div onClick={() => onClick && onClick(row)}
            style={{
                ...sCard,
                marginBottom: 8,
                padding: 12,
                cursor: onClick ? 'pointer' : 'default',
                opacity: past ? 0.55 : 1,
                borderLeft: `4px solid ${totalGaps > 0 && !past ? B.red : today ? B.bl : B.g200}`,
            }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: B.nvD, fontFamily: F }}>
                        {time || '(no time)'}
                        {row.theme && <span style={{ fontWeight: 600, color: B.g600, marginLeft: 6 }}>· {row.theme}</span>}
                    </div>
                    {squadNames.length > 0 && (
                        <div style={{ fontSize: 10, color: B.g600, fontFamily: F, marginTop: 2 }}>
                            {squadNames.join(' · ')}
                        </div>
                    )}
                </div>
                {today && <span style={{ fontSize: 9, fontWeight: 800, color: B.bl, fontFamily: F, background: `${B.bl}10`, padding: '2px 6px', borderRadius: 4 }}>TODAY</span>}
            </div>

            <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap' }}>
                {(row.assigned || []).length === 0
                    ? <div style={{ fontSize: 10, color: B.g400, fontStyle: 'italic', fontFamily: F }}>No coaches assigned</div>
                    : (row.assigned || []).map(a => <RoleChip key={a.assignment_id} role={a.coach_role} name={a.coach_name} confirmed={a.confirmed} />)
                }
            </div>

            {!past && <GapBadge gaps={row.gaps} />}

            {(row.unavailable || []).length > 0 && !past && (
                <div style={{ marginTop: 6, fontSize: 9, color: B.amb, fontFamily: F }}>
                    Unavailable: {(row.unavailable || []).map(u => u.coach_name).join(', ')}
                </div>
            )}
        </div>
    );
};

// ─── Assign drawer (modal) ───────────────────────────────────────────────
const AssignDrawer = ({ row, coaches, squadsById, onClose, onChanged, busy, setBusy, setError }) => {
    const [pickedRole, setPickedRole] = useState('squad_coach');
    const assignedCoachIdSet = useMemo(() => new Set((row?.assigned || []).map(a => a.coach_id)), [row]);
    const unavailableUserIdSet = useMemo(() => new Set((row?.unavailable || []).map(u => u.user_id)), [row]);

    if (!row) return null;
    const time = timeRange(row.start_time, row.end_time);
    const squadNames = (row.squad_ids || []).map(id => squadsById.get(id)?.name).filter(Boolean);

    const doAssign = async (coachId) => {
        setBusy(true); setError(null);
        try {
            await assignCoachToSession(row.session_id, coachId, pickedRole);
            await onChanged();
        } catch (e) {
            setError(e.message || 'Could not assign');
        } finally { setBusy(false); }
    };
    const doRemove = async (assignmentId) => {
        if (!confirm('Remove this coach from the session?')) return;
        setBusy(true); setError(null);
        try { await removeAssignment(assignmentId); await onChanged(); }
        catch (e) { setError(e.message || 'Could not remove'); }
        finally { setBusy(false); }
    };
    const doToggleConfirm = async (a) => {
        setBusy(true); setError(null);
        try { await setAssignmentConfirmed(a.assignment_id, !a.confirmed); await onChanged(); }
        catch (e) { setError(e.message || 'Could not update'); }
        finally { setBusy(false); }
    };

    return (
        <div role="dialog" aria-label="Assign coaches to session"
            onClick={onClose}
            style={{
                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
                display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
                zIndex: 200, fontFamily: F,
            }}>
            <div onClick={(e) => e.stopPropagation()}
                style={{
                    background: B.w, width: '100%', maxWidth: 520,
                    borderTopLeftRadius: 16, borderTopRightRadius: 16,
                    padding: 16, paddingBottom: 'calc(20px + env(safe-area-inset-bottom))',
                    maxHeight: '90vh', overflowY: 'auto',
                    boxShadow: '0 -8px 32px rgba(0,0,0,0.2)',
                }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: B.nvD }}>{shortLabel(row.session_date)} · {time}</div>
                    <button onClick={onClose} aria-label="Close"
                        style={{ background: 'none', border: 'none', fontSize: 20, color: B.g400, cursor: 'pointer', lineHeight: 1 }}>×</button>
                </div>
                {row.theme && <div style={{ fontSize: 11, color: B.g600, marginBottom: 4 }}>{row.theme}</div>}
                {squadNames.length > 0 && <div style={{ fontSize: 10, color: B.g400, marginBottom: 12 }}>{squadNames.join(' · ')}</div>}

                {/* Currently assigned */}
                <div style={{ fontSize: 10, fontWeight: 800, color: B.g600, letterSpacing: 1, marginTop: 8, marginBottom: 6 }}>ASSIGNED</div>
                {(row.assigned || []).length === 0 ? (
                    <div style={{ fontSize: 11, color: B.g400, fontStyle: 'italic', marginBottom: 10 }}>No coaches yet — pick one below.</div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                        {(row.assigned || []).map(a => (
                            <div key={a.assignment_id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', background: B.g50, borderRadius: 6 }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: B.nvD }}>{a.coach_name || '(unknown)'}</div>
                                    <div style={{ fontSize: 9, color: coachRoleColor(a.coach_role), fontWeight: 700 }}>{coachRoleLabel(a.coach_role)}</div>
                                </div>
                                <button onClick={() => doToggleConfirm(a)} disabled={busy}
                                    style={{ fontSize: 9, fontWeight: 700, padding: '4px 8px', borderRadius: 4, border: `1px solid ${a.confirmed ? B.grn : B.amb}`, background: 'transparent', color: a.confirmed ? B.grn : B.amb, cursor: 'pointer' }}>
                                    {a.confirmed ? '✓ Confirmed' : 'Pending'}
                                </button>
                                <button onClick={() => doRemove(a.assignment_id)} disabled={busy}
                                    style={{ fontSize: 11, fontWeight: 700, padding: '4px 8px', borderRadius: 4, border: 'none', background: `${B.red}15`, color: B.red, cursor: 'pointer' }}>
                                    Remove
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Gap badge */}
                {row.total_gaps > 0 && <GapBadge gaps={row.gaps} />}

                {/* Role picker */}
                <div style={{ fontSize: 10, fontWeight: 800, color: B.g600, letterSpacing: 1, marginTop: 14, marginBottom: 6 }}>ASSIGN AS</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                    {listCoachRoles().map(r => (
                        <button key={r.id} onClick={() => setPickedRole(r.id)}
                            style={{
                                fontSize: 11, fontWeight: 700, padding: '6px 10px', borderRadius: 6,
                                border: `1.5px solid ${pickedRole === r.id ? r.color : B.g200}`,
                                background: pickedRole === r.id ? `${r.color}15` : B.w,
                                color: pickedRole === r.id ? r.color : B.g600,
                                cursor: 'pointer', fontFamily: F,
                            }}>{r.label}</button>
                    ))}
                </div>

                {/* Coach list */}
                <div style={{ fontSize: 10, fontWeight: 800, color: B.g600, letterSpacing: 1, marginTop: 8, marginBottom: 6 }}>PICK COACH</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 280, overflowY: 'auto' }}>
                    {coaches.map(c => {
                        const alreadyAssigned = assignedCoachIdSet.has(c.id);
                        const isUnavail = c.user_id && unavailableUserIdSet.has(c.user_id);
                        return (
                            <button key={c.id}
                                disabled={alreadyAssigned || busy}
                                onClick={() => doAssign(c.id)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                                    border: `1px solid ${B.g200}`, borderRadius: 6, background: alreadyAssigned ? B.g100 : B.w,
                                    cursor: alreadyAssigned ? 'default' : 'pointer', textAlign: 'left',
                                    opacity: alreadyAssigned ? 0.55 : 1, fontFamily: F,
                                }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: B.nvD }}>{c.name}</div>
                                    <div style={{ fontSize: 9, color: B.g400 }}>
                                        {coachRoleLabel(c.role)}{c.speciality ? ` · ${c.speciality}` : ''}
                                    </div>
                                </div>
                                {isUnavail && <span style={{ fontSize: 9, fontWeight: 700, color: B.amb, background: `${B.amb}15`, padding: '2px 6px', borderRadius: 4 }}>unavailable</span>}
                                {alreadyAssigned && <span style={{ fontSize: 9, fontWeight: 700, color: B.g400 }}>assigned</span>}
                            </button>
                        );
                    })}
                    {coaches.length === 0 && <div style={{ fontSize: 11, color: B.g400, fontStyle: 'italic' }}>No active coaches in sp_coaches.</div>}
                </div>
            </div>
        </div>
    );
};

// ─── Staffing rules editor ───────────────────────────────────────────────
const StaffingRulesEditor = ({ rules, onChanged, busy, setBusy, setError, onClose }) => {
    const [draft, setDraft] = useState(rules);
    useEffect(() => setDraft(rules), [rules]);

    const setMin = (role, n) => {
        setDraft(d => {
            const idx = d.findIndex(r => r.coach_role === role && r.squad_id === null);
            const safeN = Math.max(0, parseInt(n, 10) || 0);
            if (idx >= 0) {
                const next = d.slice();
                next[idx] = { ...next[idx], min_count: safeN };
                return next;
            }
            return [...d, { id: null, coach_role: role, squad_id: null, min_count: safeN, program_id: DEFAULT_PROGRAM_ID }];
        });
    };

    const save = async () => {
        setBusy(true); setError(null);
        try {
            for (const r of draft) {
                if (r.coach_role && Number.isInteger(r.min_count)) {
                    await upsertStaffingRule({ programId: DEFAULT_PROGRAM_ID, squadId: r.squad_id, coachRole: r.coach_role, minCount: r.min_count, notes: r.notes });
                }
            }
            await onChanged();
            onClose();
        } catch (e) { setError(e.message || 'Could not save rules'); }
        finally { setBusy(false); }
    };

    const allRoles = listCoachRoles();
    return (
        <div role="dialog" aria-label="Staffing rules editor" onClick={onClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, fontFamily: F, padding: 16 }}>
            <div onClick={(e) => e.stopPropagation()}
                style={{ background: B.w, width: '100%', maxWidth: 460, borderRadius: 12, padding: 16, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: B.nvD }}>Staffing minimums</div>
                    <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', fontSize: 20, color: B.g400, cursor: 'pointer' }}>×</button>
                </div>
                <div style={{ fontSize: 11, color: B.g600, marginBottom: 12 }}>
                    Sets the minimum coaches required per role per session. Applies to every squad in the program.
                </div>
                {allRoles.map(r => {
                    const cur = draft.find(d => d.coach_role === r.id && d.squad_id === null)?.min_count ?? 0;
                    return (
                        <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: `1px solid ${B.g100}` }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: r.color }} />
                            <div style={{ flex: 1, fontSize: 12, fontWeight: 700, color: B.nvD }}>{r.label}</div>
                            <input type="number" min="0" max="10" value={cur}
                                onChange={(e) => setMin(r.id, e.target.value)}
                                style={{ width: 60, padding: '6px 10px', fontSize: 13, fontWeight: 700, fontFamily: F, border: `1px solid ${B.g200}`, borderRadius: 6, textAlign: 'center' }} />
                        </div>
                    );
                })}
                <button onClick={save} disabled={busy}
                    style={{ width: '100%', marginTop: 12, padding: '10px 16px', borderRadius: 8, border: 'none', background: `linear-gradient(135deg, ${B.bl}, ${B.pk})`, color: B.w, fontSize: 13, fontWeight: 800, fontFamily: F, cursor: 'pointer' }}>
                    {busy ? 'Saving…' : 'Save rules'}
                </button>
            </div>
        </div>
    );
};

// ─── Main component ──────────────────────────────────────────────────────
export default function CoachScheduler() {
    const [windowStart, setWindowStart] = useState(todayKey());
    const horizonEnd = useMemo(() => addDays(windowStart, HORIZON_DAYS - 1), [windowStart]);

    const [coaches, setCoaches] = useState([]);
    const [squads, setSquads] = useState([]);
    const [statusRows, setStatusRows] = useState([]);
    const [rules, setRules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);
    const [openRow, setOpenRow] = useState(null);
    const [showRules, setShowRules] = useState(false);
    const [view, setView] = useState(() => isDesktop() ? 'list' : 'list'); // list | grid

    const squadsById = useMemo(() => {
        const m = new Map();
        squads.forEach(s => m.set(s.id, s));
        return m;
    }, [squads]);

    const refresh = useCallback(async () => {
        setError(null);
        try {
            const [statusData, coachData, squadData, rulesData] = await Promise.all([
                loadStaffingStatus(windowStart, horizonEnd),
                loadActiveCoaches(),
                loadSquadsCached(),
                loadStaffingRules(),
            ]);
            setStatusRows(statusData);
            setCoaches(coachData);
            setSquads(squadData);
            setRules(rulesData);
        } catch (e) {
            setError(e.message || 'Failed to load schedule');
            // Surfaced in the UI banner; warn rather than error so dev-bypass
            // permission-denied (no real auth.uid()) doesn't trip e2e fatal checks.
            console.warn('CoachScheduler load failed:', e?.message || e);
        }
    }, [windowStart, horizonEnd]);

    useEffect(() => {
        setLoading(true);
        refresh().finally(() => setLoading(false));
    }, [refresh]);

    // Reload when current row in drawer changes (so chips update live)
    const refreshAndKeepDrawer = async () => {
        await refresh();
        // openRow points to old data — re-find by session_id after reload
        if (openRow) {
            const updated = (await loadStaffingStatus(windowStart, horizonEnd)).find(r => r.session_id === openRow.session_id);
            if (updated) setOpenRow(updated);
        }
    };

    // Aggregate gap counts in window for header banner
    const totals = useMemo(() => {
        let totalGaps = 0;
        const byRole = {};
        statusRows.forEach(r => {
            if (isPast(r.session_date)) return; // ignore past sessions
            totalGaps += r.total_gaps || 0;
            Object.entries(r.gaps || {}).forEach(([role, n]) => { byRole[role] = (byRole[role] || 0) + (n || 0); });
        });
        return { totalGaps, byRole };
    }, [statusRows]);

    const futureRows = useMemo(() => statusRows.filter(r => !isPast(r.session_date)), [statusRows]);
    const sessionsByDay = useMemo(() => {
        const m = new Map();
        statusRows.forEach(r => {
            if (!m.has(r.session_date)) m.set(r.session_date, []);
            m.get(r.session_date).push(r);
        });
        return m;
    }, [statusRows]);

    // Days for the calendar grid
    const allDays = useMemo(() => daysBetween(windowStart, horizonEnd), [windowStart, horizonEnd]);
    // Days that actually have at least one session, for the list view (skip empty days)
    const populatedDays = useMemo(() => allDays.filter(d => sessionsByDay.has(d)), [allDays, sessionsByDay]);

    // Grid view shows one week at a time. The visible week starts on the Monday
    // of whatever windowStart points to. Nav buttons in grid mode shift by ±7 days.
    const weekAnchor = useMemo(() => weekStart(windowStart), [windowStart]);
    const weekDays = useMemo(() => daysBetween(weekAnchor, addDays(weekAnchor, 6)), [weekAnchor]);

    // Nav handlers — different step + label depending on view
    const isGrid = view === 'grid';
    const navStep = isGrid ? 7 : 14;
    const navPrevLabel = isGrid ? '‹ Week' : '‹ 2 weeks';
    const navNextLabel = isGrid ? 'Week ›' : '2 weeks ›';

    // ─── Render ──────────────────────────────────────────────────────────
    return (
        <div data-testid="coach-scheduler" style={{ minHeight: '100vh', background: B.g50, fontFamily: F, paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}>
            {/* Header */}
            <div style={{ position: 'sticky', top: 0, zIndex: 50, background: B.w, borderBottom: `1px solid ${B.g200}`, padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 9, fontWeight: 800, color: B.g400, letterSpacing: 1.5 }}>COACH SCHEDULER</div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: B.nvD }}>
                            {isGrid
                                ? `Week of ${longLabel(weekAnchor)}`
                                : `${longLabel(windowStart)} → ${longLabel(horizonEnd)}`}
                        </div>
                    </div>
                    <button onClick={() => setShowRules(true)}
                        style={{ fontSize: 10, fontWeight: 700, color: B.bl, background: `${B.bl}10`, border: `1px solid ${B.bl}40`, borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontFamily: F }}>
                        Rules…
                    </button>
                </div>

                {/* Date nav — step size + labels swap based on view */}
                <div style={{ display: 'flex', gap: 6, marginTop: 8, alignItems: 'center' }}>
                    <button onClick={() => setWindowStart(addDays(windowStart, -navStep))}
                        style={navBtn}>{navPrevLabel}</button>
                    <button onClick={() => setWindowStart(todayKey())}
                        style={{ ...navBtn, background: B.bl, color: B.w, borderColor: B.bl }}>Today</button>
                    <button onClick={() => setWindowStart(addDays(windowStart, navStep))}
                        style={navBtn}>{navNextLabel}</button>
                    <div style={{ flex: 1 }} />
                    <button onClick={() => setView(view === 'list' ? 'grid' : 'list')}
                        style={navBtn} title="Toggle list / grid">
                        {view === 'list' ? '🗓 Grid' : '☰ List'}
                    </button>
                </div>

                {/* Gap counter banner */}
                <div style={{
                    marginTop: 10, padding: '8px 10px', borderRadius: 6,
                    background: totals.totalGaps > 0 ? `${B.red}10` : `${B.grn}10`,
                    border: `1px solid ${totals.totalGaps > 0 ? B.red + '40' : B.grn + '40'}`,
                    fontSize: 11, fontWeight: 700, color: totals.totalGaps > 0 ? B.red : B.grn, fontFamily: F,
                }}>
                    {totals.totalGaps > 0
                        ? `⚠ ${totals.totalGaps} unfilled coach slot${totals.totalGaps > 1 ? 's' : ''} in next ${HORIZON_DAYS} days · ${Object.entries(totals.byRole).filter(([, n]) => n > 0).map(([r, n]) => `${n} ${coachRoleLabel(r).toLowerCase()}${n > 1 ? 's' : ''}`).join(' · ')}`
                        : `✓ All ${futureRows.length} upcoming sessions are fully staffed.`
                    }
                </div>

                {error && (
                    <div style={{ marginTop: 8, padding: 8, borderRadius: 6, background: `${B.red}10`, border: `1px solid ${B.red}40`, color: B.red, fontSize: 11, fontFamily: F }}>
                        {error}
                    </div>
                )}
            </div>

            {/* Body */}
            {loading ? (
                <div style={{ padding: 40, textAlign: 'center', color: B.g400, fontSize: 12 }}>Loading schedule…</div>
            ) : statusRows.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: B.g400, fontSize: 12 }}>
                    No sessions in this date range. Use the date nav above to look further out.
                </div>
            ) : view === 'list' ? (
                <div style={{ padding: '12px 14px' }}>
                    {populatedDays.map(d => {
                        const rowsForDay = sessionsByDay.get(d) || [];
                        const dayGap = rowsForDay.reduce((s, r) => s + (isPast(r.session_date) ? 0 : (r.total_gaps || 0)), 0);
                        return (
                            <div key={d} style={{ marginBottom: 14 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, padding: '4px 0', borderBottom: `1px solid ${B.g200}` }}>
                                    <div style={{ fontSize: 11, fontWeight: 800, color: isToday(d) ? B.bl : B.nvD, fontFamily: F, letterSpacing: 0.5 }}>
                                        {dayName(d, true).toUpperCase()} · {shortLabel(d)}
                                    </div>
                                    {dayGap > 0 && <div style={{ fontSize: 9, fontWeight: 700, color: B.red, background: `${B.red}15`, padding: '2px 6px', borderRadius: 4 }}>{dayGap} short</div>}
                                </div>
                                {rowsForDay.map(r => <SessionCard key={r.session_id} row={r} squadsById={squadsById} onClick={setOpenRow} />)}
                            </div>
                        );
                    })}
                </div>
            ) : (
                <WeekGridView weekDays={weekDays} sessionsByDay={sessionsByDay} squadsById={squadsById} onPick={setOpenRow} />
            )}

            {/* Drawer */}
            {openRow && (
                <AssignDrawer
                    row={openRow}
                    coaches={coaches}
                    squadsById={squadsById}
                    onClose={() => setOpenRow(null)}
                    onChanged={refreshAndKeepDrawer}
                    busy={busy} setBusy={setBusy} setError={setError}
                />
            )}

            {/* Rules editor */}
            {showRules && (
                <StaffingRulesEditor
                    rules={rules}
                    onChanged={refresh}
                    busy={busy} setBusy={setBusy} setError={setError}
                    onClose={() => setShowRules(false)}
                />
            )}
        </div>
    );
}

// ─── Grid view: one calendar week (Mon–Sun) ──────────────────────────────
// Side-by-side 7-column grid on viewports ≥720px; falls back to a horizontally
// scrollable strip below that so each cell stays readable on a phone.
const WeekGridView = ({ weekDays, sessionsByDay, squadsById, onPick }) => {
    return (
        <div style={{ overflowX: 'auto', padding: 12 }}>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, minmax(120px, 1fr))',
                gap: 6,
                minWidth: 700,
            }}>
                {weekDays.map(d => {
                    const rows = sessionsByDay.get(d) || [];
                    const isWE = ['Sat', 'Sun'].includes(dayName(d));
                    return (
                        <div key={d} style={{
                            background: B.w, border: `1px solid ${B.g200}`, borderRadius: 8,
                            padding: 8, minHeight: 140,
                            opacity: isPast(d) ? 0.55 : 1,
                            borderTop: `3px solid ${isToday(d) ? B.bl : isWE ? B.pk : B.bl}`,
                            display: 'flex', flexDirection: 'column',
                        }}>
                            {/* Day header */}
                            <div style={{ textAlign: 'center', marginBottom: 8 }}>
                                <div style={{ fontSize: 10, fontWeight: 800, color: isToday(d) ? B.bl : B.nvD, letterSpacing: 0.5 }}>
                                    {dayName(d).toUpperCase()}
                                </div>
                                <div style={{ fontSize: 11, fontWeight: 600, color: B.g600, marginTop: 2 }}>
                                    {shortLabel(d).split(' ').slice(1).join(' ')}
                                </div>
                                {isToday(d) && (
                                    <div style={{ fontSize: 8, fontWeight: 800, color: B.bl, marginTop: 2, letterSpacing: 0.4 }}>·NOW</div>
                                )}
                            </div>

                            {/* Sessions for the day, or empty marker */}
                            {rows.length === 0 ? (
                                <div style={{ fontSize: 9, color: B.g400, fontStyle: 'italic', textAlign: 'center', marginTop: 'auto', marginBottom: 'auto' }}>—</div>
                            ) : rows.map(r => (
                                <div key={r.session_id} onClick={() => onPick(r)}
                                    style={{ background: B.g50, borderRadius: 6, padding: 6, marginBottom: 6, cursor: 'pointer', borderLeft: `3px solid ${r.total_gaps > 0 ? B.red : B.bl}` }}>
                                    <div style={{ fontSize: 10, fontWeight: 700, color: B.nvD }}>{timeRange(r.start_time, r.end_time)}</div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', marginTop: 4 }}>
                                        {(r.assigned || []).map(a => (
                                            <span key={a.assignment_id} title={`${a.coach_name} · ${coachRoleLabel(a.coach_role)}`}
                                                style={{ width: 8, height: 8, borderRadius: '50%', background: coachRoleColor(a.coach_role), marginRight: 3, marginBottom: 3, opacity: a.confirmed ? 1 : 0.55 }} />
                                        ))}
                                    </div>
                                    {r.total_gaps > 0 && (
                                        <div style={{ fontSize: 9, fontWeight: 700, color: B.red, marginTop: 3 }}>
                                            ⚠ −{r.total_gaps}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const navBtn = {
    fontSize: 11, fontWeight: 700, color: B.g600, background: B.w,
    border: `1px solid ${B.g200}`, borderRadius: 6, padding: '5px 10px',
    cursor: 'pointer', fontFamily: F,
};
