// ═══ SQUAD ASSIGNMENT — Auto-allocation engine UI ═══
import React, { useState, useEffect, useMemo } from "react";
import { B, F, sCard, getDkWrap } from "../data/theme";
import { SecH } from "../shared/FormComponents";
import { supabase } from "../supabaseClient";
import { autoAssignSquads, getSquadSummary, parseSessionPrefs, WEEKDAY_SLOTS, WEEKEND_BLOCKS } from "../engine/squadEngine";
import { loadSquadGroups, createSquadGroup, allocatePlayerToSquad } from "../db/adminDb";
import { useEngine } from "../context/EngineContext";
import { calcCCM, calcStatDomain } from "../engine/ratingEngine";
import { loadPlayersFromDB } from "../db/playerDb";

const ROLE_COLORS = { pace: B.bl, spin: B.prp, keeper: B.org, batter: B.pk, allrounder: '#14B8A6', bowlrounder: '#0D9488' };

export default function SquadAssignment() {
    const [cohort, setCohort] = useState([]);
    const [loading, setLoading] = useState(true);
    const [result, setResult] = useState(null);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const { compTiers, engineConst, engineLoading } = useEngine();

    // Load full player profiles (DNA source of truth), enriched with cohort + application data
    useEffect(() => {
        if (engineLoading) return;
        async function loadCohort() {
            setLoading(true);
            try {
                // 1. DNA profiles (full data incl. grades, assessments, self_ratings)
                // 2. Cohort data (suburb, session prefs, parent emails)
                // 3. Application data (suburb, history, bio fallbacks)
                const [dnaPlayers, { data: cohortData }, { data: appData }] = await Promise.all([
                    loadPlayersFromDB(),
                    supabase.from('official_cohort_2026').select('*'),
                    supabase.from('applications').select('*'),
                ]);

                // Build enrichment lookups
                const cohortByName = {};
                (cohortData || []).forEach(c => {
                    if (c.player_name) cohortByName[c.player_name.toLowerCase().trim()] = c;
                });
                const appsByName = {};
                (appData || []).forEach(a => {
                    const key = `${a.first_name || ''} ${a.last_name || ''}`.toLowerCase().trim();
                    if (key.length > 3) appsByName[key] = a;
                });

                // Primary source: submitted DNA players, enriched with cohort + app data
                const merged = dnaPlayers.map(p => {
                    const nameKey = p.name?.toLowerCase().trim();
                    const c = cohortByName[nameKey] || {};
                    const a = appsByName[nameKey] || {};

                    // Compute competition context from grades
                    const ccmR = calcCCM(p.grades, p.dob, compTiers, engineConst);
                    const hasCd = Object.keys(p.cd || {}).some(k => k.startsWith('t1_'));

                    // Squad ranking uses OBJECTIVE data only:
                    // 1. Season stats scored against tier-relative benchmarks
                    // 2. Peak performances scored against their tier
                    // 3. ARM multiplier (younger playing up = boosted)
                    // Self-ratings are excluded — too subjective for squad allocation
                    const cti = ccmR?.cti || 0;
                    const arm = ccmR?.arm || 1;
                    const playerAge = c.age || a.age || null;
                    const statResult = calcStatDomain(p.grades, p.role, cti, arm, playerAge, {}, p.topBat, p.topBowl, compTiers);
                    const statScore = statResult?.css || 0;

                    // Coach assessment average (if available — objective, verified data)
                    let coachScore = 0;
                    if (hasCd) {
                        const coachVals = Object.entries(p.cd)
                            .filter(([k, v]) => (k.startsWith('t1_') || k.startsWith('t2_') || k.startsWith('iq_') || k.startsWith('mn_') || k.startsWith('ph_') || k.startsWith('fld_')) && v > 0)
                            .map(([, v]) => v);
                        if (coachVals.length > 0) {
                            coachScore = coachVals.reduce((s, v) => s + v, 0) / coachVals.length;
                        }
                    }

                    // Final ability score for squad engine:
                    // If coach assessed: blend coach (60%) + stats (40%)
                    // If stats only: use stat score
                    // If neither: score = 0 (unranked, placed by session preference only)
                    let abilityScore = 0;
                    if (coachScore > 0 && statScore > 0) {
                        abilityScore = coachScore * 0.60 + statScore * 0.40;
                    } else if (coachScore > 0) {
                        abilityScore = coachScore;
                    } else if (statScore > 0) {
                        abilityScore = statScore;
                    }

                    return {
                        id: p.id,
                        name: p.name,
                        dob: p.dob || c.dob || a.dob,
                        age: c.age || a.age,
                        gender: p.gender || c.gender,
                        suburb: c.suburb || a.suburb,
                        club: p.club || c.club || a.club,
                        role: p.role || c.player_role,
                        playerRole: c.player_role,
                        bowlingType: p.bowl,
                        selectedSessions: c.selected_sessions,
                        // Ability score drives squad ranking (objective data only)
                        ccm: abilityScore,
                        abilityScore,
                        statScore,
                        coachScore,
                        ccmRaw: ccmR?.ccm || 0,
                        ccmCode: ccmR?.code || null,
                        history: c.history || a.history,
                        bio: c.bio || a.bio,
                        dnaId: p.id,
                        parent1Email: c.parent1_email || a.parent1_email || null,
                        parent2Email: c.parent2_email || a.parent2_email || null,
                        playerBatArch: p.playerBatArch,
                        playerBwlArch: p.playerBwlArch,
                        heightCm: p.heightCm,
                        assessed: hasCd,
                        grades: p.grades,
                    };
                });

                setCohort(merged);
            } catch (err) {
                console.error('Cohort load error:', err);
            }
            setLoading(false);
        }
        loadCohort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [engineLoading]);

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

    if (loading || engineLoading) return <div style={{ padding: 24, textAlign: 'center', color: B.g400, fontSize: 12, fontFamily: F }}>Loading player data & engine...</div>;

    return (
        <div style={{ padding: 12, ...getDkWrap() }}>
            {/* Header stats */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                <div style={{ ...sCard, padding: 12, flex: '1 1 80px', textAlign: 'center', marginBottom: 0 }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: B.nvD, fontFamily: F }}>{cohort.length}</div>
                    <div style={{ fontSize: 8, fontWeight: 700, color: B.g400, fontFamily: F }}>TOTAL</div>
                </div>
                <div style={{ ...sCard, padding: 12, flex: '1 1 80px', textAlign: 'center', marginBottom: 0 }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: B.pk, fontFamily: F }}>{cohort.filter(p => { const g = p.gender?.toLowerCase().trim(); return g === 'f' || g?.includes('female'); }).length}</div>
                    <div style={{ fontSize: 8, fontWeight: 700, color: B.g400, fontFamily: F }}>FEMALE</div>
                </div>
                <div style={{ ...sCard, padding: 12, flex: '1 1 80px', textAlign: 'center', marginBottom: 0 }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: B.bl, fontFamily: F }}>{cohort.filter(p => { const g = p.gender?.toLowerCase().trim(); return g !== 'f' && !g?.includes('female'); }).length}</div>
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
                                            {summary.count} players · Avg DNA Index: {summary.avgCCM.toFixed(2)}
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
                                                {p.abilityScore > 0 && <span style={{ fontSize: 8, fontWeight: 700, color: p.assessed ? B.grn : B.bl, fontFamily: F }}>{p.abilityScore.toFixed(2)}</span>}
                                                {p.abilityScore === 0 && <span style={{ fontSize: 8, color: B.g300, fontFamily: F }}>no stats</span>}
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
