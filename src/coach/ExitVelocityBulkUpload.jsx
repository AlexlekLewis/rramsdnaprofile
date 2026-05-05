// ═══ COACH/ADMIN: BULK EXIT VELOCITY UPLOAD ═══
// Modal that lets a coach paste a CSV of exit velocity readings and bulk-save.
//
// Expected CSV (header row optional; commas or tabs accepted):
//   Player Name, Attempt 1, Attempt 2, Attempt 3
//   Sam Smith, 95.2, 96.8, 97.5
//   ...
//
// All rows share one test_date set in the modal.
// Players are matched by name (case/whitespace-insensitive) against the
// submitted DNA roster (players.submitted = true).

import React, { useEffect, useState } from 'react';
import { B, F } from '../data/theme';
import { supabase } from '../supabaseClient';
import {
    saveExitVelocitySession,
    replaceExitVelocitySession,
    METRIC_TYPES,
} from '../db/performanceMetricsDb';

function todayStr() { return new Date().toISOString().slice(0, 10); }

function parseAttempt(v) {
    if (v === '' || v === null || v === undefined) return null;
    const n = Number(String(v).trim());
    return isNaN(n) ? null : n;
}

// Split a line on tab OR comma — accepts paste from Sheets/Excel.
function splitRow(line) {
    if (line.includes('\t')) return line.split('\t').map(c => c.trim());
    return line.split(',').map(c => c.trim());
}

function looksLikeHeader(cells) {
    if (cells.length < 2) return false;
    const first = (cells[0] || '').toLowerCase();
    return first.includes('name') || first.includes('player') || first.includes('athlete');
}

function normalise(str) {
    return (str || '').toString().toLowerCase().trim().replace(/\s+/g, ' ');
}

