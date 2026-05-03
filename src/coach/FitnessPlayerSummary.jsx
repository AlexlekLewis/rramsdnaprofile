// ═══ COACH/ADMIN: PER-PLAYER FITNESS DRILL-IN ═══
// Renders inside the Admin Profiles expanded card. Shows completion stats,
// current streak, lapsed-badge indicator, last log date, at-risk flag,
// and recent session list.

import React, { useEffect, useMemo, useState } from 'react';
import { B, F, sCard } from '../data/theme';
import { supabase } from '../supabaseClient';
import { computeBadgeStates, BADGE_CATALOGUE } from '../data/fitnessBadges';

const AT_RISK_DAYS = 10;

const Pill = ({ children, color = B.bl, intense = false }) => (
    <span style={{
        display: 'inline-block',
        background: intense ? color : `${color}15`,
        color: intense ? B.w : color,
        borderRadius: 6, padding: '3px 8px',
        fontSize: 9, fontWeight: 800, letterSpacing: 0.4,
        fontFamily: F, textTransform: 'uppercase',
    }}>{children}</span>
);

const StatBlock = ({ value, label, color = B.nvD }) => (
    <div style={{
        flex: 1, padding: '8px 6px', textAlign: 'center',
        background: B.g50, borderRadius: 8,
    }}>
        <div style={{ fontSize: 18, fontWeight: 800, color, fontFamily: F, lineHeight: 1.1 }}>{value}</div>
        <div style={{ fontSize: 8, fontWeight: 700, color: B.g400, fontFamily: F, letterSpacing: 0.4, textTransform: 'uppercase', marginTop: 2 }}>{label}</div>
    </div>
);

