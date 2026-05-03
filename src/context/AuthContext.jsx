import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { supabase, notifySlack } from "../supabaseClient";
import {
    signInWithUsername,
    signUpNewUser,
    signOut as authSignOut,
    getSession,
    onAuthStateChange,
    upsertUserProfile,
    loadUserProfile
} from "../auth/authHelpers";

const AuthContext = createContext();

// ── Dev bypass: add ?devRole=coach or ?devRole=player to URL on localhost ──
const DEV_MODE = import.meta.env.DEV && typeof window !== 'undefined' && window.location.hostname === 'localhost';
const DEV_ROLE_PARAM = DEV_MODE && new URLSearchParams(window.location.search).get('devRole');

// ── Join link detection (legacy support — role is now auto-detected from code) ──
const JOIN_PARAM = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('join')
    : null;
const VALID_JOIN_ROLES = ['player', 'coach'];
const INITIAL_JOIN_ROLE = VALID_JOIN_ROLES.includes(JOIN_PARAM) ? JOIN_PARAM : null;

const DEV_UUID = '00000000-0000-0000-0000-00000000de00';

function makeDevProfile(role) {
    return {
        id: DEV_UUID,
        email: `dev-${role}@rra.internal`,
        full_name: `Dev ${role.charAt(0).toUpperCase() + role.slice(1)}`,
        role: role === 'coach' ? 'super_admin' : 'player',
        submitted: role === 'player',   // player portal needs this
    };
}

