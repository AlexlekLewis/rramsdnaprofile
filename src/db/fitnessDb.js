import { supabase } from '../supabaseClient';

// ─── FITNESS TRACKING ─────────────────────────────────────────────────────
//
// 5 tables:
//   fitness_programs           — top-level program metadata + activation block
//   fitness_program_blocks     — session templates (Day 1, Day 2, etc.)
//   fitness_program_enrolment  — one row per player per program (Phase 3+)
//   fitness_session_logs       — per-player per-session log (Phase 3+)
//   fitness_badges_awarded     — badge events (Phase 5+)
//
// Cohort gate: row-level security blocks any insert into fitness_session_logs
// unless the player has players.submitted = true. Enforced in the database.
//
// PROGRAM ACTIVATION_BLOCK shape (jsonb on fitness_programs.activation_block):
//   [
//     { id: "hip_bridges", category: "Lower Body Activation", name: "Hip Bridges", prescription: "12 reps" },
//     ...
//   ]
//
// BLOCK EXERCISES shape (jsonb on fitness_program_blocks.exercises):
//   [
//     { id: "jumping_squats", category: "Lower Body Power", name: "Jumping Squats",
//       prescription: "4x8", prescribed_sets: 4, prescribed_reps: "8", tip: "..." },
//     ...
//   ]

// ═══════════════════════════════════════════════════════════════════════
// READ
// ═══════════════════════════════════════════════════════════════════════

export async function loadActivePrograms() {
    const { data, error } = await supabase
        .from('fitness_programs')
        .select('*')
        .order('created_at', { ascending: true });
    if (error) { console.error('loadActivePrograms error:', error.message); return []; }
    return data || [];
}

export async function loadProgramById(programId) {
    if (!programId) return null;
    const { data, error } = await supabase
        .from('fitness_programs')
        .select('*')
        .eq('id', programId)
        .maybeSingle();
    if (error) { console.error('loadProgramById error:', error.message); return null; }
    return data;
}

export async function loadProgramBlocks(programId) {
    if (!programId) return [];
    const { data, error } = await supabase
        .from('fitness_program_blocks')
        .select('*')
        .eq('program_id', programId)
        .order('day_number', { ascending: true });
    if (error) { console.error('loadProgramBlocks error:', error.message); return []; }
    return data || [];
}

// ═══════════════════════════════════════════════════════════════════════
// WRITE — Coach/admin only (RLS enforces this)
// ═══════════════════════════════════════════════════════════════════════

export async function updateProgram(id, patch) {
    if (!id) throw new Error('updateProgram: id is required');
    const { data, error } = await supabase
        .from('fitness_programs')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
    if (error) throw new Error(`Update program failed: ${error.message}`);
    return data;
}

export async function updateBlock(id, patch) {
    if (!id) throw new Error('updateBlock: id is required');
    const { data, error } = await supabase
        .from('fitness_program_blocks')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
    if (error) throw new Error(`Update block failed: ${error.message}`);
    return data;
}

// ═══════════════════════════════════════════════════════════════════════
// VALIDATION & HELPERS
// ═══════════════════════════════════════════════════════════════════════

const SUGGESTED_CATEGORIES = [
    'Lower Body Power',
    'Lower Body Strength',
    'Upper Body Power',
    'Upper Body Strength',
    'Core Power',
    'Core Strength',
];

const SUGGESTED_ACTIVATION_CATEGORIES = [
    'Lower Body Activation',
    'Upper Body Activation',
    'Warm Up',
];

export function listExerciseCategories() {
    return [...SUGGESTED_CATEGORIES];
}

export function listActivationCategories() {
    return [...SUGGESTED_ACTIVATION_CATEGORIES];
}

/**
 * Validate an exercises array (used on a block) before save.
 * Rules:
 *   - 1 to 12 exercises per block.
 *   - Each has a non-empty id, name, and prescription.
 *   - Ids are unique within the block.
 *   - prescribed_sets, when present, is a positive integer ≤ 10.
 */
export function validateExercises(exercises) {
    if (!Array.isArray(exercises)) return { ok: false, error: 'Exercises must be an array' };
    if (exercises.length < 1) return { ok: false, error: 'At least 1 exercise is required' };
    if (exercises.length > 12) return { ok: false, error: 'Max 12 exercises per session' };

    const seenIds = new Set();
    for (let i = 0; i < exercises.length; i++) {
        const e = exercises[i];
        if (!e || typeof e !== 'object') return { ok: false, error: `Exercise ${i + 1} is malformed` };
        const id = String(e.id || '').trim();
        if (!id) return { ok: false, error: `Exercise ${i + 1} is missing an id` };
        if (seenIds.has(id)) return { ok: false, error: `Exercise id "${id}" appears more than once` };
        seenIds.add(id);
        if (!e.name || !String(e.name).trim()) return { ok: false, error: `Exercise "${id}" has no name` };
        if (!e.prescription || !String(e.prescription).trim()) return { ok: false, error: `Exercise "${id}" has no prescription (e.g. "4x8")` };
        if (e.prescribed_sets != null) {
            const n = Number(e.prescribed_sets);
            if (!Number.isInteger(n) || n < 1 || n > 10) {
                return { ok: false, error: `Exercise "${id}" has invalid prescribed_sets (1-10 expected)` };
            }
        }
    }
    return { ok: true };
}

/**
 * Validate the program-level activation block.
 * Rules:
 *   - 0 to 6 movements.
 *   - Each has a non-empty id, name, and prescription.
 *   - Ids are unique.
 */
export function validateActivationBlock(activation) {
    if (!Array.isArray(activation)) return { ok: false, error: 'Activation must be an array' };
    if (activation.length > 6) return { ok: false, error: 'Max 6 activation movements' };

    const seenIds = new Set();
    for (let i = 0; i < activation.length; i++) {
        const a = activation[i];
        if (!a || typeof a !== 'object') return { ok: false, error: `Activation movement ${i + 1} is malformed` };
        const id = String(a.id || '').trim();
        if (!id) return { ok: false, error: `Activation movement ${i + 1} is missing an id` };
        if (seenIds.has(id)) return { ok: false, error: `Activation movement id "${id}" appears more than once` };
        seenIds.add(id);
        if (!a.name || !String(a.name).trim()) return { ok: false, error: `Activation movement "${id}" has no name` };
        if (!a.prescription || !String(a.prescription).trim()) return { ok: false, error: `Activation movement "${id}" has no prescription` };
    }
    return { ok: true };
}

/**
 * Generate a slug-style id from a name. "Bulgarian Split Squat" → "bulgarian_split_squat".
 * Falls back to a short random suffix if the name is empty.
 */
export function slugifyExerciseName(name) {
    const base = String(name || '').trim().toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
    if (base) return base;
    return `ex_${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * Group exercises by category, preserving the order each category first appears.
 * Used by the admin UI for visual grouping.
 */
export function groupExercisesByCategory(exercises) {
    const order = [];
    const groups = {};
    (exercises || []).forEach(e => {
        const cat = e.category || 'Other';
        if (!groups[cat]) { groups[cat] = []; order.push(cat); }
        groups[cat].push(e);
    });
    return order.map(cat => ({ category: cat, exercises: groups[cat] }));
}
