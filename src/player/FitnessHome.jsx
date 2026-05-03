// ═══ PLAYER: FITNESS HOME ═══
// Two tabs: This Week (Day 1 + Day 2 cards) and Past Sessions (full grid for catch-up).
// Plus a Badges panel showing earned/active/lapsed/pending state with recovery hints.
//
// Mirrors Weekly Review's tab + catch-up pattern.

import React, { useEffect, useMemo, useState } from 'react';
import { B, F, sCard } from '../data/theme';
import {
    loadActiveEnrolment,
    loadOrCreateEnrolment,
    loadProgramBlocks,
    loadSessionLogsForEnrolment,
    loadAwardedBadges,
    computeCurrentWeek,
} from '../db/fitnessDb';
import {
    computeBadgeStates,
    computeHomeStatusCopy,
    BADGE_BY_KEY,
} from '../data/fitnessBadges';
import FitnessSession from './FitnessSession';

const TabButton = ({ active, onClick, children, badge }) => (
    <button
        onClick={onClick}
        style={{
            flex: 1, padding: '12px 0', background: 'none', border: 'none',
            color: active ? B.bl : B.g400,
            borderBottom: `3px solid ${active ? B.bl : 'transparent'}`,
            fontFamily: F, fontSize: 13, fontWeight: 800, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}
    >
        {children}
        {badge != null && badge > 0 && (
            <span style={{
                background: B.amb, color: B.w, fontSize: 9, fontWeight: 800,
                padding: '2px 7px', borderRadius: 10, fontFamily: F, letterSpacing: 0.3,
            }}>{badge}</span>
        )}
    </button>
);

const sessionStatusFor = (logs, weekNumber, dayNumber) => {
    const log = logs.find(l => l.week_number === weekNumber && l.day_number === dayNumber);
    if (!log) return { kind: 'pending', log: null };
    const exLogs = Array.isArray(log.exercise_logs) ? log.exercise_logs : [];
    const totalSets = exLogs.reduce((acc, el) => acc + (el.sets || []).filter(s => s.completed).length, 0);
    return {
        kind: totalSets > 0 ? 'done' : 'pending',
        log,
        sets: totalSets,
        catchUp: log.catch_up_for_week != null,
    };
};

const StatusPill = ({ kind, catchUp }) => {
    if (kind === 'done') {
        return (
            <span style={{
                display: 'inline-block', background: catchUp ? `${B.amb}20` : `${B.grn}20`,
                color: catchUp ? '#92400E' : B.grn, fontSize: 9, fontWeight: 800,
                padding: '3px 8px', borderRadius: 6, fontFamily: F, letterSpacing: 0.4, textTransform: 'uppercase',
            }}>{catchUp ? 'Caught up' : 'Done'}</span>
        );
    }
    return (
        <span style={{
            display: 'inline-block', background: B.g100, color: B.g600,
            fontSize: 9, fontWeight: 800, padding: '3px 8px', borderRadius: 6,
            fontFamily: F, letterSpacing: 0.4, textTransform: 'uppercase',
        }}>Not started</span>
    );
};

const SessionCard = ({ block, weekNumber, status, onOpen, isCatchUp }) => (
    <button
        onClick={onOpen}
        style={{
            ...sCard, padding: 16, marginBottom: 10, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            width: '100%', textAlign: 'left', fontFamily: F, gap: 12,
            border: status.kind === 'done' ? `1px solid ${B.grn}40` : `1px solid ${B.g200}`,
        }}
    >
        <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: B.bl, fontFamily: F, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                Week {weekNumber} · Day {block.day_number}
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: B.nvD, fontFamily: F, marginTop: 2 }}>{block.day_label}</div>
            <div style={{ fontSize: 11, color: B.g600, fontFamily: F, marginTop: 4 }}>
                {(block.exercises?.length || 0)} exercises · {block.duration_minutes_target} min
                {status.kind === 'done' && status.sets > 0 && ` · ${status.sets} sets logged`}
            </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
            <StatusPill kind={status.kind} catchUp={status.catchUp} />
            {isCatchUp && status.kind === 'pending' && <span style={{ fontSize: 9, color: B.amb, fontWeight: 700, fontFamily: F }}>catch-up</span>}
            <div style={{ fontSize: 18, color: B.bl }}>›</div>
        </div>
    </button>
);

