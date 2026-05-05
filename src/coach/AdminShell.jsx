// ═══ ADMIN SHELL — CRM-style left-rail layout ═══
//
// Phase 1: empty shell with one sidebar item ("Dashboard") that embeds the
// existing CoachAssessment unchanged. Subsequent phases migrate each admin
// feature into its own sidebar item.
//
// Layout:
//   ≥1024px (isWide):  persistent 240px left rail + content
//   <1024px:           hamburger toggles an off-canvas drawer overlay
//
// Visibility:
//   Two gates — (1) role === 'super_admin' (enforced in App.jsx)
//               (2) VITE_ENABLE_ADMIN_SHELL kill-switch flag (default ON)
//   Coaches and players never reach this code path.
//
// Routing:
//   `useHashRoute()` reads the URL hash and triggers re-renders on hashchange.
//   Sidebar items navigate by setting the hash. Refresh + back/forward work.
//
// Error containment:
//   Nested `ErrorBoundary` so a broken sidebar item can't take down the whole
//   admin surface. The outer App-level boundary remains as a final backstop.

import React, { useEffect, useMemo, useState, Suspense } from 'react';
import { B, F } from '../data/theme';
import { ErrorBoundary } from '../shared/ErrorBoundary';
import { useHashRoute } from '../admin/useHashRoute';

// Lazy-load the legacy admin surface so the shell entry chunk stays small.
const CoachAssessment = React.lazy(() => import('./CoachAssessment'));

// Feature flags — must mirror the strings in CoachAssessment.jsx so the shell
// hides routes the underlying component would refuse to render.
const FITNESS_ADMIN_ENABLED = import.meta.env.VITE_ENABLE_FITNESS_ADMIN !== 'false';
const COACH_SCHEDULER_ENABLED = import.meta.env.VITE_ENABLE_COACH_SCHEDULER !== 'false';

// Icon set — kept simple and inline so the shell entry chunk stays small.
const Icon = {
    Dashboard: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>,
    Roster: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
    Profiles: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>,
    Squads: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>,
    Fitness: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6.5 6.5l11 11" /><path d="M21 21l-1-1" /><path d="M3 3l1 1" /><path d="M18 22l4-4" /><path d="M2 6l4-4" /><path d="M3 10l7-7" /><path d="M14 21l7-7" /></svg>,
    Schedule: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>,
    Accounts: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /><path d="M22 11h-6" /><path d="M19 8v6" /></svg>,
};

// Sidebar items: each maps a hash route to the corresponding cView value
// inside CoachAssessment. Phase 2 reuses CoachAssessment unchanged — the shell
// drives `forceCView` from the active route. Phases 4-5 will replace items
// with their own components for richer list-detail layouts.
const SIDEBAR_ITEMS = [
    { id: 'dashboard', label: 'Dashboard', hashPath: '/dashboard', cView: 'admin', icon: Icon.Dashboard },
    { id: 'roster', label: 'Roster', hashPath: '/roster', cView: 'list', icon: Icon.Roster },
    { id: 'profiles', label: 'Profiles', hashPath: '/profiles', cView: 'profiles', icon: Icon.Profiles },
    { id: 'squads', label: 'Squads', hashPath: '/squads', cView: 'squads', icon: Icon.Squads },
    ...(FITNESS_ADMIN_ENABLED ? [{ id: 'fitness', label: 'Fitness', hashPath: '/fitness', cView: 'fitness', icon: Icon.Fitness }] : []),
    ...(COACH_SCHEDULER_ENABLED ? [{ id: 'schedule', label: 'Schedule', hashPath: '/schedule', cView: 'schedule', icon: Icon.Schedule }] : []),
    { id: 'accounts', label: 'Accounts', hashPath: '/accounts', cView: 'accounts', icon: Icon.Accounts },
];

const DEFAULT_HASH = '/dashboard';

// Width of the persistent rail on wide viewports.
const RAIL_WIDTH = 240;
// matchMedia guarantee covering iPad landscape + most laptops/desktops.
const WIDE_QUERY = '(min-width: 1024px)';

// Listen to matchMedia and re-render on breakpoint crossings.
// (Synchronous `isWide()` reads in render do not reflow on resize.)
function useIsWide() {
    const [wide, setWide] = useState(() => {
        if (typeof window === 'undefined') return true;
        return window.matchMedia(WIDE_QUERY).matches;
    });

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const mql = window.matchMedia(WIDE_QUERY);
        const onChange = (e) => setWide(e.matches);
        // Modern browsers
        if (mql.addEventListener) {
            mql.addEventListener('change', onChange);
            return () => mql.removeEventListener('change', onChange);
        }
        // Safari fallback
        mql.addListener(onChange);
        return () => mql.removeListener(onChange);
    }, []);

    return wide;
}

