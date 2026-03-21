import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
        'Missing Supabase environment variables. ' +
        'Create a .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
    );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ── Auth header helper ──
async function getAuthHeaders() {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    };
}

// ── AI report generation ──
export async function generateDNAReport(payload) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${supabaseUrl}/functions/v1/generate-dna-report`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`AI generation failed: ${res.statusText}`);
    return res.json();
}

// ── Slack notification helper (fire-and-forget) ──
export async function notifySlack(type, details) {
    try {
        const headers = await getAuthHeaders();
        await fetch(`${supabaseUrl}/functions/v1/slack-notify`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ type, details }),
        });
    } catch (err) { console.warn('Slack notify failed:', err); }
}
