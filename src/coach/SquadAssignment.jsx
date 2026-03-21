// ═══ SQUAD ASSIGNMENT — Auto-allocation engine UI ═══
import React, { useState, useEffect } from "react";
import { B, F, sCard, getDkWrap } from "../data/theme";
import { SecH } from "../shared/FormComponents";
import { supabase } from "../supabaseClient";
import { autoAssignSquads, getSquadSummary, parseSessionPrefs, WEEKDAY_SLOTS, WEEKEND_BLOCKS } from "../engine/squadEngine";
import { loadSquadGroups, createSquadGroup, allocatePlayerToSquad } from "../db/adminDb";

const ROLE_COLORS = { pace: B.bl, spin: B.prp, keeper: B.org, batter: B.pk, allrounder: '#14B8A6' };

export default function SquadAssignment() {
    const [cohort, setCohort] = useState([]);
    const [loading, setLoading] = useState(true);
    const [result, setResult] = useState(null);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    // Load cohort data from all sources
    useEffect(() => {
        async function loadCohort() {
            setLoading(true);
            try {
                const [{ data: oc }, { data: players }, { data: apps }] = await Promise.all([
                    supabase.from('official_cohort_2026').select('*').order('player_name'),
                    supabase.from('players').select('id, name, dob, role, bowling_type, club, gender, self_ratings').eq('submitted', true),
                    supabase.from('applications').select('first_name, last_name, email, suburb, history, bio, age, dob'),
                ]);

                // Deduplicate cohort by player_name — keep the row with most data
                const deduped = {};
                (oc || []).filter(c => c.player_name && c.player_name.length > 3).forEach(c => {
                    const key = c.player_name.toLowerCase().trim();
                    if (!deduped[key]) { deduped[key] = c; return; }
                    // Keep the row with more data (prefer one with dob, selected_sessions, age)
                    const existing = deduped[key];
                    const existingScore = (existing.dob ? 1 : 0) + (existing.selected_sessions ? 1 : 0) + (existing.age ? 1 : 0) + (existing.club ? 1 : 0);
                    const newScore = (c.dob ? 1 : 0) + (c.selected_sessions ? 1 : 0) + (c.age ? 1 : 0) + (c.club ? 1 : 0);
                    if (newScore > existingScore) deduped[key] = c;
                });
                const uniqueCohort = Object.values(deduped);

                // Merge cohort with DNA player data and application data
                const merged = uniqueCohort.map(c => {
                    const dna = (players || []).find(p => p.name?.toLowerCase().trim() === c.player_name?.toLowerCase().trim());
                    const app = (apps || []).find(a => a.email && c.email && a.email.toLowerCase() === c.email.toLowerCase());

                    return {
                        id: c.id,
                        name: c.player_name,
                        dob: c.dob || app?.dob || dna?.dob,
                        age: c.age || app?.age,
                        gender: c.gender,
                        suburb: c.suburb,
                        club: c.club || dna?.club,
                        role: dna?.role || c.player_role,
                        playerRole: c.player_role,
                        bowlingType: dna?.bowling_type,
                        selectedSessions: c.selected_sessions,
                        ccm: 0, // Will be calculated or loaded
                        history: c.history || app?.history,
                        bio: c.bio || app?.bio,
                        dnaId: dna?.id,
                    };
                });

                setCohort(merged);
            } catch (err) {
                console.error('Cohort load error:', err);
            }
            setLoading(false);
        }
        loadCohort();
    }, []);

    const handleAutoAssign = () => {
        const res = autoAssignSquads(cohort);
        setResult(res);
        setSaved(false);
    };

    const handleSave = async () => {
        if (!result) return;
        setSaving(true);
        try {
            // Create squad groups and allocate players
            for (const squad of result.squads) {
                if (squad.players.length === 0) continue;
                // Create or find squad group
                let sg;
                try {
                    sg = await createSquadGroup(squad.name, `${squad.weekday} + ${squad.weekend}`, MAX_SQUAD_SIZE);
                } catch (e) {
                    // Squad may already exist
                    const { data: existing } = await supabase.from('squad_groups').select('id').eq('name', squad.name).maybeSingle();
                    sg = existing;
                }
                if (!sg?.id) continue;

                // Allocate players that have DNA profiles
                for (const player of squad.players) {
                    if (player.dnaId) {
                        try {
                            await allocatePlayerToSquad(sg.id, player.dnaId, null);
                        } catch (e) { console.warn(`Failed to allocate ${player.name}:`, e.message); }
                    }
                }
            }
            setSaved(true);
        } catch (err) {
            console.error('Save error:', err);
        }
        setSaving(false);
    };

    const MAX_SQUAD_SIZE = 12;

    if (loading) return <div style={{ padding: 24, textAlign: 'center', color: B.g400, fontSize: 12, fontFamily: F }}>Loading cohort data...</div>;

    return (
        <div style={{ padding: 12, ...getDkWrap() }}>
            {/* Header stats */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                <div style={{ ...sCard, padding: 12, flex: '1 1 80px', textAlign: 'center', marginBottom: 0 }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: B.nvD, fontFamily: F }}>{cohort.length}</div>
                    <div style={{ fontSize: 8, fontWeight: 700, color: B.g400, fontFamily: F }}>TOTAL</div>
                </div>
                <div style={{ ...sCard, padding: 12, flex: '1 1 80px', textAlign: 'center', marginBottom: 0 }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: B.pk, fontFamily: F }}>{cohort.filter(p => p.gender?.toLowerCase().includes('female')).length}</div>
                    <div style={{ fontSize: 8, fontWeight: 700, color: B.g400, fontFamily: F }}>FEMALE</div>
                </div>
                <div style={{ ...sCard, padding: 12, flex: '1 1 80px', textAlign: 'center', marginBottom: 0 }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: B.bl, fontFamily: F }}>{cohort.filter(p => !p.gender?.toLowerCase().includes('female')).length}</div>
                    <div style={{ fontSize: 8, fontWeight: 700, color: B.g400, fontFamily: F }}>MALE</div>
                </div>
                <div style={{ ...sCard, padding: 12, flex: '1 1 80px', textAlign: 'center', marginBottom: 0 }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: B.grn, fontFamily: F }}>{Math.ceil(cohort.length / 12)}</div>
                    <div style={{ fontSize: 8, fontWeight: 700, color: B.g400, fontFamily: F }}>SQUADS</div>
                </div>
            </div>

            {/* Auto-assign button */}
            <button onClick={handleAutoAssign}
                style={{ width: '100%', padding: '14px 20px', borderRadius: 10, border: 'none', background: `linear-gradient(135deg, ${B.bl}, ${B.pk})`, color: B.w, fontSize: 13, fontWeight: 800, fontFamily: F, cursor: 'pointer', letterSpacing: 0.5, marginBottom: 16 }}>
                AUTO-ASSIGN SQUADS
            </button>

            {/* Results */}
            {result && (
                <div>
                    {/* Squad cards */}
                    {result.squads.map(squad => {
                        const summary = getSquadSummary(squad);
                        if (squad.players.length === 0) return null;
                        return (
                            <div key={squad.id} style={{ ...sCard, padding: 16, marginBottom: 12 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                    <div>
                                        <div style={{ fontSize: 16, fontWeight: 800, color: B.nvD, fontFamily: F }}>{summary.name}</div>
                                        <div style={{ fontSize: 10, color: B.g400, fontFamily: F }}>
                                            {summary.count} players · Avg CCM: {summary.avgCCM.toFixed(2)}
                                            {summary.ageRange && ` · Ages ${summary.ageRange.min}-${summary.ageRange.max}`}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: 9, fontWeight: 700, color: B.bl, fontFamily: F }}>{squad.weekday}</div>
                                        <div style={{ fontSize: 9, fontWeight: 700, color: B.grn, fontFamily: F }}>{squad.weekend}</div>
                                    </div>
                                </div>

                                {/* Role composition */}
                                <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
                                    {Object.entries(summary.roles).map(([role, count]) => (
                                        <span key={role} style={{ fontSize: 8, padding: '2px 6px', borderRadius: 4, background: `${ROLE_COLORS[role] || B.g400}15`, color: ROLE_COLORS[role] || B.g400, fontWeight: 700, fontFamily: F }}>
                                            {count} {role}
                                        </span>
                                    ))}
                                </div>

                                {/* Flags */}
                                {summary.flags.ageSpreadExceeded && <div style={{ fontSize: 9, color: B.red, fontFamily: F, marginBottom: 4 }}>Age spread exceeds 2.5yr limit</div>}
                                {summary.flags.underFilled && <div style={{ fontSize: 9, color: B.amb, fontFamily: F, marginBottom: 4 }}>Under-filled ({summary.count}/12)</div>}
                                {summary.flags.missingRoles.length > 0 && <div style={{ fontSize: 9, color: B.amb, fontFamily: F, marginBottom: 4 }}>Missing: {summary.flags.missingRoles.join(', ')}</div>}

                                {/* Player list */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    {squad.players.map(p => (
                                        <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px', background: B.g50, borderRadius: 6, border: `1px solid ${B.g100}` }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <span style={{ fontSize: 11, fontWeight: 600, color: B.nvD, fontFamily: F }}>{p.name}</span>
                                                <span style={{ fontSize: 8, color: ROLE_COLORS[p.roleCategory] || B.g400, fontWeight: 700, fontFamily: F }}>{p.roleCategory}</span>
                                            </div>
                                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                                {p.age && <span style={{ fontSize: 9, color: B.g400, fontFamily: F }}>{p.age}yo</span>}
                                                {p.suburb && <span style={{ fontSize: 8, color: B.g400, fontFamily: F }}>{p.suburb}</span>}
                                                {p.ccm > 0 && <span style={{ fontSize: 8, fontWeight: 700, color: B.bl, fontFamily: F }}>CCM {p.ccm.toFixed(2)}</span>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}

                    {/* Overflow */}
                    {result.overflow.length > 0 && (
                        <div style={{ ...sCard, padding: 16, borderLeft: `3px solid ${B.red}` }}>
                            <div style={{ fontSize: 12, fontWeight: 800, color: B.red, fontFamily: F, marginBottom: 8 }}>OVERFLOW ({result.overflow.length})</div>
                            <div style={{ fontSize: 10, color: B.g400, fontFamily: F, marginBottom: 8 }}>Players not placed — require manual assignment</div>
                            {result.overflow.map(p => (
                                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', background: `${B.red}06`, borderRadius: 4, marginBottom: 4 }}>
                                    <span style={{ fontSize: 11, fontWeight: 600, color: B.nvD, fontFamily: F }}>{p.name}</span>
                                    <span style={{ fontSize: 9, color: B.red, fontFamily: F }}>{p.reason}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* CCM Overrides */}
                    {result.overrides.length > 0 && (
                        <div style={{ ...sCard, padding: 16, borderLeft: `3px solid ${B.amb}`, marginTop: 12 }}>
                            <div style={{ fontSize: 12, fontWeight: 800, color: B.amb, fontFamily: F, marginBottom: 8 }}>CCM OVERRIDES ({result.overrides.length})</div>
                            {result.overrides.map((o, i) => (
                                <div key={i} style={{ fontSize: 10, color: B.g600, fontFamily: F, marginBottom: 4 }}>
                                    <strong>{o.player}</strong> → {o.squad} (CCM {o.ccm.toFixed(2)}) — {o.reason}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Data Quality */}
                    {result.dataQuality.length > 0 && (
                        <div style={{ ...sCard, padding: 16, borderLeft: `3px solid ${B.g400}`, marginTop: 12 }}>
                            <div style={{ fontSize: 12, fontWeight: 800, color: B.g400, fontFamily: F, marginBottom: 8 }}>DATA QUALITY ({result.dataQuality.length} flags)</div>
                            <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                                {result.dataQuality.slice(0, 20).map((d, i) => (
                                    <div key={i} style={{ fontSize: 9, color: B.g400, fontFamily: F, marginBottom: 2 }}>
                                        {d.name}: {d.issue}
                                    </div>
                                ))}
                                {result.dataQuality.length > 20 && <div style={{ fontSize: 9, color: B.g400, fontFamily: F }}>...and {result.dataQuality.length - 20} more</div>}
                            </div>
                        </div>
                    )}

                    {/* Save button */}
                    <button onClick={handleSave} disabled={saving || saved}
                        style={{ width: '100%', marginTop: 16, padding: '14px 20px', borderRadius: 10, border: 'none', background: saved ? B.grn : saving ? B.g200 : B.nvD, color: B.w, fontSize: 13, fontWeight: 800, fontFamily: F, cursor: saving || saved ? 'default' : 'pointer', letterSpacing: 0.5 }}>
                        {saved ? 'SAVED' : saving ? 'SAVING...' : 'SAVE SQUAD ASSIGNMENTS'}
                    </button>
                </div>
            )}
        </div>
    );
}
