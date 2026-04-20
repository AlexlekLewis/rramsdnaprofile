// ═══ SQUAD ROSTER — Read-only view of the 8-squad elite program roster ═══
// Source of truth: sp_squads + sp_squad_players (populated from the Google Sheet).
import React, { useState, useEffect } from "react";
import { B, F, sCard, getDkWrap } from "../data/theme";
import { SecH } from "../shared/FormComponents";
import { loadAssessmentRosters } from "../db/sessionDb";

const SECTION_LABELS = {
    weekday: { title: 'Weekday Sessions', sub: 'Mon–Fri evenings · Skill-focus week' },
    weekend: { title: 'Weekend Sessions', sub: 'Sat–Sun · Game-sense week' },
};

function SquadCard({ squad }) {
    const count = squad.playerNames.length;
    const femaleCount = squad.playerNames.filter(p => {
        const g = (p.gender || '').toLowerCase().trim();
        return g === 'f' || g.includes('female');
    }).length;
    return (
        <div style={{ ...sCard, padding: 0, marginBottom: 12, overflow: 'hidden', borderLeft: `4px solid ${squad.color}` }}>
            <div style={{ padding: '12px 14px 10px', borderBottom: `1px solid ${B.g100}`, background: `${squad.color}08` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: B.nvD, fontFamily: F }}>{squad.name}</div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: squad.color, fontFamily: F }}>{count} players{femaleCount > 0 ? ` · ${femaleCount}F` : ''}</div>
                </div>
            </div>
            {count === 0 ? (
                <div style={{ padding: 16, textAlign: 'center', fontSize: 11, color: B.g400, fontFamily: F, fontStyle: 'italic' }}>No players allocated</div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 1, background: B.g100 }}>
                    {squad.playerNames.map((p, i) => {
                        const g = (p.gender || '').toLowerCase().trim();
                        const isFemale = g === 'f' || g.includes('female');
                        return (
                            <div key={`${squad.id}-${i}`} style={{ padding: '8px 10px', background: B.w, fontSize: 11, color: B.nvD, fontFamily: F, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: isFemale ? B.pk : B.bl, flexShrink: 0 }} />
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function SectionBlock({ kind, squads }) {
    const labels = SECTION_LABELS[kind];
    const total = squads.reduce((sum, s) => sum + s.playerNames.length, 0);
    return (
        <div style={{ marginBottom: 24 }}>
            <SecH title={labels.title} sub={`${labels.sub} · ${total} allocations across ${squads.length} squads`} />
            {squads.map(squad => <SquadCard key={squad.id} squad={squad} />)}
        </div>
    );
}

export default function SquadRoster() {
    const [rosters, setRosters] = useState({ skillWeek: [], gameSenseWeek: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            try {
                const data = await loadAssessmentRosters();
                if (!cancelled) setRosters(data);
            } catch (e) {
                if (!cancelled) setError(e.message || 'Failed to load squads');
            }
            if (!cancelled) setLoading(false);
        })();
        return () => { cancelled = true; };
    }, []);

    if (loading) return <div style={{ padding: 24, textAlign: 'center', color: B.g400, fontSize: 12, fontFamily: F }}>Loading squad roster...</div>;
    if (error) return <div style={{ padding: 24, textAlign: 'center', color: B.red, fontSize: 12, fontFamily: F }}>Error: {error}</div>;

    const wdTotal = rosters.skillWeek.reduce((s, sq) => s + sq.playerNames.length, 0);
    const weTotal = rosters.gameSenseWeek.reduce((s, sq) => s + sq.playerNames.length, 0);
    const allNames = new Set();
    [...rosters.skillWeek, ...rosters.gameSenseWeek].forEach(sq => sq.playerNames.forEach(p => allNames.add(p.normName)));

    return (
        <div style={{ padding: 12, ...getDkWrap() }}>
            {/* Header stats */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                <div style={{ ...sCard, padding: 12, flex: '1 1 80px', textAlign: 'center', marginBottom: 0 }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: B.nvD, fontFamily: F }}>{allNames.size}</div>
                    <div style={{ fontSize: 9, fontWeight: 700, color: B.g400, fontFamily: F, textTransform: 'uppercase', letterSpacing: 0.5 }}>Unique Players</div>
                </div>
                <div style={{ ...sCard, padding: 12, flex: '1 1 80px', textAlign: 'center', marginBottom: 0 }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: B.bl, fontFamily: F }}>{wdTotal}</div>
                    <div style={{ fontSize: 9, fontWeight: 700, color: B.g400, fontFamily: F, textTransform: 'uppercase', letterSpacing: 0.5 }}>Weekday</div>
                </div>
                <div style={{ ...sCard, padding: 12, flex: '1 1 80px', textAlign: 'center', marginBottom: 0 }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: B.pk, fontFamily: F }}>{weTotal}</div>
                    <div style={{ fontSize: 9, fontWeight: 700, color: B.g400, fontFamily: F, textTransform: 'uppercase', letterSpacing: 0.5 }}>Weekend</div>
                </div>
                <div style={{ ...sCard, padding: 12, flex: '1 1 80px', textAlign: 'center', marginBottom: 0 }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: B.grn, fontFamily: F }}>{wdTotal + weTotal}</div>
                    <div style={{ fontSize: 9, fontWeight: 700, color: B.g400, fontFamily: F, textTransform: 'uppercase', letterSpacing: 0.5 }}>Total Slots</div>
                </div>
            </div>

            <SectionBlock kind="weekday" squads={rosters.skillWeek} />
            <SectionBlock kind="weekend" squads={rosters.gameSenseWeek} />

            <div style={{ fontSize: 10, color: B.g400, fontFamily: F, textAlign: 'center', marginTop: 16, fontStyle: 'italic' }}>
                Source: Elite Program Roster (Google Sheet) · Synced to sp_squad_players.
            </div>
        </div>
    );
}
