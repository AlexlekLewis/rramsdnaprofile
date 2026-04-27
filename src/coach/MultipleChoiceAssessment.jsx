// ═══ MULTIPLE CHOICE ASSESSMENT ═══
// New structured assessment flow: 29 items × 5 statements, one tap per item, multi-rater.
// Complements (does NOT replace) the legacy CoachAssessment free-text + sliders form.
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { B, F, sCard, getDkWrap, isDesktop } from "../data/theme";
import {
    loadAssessmentItems,
    loadCoachItemRatings,
    saveItemRating,
    loadCoachAllocations,
    loadCoachCompletionSummary,
} from "../db/multiraterDb";
import { supabase } from "../supabaseClient";

const SECTIONS = [
    { key: 'batting', label: 'Batting', icon: '🏏', color: B.bl },
    { key: 'bowling', label: 'Bowling', icon: '🎯', color: B.pk },
    { key: 'wk',      label: 'Wicket-Keeping', icon: '🧤', color: B.prp },
];

const SESSION_OPTIONS = [
    { key: 'both',    label: 'General' },
    { key: 'weekday', label: 'Weekday (Skill)' },
    { key: 'weekend', label: 'Weekend (Game Sense)' },
];

// ── Sticky player banner (always visible) ──
function PlayerBanner({ player, completionCount, totalItems, onBack, sectionColor }) {
    const pct = totalItems > 0 ? Math.round((completionCount / totalItems) * 100) : 0;
    return (
        <div style={{
            position: 'sticky', top: 0, zIndex: 50,
            background: B.w, borderBottom: `2px solid ${sectionColor || B.bl}`,
            padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10,
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        }}>
            <button onClick={onBack} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: B.g600, padding: 4, display: 'flex', alignItems: 'center',
            }} aria-label="Back to allocation list">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: B.nvD, fontFamily: F, lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {player?.name || 'Player'}
                </div>
                <div style={{ fontSize: 10, color: B.g600, fontFamily: F, marginTop: 2 }}>
                    {completionCount} of {totalItems} rated · {pct}%
                </div>
            </div>
            <div style={{
                width: 40, height: 40, borderRadius: '50%',
                border: `3px solid ${pct === 100 ? B.grn : sectionColor || B.bl}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 800, color: pct === 100 ? B.grn : sectionColor || B.bl,
                fontFamily: F, flexShrink: 0,
            }}>
                {pct}%
            </div>
        </div>
    );
}

// ── A single item card (prompt + 5 tappable statements) ──
function ItemCard({ item, currentScore, onSelect, sectionColor, saveState, sessionType }) {
    const handleTap = (n) => {
        if (saveState === 'saving') return;
        onSelect(n, item.statements[n - 1]);
    };
    return (
        <div style={{ ...sCard, padding: '12px 14px', marginBottom: 10, border: currentScore ? `2px solid ${sectionColor}` : sCard.border }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, gap: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: B.nvD, fontFamily: F, lineHeight: 1.3, flex: 1 }}>
                    {item.prompt}
                </div>
                {saveState === 'saving' && <span style={{ fontSize: 9, fontWeight: 700, color: B.amb, fontFamily: F }}>saving…</span>}
                {saveState === 'saved' && <span style={{ fontSize: 9, fontWeight: 700, color: B.grn, fontFamily: F }}>✓ saved</span>}
                {saveState === 'error' && <span style={{ fontSize: 9, fontWeight: 700, color: B.red, fontFamily: F }}>retry</span>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {item.statements.map((s, i) => {
                    const n = i + 1;
                    const selected = currentScore === n;
                    return (
                        <button
                            key={n}
                            onClick={() => handleTap(n)}
                            data-testid={`mc-statement-${item.key}-${n}`}
                            style={{
                                display: 'flex', alignItems: 'flex-start', gap: 10,
                                padding: '12px 12px', minHeight: 60,
                                borderRadius: 10,
                                border: selected ? `2px solid ${sectionColor}` : `1.5px solid ${B.g200}`,
                                background: selected ? `${sectionColor}10` : B.w,
                                cursor: 'pointer', textAlign: 'left',
                                fontFamily: F, transition: 'all 0.15s',
                                width: '100%',
                            }}
                        >
                            <div style={{
                                flexShrink: 0, width: 28, height: 28, borderRadius: '50%',
                                border: `2px solid ${selected ? sectionColor : B.g200}`,
                                background: selected ? sectionColor : B.w,
                                color: selected ? B.w : B.g400,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 12, fontWeight: 800,
                            }}>
                                {n}
                            </div>
                            <div style={{
                                flex: 1, fontSize: 12, lineHeight: 1.4,
                                color: selected ? B.nvD : B.g600,
                                fontWeight: selected ? 700 : 500,
                            }}>
                                {item.statements[i]}
                            </div>
                        </button>
                    );
                })}
            </div>
            {currentScore > 0 && (
                <button
                    onClick={() => handleTap(currentScore)}
                    style={{
                        marginTop: 8, padding: '4px 10px', fontSize: 9, fontWeight: 700,
                        color: B.g400, background: 'transparent', border: `1px solid ${B.g200}`,
                        borderRadius: 4, cursor: 'pointer', fontFamily: F,
                    }}
                >
                    Clear
                </button>
            )}
        </div>
    );
}

// ── Per-player assessment screen ──
export default function MultipleChoiceAssessment({ player, onBack, onNext, allocatedPlayers, includeWK }) {
    const { session } = useAuth();
    // Always derive coachId from session — never trust a prop for the writer's identity.
    const effectiveCoachId = session?.user?.id;
    const [allItems, setAllItems] = useState([]);
    const [ratings, setRatings] = useState({}); // { item_key + '|' + session_type: { score, statement } }
    const [saveStates, setSaveStates] = useState({}); // { item_key: 'saving' | 'saved' | 'error' }
    const [activeSection, setActiveSection] = useState('batting');
    const [sessionType, setSessionType] = useState('both');
    const [loading, setLoading] = useState(true);
    const [showWK, setShowWK] = useState(!!includeWK);
    const saveTimeouts = useRef({});

    // Cleanup all save-state timers on unmount (prevents setState-on-unmounted warnings)
    useEffect(() => () => {
        Object.values(saveTimeouts.current).forEach(clearTimeout);
        saveTimeouts.current = {};
    }, []);

    // ── Load items + existing ratings on player change; reset transient UI state ──
    useEffect(() => {
        if (!player?.id || !effectiveCoachId) return;
        // Reset per-player UI state so the previous player's "saved"/"error" badges don't bleed over.
        Object.values(saveTimeouts.current).forEach(clearTimeout);
        saveTimeouts.current = {};
        setSaveStates({});
        let cancelled = false;
        setLoading(true);
        (async () => {
            const [items, existing] = await Promise.all([
                loadAssessmentItems(),
                loadCoachItemRatings({ playerId: player.id, coachId: effectiveCoachId }),
            ]);
            if (cancelled) return;
            setAllItems(items);
            const ratingMap = {};
            existing.forEach(r => {
                const k = `${r.item_key}|${r.session_type}`;
                ratingMap[k] = { score: r.score, statement: r.statement };
            });
            setRatings(ratingMap);
            setLoading(false);
        })();
        return () => { cancelled = true; };
    }, [player?.id, effectiveCoachId]);

    // ── Detect WK from player profile ──
    useEffect(() => {
        if (player && includeWK === undefined) {
            const looksLikeWK =
                /wicket|keeper|wk[-\s]?bat|^wk$/i.test(player.role || '') ||
                /\bwk\b|keeper/i.test(player.name || '');
            setShowWK(looksLikeWK);
        }
    }, [player, includeWK]);

    const sectionItems = useMemo(() => {
        const base = allItems.filter(i => i.section === activeSection);
        if (activeSection === 'wk') return showWK ? base : [];
        return base;
    }, [allItems, activeSection, showWK]);

    const completionForSection = useCallback((sectionKey) => {
        const items = allItems.filter(i => i.section === sectionKey);
        const total = items.length;
        const done = items.filter(i => ratings[`${i.key}|${sessionType}`]).length;
        return { done, total };
    }, [allItems, ratings, sessionType]);

    const totalItemsForView = useMemo(() => {
        return allItems.filter(i => i.section !== 'wk' || showWK).length;
    }, [allItems, showWK]);

    const totalCompleted = useMemo(() => {
        return Object.keys(ratings).filter(k => k.endsWith(`|${sessionType}`)).length;
    }, [ratings, sessionType]);

    // ── Handle a tap on a statement (or "clear") ──
    // Use functional state setters so two rapid taps don't race against a stale closure.
    const handleSelect = useCallback(async (item, score, statement) => {
        if (!player?.id || !effectiveCoachId) return;
        const k = `${item.key}|${sessionType}`;
        // Snapshot the current value via functional setter so rollback stays correct under rapid taps.
        let priorValue;
        setRatings(prev => { priorValue = prev[k]; return prev; });
        const existing = priorValue;

        // Clear (tap same score again) — delete the row
        if (existing && existing.score === score) {
            setRatings(prev => { const next = { ...prev }; delete next[k]; return next; });
            setSaveStates(s => ({ ...s, [item.key]: 'saving' }));
            const result = await deleteItemRating({
                playerId: player.id, coachId: effectiveCoachId, itemKey: item.key, sessionType,
            });
            if (result.ok) {
                setSaveStates(s => ({ ...s, [item.key]: 'saved' }));
            } else {
                setSaveStates(s => ({ ...s, [item.key]: 'error' }));
                setRatings(prev => existing ? { ...prev, [k]: existing } : prev);
            }
            return;
        }

        // Optimistic UI
        setRatings(prev => ({ ...prev, [k]: { score, statement } }));
        setSaveStates(s => ({ ...s, [item.key]: 'saving' }));

        const result = await saveItemRating({
            playerId: player.id,
            coachId: effectiveCoachId,
            itemKey: item.key,
            score,
            statement,
            sessionType,
        });

        if (result.ok) {
            setSaveStates(s => ({ ...s, [item.key]: 'saved' }));
            if (saveTimeouts.current[item.key]) clearTimeout(saveTimeouts.current[item.key]);
            saveTimeouts.current[item.key] = setTimeout(() => {
                setSaveStates(s => { const next = { ...s }; delete next[item.key]; return next; });
            }, 2000);
        } else {
            setSaveStates(s => ({ ...s, [item.key]: 'error' }));
            // Rollback optimistic update — functional setter so we restore based on current state.
            setRatings(prev => {
                const next = { ...prev };
                if (existing) next[k] = existing; else delete next[k];
                return next;
            });
        }
    }, [player?.id, effectiveCoachId, sessionType]);

    if (loading) {
        return (
            <div style={{ padding: 40, textAlign: 'center', color: B.g600, fontFamily: F, fontSize: 13 }}>
                Loading assessment items...
            </div>
        );
    }

    if (!player) {
        return (
            <div style={{ padding: 40, textAlign: 'center', color: B.g400, fontFamily: F, fontSize: 13 }}>
                No player selected.
            </div>
        );
    }

    const sectionColor = SECTIONS.find(s => s.key === activeSection)?.color || B.bl;

    return (
        <div style={{ minHeight: '100vh', background: B.g50, fontFamily: F, paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}>
            <PlayerBanner
                player={player}
                completionCount={totalCompleted}
                totalItems={totalItemsForView}
                onBack={onBack}
                sectionColor={sectionColor}
            />

            {/* Session selector */}
            <div style={{ background: B.w, padding: '8px 14px', borderBottom: `1px solid ${B.g200}`, display: 'flex', gap: 6, overflowX: 'auto' }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: B.g600, fontFamily: F, alignSelf: 'center', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: 0.5, marginRight: 4 }}>
                    Session:
                </div>
                {SESSION_OPTIONS.map(opt => (
                    <button
                        key={opt.key}
                        onClick={() => setSessionType(opt.key)}
                        data-testid={`mc-session-${opt.key}`}
                        style={{
                            padding: '6px 12px', borderRadius: 16,
                            border: sessionType === opt.key ? `2px solid ${B.nvD}` : `1.5px solid ${B.g200}`,
                            background: sessionType === opt.key ? B.nvD : B.w,
                            color: sessionType === opt.key ? B.w : B.g600,
                            fontSize: 10, fontWeight: 700, cursor: 'pointer',
                            whiteSpace: 'nowrap', fontFamily: F,
                        }}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>

            {/* Section tabs */}
            <div style={{ background: B.w, padding: '8px 14px', borderBottom: `1px solid ${B.g200}`, display: 'flex', gap: 8 }}>
                {SECTIONS.map(s => {
                    if (s.key === 'wk' && !showWK) return null;
                    const { done, total } = completionForSection(s.key);
                    const active = activeSection === s.key;
                    return (
                        <button
                            key={s.key}
                            onClick={() => setActiveSection(s.key)}
                            data-testid={`mc-section-${s.key}`}
                            style={{
                                flex: 1, padding: '8px 6px', borderRadius: 8,
                                border: active ? `2px solid ${s.color}` : `1.5px solid ${B.g200}`,
                                background: active ? `${s.color}10` : B.w,
                                cursor: 'pointer', fontFamily: F,
                                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                            }}
                        >
                            <div style={{ fontSize: 16 }}>{s.icon}</div>
                            <div style={{ fontSize: 10, fontWeight: 800, color: active ? s.color : B.g600 }}>{s.label}</div>
                            <div style={{ fontSize: 8, fontWeight: 700, color: done === total && total > 0 ? B.grn : B.g400 }}>
                                {done}/{total}
                            </div>
                        </button>
                    );
                })}
                {!showWK && (
                    <button
                        onClick={() => setShowWK(true)}
                        data-testid="mc-add-wk"
                        style={{
                            padding: '8px 10px', borderRadius: 8, border: `1.5px dashed ${B.g400}`,
                            background: B.w, color: B.g600, fontSize: 9, fontWeight: 700,
                            cursor: 'pointer', fontFamily: F,
                        }}
                    >
                        + WK items
                    </button>
                )}
            </div>

            {/* Items list */}
            <div style={{ padding: '12px 14px', ...getDkWrap() }}>
                {showWK && activeSection === 'wk' && (
                    <button
                        onClick={() => setShowWK(false)}
                        style={{
                            marginBottom: 10, fontSize: 9, color: B.g400, background: 'none',
                            border: 'none', cursor: 'pointer', fontFamily: F, textDecoration: 'underline',
                        }}
                    >
                        Hide WK section (player isn't a keeper)
                    </button>
                )}
                {sectionItems.length === 0 ? (
                    <div style={{ padding: 30, textAlign: 'center', color: B.g400, fontSize: 12, fontFamily: F }}>
                        No items in this section.
                    </div>
                ) : (
                    sectionItems.map(item => {
                        const k = `${item.key}|${sessionType}`;
                        const r = ratings[k];
                        return (
                            <ItemCard
                                key={item.key}
                                item={item}
                                currentScore={r?.score || 0}
                                onSelect={(score, statement) => handleSelect(item, score, statement)}
                                sectionColor={sectionColor}
                                saveState={saveStates[item.key]}
                                sessionType={sessionType}
                            />
                        );
                    })
                )}
            </div>

            {/* Bottom nav: previous / next player from allocated list */}
            {allocatedPlayers && allocatedPlayers.length > 1 && (
                <div className="rra-fixed-bottom" style={{
                    position: 'fixed', bottom: 0, left: 0, right: 0, background: B.w,
                    borderTop: `1px solid ${B.g200}`, padding: '10px 12px',
                    paddingBottom: 'calc(10px + env(safe-area-inset-bottom))',
                    display: 'flex', gap: 8, zIndex: 100,
                }}>
                    <button
                        onClick={() => onNext('prev')}
                        data-testid="mc-prev-player"
                        style={{
                            flex: 1, padding: '12px 14px', borderRadius: 8,
                            border: `1.5px solid ${B.g200}`, background: B.w,
                            fontSize: 11, fontWeight: 700, color: B.g600,
                            cursor: 'pointer', fontFamily: F,
                        }}
                    >
                        ← Previous player
                    </button>
                    <button
                        onClick={() => onNext('next')}
                        data-testid="mc-next-player"
                        style={{
                            flex: 1, padding: '12px 14px', borderRadius: 8,
                            border: 'none', background: `linear-gradient(135deg,${B.bl},${B.pk})`,
                            fontSize: 11, fontWeight: 700, color: B.w,
                            cursor: 'pointer', fontFamily: F,
                        }}
                    >
                        Next player →
                    </button>
                </div>
            )}
        </div>
    );
}

// ── Coach allocation list view (entry point for Multiple Choice flow) ──
export function MultipleChoiceCoachList({ onPickPlayer, allPlayers }) {
    const { session } = useAuth();
    const coachId = session?.user?.id;
    const [allocatedIds, setAllocatedIds] = useState([]);
    const [completionByPlayer, setCompletionByPlayer] = useState({});
    const [showAll, setShowAll] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!coachId) return;
        let cancelled = false;
        (async () => {
            setLoading(true);
            const [allocs, summary] = await Promise.all([
                loadCoachAllocations(coachId),
                loadCoachCompletionSummary(coachId),
            ]);
            if (cancelled) return;
            setAllocatedIds(allocs);
            setCompletionByPlayer(summary);
            setLoading(false);
        })();
        return () => { cancelled = true; };
    }, [coachId]);

    const allocatedPlayers = useMemo(() => {
        const set = new Set(allocatedIds);
        return (allPlayers || []).filter(p => set.has(p.id));
    }, [allPlayers, allocatedIds]);

    const visiblePlayers = useMemo(() => {
        const list = showAll ? (allPlayers || []) : allocatedPlayers;
        if (!searchTerm.trim()) return list;
        const q = searchTerm.toLowerCase();
        return list.filter(p => (p.name || '').toLowerCase().includes(q));
    }, [showAll, allocatedPlayers, allPlayers, searchTerm]);

    if (loading) {
        return (
            <div style={{ padding: 40, textAlign: 'center', color: B.g600, fontFamily: F, fontSize: 13 }}>
                Loading your allocated players…
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: B.g50, fontFamily: F, paddingBottom: 80 }}>
            <div style={{ background: B.w, padding: '14px 16px', borderBottom: `1px solid ${B.g200}` }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: B.nvD, fontFamily: F, marginBottom: 2 }}>
                    Multiple Choice Assessment
                </div>
                <div style={{ fontSize: 10, color: B.g600, fontFamily: F }}>
                    {showAll
                        ? `All players (${visiblePlayers.length})`
                        : `Your allocated players (${allocatedPlayers.length}). Other coaches can also rate any player.`}
                </div>
            </div>

            <div style={{ padding: '12px 14px', display: 'flex', gap: 8, alignItems: 'center', background: B.w, borderBottom: `1px solid ${B.g200}` }}>
                <input
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Search players…"
                    data-testid="mc-search"
                    style={{
                        flex: 1, padding: '8px 12px', borderRadius: 8,
                        border: `1.5px solid ${B.g200}`, fontSize: 12,
                        fontFamily: F, outline: 'none', color: B.g800,
                    }}
                />
                <button
                    onClick={() => setShowAll(s => !s)}
                    data-testid="mc-toggle-all"
                    style={{
                        padding: '8px 12px', borderRadius: 8,
                        border: `1.5px solid ${showAll ? B.pk : B.g200}`,
                        background: showAll ? `${B.pk}15` : B.w,
                        color: showAll ? B.pk : B.g600,
                        fontSize: 10, fontWeight: 700, cursor: 'pointer',
                        whiteSpace: 'nowrap', fontFamily: F,
                    }}
                >
                    {showAll ? '✓ All players' : 'Show all players'}
                </button>
            </div>

            <div style={{ padding: '12px 14px', ...getDkWrap() }}>
                {visiblePlayers.length === 0 ? (
                    <div style={{ padding: 40, textAlign: 'center', color: B.g400, fontSize: 12, fontFamily: F }}>
                        {searchTerm ? 'No players match your search.' : 'No players in this view.'}
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {visiblePlayers.map(p => {
                            const stats = completionByPlayer[p.id] || { count: 0 };
                            const done = stats.count;
                            return (
                                <button
                                    key={p.id}
                                    onClick={() => onPickPlayer(p)}
                                    data-testid={`mc-player-${p.id}`}
                                    style={{
                                        ...sCard,
                                        marginBottom: 0, padding: '12px 14px',
                                        textAlign: 'left', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', gap: 12,
                                        border: done > 0 ? `1.5px solid ${B.grn}40` : sCard.border,
                                        width: '100%',
                                    }}
                                >
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: 13, fontWeight: 700, color: B.nvD, fontFamily: F, lineHeight: 1.2 }}>
                                            {p.name}
                                        </div>
                                        <div style={{ fontSize: 9, color: B.g600, fontFamily: F, marginTop: 3 }}>
                                            {done > 0
                                                ? `${done} item${done !== 1 ? 's' : ''} rated by you`
                                                : 'Not yet started'}
                                        </div>
                                    </div>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={B.g400} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M9 6l6 6-6 6" />
                                    </svg>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
