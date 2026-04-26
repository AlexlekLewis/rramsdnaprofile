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

        const sessionPromise = getSession();
        // 3s timeout (was 1.5s) — mobile 3G/4G networks often take 2+ seconds for getSession().
        // If this fires before the real session arrives, user briefly sees login screen.
        const timeoutPromise = new Promise(r => setTimeout(() => r(null), 3000));

        Promise.race([sessionPromise, timeoutPromise]).then(async (s) => {
            if (cancelled) return;
            if (s?.user) {
                setSession(s);
                const profile = await resolveProfile(s.user);
                if (profile) persistSubmitted(profile);
                if (!cancelled) setUserProfile(profile || buildFallbackProfile(s.user));
            }
            if (!cancelled) setAuthLoading(false);
        }).catch((e) => {
            console.error('Auth init error:', e);
            if (!cancelled) setAuthLoading(false);
        });

        const sub = onAuthStateChange(async (event, s) => {
            if (cancelled) return;
            setSession(s);

            if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && s?.user) {
                const fallback = buildFallbackProfile(s.user);
                if (!cancelled && fallback) setUserProfile(fallback);
                if (!cancelled) setAuthStep('login');

                const profile = await resolveProfile(s.user);
                if (profile) persistSubmitted(profile);
                if (!cancelled && profile) setUserProfile(profile);
                if (!cancelled) setAuthLoading(false);
            }

            if (event === 'SIGNED_OUT') {
                setUserProfile(null);
                setAuthStep('login');
            }
        });

        return () => { cancelled = true; sub.unsubscribe(); };
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