const BadgeCard = ({ state }) => {
    const isActive = state.status === 'active';
    const isLapsed = state.status === 'lapsed';
    const isPending = state.status === 'pending';
    const bg = isActive ? B.w : isLapsed ? '#FFF8F1' : B.g50;
    const border = isActive ? B.grn : isLapsed ? B.amb : B.g200;
    const opacity = isPending ? 0.55 : 1;
    return (
        <div style={{
            ...sCard, padding: 14, opacity, marginBottom: 10,
            border: `1px solid ${border}`, background: bg,
        }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div style={{
                    fontSize: 28, lineHeight: 1, flexShrink: 0,
                    filter: isPending ? 'grayscale(0.8)' : 'none',
                }}>{state.emoji}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: B.nvD, fontFamily: F }}>{state.name}</div>
                        {isActive && <span style={{ fontSize: 8, fontWeight: 800, color: B.grn, background: `${B.grn}15`, padding: '2px 6px', borderRadius: 4, letterSpacing: 0.4, textTransform: 'uppercase' }}>Earned</span>}
                        {isLapsed && <span style={{ fontSize: 8, fontWeight: 800, color: B.amb, background: `${B.amb}15`, padding: '2px 6px', borderRadius: 4, letterSpacing: 0.4, textTransform: 'uppercase' }}>Lapsed</span>}
                        {state.repeatable && state.count > 0 && (
                            <span style={{ fontSize: 8, fontWeight: 800, color: B.bl, background: `${B.bl}15`, padding: '2px 6px', borderRadius: 4, letterSpacing: 0.4 }}>×{state.count}</span>
                        )}
                    </div>
                    <div style={{ fontSize: 11, color: B.g600, fontFamily: F, lineHeight: 1.4 }}>
                        {isPending ? state.howToEarn : state.flavour}
                    </div>
                    {state.recoverHint && (
                        <div style={{ fontSize: 10, color: B.amb, fontFamily: F, marginTop: 4, fontWeight: 700 }}>
                            {state.recoverHint}
                        </div>
                    )}
                    {state.total != null && state.progress != null && state.total > 1 && state.status !== 'active' && !state.repeatable && (
                        <div style={{ marginTop: 8 }}>
                            <div style={{ height: 4, background: B.g100, borderRadius: 2, overflow: 'hidden' }}>
                                <div style={{
                                    width: `${Math.min(100, Math.round((state.progress / state.total) * 100))}%`,
                                    height: '100%', background: isLapsed ? B.amb : B.bl,
                                }} />
                            </div>
                            <div style={{ fontSize: 9, color: B.g400, fontFamily: F, marginTop: 3, fontWeight: 700 }}>
                                {state.progress} / {state.total}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default function FitnessHome({ session, userProfile, playerId }) {
    const authUserId = session?.user?.id;
    const [enrolment, setEnrolment] = useState(null);
    const [program, setProgram] = useState(null);
    const [blocks, setBlocks] = useState([]);
    const [logs, setLogs] = useState([]);
    const [awarded, setAwarded] = useState([]);
    const [tab, setTab] = useState('this'); // 'this' | 'past' | 'badges'
    const [openSession, setOpenSession] = useState(null); // { block, weekNumber }
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [notEnrolled, setNotEnrolled] = useState(false);

    const refresh = async () => {
        if (!authUserId || !playerId) return;
        setLoading(true);
        setError(null);
        try {
            // Try to get the active enrolment; create if missing.
            let en = await loadActiveEnrolment(authUserId);
            if (!en) {
                // Pull active program then attempt self-enrolment.
                const { data: progs } = await import('../supabaseClient').then(m => m.supabase
                    .from('fitness_programs').select('*').eq('is_active', true).limit(1).maybeSingle());
                if (progs) {
                    en = await loadOrCreateEnrolment({
                        authUserId, playerId, programId: progs.id,
                    });
                }
            }
            if (!en) { setNotEnrolled(true); setLoading(false); return; }
            setEnrolment(en);
            const prog = en.program || null;
            setProgram(prog);
            const [blockRows, logRows, awardRows] = await Promise.all([
                loadProgramBlocks(en.program_id),
                loadSessionLogsForEnrolment(en.id),
                loadAwardedBadges(en.id),
            ]);
            setBlocks(blockRows);
            setLogs(logRows);
            setAwarded(awardRows);
        } catch (e) {
            console.error('FitnessHome refresh error:', e);
            setError(e.message || 'Failed to load fitness program');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [authUserId, playerId]);

    const currentWeek = useMemo(() => {
        if (!enrolment || !program) return 1;
        return computeCurrentWeek(enrolment.start_date, program.total_weeks, new Date());
    }, [enrolment, program]);

    const totalWeeks = program?.total_weeks || 10;
    const sessionsPerWeek = program?.sessions_per_week || 2;
    const orderedBlocks = useMemo(() => [...blocks].sort((a, b) => a.day_number - b.day_number), [blocks]);

    const badgeStates = useMemo(
        () => computeBadgeStates({ logs, program: program || {}, awardedRows: awarded }),
        [logs, program, awarded]
    );

    const homeStatus = useMemo(
        () => computeHomeStatusCopy({ logs, program: program || {}, currentWeek }),
        [logs, program, currentWeek]
    );

    // Count of past weeks with at least one session NOT YET logged (for catch-up badge on tab)
    const catchUpCount = useMemo(() => {
        if (!enrolment) return 0;
        let n = 0;
        for (let w = 1; w < currentWeek; w++) {
            for (const block of orderedBlocks) {
                const status = sessionStatusFor(logs, w, block.day_number);
                if (status.kind === 'pending') n++;
            }
        }
        return n;
    }, [enrolment, currentWeek, orderedBlocks, logs]);

    if (!authUserId || !playerId) {
        return <div style={{ padding: 24, textAlign: 'center', color: B.g400, fontFamily: F, fontSize: 13 }}>Loading…</div>;
    }

    if (loading) {
        return <div style={{ padding: 24, textAlign: 'center', color: B.g400, fontFamily: F, fontSize: 13 }}>Loading your fitness program…</div>;
    }

    if (notEnrolled) {
        return (
            <div style={{ padding: 24, fontFamily: F, maxWidth: 600, margin: '0 auto' }}>
                <div style={{ ...sCard, padding: 24, textAlign: 'center' }}>
                    <div style={{ fontSize: 32, marginBottom: 12 }}>🏋️</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: B.nvD, marginBottom: 6 }}>Fitness program not yet active for you</div>
                    <div style={{ fontSize: 12, color: B.g600, lineHeight: 1.5 }}>
                        Your coach will enrol you shortly. Check back soon, or message your coach.
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ padding: 24, fontFamily: F, maxWidth: 600, margin: '0 auto' }}>
                <div style={{ ...sCard, padding: 18, background: '#FEF2F2', border: `1px solid ${B.red}` }}>
                    <div style={{ color: B.red, fontWeight: 700, fontSize: 13 }}>Couldn't load fitness program</div>
                    <div style={{ color: B.g600, fontSize: 11, marginTop: 6 }}>{error}</div>
                    <button onClick={refresh} style={{ marginTop: 10, background: B.bl, color: B.w, border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: F }}>Try again</button>
                </div>
            </div>
        );
    }

    if (openSession) {
        return (
            <FitnessSession
                enrolment={enrolment}
                block={openSession.block}
                weekNumber={openSession.weekNumber}
                activationBlock={program?.activation_block || []}
                currentWeek={currentWeek}
                authUserId={authUserId}
                playerId={playerId}
                onBack={() => setOpenSession(null)}
                onSaved={async () => {
                    await refresh();
                    setOpenSession(null);
                }}
            />
        );
    }

    return (
        <div style={{ padding: '12px 16px 80px', fontFamily: F, maxWidth: 720, margin: '0 auto' }}>
            <div style={{
                background: `linear-gradient(135deg, ${B.nvD} 0%, ${B.bl} 100%)`,
                color: B.w, borderRadius: 14, padding: 18, marginBottom: 16,
            }}>
                <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.2 }}>{homeStatus.headline}</div>
                <div style={{ fontSize: 12, marginTop: 6, opacity: 0.9 }}>{homeStatus.sub}</div>
                {program?.name && (
                    <div style={{ fontSize: 10, marginTop: 10, opacity: 0.7, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase' }}>{program.name}</div>
                )}
            </div>

            <div style={{ display: 'flex', borderBottom: `1px solid ${B.g200}`, marginBottom: 16 }}>
                <TabButton active={tab === 'this'} onClick={() => setTab('this')}>This Week</TabButton>
                <TabButton active={tab === 'past'} onClick={() => setTab('past')} badge={catchUpCount}>Past Sessions</TabButton>
                <TabButton active={tab === 'badges'} onClick={() => setTab('badges')}>Badges</TabButton>
            </div>

            {tab === 'this' && (
                <div>
                    <div style={{ fontSize: 11, color: B.g600, fontFamily: F, marginBottom: 12 }}>
                        {sessionsPerWeek} sessions to log this week. Tap a card to start.
                    </div>
                    {orderedBlocks.length === 0 && <div style={{ color: B.g400, padding: 24, textAlign: 'center' }}>No session templates configured yet.</div>}
                    {orderedBlocks.map(block => {
                        const status = sessionStatusFor(logs, currentWeek, block.day_number);
                        return (
                            <SessionCard
                                key={block.id}
                                block={block}
                                weekNumber={currentWeek}
                                status={status}
                                isCatchUp={false}
                                onOpen={() => setOpenSession({ block, weekNumber: currentWeek })}
                            />
                        );
                    })}
                </div>
            )}

            {tab === 'past' && (
                <div>
                    {catchUpCount > 0 && (
                        <div style={{
                            background: `${B.amb}10`, border: `1px solid ${B.amb}40`, borderRadius: 10,
                            padding: 12, marginBottom: 14, color: '#92400E', fontSize: 11, fontWeight: 700, fontFamily: F,
                        }}>
                            You have {catchUpCount} session{catchUpCount === 1 ? '' : 's'} to catch up on. Tap any to log it now.
                        </div>
                    )}
                    {Array.from({ length: Math.max(currentWeek - 1, 0) }, (_, i) => i + 1).reverse().map(weekNum => (
                        <div key={weekNum} style={{ marginBottom: 18 }}>
                            <div style={{ fontSize: 11, fontWeight: 800, color: B.g600, fontFamily: F, letterSpacing: 0.5, marginBottom: 8, textTransform: 'uppercase' }}>
                                Week {weekNum}
                            </div>
                            {orderedBlocks.map(block => {
                                const status = sessionStatusFor(logs, weekNum, block.day_number);
                                return (
                                    <SessionCard
                                        key={`${weekNum}-${block.id}`}
                                        block={block}
                                        weekNumber={weekNum}
                                        status={status}
                                        isCatchUp={status.kind === 'pending'}
                                        onOpen={() => setOpenSession({ block, weekNumber: weekNum })}
                                    />
                                );
                            })}
                        </div>
                    ))}
                    {currentWeek === 1 && <div style={{ color: B.g400, padding: 24, textAlign: 'center', fontSize: 12 }}>No past sessions yet — you're in week 1.</div>}
                </div>
            )}

            {tab === 'badges' && (
                <div>
                    <div style={{ fontSize: 11, color: B.g600, fontFamily: F, marginBottom: 12 }}>
                        Some badges lock in forever. Others lapse if you go quiet for a fortnight — but you can wake them back up by logging again.
                    </div>
                    {badgeStates.map(b => <BadgeCard key={b.key} state={b} />)}
                </div>
            )}
        </div>
    );
}
