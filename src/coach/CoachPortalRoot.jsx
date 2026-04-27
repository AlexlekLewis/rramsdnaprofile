// ═══ COACH PORTAL ROOT — Switcher between legacy and Multiple Choice flows ═══
// Wraps the existing CoachAssessment without modifying it.
// Adds a feature-flagged Multiple Choice mode that does NOT touch the live save path.
import React, { useState, useEffect, Suspense } from "react";
import CoachAssessment from "./CoachAssessment";
import { useAuth } from "../context/AuthContext";
import { B, F } from "../data/theme";
import { loadPlayersFromDB } from "../db/playerDb";

const MultipleChoiceAssessmentLazy = React.lazy(() => import("./MultipleChoiceAssessment"));

const MC_ENABLED =
    import.meta.env.VITE_ENABLE_MC_ASSESSMENT === 'true' ||
    import.meta.env.VITE_ENABLE_MC_ASSESSMENT === '1';

// Renders the legacy coach view by default; coaches can switch into the new
// Multiple Choice flow via a small button. The legacy flow is never replaced or hidden.
export default function CoachPortalRoot() {
    const { session } = useAuth();
    const [mcView, setMcView] = useState(null); // null | 'list' | 'assess'
    const [selectedPlayer, setSelectedPlayer] = useState(null);
    const [allPlayers, setAllPlayers] = useState([]);
    const [playersLoading, setPlayersLoading] = useState(false);

    useEffect(() => {
        // Lazy-load player list only when entering MC list view to keep legacy flow untouched.
        if (mcView !== 'list' && mcView !== 'assess') return;
        if (allPlayers.length > 0) return;
        let cancelled = false;
        setPlayersLoading(true);
        (async () => {
            try {
                const list = await loadPlayersFromDB();
                if (!cancelled) setAllPlayers(list || []);
            } catch (e) {
                console.error('CoachPortalRoot: loadPlayersFromDB failed:', e?.message);
            } finally {
                if (!cancelled) setPlayersLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [mcView, allPlayers.length]);

    // Feature flag off — render legacy only, no entry point at all.
    if (!MC_ENABLED) return <CoachAssessment />;

    // MC list view: pick a player to assess
    if (mcView === 'list') {
        return (
            <Suspense fallback={<LoadingShell />}>
                {playersLoading ? <LoadingShell /> : (
                    <MCListWithEntry
                        allPlayers={allPlayers}
                        onPickPlayer={(p) => { setSelectedPlayer(p); setMcView('assess'); }}
                        onBackToLegacy={() => setMcView(null)}
                    />
                )}
            </Suspense>
        );
    }

    // MC assess view: rate items for one player
    if (mcView === 'assess' && selectedPlayer) {
        const allocatedIndex = allPlayers.findIndex(p => p.id === selectedPlayer.id);
        const handleNextPlayer = (dir) => {
            if (!allPlayers.length) return;
            let next = dir === 'next' ? allocatedIndex + 1 : allocatedIndex - 1;
            if (next < 0) next = allPlayers.length - 1;
            if (next >= allPlayers.length) next = 0;
            setSelectedPlayer(allPlayers[next]);
        };
        return (
            <Suspense fallback={<LoadingShell />}>
                <MultipleChoiceAssessmentLazy
                    player={selectedPlayer}
                    coachId={session?.user?.id}
                    allocatedPlayers={allPlayers}
                    onBack={() => { setSelectedPlayer(null); setMcView('list'); }}
                    onNext={handleNextPlayer}
                />
            </Suspense>
        );
    }

    // Default view: legacy CoachAssessment with a small floating button to enter MC mode
    return (
        <>
            <CoachAssessment />
            <button
                onClick={() => setMcView('list')}
                data-testid="mc-entry-button"
                style={{
                    position: 'fixed',
                    bottom: 'calc(72px + env(safe-area-inset-bottom))',
                    right: 16,
                    background: `linear-gradient(135deg,${B.bl},${B.pk})`,
                    color: B.w,
                    border: 'none',
                    borderRadius: 22,
                    padding: '10px 16px',
                    fontSize: 11,
                    fontWeight: 800,
                    fontFamily: F,
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(0, 29, 72, 0.25)',
                    zIndex: 200,
                    letterSpacing: 0.4,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                }}
            >
                <span style={{ fontSize: 14 }}>📋</span>
                Multiple Choice
            </button>
        </>
    );
}

function LoadingShell() {
    return (
        <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: B.g50 }}>
            <div style={{ fontSize: 12, color: B.g600, fontFamily: F, fontWeight: 600 }}>Loading…</div>
        </div>
    );
}

// Wraps the MC list with a back-to-legacy button at the top
function MCListWithEntry({ allPlayers, onPickPlayer, onBackToLegacy }) {
    const Inner = React.lazy(() => import("./MultipleChoiceAssessment").then(m => ({ default: m.MultipleChoiceCoachList })));
    return (
        <div>
            <div style={{ background: B.nvD, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                    onClick={onBackToLegacy}
                    data-testid="mc-back-to-legacy"
                    style={{
                        background: 'rgba(255,255,255,0.1)', color: B.w,
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: 6, padding: '6px 10px',
                        fontSize: 10, fontWeight: 700, cursor: 'pointer',
                        fontFamily: F,
                    }}
                >
                    ← Legacy form
                </button>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontFamily: F, fontWeight: 600 }}>
                    Multiple Choice Beta
                </div>
            </div>
            <Suspense fallback={<LoadingShell />}>
                <Inner allPlayers={allPlayers} onPickPlayer={onPickPlayer} />
            </Suspense>
        </div>
    );
}