export default function ExitVelocityBulkUpload({ onClose }) {
    const [roster, setRoster] = useState([]);
    const [rosterLoading, setRosterLoading] = useState(true);
    const [csv, setCsv] = useState('');
    const [date, setDate] = useState(todayStr());
    const [parsed, setParsed] = useState(null); // { matched: [...], unmatched: [...] }
    const [previewing, setPreviewing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [result, setResult] = useState(null);

    // Load player roster once for name matching
    useEffect(() => {
        let cancelled = false;
        (async () => {
            const { data, error } = await supabase
                .from('players')
                .select('id, name')
                .eq('submitted', true);
            if (cancelled) return;
            if (error) {
                console.error('roster load failed:', error.message);
                setRoster([]);
            } else {
                setRoster(data || []);
            }
            setRosterLoading(false);
        })();
        return () => { cancelled = true; };
    }, []);

    const rosterByName = React.useMemo(() => {
        const m = new Map();
        roster.forEach(p => m.set(normalise(p.name), p));
        return m;
    }, [roster]);

    const handlePreview = async () => {
        setResult(null);
        setPreviewing(true);
        const lines = csv.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        if (lines.length === 0) { setParsed(null); setPreviewing(false); return; }

        // Skip header if detected
        const firstCells = splitRow(lines[0]);
        const start = looksLikeHeader(firstCells) ? 1 : 0;

        const matched = [];
        const unmatched = [];

        for (let i = start; i < lines.length; i++) {
            const cells = splitRow(lines[i]);
            const name = cells[0];
            const a1 = parseAttempt(cells[1]);
            const a2 = parseAttempt(cells[2]);
            const a3 = parseAttempt(cells[3]);
            const attempts = [a1, a2, a3];
            const validCount = attempts.filter(v => v !== null).length;

            if (!name || validCount === 0) {
                unmatched.push({ line: i + 1, name: name || '(blank)', reason: 'no valid attempts' });
                continue;
            }

            const player = rosterByName.get(normalise(name));
            if (!player) {
                unmatched.push({ line: i + 1, name, reason: 'player not found' });
                continue;
            }

            const validVals = attempts.filter(v => v !== null);
            const out = validVals.find(v => v < 20 || v > 200);
            if (out !== undefined) {
                unmatched.push({ line: i + 1, name, reason: `${out} km/h out of range` });
                continue;
            }

            const best = Math.max(...validVals);
            const avg = +(validVals.reduce((s, v) => s + v, 0) / validVals.length).toFixed(1);
            matched.push({ playerId: player.id, name: player.name, attempts, best, avg, willOverwrite: false });
        }

        // Flag rows that would overwrite existing data for this date
        if (matched.length > 0) {
            const playerIds = matched.map(m => m.playerId);
            const { data: existing } = await supabase
                .from('player_performance_metrics')
                .select('player_id')
                .eq('metric_type', METRIC_TYPES.EXIT_VELOCITY)
                .eq('recorded_at', date)
                .in('player_id', playerIds);
            const overwriteSet = new Set((existing || []).map(r => r.player_id));
            matched.forEach(m => { m.willOverwrite = overwriteSet.has(m.playerId); });
        }

        setParsed({ matched, unmatched });
        setPreviewing(false);
    };

    // If the user changes the test date after previewing, force them to re-preview so
    // willOverwrite flags stay accurate.
    useEffect(() => {
        if (parsed) setParsed(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [date]);

    const handleSave = async () => {
        if (!parsed || parsed.matched.length === 0 || saving) return;

        // Confirm if any rows would overwrite existing data
        const overwriteCount = parsed.matched.filter(m => m.willOverwrite).length;
        if (overwriteCount > 0) {
            const ok = window.confirm(
                `${overwriteCount} player${overwriteCount === 1 ? '' : 's'} already have a test for ${date}. ` +
                `Continuing will REPLACE their existing values. Click Cancel to review first.`
            );
            if (!ok) return;
        }

        setSaving(true);
        try {
            const { data: userResp } = await supabase.auth.getUser();
            const userId = userResp?.user?.id;
            if (!userId) throw new Error('Not signed in');

            let inserted = 0;
            const errors = [];
            for (const row of parsed.matched) {
                try {
                    const fn = row.willOverwrite ? replaceExitVelocitySession : saveExitVelocitySession;
                    await fn({
                        playerId: row.playerId,
                        recordedAt: date,
                        attempts: row.attempts,
                        notes: null,
                        recordedBy: userId,
                        recordedByRole: 'coach',
                    });
                    inserted++;
                } catch (e) {
                    errors.push({ name: row.name, error: e.message });
                }
            }
            setResult({ inserted, errors });
        } catch (e) {
            setResult({ inserted: 0, errors: [{ name: '(all)', error: e.message }] });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div onClick={onClose} style={{
            position: 'fixed', inset: 0, zIndex: 10000,
            background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        }}>
            <div onClick={e => e.stopPropagation()} style={{
                background: B.w, borderRadius: 16, padding: 20, maxWidth: 640, width: '100%',
                maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: B.nvD, fontFamily: F }}>Bulk Upload — Exit Velocity</div>
                        <div style={{ fontSize: 11, color: B.g500, fontFamily: F, marginTop: 2 }}>Paste rows from a sheet. One date applied to all rows.</div>
                    </div>
                    <button onClick={onClose}
                        style={{ padding: '6px 10px', borderRadius: 6, border: `1px solid ${B.g200}`, background: B.w, color: B.g600, fontSize: 11, fontFamily: F, cursor: 'pointer' }}>
                        Close
                    </button>
                </div>

                {/* Date */}
                <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 9, fontWeight: 700, color: B.g400, fontFamily: F, display: 'block', marginBottom: 4 }}>Test date (applied to all rows)</label>
                    <input type="date" value={date} onChange={e => setDate(e.target.value)}
                        style={{ padding: '8px 10px', borderRadius: 6, border: `1px solid ${B.g200}`, fontSize: 12, fontFamily: F, color: B.nvD, outline: 'none' }} />
                </div>

                {/* CSV input */}
                <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 9, fontWeight: 700, color: B.g400, fontFamily: F, display: 'block', marginBottom: 4 }}>
                        Paste rows (Player Name, Attempt 1, Attempt 2, Attempt 3)
                    </label>
                    <textarea
                        value={csv} onChange={e => setCsv(e.target.value)}
                        rows={8}
                        placeholder={"Player Name, Attempt 1, Attempt 2, Attempt 3\nSam Smith, 95.2, 96.8, 97.5\nJane Doe, 88.0, 89.5, 91.2"}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: `1px solid ${B.g200}`, fontSize: 12, fontFamily: 'monospace', color: B.nvD, outline: 'none', boxSizing: 'border-box', resize: 'vertical' }}
                    />
                    <div style={{ fontSize: 9, color: B.g400, fontFamily: F, marginTop: 4 }}>
                        Accepts commas or tabs. Header row optional. {rosterLoading ? 'Loading roster…' : `${roster.length} players in roster.`}
                    </div>
                </div>

                {/* Action: Preview */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                    <button onClick={handlePreview} disabled={!csv.trim() || rosterLoading || previewing}
                        style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: csv.trim() && !rosterLoading && !previewing ? B.bl : B.g200, color: B.w, fontSize: 12, fontWeight: 800, fontFamily: F, cursor: csv.trim() && !rosterLoading && !previewing ? 'pointer' : 'default' }}>
                        {previewing ? 'Checking…' : 'Preview matches'}
                    </button>
                </div>

                {/* Preview results */}
                {parsed && (
                    <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: B.nvD, fontFamily: F, marginBottom: 6 }}>
                            {parsed.matched.length} matched · {parsed.unmatched.length} skipped
                        </div>

                        {parsed.matched.length > 0 && (
                            <div style={{ marginBottom: 10, border: `1px solid ${B.g200}`, borderRadius: 6, overflow: 'hidden' }}>
                                <div style={{ padding: '6px 10px', background: `${B.grn}10`, fontSize: 9, fontWeight: 800, color: B.grn, fontFamily: F, letterSpacing: 0.4 }}>
                                    READY TO SAVE
                                </div>
                                <div style={{ maxHeight: 200, overflow: 'auto' }}>
                                    {parsed.matched.map((m, i) => (
                                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '6px 10px', borderBottom: `1px solid ${B.g100}`, fontSize: 11, color: B.g600, fontFamily: F }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
                                                <span style={{ fontWeight: 600, color: B.nvD }}>{m.name}</span>
                                                {m.willOverwrite && (
                                                    <span title={`Will replace existing test for ${date}`}
                                                        style={{ fontSize: 8, fontWeight: 800, padding: '2px 6px', borderRadius: 4, background: `${B.amb}20`, color: B.amb, fontFamily: F, letterSpacing: 0.4 }}>
                                                        WILL REPLACE
                                                    </span>
                                                )}
                                            </span>
                                            <span style={{ flexShrink: 0 }}>
                                                {m.attempts.map(a => a === null ? '—' : a).join(' · ')} km/h
                                                {' · best '}<span style={{ fontWeight: 800, color: B.bl }}>{m.best}</span>
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {parsed.unmatched.length > 0 && (
                            <div style={{ marginBottom: 10, border: `1px solid ${B.amb}30`, borderRadius: 6, overflow: 'hidden' }}>
                                <div style={{ padding: '6px 10px', background: `${B.amb}15`, fontSize: 9, fontWeight: 800, color: B.amb, fontFamily: F, letterSpacing: 0.4 }}>
                                    SKIPPED
                                </div>
                                <div style={{ maxHeight: 160, overflow: 'auto' }}>
                                    {parsed.unmatched.map((u, i) => (
                                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', borderBottom: `1px solid ${B.g100}`, fontSize: 11, color: B.g600, fontFamily: F }}>
                                            <span>line {u.line} · {u.name}</span>
                                            <span style={{ color: B.amb }}>{u.reason}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {parsed.matched.length > 0 && (
                            <button onClick={handleSave} disabled={saving}
                                style={{ width: '100%', padding: '12px', borderRadius: 8, border: 'none', background: saving ? B.g200 : B.grn, color: B.w, fontSize: 12, fontWeight: 800, fontFamily: F, cursor: saving ? 'default' : 'pointer' }}>
                                {saving ? 'Saving…' : `Save ${parsed.matched.length} test${parsed.matched.length === 1 ? '' : 's'}`}
                            </button>
                        )}
                    </div>
                )}

                {/* Result */}
                {result && (
                    <div style={{
                        padding: 12, borderRadius: 8,
                        background: result.errors.length === 0 ? `${B.grn}10` : `${B.amb}10`,
                        border: `1px solid ${result.errors.length === 0 ? B.grn : B.amb}30`,
                    }}>
                        <div style={{ fontSize: 12, fontWeight: 800, color: result.errors.length === 0 ? B.grn : B.amb, fontFamily: F, marginBottom: 4 }}>
                            Saved {result.inserted} test{result.inserted === 1 ? '' : 's'}
                            {result.errors.length > 0 ? ` · ${result.errors.length} failed` : ''}
                        </div>
                        {result.errors.length > 0 && (
                            <div style={{ fontSize: 10, color: B.g600, fontFamily: F, marginTop: 6 }}>
                                {result.errors.map((e, i) => (
                                    <div key={i}>• {e.name}: {e.error}</div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