function SidebarBrand() {
    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '20px 18px 18px',
            borderBottom: `1px solid ${B.g200}`,
        }}>
            <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: `linear-gradient(135deg, ${B.bl}, ${B.pk})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: B.w, fontSize: 14, fontWeight: 900, fontFamily: F,
            }}>R</div>
            <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: B.nvD, fontFamily: F, letterSpacing: 0.4 }}>
                    Admin
                </div>
                <div style={{ fontSize: 9, fontWeight: 600, color: B.g400, fontFamily: F, marginTop: 2 }}>
                    RRA Melbourne
                </div>
            </div>
        </div>
    );
}

function SidebarNav({ activePath, onNavigate }) {
    return (
        <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto' }} aria-label="Admin navigation">
            {SIDEBAR_ITEMS.map(item => {
                const active = activePath === item.hashPath;
                return (
                    <button
                        key={item.id}
                        onClick={() => onNavigate(item.hashPath)}
                        aria-current={active ? 'page' : undefined}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            width: '100%', padding: '10px 12px', marginBottom: 2,
                            borderRadius: 8, border: 'none',
                            background: active ? `${B.bl}10` : 'transparent',
                            color: active ? B.bl : B.g600,
                            fontSize: 12, fontWeight: active ? 800 : 600,
                            fontFamily: F, cursor: 'pointer',
                            textAlign: 'left',
                        }}
                    >
                        <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>{item.icon}</span>
                        {item.label}
                    </button>
                );
            })}
        </nav>
    );
}

function SidebarFooter({ userProfile, onSignOut }) {
    return (
        <div style={{ padding: '12px 14px', borderTop: `1px solid ${B.g200}`, fontFamily: F }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: B.nvD, marginBottom: 2 }}>
                {userProfile?.full_name || userProfile?.email || 'Signed in'}
            </div>
            <div style={{ fontSize: 9, color: B.g400, marginBottom: 8 }}>
                {userProfile?.role || ''}
            </div>
            {onSignOut && (
                <button
                    onClick={onSignOut}
                    style={{
                        width: '100%', padding: '8px 10px',
                        borderRadius: 6, border: `1px solid ${B.g200}`,
                        background: B.w, color: B.g600,
                        fontSize: 10, fontWeight: 700, fontFamily: F, cursor: 'pointer',
                    }}
                >
                    Sign out
                </button>
            )}
        </div>
    );
}

function HamburgerButton({ onClick, isOpen }) {
    return (
        <button
            onClick={onClick}
            aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={isOpen}
            style={{
                position: 'fixed', top: 12, left: 12, zIndex: 1001,
                width: 40, height: 40, borderRadius: 8,
                border: `1px solid ${B.g200}`, background: B.w,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            }}
        >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={B.nvD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {isOpen ? (
                    <>
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </>
                ) : (
                    <>
                        <line x1="3" y1="6" x2="21" y2="6" />
                        <line x1="3" y1="12" x2="21" y2="12" />
                        <line x1="3" y1="18" x2="21" y2="18" />
                    </>
                )}
            </svg>
        </button>
    );
}

export default function AdminShell({ userProfile, onSignOut }) {
    const wide = useIsWide();
    const { path, navigate } = useHashRoute();
    const [drawerOpen, setDrawerOpen] = useState(false);

    // If nothing in the URL hash, default to the dashboard route so the
    // KPI overview is the admin's landing page (instead of the roster default
    // baked into CoachAssessment's session state).
    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (!window.location.hash || window.location.hash === '#') {
            navigate(DEFAULT_HASH);
        }
    }, [navigate]);

    // Close the drawer when the viewport becomes wide.
    useEffect(() => {
        if (wide && drawerOpen) setDrawerOpen(false);
    }, [wide, drawerOpen]);

    // Close the drawer after navigation.
    const handleNavigate = (target) => {
        navigate(target);
        if (!wide) setDrawerOpen(false);
    };

    const activeItem = useMemo(
        () => SIDEBAR_ITEMS.find(i => i.hashPath === path) || SIDEBAR_ITEMS[0],
        [path]
    );

    // Render CoachAssessment ONCE and drive its internal cView via prop on
    // every route change. Mounting a new instance per item would lose roster
    // selection, scroll position, and any in-flight assessment state.
    const renderActive = () => <CoachAssessment inAdminShell forceCView={activeItem.cView} />;

    const sidebarPanel = (
        <div style={{
            width: RAIL_WIDTH,
            background: B.w,
            borderRight: `1px solid ${B.g200}`,
            display: 'flex', flexDirection: 'column',
            height: '100vh',
        }}>
            <SidebarBrand />
            <SidebarNav activePath={path} onNavigate={handleNavigate} />
            <SidebarFooter userProfile={userProfile} onSignOut={onSignOut} />
        </div>
    );

    return (
        <div style={{ minHeight: '100vh', background: B.g50, fontFamily: F }}>
            {/* Persistent rail on wide viewports */}
            {wide && (
                <aside style={{ position: 'fixed', top: 0, left: 0, zIndex: 50 }}>
                    {sidebarPanel}
                </aside>
            )}

            {/* Hamburger + drawer on narrow viewports */}
            {!wide && (
                <>
                    <HamburgerButton onClick={() => setDrawerOpen(o => !o)} isOpen={drawerOpen} />
                    {drawerOpen && (
                        <>
                            {/* Scrim */}
                            <div
                                onClick={() => setDrawerOpen(false)}
                                style={{
                                    position: 'fixed', inset: 0, zIndex: 999,
                                    background: 'rgba(0,0,0,0.4)',
                                }}
                            />
                            {/* Drawer */}
                            <aside style={{
                                position: 'fixed', top: 0, left: 0, zIndex: 1000,
                                boxShadow: '4px 0 16px rgba(0,0,0,0.15)',
                            }}>
                                {sidebarPanel}
                            </aside>
                        </>
                    )}
                </>
            )}

            {/* Main content area — offset by the rail width on wide viewports */}
            <main style={{
                marginLeft: wide ? RAIL_WIDTH : 0,
                paddingTop: wide ? 0 : 64, // clearance for the hamburger button on mobile
                minHeight: '100vh',
            }}>
                <ErrorBoundary>
                    <Suspense fallback={
                        <div style={{ padding: 32, textAlign: 'center', color: B.g400, fontFamily: F, fontSize: 12 }}>
                            Loading…
                        </div>
                    }>
                        {renderActive()}
                    </Suspense>
                </ErrorBoundary>
            </main>
        </div>
    );
}
