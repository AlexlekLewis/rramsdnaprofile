// ═══ ADMIN DASHBOARD — Cohort Overview, Rankings, Engagement, Squads ═══
import React, { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useAuth } from "../context/AuthContext";

import { B, F, sCard, getDkWrap, isDesktop } from "../data/theme";
import { ROLES } from "../data/skillItems";
import { getAge, getBracket } from "../engine/ratingEngine";
import { loadPlayersFromDB, loadPlayerScores } from "../db/playerDb";
import { loadProgramMembers, loadMemberEngagement } from "../db/adminDb";
import { loadAssessmentRosters, buildRosterLookup, matchPlayerToSquad } from "../db/sessionDb";
import { loadJournalHistory } from "../db/journalDb";
import { Hdr, SecH, InfoTooltip } from "../shared/FormComponents";

// ── Tab selector ──
const TabBar = ({ tabs, active, onSelect }) => (
    <div style={{ display: 'flex', gap: 4, overflowX: 'auto', padding: '8px 12px', background: B.g100, borderBottom: `1px solid ${B.g200}` }}>
        {tabs.map(t => (
            <button key={t.id} onClick={() => onSelect(t.id)}
                style={{ padding: '8px 14px', borderRadius: 8, border: active === t.id ? `1.5px solid ${B.bl}` : `1px solid ${B.g200}`, background: active === t.id ? `${B.bl}10` : B.w, color: active === t.id ? B.bl : B.g600, fontSize: 10, fontWeight: active === t.id ? 800 : 600, fontFamily: F, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {t.label}
            </button>
        ))}
    </div>
);

// ── Metric card ──
const MetricCard = ({ label, value, sub, color, tooltip }) => {
    const labelNode = (
        <div style={{ fontSize: 10, fontWeight: 700, color: B.g400, fontFamily: F, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 }}>
            {label}{tooltip ? ' ⓘ' : ''}
        </div>
    );
    return (
        <div style={{ ...sCard, padding: 16, textAlign: 'center', flex: '1 1 120px', marginBottom: 0 }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: color || B.nvD, fontFamily: F }}>{value}</div>
            {tooltip ? <InfoTooltip def={tooltip}>{labelNode}</InfoTooltip> : labelNode}
            {sub && <div style={{ fontSize: 9, color: B.g400, fontFamily: F, marginTop: 2 }}>{sub}</div>}
        </div>
    );
};

const TABS = [
    { id: 'overview', label: 'Overview' },
    { id: 'progress', label: 'Assessments' },
    { id: 'reflections', label: 'Reflections' },
    { id: 'rankings', label: 'Rankings' },
    { id: 'engagement', label: 'Engagement' },
    { id: 'reports', label: 'Reports' },
];

// Lazy-load heavy sub-views so they don't inflate the dashboard bundle
const AssessmentProgress = React.lazy(() => import('./AssessmentProgress'));
const WeeklyReflectionsAdmin = React.lazy(() => import('./WeeklyReflectionsAdmin'));

export default function AdminDashboard({ onBack }) {
    const { session, isAdmin } = useAuth();

    const [tab, setTab] = useState('overview');
    const [players, setPlayers] = useState([]);
    const [scores, setScores] = useState([]);
    const [rosters, setRosters] = useState({ skillWeek: [], gameSenseWeek: [] });
    const [engagement, setEngagement] = useState([]);
    const [journalCounts, setJournalCounts] = useState({});
    const [loading, setLoading] = useState(true);

    // Rankings state
    const [sortKey, setSortKey] = useState('name');
    const [sortDir, setSortDir] = useState('asc');
    const [filterRole, setFilterRole] = useState('all');
    const [filterAge, setFilterAge] = useState('all');
    const [filterAssessed, setFilterAssessed] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');


    const refreshData = useCallback(async () => {
        setLoading(true);
        try {
            const [ps, sc, rs, eng] = await Promise.all([
                loadPlayersFromDB(),
                loadPlayerScores(),
                loadAssessmentRosters(),
                loadMemberEngagement(),
            ]);
            setPlayers(ps);
            setScores(sc || []);
            setRosters(rs || { skillWeek: [], gameSenseWeek: [] });
            setEngagement(eng || []);
        } catch (e) {
            console.error('Admin data load error:', e);
        }
        setLoading(false);
    }, []);

    useEffect(() => { refreshData(); }, [refreshData]);

    // Build enriched players using stored scores from player_scores table
    const scoresByPlayer = useMemo(() => {
        const map = {};
        (scores || []).forEach(s => { map[s.player_id] = s; });
        return map;
    }, [scores]);

    // Build lookups from weekday + weekend rosters so each player can show both squads
    const wdLookup = useMemo(() => buildRosterLookup(rosters.skillWeek), [rosters.skillWeek]);
    const weLookup = useMemo(() => buildRosterLookup(rosters.gameSenseWeek), [rosters.gameSenseWeek]);
    const squadById = useMemo(() => {
        const m = {};
        [...rosters.skillWeek, ...rosters.gameSenseWeek].forEach(sq => { m[sq.id] = sq; });
        return m;
    }, [rosters]);

    const enrichedPlayers = useMemo(() => {
        return players.filter(p => p.submitted).map(p => {
            const hasCd = Object.keys(p.cd || {}).some(k => k.startsWith('t1_'));
            const sc = scoresByPlayer[p.id];
            // Build dn-compatible object from stored scores
            let dn = null;
            if (sc && sc.pdi > 0) {
                // Convert domain_scores array to keyed object for domain averages
                const domainMap = {};
                (sc.domain_scores || []).forEach(d => { domainMap[d.key] = d.css || 0; });
                dn = { overall: sc.pdi, pdiPct: sc.pdi_pct, g: sc.grade, domains: domainMap, sagi: sc.sagi, sagiLabel: sc.sagi_label };
            }
            const age = getAge(p.dob);
            const bracket = getBracket(p.dob);
            const roleObj = ROLES.find(r => r.id === p.role);
            const wdId = matchPlayerToSquad(wdLookup, rosters.skillWeek, p.name);
            const weId = matchPlayerToSquad(weLookup, rosters.gameSenseWeek, p.name);
            return { ...p, dn, age, bracket, roleLabel: roleObj?.label || p.role, ccm: sc?.ccm || 0, assessed: hasCd, wdSquad: squadById[wdId] || null, weSquad: squadById[weId] || null };
        });
    }, [players, scoresByPlayer, rosters, wdLookup, weLookup, squadById]);

    // Filtered + sorted rankings
    const rankedPlayers = useMemo(() => {
        let filtered = [...enrichedPlayers];
        if (filterRole !== 'all') filtered = filtered.filter(p => p.role === filterRole);
        if (filterAge !== 'all') filtered = filtered.filter(p => p.bracket === filterAge);
        if (filterAssessed === 'assessed') filtered = filtered.filter(p => p.assessed);
        if (filterAssessed === 'unassessed') filtered = filtered.filter(p => !p.assessed);
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(p => p.name?.toLowerCase().includes(term));
        }

        filtered.sort((a, b) => {
            let av, bv;
            switch (sortKey) {
                case 'name': av = a.name || ''; bv = b.name || ''; break;
                case 'pdi': av = a.dn?.overall || 0; bv = b.dn?.overall || 0; break;
                case 'ccm': av = a.ccm || 0; bv = b.ccm || 0; break;
                case 'age': av = a.age || 0; bv = b.age || 0; break;
                case 'role': av = a.roleLabel || ''; bv = b.roleLabel || ''; break;
                default: av = a.name || ''; bv = b.name || '';
            }
            if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
            return sortDir === 'asc' ? av - bv : bv - av;
        });
        return filtered;
    }, [enrichedPlayers, filterRole, filterAge, filterAssessed, searchTerm, sortKey, sortDir]);

    const toggleSort = (key) => {
        if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortKey(key); setSortDir('desc'); }
    };

    // Export to XLSX
    const handleExport = async () => {
        try {
            const XLSX = await import('xlsx');
            const data = rankedPlayers.map(p => ({
                Name: p.name, Role: p.roleLabel, Age: p.age, 'Age Group': p.bracket,
                PDI: p.dn?.overall?.toFixed(2) || '', CCM: p.ccm?.toFixed(2) || '',
                Assessed: p.assessed ? 'Yes' : 'No', Club: p.club || '',
                'Weekday Squad': p.wdSquad?.name || '',
                'Weekend Squad': p.weSquad?.name || '',
            }));
            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Rankings');
            XLSX.writeFile(wb, `RRAM_Rankings_${new Date().toISOString().split('T')[0]}.xlsx`);
        } catch (e) { console.error('Export failed:', e); }
    };

    if (loading) return (
        <div style={{ minHeight: '100vh', background: B.g50, fontFamily: F }}>
            <Hdr label="ADMIN DASHBOARD" />
            <div style={{ padding: 24, textAlign: 'center', color: B.g400, fontSize: 12 }}>Loading dashboard...</div>
        </div>
    );

    // ═══ COMPUTED STATS ═══
    const totalPlayers = enrichedPlayers.length;
    const assessedCount = enrichedPlayers.filter(p => p.assessed).length;
    const avgPDI = enrichedPlayers.filter(p => p.dn).reduce((sum, p) => sum + (p.dn.overall || 0), 0) / (enrichedPlayers.filter(p => p.dn).length || 1);
    const avgCCM = enrichedPlayers.filter(p => p.ccm).reduce((sum, p) => sum + p.ccm, 0) / (enrichedPlayers.filter(p => p.ccm).length || 1);
    const completionRate = totalPlayers > 0 ? Math.round((assessedCount / totalPlayers) * 100) : 0;

    // Onboarding funnel
    const onboardingComplete = engagement.filter(e => e.submitted).length;
    const onboardingPartial = engagement.filter(e => !e.submitted && e.onboardingPct > 0).length;
    const onboardingNotStarted = engagement.filter(e => !e.submitted && e.onboardingPct === 0).length;

    // Domain averages
    const domainAverages = {};
    const DM = [
        { k: 'tm', l: 'Technical', c: B.pk },
        { k: 'te', l: 'Tactical', c: '#0EA5E9' },
        { k: 'pc', l: 'Physical', c: B.nvD },
        { k: 'mr', l: 'Mental', c: B.prp },
        { k: 'af', l: 'Fielding', c: '#14B8A6' },
        { k: 'mi', l: 'Match Impact', c: B.org },
    ];
    DM.forEach(d => {
        const vals = enrichedPlayers.filter(p => p.dn?.domains?.[d.k]).map(p => p.dn.domains[d.k]);
        domainAverages[d.k] = vals.length > 0 ? (vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
    });

    const SortHeader = ({ k, label, w, tooltip }) => {
        const inner = (
            <span>{label}{tooltip ? ' ⓘ' : ''} {sortKey === k && (sortDir === 'asc' ? '↑' : '↓')}</span>
        );
        return (
            <th onClick={() => toggleSort(k)} style={{ padding: '8px 6px', fontSize: 9, fontWeight: 700, color: sortKey === k ? B.bl : B.g600, cursor: 'pointer', fontFamily: F, textAlign: 'left', width: w, borderBottom: `2px solid ${B.g200}`, userSelect: 'none' }}>
                {tooltip ? <InfoTooltip def={tooltip}>{inner}</InfoTooltip> : inner}
            </th>
        );
    };

    return (
        <div style={{ minHeight: '100vh', background: B.g50, fontFamily: F }}>
            <Hdr label="ADMIN DASHBOARD" />
            <div style={{ padding: '4px 12px', background: B.g100, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button onClick={onBack} style={{ fontSize: 10, fontWeight: 700, color: B.bl, background: 'none', border: 'none', cursor: 'pointer', fontFamily: F }}>
                    ← Back to Coach Portal
                </button>
            </div>

            <TabBar tabs={TABS} active={tab} onSelect={setTab} />

            <div style={{ padding: 12, ...getDkWrap() }}>

                {/* ═══ 3a: COHORT OVERVIEW ═══ */}
                {tab === 'overview' && (
                    <div>
                        <SecH title="Cohort Overview" sub={`${totalPlayers} players in cohort`} />
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
                            <MetricCard label="Total Players" value={totalPlayers} color={B.nvD} />
                            <MetricCard label="Assessed" value={assessedCount} sub={`${totalPlayers - assessedCount} pending`} color={B.grn} />
                            <MetricCard label="Avg PDI" value={avgPDI.toFixed(2)} color={B.pk} tooltip="pdi" />
                            <MetricCard label="Avg CCM" value={avgCCM.toFixed(2)} color={B.bl} tooltip="ccm" />
                            <MetricCard label="Completion" value={`${completionRate}%`} color={completionRate >= 80 ? B.grn : B.amb} />
                        </div>

                        {/* Onboarding Funnel */}
                        <div style={{ ...sCard, padding: 16 }}>
                            <div style={{ fontSize: 12, fontWeight: 800, color: B.nvD, fontFamily: F, marginBottom: 12 }}>Onboarding Funnel</div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                {[
                                    { label: 'Complete', count: onboardingComplete, color: B.grn },
                                    { label: 'In Progress', count: onboardingPartial, color: B.amb },
                                    { label: 'Not Started', count: onboardingNotStarted, color: B.red },
                                ].map(s => (
                                    <div key={s.label} style={{ flex: 1, textAlign: 'center', padding: '10px 8px', borderRadius: 8, background: `${s.color}10`, border: `1px solid ${s.color}30` }}>
                                        <div style={{ fontSize: 20, fontWeight: 800, color: s.color, fontFamily: F }}>{s.count}</div>
                                        <div style={{ fontSize: 9, fontWeight: 600, color: s.color, fontFamily: F }}>{s.label}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Domain Averages */}
                        <div style={{ ...sCard, padding: 16, marginTop: 12 }}>
                            <div style={{ fontSize: 12, fontWeight: 800, color: B.nvD, fontFamily: F, marginBottom: 12 }}>Programme Domain Averages</div>
                            {DM.map(d => {
                                const val = domainAverages[d.k] || 0;
                                return (
                                    <div key={d.k} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                        <div style={{ width: 80, fontSize: 10, fontWeight: 600, color: B.g600, fontFamily: F, textAlign: 'right' }}>{d.l}</div>
                                        <div style={{ flex: 1, height: 14, background: B.g100, borderRadius: 7, overflow: 'hidden' }}>
                                            <div style={{ width: `${Math.min(val * 20, 100)}%`, height: '100%', background: `linear-gradient(90deg, ${d.c}, ${d.c}CC)`, borderRadius: 7, transition: 'width 0.5s' }} />
                                        </div>
                                        <div style={{ width: 36, fontSize: 10, fontWeight: 700, color: B.nvD, fontFamily: F, textAlign: 'center' }}>{val.toFixed(1)}</div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Role breakdown */}
                        <div style={{ ...sCard, padding: 16, marginTop: 12 }}>
                            <div style={{ fontSize: 12, fontWeight: 800, color: B.nvD, fontFamily: F, marginBottom: 12 }}>Role Distribution</div>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                {ROLES.map(r => {
                                    const count = enrichedPlayers.filter(p => p.role === r.id).length;
                                    if (count === 0) return null;
                                    return (
                                        <div key={r.id} style={{ padding: '6px 12px', borderRadius: 8, background: B.g50, border: `1px solid ${B.g200}`, textAlign: 'center' }}>
                                            <div style={{ fontSize: 16, fontWeight: 800, color: B.nvD, fontFamily: F }}>{count}</div>
                                            <div style={{ fontSize: 8, fontWeight: 600, color: B.g400, fontFamily: F, textTransform: 'uppercase' }}>{r.label}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* ═══ 3a2: ASSESSMENT PROGRESS (coaches × players × sessions) ═══ */}
                {tab === 'progress' && (
                    <Suspense fallback={<div style={{ padding: 24, textAlign: 'center', color: B.g400, fontSize: 11, fontFamily: F }}>Loading progress…</div>}>
                        <AssessmentProgress />
                    </Suspense>
                )}

                {/* ═══ 3a3: WEEKLY REFLECTIONS (admin authors 3 Qs per week, players answer) ═══ */}
                {tab === 'reflections' && (
                    <Suspense fallback={<div style={{ padding: 24, textAlign: 'center', color: B.g400, fontSize: 11, fontFamily: F }}>Loading reflections…</div>}>
                        <WeeklyReflectionsAdmin />
                    </Suspense>
                )}

                {/* ═══ 3b: PLAYER RANKINGS TABLE ═══ */}
                {tab === 'rankings' && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <SecH title="Player Rankings" sub={`${rankedPlayers.length} players`} />
                            <button onClick={handleExport} style={{ fontSize: 10, fontWeight: 700, color: B.bl, background: `${B.bl}10`, border: `1px solid ${B.bl}30`, borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontFamily: F }}>
                                Export XLSX
                            </button>
                        </div>

                        {/* Search + Filters */}
                        <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                            <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search by name..."
                                style={{ flex: '1 1 180px', padding: '8px 12px', borderRadius: 8, border: `1px solid ${B.g200}`, fontSize: 11, fontFamily: F, outline: 'none' }} />
                            <select value={filterRole} onChange={e => setFilterRole(e.target.value)}
                                style={{ padding: '8px 10px', borderRadius: 8, border: `1px solid ${B.g200}`, fontSize: 10, fontFamily: F }}>
                                <option value="all">All Roles</option>
                                {ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                            </select>
                            <select value={filterAge} onChange={e => setFilterAge(e.target.value)}
                                style={{ padding: '8px 10px', borderRadius: 8, border: `1px solid ${B.g200}`, fontSize: 10, fontFamily: F }}>
                                <option value="all">All Ages</option>
                                <option value="U11-U13">U11-U13</option>
                                <option value="U14-U16">U14-U16</option>
                                <option value="U17-U19">U17-U19</option>
                                <option value="U20+">U20+</option>
                            </select>
                            <select value={filterAssessed} onChange={e => setFilterAssessed(e.target.value)}
                                style={{ padding: '8px 10px', borderRadius: 8, border: `1px solid ${B.g200}`, fontSize: 10, fontFamily: F }}>
                                <option value="all">All</option>
                                <option value="assessed">Assessed</option>
                                <option value="unassessed">Unassessed</option>
                            </select>
                        </div>

                        {/* Table */}
                        <div style={{ overflowX: 'auto', ...sCard, padding: 0, marginBottom: 0 }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, fontFamily: F }}>
                                <thead>
                                    <tr style={{ background: B.g50 }}>
                                        <SortHeader k="name" label="Name" />
                                        <SortHeader k="role" label="Role" w={60} />
                                        <SortHeader k="age" label="Age" w={40} />
                                        <SortHeader k="pdi" label="PDI" w={50} tooltip="pdi" />
                                        <SortHeader k="ccm" label="CCM" w={50} tooltip="ccm" />
                                        <th style={{ padding: '8px 6px', fontSize: 9, fontWeight: 700, color: B.g600, fontFamily: F, borderBottom: `2px solid ${B.g200}`, width: 60 }}>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rankedPlayers.map(p => (
                                        <tr key={p.id} style={{ borderBottom: `1px solid ${B.g100}` }}>
                                            <td style={{ padding: '10px 6px', fontWeight: 600, color: B.nvD }}>{p.name}</td>
                                            <td style={{ padding: '10px 6px', color: B.g600, fontSize: 10 }}>{p.roleLabel}</td>
                                            <td style={{ padding: '10px 6px', color: B.g600, fontSize: 10 }}>{p.age || '—'}</td>
                                            <td style={{ padding: '10px 6px', fontWeight: 700, color: p.dn ? B.pk : B.g400, fontSize: 10 }}>{p.dn?.overall?.toFixed(2) || '—'}</td>
                                            <td style={{ padding: '10px 6px', fontWeight: 700, color: p.ccm ? B.bl : B.g400, fontSize: 10 }}>{p.ccm?.toFixed(2) || '—'}</td>
                                            <td style={{ padding: '10px 6px' }}>
                                                <span style={{ fontSize: 8, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: p.assessed ? `${B.grn}15` : `${B.amb}15`, color: p.assessed ? B.grn : B.amb }}>
                                                    {p.assessed ? 'DONE' : 'PENDING'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ═══ 3d: ENGAGEMENT TRACKING ═══ */}
                {tab === 'engagement' && (
                    <div>
                        <SecH title="Engagement Tracking" sub="Player activity and onboarding status" />
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
                            <MetricCard label="Onboarded" value={onboardingComplete} color={B.grn} />
                            <MetricCard label="In Progress" value={onboardingPartial} color={B.amb} />
                            <MetricCard label="Assessed" value={assessedCount} color={B.pk} />
                        </div>

                        <div style={{ ...sCard, padding: 0 }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, fontFamily: F }}>
                                <thead>
                                    <tr style={{ background: B.g50 }}>
                                        <th style={{ padding: '8px 10px', fontSize: 9, fontWeight: 700, color: B.g600, fontFamily: F, textAlign: 'left', borderBottom: `2px solid ${B.g200}` }}>Name</th>
                                        <th style={{ padding: '8px 6px', fontSize: 9, fontWeight: 700, color: B.g600, fontFamily: F, textAlign: 'center', borderBottom: `2px solid ${B.g200}` }}>Onboarded</th>
                                        <th style={{ padding: '8px 6px', fontSize: 9, fontWeight: 700, color: B.g600, fontFamily: F, textAlign: 'center', borderBottom: `2px solid ${B.g200}` }}>Assessed</th>
                                        <th style={{ padding: '8px 6px', fontSize: 9, fontWeight: 700, color: B.g600, fontFamily: F, textAlign: 'center', borderBottom: `2px solid ${B.g200}` }}>Onb %</th>
                                        <th style={{ padding: '8px 6px', fontSize: 9, fontWeight: 700, color: B.g600, fontFamily: F, textAlign: 'left', borderBottom: `2px solid ${B.g200}` }}>Joined</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {engagement.map(e => {
                                        const player = enrichedPlayers.find(p => p.id === e.id);
                                        return (
                                            <tr key={e.id} style={{ borderBottom: `1px solid ${B.g100}` }}>
                                                <td style={{ padding: '8px 10px', fontWeight: 600, color: B.nvD }}>{e.name || 'Unknown'}</td>
                                                <td style={{ padding: '8px 6px', textAlign: 'center' }}>
                                                    <span style={{ fontSize: 10, color: e.submitted ? B.grn : B.red }}>{e.submitted ? '✓' : '✗'}</span>
                                                </td>
                                                <td style={{ padding: '8px 6px', textAlign: 'center' }}>
                                                    <span style={{ fontSize: 10, color: player?.assessed ? B.grn : B.g400 }}>{player?.assessed ? '✓' : '—'}</span>
                                                </td>
                                                <td style={{ padding: '8px 6px', textAlign: 'center', fontSize: 10, fontWeight: 600, color: e.onboardingPct >= 100 ? B.grn : e.onboardingPct > 0 ? B.amb : B.g400 }}>
                                                    {e.onboardingPct}%
                                                </td>
                                                <td style={{ padding: '8px 6px', fontSize: 9, color: B.g400 }}>
                                                    {e.joinDate ? new Date(e.joinDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) : '—'}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ═══ 3e: SQUAD MANAGEMENT ═══ */}
                {/* ═══ 3g: REPORT CARDS HUB ═══ */}
                {tab === 'reports' && (
                    <div>
                        <SecH title="Report Cards" sub="Generate and download player reports" />
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
                            <MetricCard label="Assessed" value={assessedCount} color={B.grn} />
                            <MetricCard label="Pending" value={totalPlayers - assessedCount} color={B.amb} />
                        </div>

                        <div style={{ ...sCard, padding: 0 }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, fontFamily: F }}>
                                <thead>
                                    <tr style={{ background: B.g50 }}>
                                        <th style={{ padding: '8px 10px', fontSize: 9, fontWeight: 700, color: B.g600, fontFamily: F, textAlign: 'left', borderBottom: `2px solid ${B.g200}` }}>Player</th>
                                        <th style={{ padding: '8px 6px', fontSize: 9, fontWeight: 700, color: B.g600, fontFamily: F, textAlign: 'center', borderBottom: `2px solid ${B.g200}` }}>Assessed</th>
                                        <th style={{ padding: '8px 6px', fontSize: 9, fontWeight: 700, color: B.g600, fontFamily: F, textAlign: 'center', borderBottom: `2px solid ${B.g200}` }}>Narrative</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {enrichedPlayers.map(p => {
                                        const hasNarrative = !!(p.cd?.narrative);
                                        return (
                                            <tr key={p.id} style={{ borderBottom: `1px solid ${B.g100}` }}>
                                                <td style={{ padding: '8px 10px', fontWeight: 600, color: B.nvD }}>{p.name}</td>
                                                <td style={{ padding: '8px 6px', textAlign: 'center' }}>
                                                    <span style={{ fontSize: 10, color: p.assessed ? B.grn : B.g400 }}>{p.assessed ? '✓' : '—'}</span>
                                                </td>
                                                <td style={{ padding: '8px 6px', textAlign: 'center' }}>
                                                    <span style={{ fontSize: 10, color: hasNarrative ? B.grn : B.g400 }}>{hasNarrative ? '✓' : '—'}</span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
