// ═══ PERFORMANCE METRICS — top-line section for IDP (player + coach) ═══
// Reusable. The same component renders in:
//   - Player Portal IDPView   →  <PerformanceMetrics playerId editorRole="player" editorUserId={...} />
//   - Coach assessment view   →  <PerformanceMetrics playerId editorRole="coach"  editorUserId={...} />
// RLS handles the permission. The component just records whose role the entry was made under.
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { B, F, sCard } from '../data/theme';
import { SaveToast, useSaveStatus } from './SaveToast';
import {
    METRIC_GROUPS,
    METRIC_BY_TYPE,
    formatMetricValue,
    parseMetricInput,
    loadLatestMetrics,
    addPerformanceMetric,
} from '../db/performanceMetricsDb';

const ACCENT = { bl: B.bl, pk: B.pk, org: B.org, prp: B.prp, grn: B.grn };

function daysAgo(isoDate) {
    if (!isoDate) return null;
    const d = new Date(isoDate);
    if (Number.isNaN(d.getTime())) return null;
    const ms = Date.now() - d.getTime();
    return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

function formatRecordedAgo(isoDate) {
    const n = daysAgo(isoDate);
    if (n === null) return '';
    if (n === 0) return 'today';
    if (n === 1) return 'yesterday';
    if (n < 7) return `${n} days ago`;
    if (n < 14) return '1 week ago';
    if (n < 60) return `${Math.floor(n / 7)} weeks ago`;
    if (n < 365) return `${Math.floor(n / 30)} months ago`;
    return `${Math.floor(n / 365)} years ago`;
}

// One card per metric. Click "Edit" to open an inline form. Explicit Save button only.
function MetricCard({ cfg, current, accentColor, onSaved, editorRole }) {
    const [editing, setEditing] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [validationError, setValidationError] = useState('');
    const [saving, setSaving] = useState(false);
    const [serverError, setServerError] = useState('');
    // Synchronous lock — prevents iOS touch+click double-fire from inserting two rows
    const inFlightRef = useRef(false);

    const startEdit = () => {
        // Pre-fill with current value when editing
        if (current?.value !== undefined && current?.value !== null) {
            setInputValue(formatMetricValue(cfg.type, current.value));
        } else {
            setInputValue('');
        }
        setValidationError('');
        setServerError('');
        setEditing(true);
    };

    const cancelEdit = () => {
        if (saving) return;
        setEditing(false);
        setValidationError('');
        setServerError('');
    };

    const handleSubmit = useCallback(async () => {
        // Synchronous guard — fires before React can re-render. Stops iOS Safari's
        // ghost-click + touchend double-fire from inserting two rows on slow networks.
        if (inFlightRef.current || saving) return;
        const parsed = parseMetricInput(cfg.type, inputValue);
        if (!parsed.ok) {
            setValidationError(parsed.error || 'Invalid input.');
            return;
        }
        inFlightRef.current = true;
        setValidationError('');
        setServerError('');
        setSaving(true);
        try {
            await onSaved({ type: cfg.type, value: parsed.value, unit: cfg.unit });
            setEditing(false);
        } catch (err) {
            setServerError(err?.message || 'Save failed. Please try again.');
        } finally {
            inFlightRef.current = false;
            setSaving(false);
        }
    }, [cfg.type, cfg.unit, inputValue, onSaved, saving]);

    // Mobile-safe: numeric keyboard, no leading-zero stripping (Safari quirk),
    // value updates locally only — never autosaves on blur.
    const inputMode = cfg.format === 'mmss' ? 'numeric' : 'decimal';
    const placeholder = cfg.format === 'mmss' ? 'mm:ss' : `e.g. ${cfg.min}–${cfg.max}`;

    const valueDisplay = current?.value !== undefined && current?.value !== null
        ? formatMetricValue(cfg.type, current.value)
        : null;

    return (
        <div style={{
            ...sCard, padding: 14, marginBottom: 0, position: 'relative',
            borderTop: `3px solid ${accentColor}`,
        }}>
            {/* Header row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: accentColor, letterSpacing: 1, textTransform: 'uppercase', fontFamily: F }}>
                        {cfg.label}
                    </div>
                    {!editing && (
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
                            <span style={{ fontSize: 24, fontWeight: 800, color: B.nvD, fontFamily: F, letterSpacing: -0.5 }}>
                                {valueDisplay ?? '—'}
                            </span>
                            <span style={{ fontSize: 11, fontWeight: 700, color: B.g400, fontFamily: F }}>{cfg.unit}</span>
                        </div>
                    )}
                </div>
                {!editing && (
                    <button
                        onClick={startEdit}
                        style={{
                            padding: '6px 10px', borderRadius: 6,
                            border: `1px solid ${B.g200}`, background: B.w,
                            color: accentColor, fontSize: 10, fontWeight: 800, fontFamily: F,
                            cursor: 'pointer', flexShrink: 0,
                        }}
                        aria-label={`Update ${cfg.label}`}
                    >
                        {valueDisplay ? 'Update' : 'Add'}
                    </button>
                )}
            </div>

            {/* Sub-line */}
            {!editing && current && (
                <div style={{ fontSize: 10, fontWeight: 600, color: B.g400, fontFamily: F, marginTop: 6 }}>
                    Updated {formatRecordedAgo(current.recorded_at)}
                    {current.recorded_by_role ? ` · by ${current.recorded_by_role}` : ''}
                </div>
            )}
            {!editing && !current && (
                <div style={{ fontSize: 10, fontWeight: 600, color: B.g400, fontFamily: F, marginTop: 6 }}>
                    {cfg.hint}
                </div>
            )}

            {/* Edit form */}
            {editing && (
                <div style={{ marginTop: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'stretch', gap: 8 }}>
                        <input
                            type="text"
                            inputMode={inputMode}
                            // autoComplete off avoids Safari/Chrome predictive-text shenanigans on numbers
                            autoComplete="off"
                            autoCorrect="off"
                            spellCheck="false"
                            // 16px font on iOS prevents the auto-zoom that would hide the keyboard
                            value={inputValue}
                            placeholder={placeholder}
                            onChange={(e) => { setInputValue(e.target.value); setValidationError(''); setServerError(''); }}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); else if (e.key === 'Escape') cancelEdit(); }}
                            disabled={saving}
                            style={{
                                flex: 1, minWidth: 0, padding: '12px 12px',
                                borderRadius: 8, border: `2px solid ${validationError ? B.red : B.g200}`,
                                fontSize: 16, fontWeight: 700, color: B.nvD, fontFamily: F,
                                outline: 'none', WebkitAppearance: 'none', appearance: 'none',
                                background: B.w,
                            }}
                        />
                        <span style={{ display: 'flex', alignItems: 'center', padding: '0 6px', fontSize: 11, fontWeight: 800, color: B.g400, fontFamily: F }}>
                            {cfg.unit}
                        </span>
                    </div>
                    {validationError && (
                        <div style={{ fontSize: 10, fontWeight: 700, color: B.red, fontFamily: F, marginTop: 6 }}>
                            {validationError}
                        </div>
                    )}
                    {serverError && (
                        <div style={{ fontSize: 10, fontWeight: 700, color: B.red, fontFamily: F, marginTop: 6 }}>
                            {serverError}
                        </div>
                    )}
                    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                        <button
                            type="button"
                            onClick={cancelEdit}
                            disabled={saving}
                            style={{
                                flex: 1, padding: '10px 12px', borderRadius: 8,
                                border: `1px solid ${B.g200}`, background: B.w,
                                color: B.nv, fontSize: 11, fontWeight: 800, fontFamily: F,
                                cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.5 : 1,
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={saving}
                            style={{
                                flex: 1.4, padding: '10px 12px', borderRadius: 8,
                                border: 'none',
                                background: saving ? B.g400 : `linear-gradient(135deg, ${accentColor}, ${B.nvD})`,
                                color: B.w, fontSize: 11, fontWeight: 800, fontFamily: F,
                                cursor: saving ? 'not-allowed' : 'pointer',
                                boxShadow: saving ? 'none' : `0 2px 8px ${accentColor}40`,
                            }}
                        >
                            {saving ? 'Saving…' : `Save${editorRole === 'coach' ? ' as coach' : ''}`}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function PerformanceMetrics({ playerId, editorRole, editorUserId }) {
    const [latest, setLatest] = useState({});
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const save = useSaveStatus();
    // Stable ref tracking the *currently mounted* playerId so in-flight saves
    // can detect a player switch and bail before mutating the wrong player's state.
    const playerIdRef = useRef(playerId);
    useEffect(() => { playerIdRef.current = playerId; }, [playerId]);

    // Fetch on mount / when player changes
    useEffect(() => {
        if (!playerId) return;
        let cancelled = false;
        setLoading(true);
        setLoadError('');
        // Reset visible state immediately so we don't show the previous player's numbers
        setLatest({});
        loadLatestMetrics(playerId)
            .then((data) => { if (!cancelled) setLatest(data); })
            .catch((err) => { if (!cancelled) setLoadError(err?.message || 'Could not load metrics.'); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [playerId]);

    const handleSave = useCallback(async ({ type, value, unit }) => {
        // Capture the playerId at the moment Save was clicked. If the user
        // switches to a different player mid-save, we must NOT mutate the new
        // player's state with the previous player's response.
        const savePlayerId = playerId;
        if (!savePlayerId) throw new Error('No player selected.');
        save.setSaving();
        const cfg = METRIC_BY_TYPE[type];
        if (!cfg) throw new Error('Unknown metric.');

        // Local-date YYYY-MM-DD (not UTC) — saving at 11pm AEDT shouldn't roll
        // the date forward by a day in the player's view.
        const today = (() => {
            const d = new Date();
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
        })();

        // Optimistic update — show new value immediately
        const previous = latest[type] || null;
        const optimistic = {
            id: `optimistic-${Date.now()}`,
            metric_type: type,
            value,
            unit: cfg.unit,
            recorded_at: today,
            recorded_by_role: editorRole,
            notes: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            _pending: true,
        };
        if (savePlayerId === playerIdRef.current) {
            setLatest((prev) => ({ ...prev, [type]: optimistic }));
        }

        try {
            const saved = await addPerformanceMetric({
                playerId: savePlayerId,
                metricType: type,
                value,
                unit: cfg.unit,
                recordedAt: today,
                recordedBy: editorUserId || null,
                recordedByRole: editorRole,
            });
            // Only commit to state if we're still viewing the same player
            if (savePlayerId === playerIdRef.current) {
                setLatest((prev) => ({ ...prev, [type]: saved }));
                save.setSaved();
            }
        } catch (err) {
            // Roll back optimistic update — only if we're still on the same player
            if (savePlayerId === playerIdRef.current) {
                setLatest((prev) => {
                    const copy = { ...prev };
                    if (previous) copy[type] = previous; else delete copy[type];
                    return copy;
                });
                save.setError(err?.message || 'Save failed.');
            }
            throw err;   // re-throw so MetricCard shows the error message
        }
    }, [playerId, editorRole, editorUserId, latest, save]);

    if (!playerId) return null;

    return (
        <div style={{ marginBottom: 16 }}>
            <SaveToast status={save.status} message={save.message} />

            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
                <div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: B.bl, letterSpacing: 1.4, textTransform: 'uppercase', fontFamily: F }}>
                        Performance Metrics
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: B.g400, fontFamily: F, marginTop: 2 }}>
                        Top-line numbers · {editorRole === 'coach' ? 'editable by coach' : 'editable by you or your coach'}
                    </div>
                </div>
            </div>

            {loading && (
                <div style={{ ...sCard, padding: 14, textAlign: 'center', fontSize: 11, color: B.g400 }}>
                    Loading…
                </div>
            )}
            {loadError && !loading && (
                <div style={{ ...sCard, padding: 14, fontSize: 11, color: B.red, fontWeight: 700 }}>
                    {loadError}
                </div>
            )}

            {!loading && !loadError && METRIC_GROUPS.map((group) => (
                <div key={group.category} style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: B.g600, letterSpacing: 1, textTransform: 'uppercase', fontFamily: F, marginBottom: 6, paddingLeft: 2 }}>
                        {group.icon} {group.category}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
                        {group.metrics.map((m) => (
                            <MetricCard
                                key={m.type}
                                cfg={m}
                                current={latest[m.type]}
                                accentColor={ACCENT[group.accent] || B.bl}
                                editorRole={editorRole}
                                onSaved={handleSave}
                            />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
