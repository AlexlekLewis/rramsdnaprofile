import { supabase } from '../supabaseClient';

/**
 * Sign in with username + password.
 * Looks up the username in program_members to get the internal email,
 * then authenticates via Supabase Auth.
 */
export async function signInWithUsername(username, password) {
    const cleanUsername = username.toLowerCase().trim();

    let member = null;

    // Try security-definer RPC first (preferred — restricts anon access)
    const { data: rpcData, error: rpcError } = await supabase
        .rpc('lookup_member_for_login', { p_username: cleanUsername });

    if (!rpcError && Array.isArray(rpcData) && rpcData.length > 0) {
        member = rpcData[0];
    } else {
        // RPC missing (PGRST202) or failed — fallback to direct table query
        if (rpcError) console.warn('RPC fallback:', rpcError.code, rpcError.message);
        const { data: directData, error: directError } = await supabase
            .from('program_members')
            .select('auth_user_id, role, active')
            .eq('username', cleanUsername)
            .limit(1)
            .maybeSingle();

        if (!directError && directData) {
            member = directData;
        }
    }

    if (!member) {
        throw new Error('Username not found. Please check your credentials.');
    }

    if (!member.active) {
        throw new Error('This account has been deactivated. Contact your program coordinator.');
    }

    // Store the role for post-login profile setup
    localStorage.setItem('rra_pending_role', member.role);

    // Sign in using the internal email
    const internalEmail = `${cleanUsername}@rradna.app`;
    const { data, error } = await supabase.auth.signInWithPassword({
        email: internalEmail,
        password,
    });

    if (error) {
        throw new Error('Invalid password. Please try again.');
    }

    return data;
}

/**
 * Register a new user (player or coach) via invite link.
 * Creates a Supabase Auth user, then registers them in program_members via RPC.
 */
export async function signUpNewUser(username, password, fullName, role, code) {
    const cleanUsername = username.toLowerCase().trim();

    // Validate username format
    if (!/^[a-z0-9._]{3,30}$/.test(cleanUsername)) {
        throw new Error('Username must be 3-30 characters: letters, numbers, dots, or underscores.');
    }

    // Validate role (defense in depth — RPC also validates)
    if (!['player', 'coach'].includes(role)) {
        throw new Error('Invalid role.');
    }

    // Validate password strength (must match frontend rules)
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
        throw new Error('Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character.');
    }

    // Validate registration code
    if (!code || !code.trim()) {
        throw new Error('Please enter your registration code.');
    }

    // Pre-flight: check code is valid before creating the auth user
    const { data: codeCheck, error: codeErr } = await supabase
        .rpc('validate_registration_code', { p_code: code.trim(), p_role: role });

    if (codeErr) {
        throw new Error('Unable to verify registration code. Please try again.');
    }
    if (codeCheck && !codeCheck.valid) {
        throw new Error(codeCheck.error || 'Invalid registration code.');
    }

    // Store role BEFORE signUp — signUp auto-signs-in which triggers onAuthStateChange → upsertUserProfile
    localStorage.setItem('rra_pending_role', role);

    // 1. Create Supabase Auth user
    const internalEmail = `${cleanUsername}@rradna.app`;
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: internalEmail,
        password,
        options: { data: { full_name: fullName } },
    });

    if (signUpError) {
        if (signUpError.message?.includes('already registered')) {
            throw new Error('This username is already taken.');
        }
        throw new Error(signUpError.message || 'Registration failed.');
    }

    if (!signUpData?.user) {
        throw new Error('Registration failed — no user returned.');
    }

    // 2. Register in program_members via security-definer RPC
    const { data: rpcResult, error: rpcError } = await supabase
        .rpc('register_new_user', { p_username: cleanUsername, p_role: role, p_code: code.trim() });

    if (rpcError) {
        throw new Error('Registration failed. Please try again.');
    }

    if (rpcResult && !rpcResult.success) {
        throw new Error(rpcResult.error || 'Registration failed.');
    }

    return signUpData;
}

/**
 * Sign out the current user.
 */
export async function signOut() {
    localStorage.removeItem('rra_pending_role');
    localStorage.removeItem('rra_user_role');
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
}

/**
 * Get the current session.
 */
export async function getSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return session;
}

/**
 * Subscribe to auth state changes.
 * Returns the unsubscribe function.
 */
export function onAuthStateChange(callback) {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
    return subscription;
}

/**
 * Upsert a user profile record after sign-in.
 * Uses the pending role from localStorage if available,
 * otherwise falls back to existing profile role.
 */
export async function upsertUserProfile(user) {
    let role = localStorage.getItem('rra_pending_role');

    if (!role) {
        const { data: existing } = await supabase
            .from('user_profiles')
            .select('role')
            .eq('id', user.id)
            .maybeSingle();
        role = existing?.role || 'player';
    }

    const { data, error } = await supabase
        .from('user_profiles')
        .upsert({
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
            avatar_url: user.user_metadata?.avatar_url || '',
            role,
            updated_at: new Date().toISOString(),
        }, { onConflict: 'id' })
        .select()
        .single();

    if (error) throw error;

    localStorage.setItem('rra_user_role', role);
    localStorage.removeItem('rra_pending_role');

    return data;
}

/**
 * Load the user profile from Supabase.
 */
export async function loadUserProfile(userId) {
    const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

    if (error) throw error;
    return data;
}
