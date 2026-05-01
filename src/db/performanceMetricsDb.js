// ═══ PERFORMANCE METRICS — IDP top-line numbers ═══
// Event-sourced: one row per measurement, never overwrite.
// "Current value" = latest row per (player_id, metric_type), ordered by recorded_at DESC.
import { supabase } from '../supabaseClient';

// ─── REGISTRY ────────────────────────────────────────────────────────────────
// Add new metrics here — UI picks them up automatically. No migration needed.
// Conventions:
//   type:    snake_case unique key, stored verbatim in DB
//   unit:    lowercase, stored verbatim in DB
//   min/max: input validation bounds (inclusive)
//   step:    numeric input step
//   format:  'decimal' (default) | 'mmss' (input rendered as mm:ss, value stored as integer seconds)
export const METRIC_GROUPS = [
    {
        category: 'Bowling',
        accent: 'bl',          // matches B[accent] in theme
        icon: '🎯',
        metrics: [
            { type: 'bowling_speed_max', label: 'Max bowling speed', short: 'Max speed',
              unit: 'kph', min: 30, max: 200, step: 0.1,
              hint: 'Fastest delivery recorded with a speed gun.' },
        ],
    },
    {
        category: 'Batting',
        accent: 'pk',
        icon: '🏏',
        metrics: [
            { type: 'exit_velocity_max', label: 'Max exit velocity', short: 'Max exit vel.',
              unit: 'mph', min: 20, max: 150, step: 0.1,
              hint: 'Fastest ball-off-bat speed (e.g. from PitchVision / HitTrax).' },
        ],
    },
    {
        category: 'Fitness',
        accent: 'org',
        icon: '💪',
        metrics: [
            { type: 'beep_test',  label: 'Beep test',  short: 'Beep test',
              unit: 'level', min: 1, max: 21, step: 0.1,
              hint: 'Highest level + shuttle reached (e.g. 11.4).' },
            { type: 'yo_yo_test', label: 'Yo-yo test', short: 'Yo-yo',
              unit: 'level', min: 1, max: 23, step: 0.1,
              hint: 'Yo-yo intermittent recovery test level reached.' },
            { type: 'run_2km',    label: '2 km run',   short: '2 km run',
              unit: 'sec', min: 240, max: 1500, step: 1, format: 'mmss',
              hint: 'Time to complete a 2 km timed run. Enter as mm:ss.' },
        ],
    },
];

// Flat lookup so UI components can resolve a row's display config from its metric_type
export const METRIC_BY_TYPE = METRIC_GROUPS
    .flatMap(g => g.metrics.map(m => ({ ...m, category: g.category, accent: g.accent, icon: g.icon })))
    .reduce((acc, m) => { acc[m.type] = m; return acc; }, {});

// ─── FORMATTERS ──────────────────────────────────────────────────────────────
// Render a numeric value back as a display string, respecting `format`.
export function formatMetricValue(metricType, value) {
    if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
    const cfg = METRIC_BY_TYPE[metricType];
    if (cfg?.format === 'mmss') {
        const total = Math.round(Number(value));
        const m = Math.floor(total / 60);
        const s = total % 60;
        return `${m}:${String(s).padStart(2, '0')}`;
    }
    // Decimal: trim trailing .0 but keep one decimal if non-integer
    const num = Number(value);
    if (Number.isInteger(num)) return String(num);
    return num.toFixed(1);
}

// Parse a UI input string back into the numeric value we store.
// Returns { ok: boolean, value?: number, error?: string }
export function parseMetricInput(metricType, raw) {
    const cfg = METRIC_BY_TYPE[metricType];
    if (!cfg) return { ok: false, error: 'Unknown metric.' };
    if (raw === null || raw === undefined || String(raw).trim() === '') {
        return { ok: false, error: 'Please enter a value.' };
    }
    const trimmed = String(raw).trim();
    let value;
    if (cfg.format === 'mmss') {
        const m = trimmed.match(/^(\d{1,2}):([0-5]\d)$/);
        if (!m) return { ok: false, error: 'Use mm:ss format (e.g. 8:24).' };
        value = Number(m[1]) * 60 + Number(m[2]);
    } else {
        value = Number(trimmed.replace(',', '.'));
        if (!Number.isFinite(value)) return { ok: false, error: 'Please enter a number.' };
    }
    if (cfg.min !== undefined && value < cfg.min) return { ok: false, error: `Minimum is ${cfg.format === 'mmss' ? formatMetricValue(metricType, cfg.min) : cfg.min} ${cfg.unit}.` };
    if (cfg.max !== undefined && value > cfg.max) return { ok: false, error: `Maximum is ${cfg.format === 'mmss' ? formatMetricValue(metricType, cfg.max) : cfg.max} ${cfg.unit}.` };
    return { ok: true, value };
}

// ─── DB HELPERS ──────────────────────────────────────────────────────────────

// Load all metrics for a player and reduce to "latest per type".
// Returns: { [metric_type]: row }
export async function loadLatestMetrics(playerId) {
    if (!playerId) return {};
    const { data, error } = await supabase
        .from('player_performance_metrics')
        .select('id, metric_type, value, unit, recorded_at, recorded_by_role, notes, created_at, updated_at')
        .eq('player_id', playerId)
        .order('recorded_at', { ascending: false })
        .order('created_at', { ascending: false });
    if (error) throw error;
    const latest = {};
    for (const row of data || []) {
        if (!latest[row.metric_type]) latest[row.metric_type] = row;
    }
    return latest;
}

// Load full history for one metric (for trend display / PB tracking).
export async function loadMetricHistory(playerId, metricType, limit = 20) {
    if (!playerId || !metricType) return [];
    const { data, error } = await supabase
        .from('player_performance_metrics')
        .select('id, value, unit, recorded_at, recorded_by_role, notes, created_at')
        .eq('player_id', playerId)
        .eq('metric_type', metricType)
        .order('recorded_at', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit);
    if (error) throw error;
    return data || [];
}

// Insert a new measurement. Never updates an existing row — every change is a new entry.
// `recordedBy` is auth.users.id (nullable). `recordedByRole` is 'player' | 'coach'.
export async function addPerformanceMetric({
    playerId,
    metricType,
    value,
    unit,
    recordedAt,            // 'YYYY-MM-DD' or undefined for today
    recordedBy,            // auth.users.id or null
    recordedByRole,        // 'player' | 'coach'
    notes,                 // optional
}) {
    if (!playerId)        throw new Error('Missing playerId');
    if (!metricType)      throw new Error('Missing metricType');
    if (value === null || value === undefined || Number.isNaN(Number(value))) {
        throw new Error('Missing or invalid value');
    }
    if (!unit)            throw new Error('Missing unit');
    if (recordedByRole !== 'player' && recordedByRole !== 'coach') {
        throw new Error('recordedByRole must be "player" or "coach"');
    }

    const payload = {
        player_id: playerId,
        metric_type: metricType,
        value: Number(value),
        unit,
        recorded_at: recordedAt || new Date().toISOString().slice(0, 10),
        recorded_by: recordedBy || null,
        recorded_by_role: recordedByRole,
        notes: notes ? String(notes).trim() : null,
    };

    const { data, error } = await supabase
        .from('player_performance_metrics')
        .insert(payload)
        .select()
        .single();
    if (error) throw error;
    return data;
}

// Delete a single measurement (e.g. to fix a typo). RLS allows the owner OR a coach.
export async function deletePerformanceMetric(id) {
    if (!id) throw new Error('Missing id');
    const { error } = await supabase
        .from('player_performance_metrics')
        .delete()
        .eq('id', id);
    if (error) throw error;
    return true;
}