function fmtDate(d) {
    if (!d) return '—';
    const dt = new Date(d);
    return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function computeStreak(logs, sessionsPerWeek = 2) {
    // Current consecutive run of weeks (most recent backwards) where both
    // sessions of that week were logged.
    const byWeek = {};
    (logs || []).forEach(l => {
        if (!byWeek[l.week_number]) byWeek[l.week_number] = new Set();
        byWeek[l.week_number].add(l.day_number);
    });
    const weeks = Object.keys(byWeek).map(n => parseInt(n, 10)).sort((a, b) => b - a);
    let streak = 0;
    let expected = weeks[0];
    for (const w of weeks) {
        if (w !== expected) break;
        if (byWeek[w].size < sessionsPerWeek) break;
        streak++;
        expected = w - 1;
    }
    return streak;
}

export default function FitnessPlayerSummary({ playerId }) {
    const [enrolment, setEnrolment] = useState(null);
    const [program, setProgram] = useState(null);
    const [logs, setLogs] = useState([]);
    const [awarded, setAwarded] = useState([]);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState(null);

    useEffect(() => {
        if (!playerId) return;
        let cancelled = false;
        (async () => {
            setLoading(true);
            setErr(null);
            try {
                const { data: enrolRow, error: e1 } = await supabase
                    .from('fitness_program_enrolment')
                    .select('*, program:program_id(*)')
                    .eq('player_id', playerId)
                    .eq('status', 'active')
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();
                if (e1) throw new Error(e1.message);
                if (cancelled) return;
                if (!enrolRow) {
                    setEnrolment(null);
                    setProgram(null);
                    setLogs([]);
                    setAwarded([]);
                    setLoading(false);
                    return;
                }
                setEnrolment(enrolRow);
                setProgram(enrolRow.program || null);

                const [logsResp, awardsResp] = await Promise.all([
                    supabase
                        .from('fitness_session_logs')
                        .select('*')
                        .eq('enrolment_id', enrolRow.id)
                        .order('completed_at', { ascending: false }),
                    supabase
                        .from('fitness_badges_awarded')
                        .select('*')
                        .eq('enrolment_id', enrolRow.id),
                ]);
                if (cancelled) return;
                if (logsResp.error) throw new Error(logsResp.error.message);
                setLogs(logsResp.data || []);
                setAwarded(awardsResp.data || []);
            } catch (e) {
                if (!cancelled) setErr(e.message || 'Failed to load fitness summary');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [playerId]);

    const stats = useMemo(() => {
        if (!program) return null;
        const sessionsPerWeek = program.sessions_per_week || 2;
        const totalWeeks = program.total_weeks || 10;
        const totalSessions = totalWeeks * sessionsPerWeek;
        const sessionsLogged = logs.length;
        const byWeek = {};
        logs.forEach(l => {
            if (!byWeek[l.week_number]) byWeek[l.week_number] = new Set();
            byWeek[l.week_number].add(l.day_number);
        });
        const weeksCompleted = Object.values(byWeek).filter(d => d.size >= sessionsPerWeek).length;
        const onTimeCount = logs.filter(l => l.logged_on_time).length;
        const onTimeRate = sessionsLogged === 0 ? null : Math.round((onTimeCount / sessionsLogged) * 100);
        const streak = computeStreak(logs, sessionsPerWeek);
        const lastLog = logs[0] ? new Date(logs[0].completed_at) : null;
        const daysSinceLast = lastLog ? Math.floor((Date.now() - lastLog.getTime()) / 86400000) : null;
        const atRisk = sessionsLogged === 0 || (daysSinceLast !== null && daysSinceLast >= AT_RISK_DAYS);
        return {
            sessionsLogged, totalSessions, weeksCompleted, totalWeeks,
            onTimeRate, streak, lastLog, daysSinceLast, atRisk,
        };
    }, [program, logs]);

    const badgeStates = useMemo(
        () => computeBadgeStates({ logs, program: program || {}, awardedRows: awarded }),
        [logs, program, awarded]
    );

    const earnedActive = badgeStates.filter(b => b.status === 'active');
    const lapsed = badgeStates.filter(b => b.status === 'lapsed');

    if (!playerId) return null;
    if (loading) {
        return (
            <div style={{ padding: '12px 0', fontSize: 11, color: B.g400, fontFamily: F, textAlign: 'center' }}>
                Loading fitness…
            </div>
        );
    }
    if (err) {
        return (
            <div style={{ padding: '12px 0', fontSize: 11, color: B.red, fontFamily: F }}>
                Couldn't load fitness summary: {err}
            </div>
        );
    }
    if (!enrolment) {
        return (
            <div style={{ padding: '12px 0', fontSize: 11, color: B.g400, fontFamily: F }}>
                Not enrolled in a fitness program.
            </div>
        );
    }

    return (
        <div style={{ padding: '4px 0' }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: B.bl, fontFamily: F, marginTop: 10, marginBottom: 8, letterSpacing: 0.5 }}>FITNESS</div>

            {/* Headline strip */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                marginBottom: 8, padding: '8px 12px',
                background: stats?.atRisk ? '#FEF2F2' : (stats?.streak > 0 ? '#ECFDF5' : B.g50),
                border: `1px solid ${stats?.atRisk ? B.red : (stats?.streak > 0 ? B.grn : B.g200)}`,
                borderRadius: 8,
            }}>
                <div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: B.nvD, fontFamily: F }}>
                        {program?.name || 'Fitness program'}
                    </div>
                    <div style={{ fontSize: 10, color: B.g600, fontFamily: F, marginTop: 2 }}>
                        Started {fmtDate(enrolment.start_date)} · Last log {fmtDate(stats?.lastLog)}
                        {stats?.daysSinceLast !== null && stats?.daysSinceLast > 0 ? ` (${stats.daysSinceLast}d ago)` : ''}
                    </div>
                </div>
                {stats?.atRisk
                    ? <Pill color={B.red} intense>At risk</Pill>
                    : stats?.streak > 0
                        ? <Pill color={B.grn} intense>{stats.streak}-week streak</Pill>
                        : <Pill color={B.bl}>Active</Pill>}
            </div>

            {/* 4-stat row */}
            {stats && (
                <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                    <StatBlock value={`${stats.sessionsLogged}/${stats.totalSessions}`} label="Sessions" color={B.bl} />
                    <StatBlock value={`${stats.weeksCompleted}/${stats.totalWeeks}`} label="Weeks done" color={B.prp} />
                    <StatBlock value={stats.streak} label="Streak" color={stats.streak > 0 ? B.grn : B.g400} />
                    <StatBlock value={stats.onTimeRate == null ? '—' : `${stats.onTimeRate}%`} label="On time" color={B.nvD} />
                </div>
            )}

            {/* Badge summary */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
                {earnedActive.length === 0 && lapsed.length === 0 && (
                    <span style={{ fontSize: 10, color: B.g400, fontFamily: F, fontStyle: 'italic' }}>No badges yet.</span>
                )}
                {earnedActive.map(b => (
                    <span key={b.key} title={`${b.name}${b.repeatable && b.count > 1 ? ` ×${b.count}` : ''}`} style={{
                        fontSize: 10, fontFamily: F,
                        padding: '3px 8px', borderRadius: 999,
                        background: `${B.grn}15`, color: B.grn, fontWeight: 700,
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                    }}>{b.emoji} {b.name}{b.repeatable && b.count > 1 ? ` ×${b.count}` : ''}</span>
                ))}
                {lapsed.map(b => (
                    <span key={b.key} title={b.recoverHint || `${b.name} (lapsed)`} style={{
                        fontSize: 10, fontFamily: F,
                        padding: '3px 8px', borderRadius: 999,
                        background: `${B.amb}15`, color: '#92400E', fontWeight: 700,
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                    }}>{b.emoji} {b.name} · lapsed</span>
                ))}
            </div>

            {/* Recent log list */}
            {logs.length > 0 && (
                <div>
                    <div style={{ fontSize: 9, fontWeight: 800, color: B.g400, fontFamily: F, marginBottom: 4, letterSpacing: 0.4 }}>RECENT</div>
                    {logs.slice(0, 5).map(l => {
                        const setsCount = (l.exercise_logs || []).reduce((acc, el) => acc + (el.sets || []).filter(s => s.completed).length, 0);
                        const isCoachLogged = l.logged_by_role !== 'player';
                        return (
                            <div key={l.id} style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                fontSize: 11, color: B.g600, fontFamily: F,
                                padding: '5px 0', borderBottom: `1px solid ${B.g100}`,
                            }}>
                                <div>
                                    <span style={{ fontWeight: 700, color: B.nvD }}>W{l.week_number} · D{l.day_number}</span>
                                    <span style={{ marginLeft: 8 }}>{setsCount} sets</span>
                                    {l.catch_up_for_week != null && <span style={{ marginLeft: 8, color: B.amb, fontWeight: 700 }}>catch-up</span>}
                                    {isCoachLogged && <span style={{ marginLeft: 8, color: B.bl, fontWeight: 700 }}>coach-logged</span>}
                                </div>
                                <div style={{ fontSize: 10, color: B.g400 }}>{fmtDate(l.completed_at)}</div>
                            </div>
                        );
                    })}
                    {logs.length > 5 && (
                        <div style={{ fontSize: 10, color: B.g400, fontFamily: F, marginTop: 4, fontStyle: 'italic' }}>
                            + {logs.length - 5} earlier session{logs.length - 5 === 1 ? '' : 's'}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
