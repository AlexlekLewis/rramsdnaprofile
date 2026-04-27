// ═══ MULTI-RATER IDP SECTION ═══
// Displays aggregated multi-rater scores from coach_assessment_items in the player's DNA / IDP view.
// Renders nothing if the player has no aggregated scores — safe to drop into any player view.
import React, { useEffect, useState, useMemo } from "react";
import { B, F, sCard } from "../data/theme";
import { loadPlayerAggregates, loadAssessmentItems } from "../db/multiraterDb";

const SECTION_LABELS = {
    batting: { label: 'Batting', color: B.bl, icon: '🏏' },
    bowling: { label: 'Bowling', color: B.pk, icon: '🎯' },
    wk:      { label: 'Wicket-Keeping', color: B.prp, icon: '🧤' },
};

function ScoreBar({ score, color }) {
    const pct = Math.round((score / 5) * 100);
    return (
        <div style={{ flex: 1, minWidth: 80, height: 8, background: B.g100, borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
                width: `${pct}%`, height: '100%', background: color, borderRadius: 4,
                transition: 'width 0.4s ease',
            }} />
        </div>
    );
}

export default function MultiRaterIDPSection({ playerId, sessionContext = 'assessment_week_2026' }) {
    const [aggregates, setAggregates] = useState([]);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!playerId) { setLoading(false); return; }
        let cancelled = false;
        (async () => {
            // Load aggregates first; only fetch item definitions if there are scores to render.
            // Avoids any extra network on the player home view when the new system is empty.
            const aggs = await loadPlayerAggregates(playerId, sessionContext);
            if (cancelled) return;
            if (!aggs.length) {
                setAggregates([]);
                setLoading(false);
                return;
            }
            const defs = await loadAssessmentItems();
            if (cancelled) return;
            setAggregates(aggs);
            setItems(defs);
            setLoading(false);
        })();
        return () => { cancelled = true; };
    }, [playerId, sessionContext]);

    const itemMap = useMemo(() => {
        const m = {};
        items.forEach(i => { m[i.key] = i; });
        return m;
    }, [items]);

    // Group aggregates by section, picking 'both' session_type as primary (or summing if separate)
    const grouped = useMemo(() => {
        const byKey = {};
        aggregates.forEach(a => {
            // Prefer 'both', then 'weekday', then 'weekend' if multiple session types per item
            const cur = byKey[a.item_key];
            if (!cur || a.session_type === 'both' || (cur.session_type !== 'both' && a.rater_count > cur.rater_count)) {
                byKey[a.item_key] = a;
            }
        });
        const sections = { batting: [], bowling: [], wk: [] };
        Object.values(byKey).forEach(a => {
            const def = itemMap[a.item_key];
            if (!def) return;
            sections[def.section]?.push({ ...a, def });
        });
        Object.keys(sections).forEach(s => {
            sections[s].sort((x, y) => (x.def.order || 0) - (y.def.order || 0));
        });
        return sections;
    }, [aggregates, itemMap]);

    const sectionAverages = useMemo(() => {
        const out = {};
        Object.entries(grouped).forEach(([key, list]) => {
            if (!list.length) return;
            const sum = list.reduce((acc, a) => acc + Number(a.avg_score || 0), 0);
            out[key] = sum / list.length;
        });
        return out;
    }, [grouped]);

    const totalRated = aggregates.length;
    const totalRaters = useMemo(() => {
        const max = aggregates.reduce((acc, a) => Math.max(acc, a.rater_count || 0), 0);
        return max;
    }, [aggregates]);

    if (loading) return null;
    if (totalRated === 0) return null;

    return (
        <div style={{ marginBottom: 16 }}>
            <div style={{
                background: `linear-gradient(135deg, ${B.bl}, ${B.pk})`,
                borderRadius: 14, padding: '14px 16px', marginBottom: 10, color: B.w,
            }}>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.5, opacity: 0.8, fontFamily: F, textTransform: 'uppercase' }}>
                    Coach Assessment Scores
                </div>
                <div style={{ fontSize: 17, fontWeight: 800, fontFamily: F, marginTop: 2 }}>
                    {totalRated} item{totalRated !== 1 ? 's' : ''} rated
                </div>
                <div style={{ fontSize: 10, fontFamily: F, marginTop: 3, opacity: 0.85 }}>
                    {totalRaters > 1 ? `Up to ${totalRaters} coaches contributed` : 'From your coach'} · Multi-rater averages
                </div>
            </div>

            {Object.entries(grouped).map(([sectionKey, list]) => {
                if (!list.length) return null;
                const meta = SECTION_LABELS[sectionKey];
                const avg = sectionAverages[sectionKey];
                return (
                    <div key={sectionKey} style={{ ...sCard, padding: 14, marginBottom: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: 18 }}>{meta.icon}</span>
                                <div style={{ fontSize: 13, fontWeight: 800, color: B.nvD, fontFamily: F }}>{meta.label}</div>
                            </div>
                            <div style={{
                                fontSize: 14, fontWeight: 800, color: meta.color, fontFamily: F,
                                background: `${meta.color}10`, padding: '4px 10px', borderRadius: 16,
                            }}>
                                {avg.toFixed(1)} / 5
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {list.map(a => (
                                <div key={a.item_key} style={{
                                    display: 'flex', flexDirection: 'column', gap: 4,
                                    paddingBottom: 8, borderBottom: `1px solid ${B.g100}`,
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                                        <div style={{ fontSize: 11, fontWeight: 700, color: B.nv, fontFamily: F, flex: 1 }}>
                                            {a.def.prompt}
                                        </div>
                                        <div style={{ fontSize: 11, fontWeight: 800, color: meta.color, fontFamily: F, minWidth: 28, textAlign: 'right' }}>
                                            {Number(a.avg_score).toFixed(1)}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <ScoreBar score={Number(a.avg_score)} color={meta.color} />
                                        <div style={{ fontSize: 9, color: B.g400, fontFamily: F, minWidth: 50, textAlign: 'right' }}>
                                            {a.rater_count} rater{a.rater_count !== 1 ? 's' : ''}
                                        </div>
                                    </div>
                                    {a.top_statement && (
                                        <div style={{ fontSize: 10, color: B.g600, fontFamily: F, lineHeight: 1.4, fontStyle: 'italic', marginTop: 2 }}>
                                            "{a.top_statement}"
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