export function AuthProvider({ children }) {
    const [session, setSession] = useState(DEV_ROLE_PARAM ? { user: { id: DEV_UUID } } : null);
    const [userProfile, setUserProfile] = useState(DEV_ROLE_PARAM ? makeDevProfile(DEV_ROLE_PARAM) : null);
    const [authLoading, setAuthLoading] = useState(DEV_ROLE_PARAM ? false : true);
    const [authStep, setAuthStep] = useState('login'); // 'login' | 'signing-in' | 'register' | 'registering'
    const [joinRole, setJoinRole] = useState(INITIAL_JOIN_ROLE);

    useEffect(() => {
        // Skip real auth when in dev bypass mode
        if (DEV_ROLE_PARAM) {
            console.log(`🛠 DEV AUTH BYPASS active — role: ${DEV_ROLE_PARAM}`);
            return;
        }

        let cancelled = false;

        const resolveProfile = async (user) => {
            const profilePromise = (async () => {
                try {
                    return await upsertUserProfile(user);
                } catch (e) {
                    console.warn('upsertUserProfile failed, trying load:', e.message);
                    try { return await loadUserProfile(user.id); } catch { return null; }
                }
            })();
            const timeout = new Promise(r => setTimeout(() => r(null), 5000));
            return Promise.race([profilePromise, timeout]);
        };

        const buildFallbackProfile = (user) => {
            const role = localStorage.getItem('rra_pending_role') || localStorage.getItem('rra_user_role');
            if (!role) return null;
            // CRITICAL: returning players must NOT be flashed back into onboarding
            // while the real profile is loading. We persist submitted=true on every
            // successful load (see persistSubmitted below), and replay it here.
            const submittedCached = localStorage.getItem('rra_user_submitted') === 'true';
            return {
                id: user.id,
                role,
                submitted: submittedCached,
                _fallback: true,            // marker so App can keep showing the loader if we have no submitted info
                _hasSubmittedHint: submittedCached || localStorage.getItem('rra_user_submitted') === 'false',
            };
        };

        // Persist the submitted flag locally so the fallback profile can include it
        // on the next sign-in (avoids routing returning players to Onboarding while
        // the real user_profiles row is still in flight on slow networks).
        const persistSubmitted = (profile) => {
            if (!profile) return;
            if (profile.submitted) localStorage.setItem('rra_user_submitted', 'true');
            else if (profile.submitted === false) localStorage.removeItem('rra_user_submitted');
        };

        // Keep the rra_user_role localStorage cache (used by buildFallbackProfile)
        // in sync with the authoritative DB role. Without this, if an admin
        // changes a user's role server-side, the local cache stays stale across
        // sessions until next sign-in — meaning the fallback profile shown
        // during a slow auth bootstrap could render the OLD role's UI for a
        // few seconds. RLS still blocks the actual data, but the UI mismatch
        // is confusing.
        const persistRole = (profile) => {
            if (profile?.role) localStorage.setItem('rra_user_role', profile.role);
        };

        const sessionPromise = getSession();
        // Safety timeout: if Supabase getSession() never resolves (e.g. cold-cached
        // mobile network with no connectivity), drop the splash so the user can at
        // least try to sign in. Bumped from 3s → 6s — on real 3G/4G connections
        // getSession() routinely takes 4-5 seconds and a 3s budget caused a brief
        // login flash for returning users on slow networks. The actual happy-path
        // unblock comes from the INITIAL_SESSION handler below, which fires as
        // soon as Supabase has resolved auth state authoritatively.
        const timeoutPromise = new Promise(r => setTimeout(() => r(null), 6000));

        Promise.race([sessionPromise, timeoutPromise]).then(async (s) => {
            if (cancelled) return;
            if (s?.user) {
                setSession(s);
                const profile = await resolveProfile(s.user);
                if (profile) { persistSubmitted(profile); persistRole(profile); }
                if (!cancelled) setUserProfile(profile || buildFallbackProfile(s.user));
                if (!cancelled) setAuthLoading(false);
            }
            // Note: when s is null we deliberately do NOT setAuthLoading(false) here.
            // The INITIAL_SESSION event below will resolve it authoritatively.
            // The 6s timeout is a hard safety net for the rare case where
            // INITIAL_SESSION never fires (e.g. SDK initialisation hung).
        }).catch((e) => {
            console.error('Auth init error:', e);
            if (!cancelled) setAuthLoading(false);
        });

        // Hard safety net — in the unlikely event NEITHER getSession() NOR
        // onAuthStateChange fires within 6s, drop the splash and show the login
        // screen rather than hanging the user.
        const safetyTimer = setTimeout(() => {
            if (!cancelled) setAuthLoading(false);
        }, 6000);

        const sub = onAuthStateChange(async (event, s) => {
            if (cancelled) return;
            setSession(s);

            // Supabase v2 fires INITIAL_SESSION exactly once on subscribe with the
            // current session (or null). This is the authoritative "auth has
            // resolved" signal — drop the splash here regardless of the result.
            if (event === 'INITIAL_SESSION') {
                if (s?.user) {
                    const fallback = buildFallbackProfile(s.user);
                    if (!cancelled && fallback) setUserProfile(fallback);
                    const profile = await resolveProfile(s.user);
                    if (profile) { persistSubmitted(profile); persistRole(profile); }
                    if (!cancelled && profile) setUserProfile(profile);
                }
                if (!cancelled) setAuthLoading(false);
                return;
            }

            if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && s?.user) {
                const fallback = buildFallbackProfile(s.user);
                if (!cancelled && fallback) setUserProfile(fallback);
                if (!cancelled) setAuthStep('login');

                const profile = await resolveProfile(s.user);
                if (profile) { persistSubmitted(profile); persistRole(profile); }
                if (!cancelled && profile) setUserProfile(profile);
                if (!cancelled) setAuthLoading(false);
            }

            if (event === 'SIGNED_OUT') {
                setUserProfile(null);
                setAuthStep('login');
            }
        });

        return () => { cancelled = true; clearTimeout(safetyTimer); sub.unsubscribe(); };
    }, []);

    const signIn = async (username, password) => {
        setAuthStep('signing-in');
        try {
            return await signInWithUsername(username, password);
        } catch (e) {
            setAuthStep('login');
            throw e;
        }
    };

    const signUp = async (username, password, fullName, role, code) => {
        setAuthStep('registering');
        try {
            const result = await signUpNewUser(username, password, fullName, role, code);
            notifySlack('signup', { name: fullName, username, role });
            // Clear ?join= param from URL without page reload
            if (typeof window !== 'undefined') {
                const url = new URL(window.location);
                url.searchParams.delete('join');
                window.history.replaceState({}, '', url);
            }
            setJoinRole(null);
            return result;
        } catch (e) {
            setAuthStep('register');
            throw e;
        }
    };

    const signOut = async () => {
        try {
            ['rra_pStep', 'rra_selP', 'rra_cView', 'rra_cPage'].forEach(k => sessionStorage.removeItem(k));
            ['rra_pStep', 'rra_pd', 'rra_obGuide', 'rra_user_role', 'rra_pending_role', 'rra_user_submitted'].forEach(k => localStorage.removeItem(k));
            await authSignOut();
        } catch (e) {
            console.error('Sign-out error:', e);
        }
    };

    // Re-fetch the user_profiles row from the DB and update local state.
    // Call this after operations that flip submitted=true (e.g. profile submit) so
    // the App routing picks up the new state without a full page reload.
    const refreshUserProfile = async () => {
        const uid = session?.user?.id;
        if (!uid) return null;
        try {
            const fresh = await loadUserProfile(uid);
            if (fresh) {
                setUserProfile(fresh);
                if (fresh.submitted) localStorage.setItem('rra_user_submitted', 'true');
                if (fresh.role) localStorage.setItem('rra_user_role', fresh.role);
            }
            return fresh;
        } catch (e) {
            console.warn('refreshUserProfile failed:', e?.message);
            return null;
        }
    };

    // Derive portal from role (default to role if valid, else null)
    const portal = userProfile?.role || null;

    // Admin access determined solely by DB role in user_profiles
    const isAdmin =
        userProfile?.role === 'admin' ||
        userProfile?.role === 'super_admin';

    const value = {
        session,
        userProfile,
        authLoading,
        authStep,
        setAuthStep,
        portal,
        isAdmin,
        signIn,
        signUp,
        signOut,
        refreshUserProfile,
        joinRole,
        setJoinRole,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
