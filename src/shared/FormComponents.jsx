// ═══ SHARED UI COMPONENTS ═══
import { useState, useEffect, useMemo } from 'react';
import { B, F, LOGO, sGrad, sCard, isDesktop, getDSZ, getDSF } from '../data/theme';
import { TIER_GROUPS, isCommunityGroup } from '../data/competitionData';
import { getAge } from '../engine/ratingEngine';
import { getItemSession } from '../data/skillItems';

// ═══ HEADER ═══
export function Hdr({ label, onLogoClick }) {
    return (
        <div style={{ ...sGrad, padding: "16px 16px 14px", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: -20, right: -30, width: 180, height: 180, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.06)" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <img src={LOGO} alt="" onClick={onLogoClick} style={{ width: 40, height: 40, objectFit: "contain", cursor: onLogoClick ? "pointer" : "default", transition: "opacity 0.2s" }} title={onLogoClick ? "Sign out" : undefined} />
                <div>
                    <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.6)", letterSpacing: 2, textTransform: "uppercase", fontFamily: F }}>Rajasthan Royals Academy Melbourne</div>
                    <div style={{ fontSize: 17, fontWeight: 800, color: B.w, fontFamily: F }}>Player DNA Report</div>
                </div>
            </div>
            <div style={{ display: "inline-block", marginTop: 5, padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 700, fontFamily: F, background: label === "COACH PORTAL" ? "rgba(255,255,255,0.2)" : B.pk, color: B.w }}>{label}</div>
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: B.pk }} />
        </div>
    );
}

// ═══ SECTION HEADER ═══
export function SecH({ title, sub }) {
    return (
        <div style={{ marginTop: 20, marginBottom: 10, paddingLeft: 10, borderLeft: `3px solid ${B.pk}` }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: B.nvD, textTransform: "uppercase", fontFamily: F, letterSpacing: .5 }}>{title}</div>
            {sub && <div style={{ fontSize: 10, color: B.g600, fontStyle: "italic", marginTop: 1, fontFamily: F }}>{sub}</div>}
        </div>
    );
}

// ═══ TEXT INPUT ═══
export function Inp({ label, value, onChange, ph, half, type = "text" }) {
    return (
        <div style={{ flex: half ? 1 : "auto", minWidth: half ? 130 : "auto", marginBottom: 8 }}>
            {label && <div style={{ fontSize: 10, color: B.g600, fontFamily: F, marginBottom: 1 }}>{label}</div>}
            <input type={type} value={value || ""} onChange={e => onChange(e.target.value)} placeholder={ph}
                style={{ width: "100%", border: "none", borderBottom: `1.5px solid ${B.g200}`, padding: "5px 0", fontSize: 12, fontFamily: F, color: B.g800, outline: "none", background: "transparent", boxSizing: "border-box" }} />
        </div>
    );
}

// ═══ SELECT ═══
export function Sel({ label, value, onChange, opts, half }) {
    return (
        <div style={{ flex: half ? 1 : "auto", minWidth: half ? 130 : "auto", marginBottom: 8 }}>
            {label && <div style={{ fontSize: 10, color: B.g600, fontFamily: F, marginBottom: 1 }}>{label}</div>}
            <select value={value || ""} onChange={e => onChange(e.target.value)}
                style={{ width: "100%", border: "none", borderBottom: `1.5px solid ${B.g200}`, padding: "5px 0", fontSize: 12, fontFamily: F, color: value ? B.g800 : B.g400, outline: "none", background: "transparent", boxSizing: "border-box" }}>
                <option value="">Select...</option>
                {opts.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
        </div>
    );
}

// ═══ TEXTAREA ═══
export function TArea({ label, value, onChange, ph, rows = 2 }) {
    return (
        <div style={{ marginBottom: 10 }}>
            {label && <div style={{ fontSize: 11, fontWeight: 600, color: B.g800, fontStyle: "italic", fontFamily: F, marginBottom: 3 }}>{label}</div>}
            <textarea value={value || ""} onChange={e => onChange(e.target.value)} placeholder={ph} rows={rows}
                style={{ width: "100%", border: `1px solid ${B.g200}`, borderRadius: 6, padding: "6px 8px", fontSize: 12, fontFamily: F, color: B.g800, resize: "vertical", outline: "none", boxSizing: "border-box" }} />
        </div>
    );
}

// ═══ NUMBER INPUT ═══
export function NumInp({ label, value, onChange, w = 52 }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: w }}>
            <div style={{ fontSize: 8, fontWeight: 700, color: B.g400, fontFamily: F, marginBottom: 2, textTransform: "uppercase" }}>{label}</div>
            <input type="number" value={value || ""} onChange={e => onChange(e.target.value)} placeholder="—"
                style={{ width: "100%", border: "none", borderBottom: `1.5px solid ${B.g200}`, padding: "4px 0", fontSize: 13, fontWeight: 600, fontFamily: F, color: B.g800, outline: "none", background: "transparent", boxSizing: "border-box", textAlign: "center" }} />
        </div>
    );
}

// ═══ DOTS (1-5 RATING — standalone, kept for other uses) ═══
export function Dots({ value, onChange, color = B.pk }) {
    return (
        <div style={{ display: "flex", gap: isDesktop() ? 6 : 5 }}>
            {[1, 2, 3, 4, 5].map(n => (
                <button key={n} onClick={() => onChange(value === n ? 0 : n)}
                    style={{
                        width: getDSZ(), height: getDSZ(), borderRadius: "50%", border: `2px solid ${value >= n ? color : B.g200}`,
                        background: value >= n ? color : "transparent", cursor: "pointer", transition: "all 0.2s",
                        display: "flex", alignItems: "center", justifyContent: "center", fontSize: getDSF(), fontWeight: 700,
                        color: value >= n ? B.w : B.g400, fontFamily: F
                    }}>{n}</button>
            ))}
        </div>
    );
}

// ═══ ASSESSMENT GRID — 3-column accordion tiles with green completion ring ═══
const RATING_LABELS = ['', 'Just Starting', 'Developing', 'Solid', 'Strong', 'Elite'];
const COACH_LABELS = ['', 'Novice', 'Developing', 'Competent', 'Advanced', 'Elite'];

export function AssGrid({ items, values, onRate, color, SKILL_DEFS, keyPrefix, activeSession }) {
    const [openIdx, setOpenIdx] = useState(null);
    const mobile = !isDesktop();
    return (
        <div style={{ display: 'grid', gridTemplateColumns: isDesktop() ? 'repeat(3, 1fr)' : '1fr', gap: 6 }}>
            {items.map((item, i) => {
                const k = `${keyPrefix}_${i}`;
                const v = values[k] || 0;
                const isOpen = openIdx === i;
                const defs = SKILL_DEFS?.[item];
                const done = v > 0;
                const itemSession = getItemSession(item);
                const locked = !!activeSession && itemSession !== 'both' && itemSession !== activeSession;
                const lockLabel = itemSession === 'weekend' ? 'Weekend' : itemSession === 'weekday' ? 'Weekday' : null;
                const lockColor = itemSession === 'weekend' ? B.pk : B.bl;
                return (
                    <div key={item} style={{
                        background: locked ? B.g50 : (isOpen ? B.w : B.g100),
                        borderRadius: 10,
                        border: isOpen ? `2px solid ${color}40` : `1.5px solid ${locked ? `${lockColor}25` : (done ? `${B.grn}50` : B.g200)}`,
                        overflow: 'hidden',
                        transition: 'all 0.25s ease',
                        gridColumn: isOpen && isDesktop() ? '1 / -1' : undefined,
                        boxShadow: isOpen ? `0 4px 16px ${color}15` : 'none',
                        opacity: locked ? 0.62 : 1,
                    }}>
                        {/* ── Tile header with inline rating ── */}
                        <div style={{ padding: '8px 10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                                {/* Completion indicator */}
                                <div style={{
                                    width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                                    border: `2px solid ${done ? B.grn : B.g200}`,
                                    background: done ? `${B.grn}15` : 'transparent',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    {done ? <span style={{ fontSize: 10, color: B.grn, fontWeight: 800 }}>✓</span>
                                         : <span style={{ fontSize: 7, color: B.g400 }}>—</span>}
                                </div>
                                {/* Skill name — tap to expand definitions */}
                                <div onClick={() => setOpenIdx(isOpen ? null : i)} style={{
                                    flex: 1, fontSize: 11, fontWeight: 600, color: B.g800, fontFamily: F,
                                    cursor: 'pointer', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                }}>
                                    {item}
                                </div>
                                {locked && lockLabel && (
                                    <span title={`This item is scored in the ${lockLabel.toLowerCase()} session`}
                                        style={{
                                            flexShrink: 0, fontSize: 8, fontWeight: 800, color: lockColor,
                                            background: `${lockColor}15`, border: `1px solid ${lockColor}40`,
                                            borderRadius: 4, padding: '2px 6px', fontFamily: F,
                                            textTransform: 'uppercase', letterSpacing: 0.4,
                                        }}>🔒 {lockLabel}</span>
                                )}
                                {defs && <span onClick={() => setOpenIdx(isOpen ? null : i)} style={{
                                    fontSize: 10, color: B.g400, cursor: 'pointer', flexShrink: 0,
                                    transform: isOpen ? 'rotate(180deg)' : 'rotate(0)',
                                    transition: 'transform 0.25s', display: 'inline-block',
                                }}>▾</span>}
                            </div>
                            {/* ── Inline quick-rate buttons ── */}
                            <div style={{ display: 'flex', gap: mobile ? 6 : 5, justifyContent: 'space-between' }}>
                                {[1, 2, 3, 4, 5].map(n => {
                                    const sel = v === n;
                                    const labels = defs ? COACH_LABELS : RATING_LABELS;
                                    return (
                                        <button key={n} onClick={() => { if (!locked) onRate(k, v === n ? 0 : n); }}
                                            disabled={locked}
                                            title={locked && lockLabel ? `Assessed in the ${lockLabel.toLowerCase()} session` : undefined}
                                            style={{
                                                flex: 1, minHeight: mobile ? 38 : 32, maxWidth: mobile ? 64 : 56,
                                                border: sel ? `2px solid ${color}` : `1.5px solid ${B.g200}`,
                                                borderRadius: 8,
                                                background: sel ? `${color}15` : B.w,
                                                cursor: locked ? 'not-allowed' : 'pointer',
                                                display: 'flex', flexDirection: 'column',
                                                alignItems: 'center', justifyContent: 'center', gap: 1,
                                                padding: '4px 2px',
                                                transition: 'all 0.15s',
                                                boxShadow: sel ? `0 1px 4px ${color}25` : 'none',
                                            }}
                                        >
                                            <div style={{
                                                fontSize: mobile ? 14 : 12, fontWeight: 800,
                                                color: sel ? color : B.g400, fontFamily: F,
                                            }}>{n}</div>
                                            <div style={{
                                                fontSize: 7, fontWeight: 600,
                                                color: sel ? color : B.g400,
                                                fontFamily: F, lineHeight: 1.1,
                                                textAlign: 'center',
                                            }}>{labels[n]}</div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* ── Expanded definition (tap skill name to toggle) ── */}
                        {isOpen && defs && (
                            <div style={{ padding: '0 10px 10px' }}>
                                {v > 0 ? (
                                    <div style={{
                                        background: `${color}08`, borderRadius: 8,
                                        padding: '8px 12px', border: `1px solid ${color}20`,
                                    }}>
                                        <div style={{ fontSize: 10, color: color, fontWeight: 700, fontFamily: F, marginBottom: 2 }}>
                                            Level {v} — {COACH_LABELS[v]}
                                        </div>
                                        <div style={{ fontSize: 10, color: B.g600, fontFamily: F, lineHeight: 1.5 }}>
                                            {defs[v]}
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ background: B.g50, borderRadius: 8, padding: '8px 10px', border: `1px solid ${B.g200}` }}>
                                        <div style={{ fontSize: 9, fontWeight: 700, color: B.g400, fontFamily: F, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                            Scoring guide
                                        </div>
                                        {[1, 2, 3, 4, 5].map(n => (
                                            <div key={n} style={{ display: 'flex', gap: 6, marginBottom: n < 5 ? 3 : 0, alignItems: 'flex-start', opacity: 0.7 }}>
                                                <div style={{ fontSize: 8, fontWeight: 800, color: B.g400, fontFamily: F, width: 12, flexShrink: 0, marginTop: 1 }}>{n}.</div>
                                                <div style={{ fontSize: 9, color: B.g500, fontFamily: F, lineHeight: 1.4 }}>{defs[n]}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// ═══ ASSESSMENT ROW (legacy — kept for backward compat) ═══
export function AssRow({ label, value, onR, color, SKILL_DEFS }) {
    const [showDefs, setShowDefs] = useState(false);
    const defs = SKILL_DEFS?.[label];
    return (
        <div style={{ background: B.g100, borderRadius: 6, padding: isDesktop() ? '10px 14px' : '10px 12px', marginBottom: 5 }}>
            <div style={{ ...(isDesktop() ? { display: 'flex', alignItems: 'center', justifyContent: 'space-between' } : {}) }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: isDesktop() ? 0 : 6 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: B.g800, fontFamily: F }}>{label}</div>
                    {defs && <button onClick={(e) => { e.stopPropagation(); setShowDefs(s => !s); }}
                        style={{ width: 18, height: 18, borderRadius: '50%', border: `1.5px solid ${showDefs ? color : B.g300}`, background: showDefs ? `${color}15` : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: showDefs ? color : B.g400, fontFamily: F, padding: 0, lineHeight: 1, flexShrink: 0 }}
                        title="Show rating guide">ⓘ</button>}
                </div>
                <Dots value={value || 0} onChange={onR} color={color} />
            </div>
            {showDefs && defs && (
                <div style={{ marginTop: 8, padding: '8px 10px', background: B.w, borderRadius: 6, border: `1px solid ${color}25` }}>
                    {[1, 2, 3, 4, 5].map(n => (
                        <div key={n} style={{ display: 'flex', gap: 6, marginBottom: n < 5 ? 4 : 0, alignItems: 'flex-start' }}>
                            <div style={{ width: 18, height: 18, borderRadius: '50%', border: `1.5px solid ${value >= n ? color : B.g200}`, background: value >= n ? color : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 800, color: value >= n ? B.w : B.g400, fontFamily: F, flexShrink: 0, marginTop: 1 }}>{n}</div>
                            <div style={{ fontSize: 10, color: value === n ? B.g800 : B.g500, fontFamily: F, lineHeight: 1.4, fontWeight: value === n ? 700 : 400 }}>{defs[n]}</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ═══ RING (circular progress) ═══
export function Ring({ value, size = 100, color = B.pk, label }) {
    const r = (size - 12) / 2, c = 2 * Math.PI * r, off = c - (c * (value || 0) / 100);
    return (
        <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
            <svg width={size} height={size}><circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6" />
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={value > 0 ? color : "rgba(255,255,255,0.1)"}
                    strokeWidth="6" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={value > 0 ? off : c}
                    transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: "stroke-dashoffset 1s" }} /></svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <div style={{ fontSize: size * .26, fontWeight: 900, color: B.w, fontFamily: F, lineHeight: 1 }}>{value > 0 ? value : "—"}</div>
                {label && <div style={{ fontSize: 7, fontWeight: 700, color: "rgba(255,255,255,0.5)", fontFamily: F, marginTop: 1 }}>{label}</div>}
            </div>
        </div>
    );
}

// ═══ SCORE DEFINITIONS (shared across coach + admin portals) ═══
export const SCORE_DEFS = {
    overall: {
        name: 'Overall Player Score',
        short: '⭐ Overall',
        range: '0 – 100',
        desc: 'Combined weighted score from all assessments. Blends PDI, CCM, and completion quality into a single headline number so you can rank players at a glance.',
    },
    pdi: {
        name: 'Player Development Index',
        short: 'PDI',
        range: '1.0 – 5.0',
        desc: 'Weighted average of all 8 skill pillars on a 1–5 scale. Each pillar\'s weight changes by role — e.g. Technical Mastery counts more for spinners than pace bowlers.',
    },
    ccm: {
        name: 'Competition Context Multiplier',
        short: 'CCM',
        range: '0.5 – 2.0+',
        desc: 'Adjusts PDI by what level the player competes at and how old they are relative to that level. A young player thriving at a high level gets an uplift.',
    },
    cti: {
        name: 'Competition Tier Index',
        short: 'CTI',
        range: '0.5 – 2.0',
        desc: 'The "what level" part of CCM. Premier Cricket scores higher than Community cricket. Higher tier = higher CTI.',
    },
    arm: {
        name: 'Age Relativity Multiplier',
        short: 'ARM',
        range: '0.8 – 1.5',
        desc: 'The "age vs age-group" part of CCM. Younger players in higher groups get a boost. Older players in lower groups get a slight downward adjustment.',
    },
    trajectory: {
        name: 'Positive Trajectory',
        short: '🚀 Trajectory',
        range: '',
        desc: 'Flags a player who is young for their competition level AND rating well (PDI 2.5+). Signals a strong development curve — worth tracking closely.',
    },
};

// ═══ INFO TOOLTIP (hover on desktop, tap on mobile) ═══
export function InfoTooltip({ def, children, placement = 'top', inline = true }) {
    const [open, setOpen] = useState(false);
    const d = typeof def === 'string' ? SCORE_DEFS[def] : def;
    if (!d) return children;

    const show = () => setOpen(true);
    const hide = () => setOpen(false);
    const toggle = (e) => { e.stopPropagation(); setOpen(o => !o); };

    useEffect(() => {
        if (!open) return;
        const onDoc = () => setOpen(false);
        const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('click', onDoc);
        document.addEventListener('keydown', onKey);
        return () => { document.removeEventListener('click', onDoc); document.removeEventListener('keydown', onKey); };
    }, [open]);

    const pop = {
        position: 'absolute',
        zIndex: 9999,
        [placement === 'top' ? 'bottom' : 'top']: 'calc(100% + 8px)',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 240,
        maxWidth: 'calc(100vw - 32px)',
        background: B.nvD,
        color: B.w,
        borderRadius: 8,
        padding: '10px 12px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
        fontFamily: F,
        textAlign: 'left',
        pointerEvents: 'none',
        border: `1px solid ${B.g200}`,
    };

    return (
        <span
            style={{ position: 'relative', display: inline ? 'inline-flex' : 'flex', cursor: 'help' }}
            onMouseEnter={show}
            onMouseLeave={hide}
            onFocus={show}
            onBlur={hide}
            onClick={toggle}
            tabIndex={0}
            aria-label={`${d.name} — info`}
        >
            {children}
            {open && (
                <span style={pop} role="tooltip">
                    <span style={{ display: 'block', fontSize: 11, fontWeight: 800, color: B.w, marginBottom: 2 }}>{d.name}</span>
                    {d.range && <span style={{ display: 'block', fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.55)', marginBottom: 6, letterSpacing: 0.3 }}>Range: {d.range}</span>}
                    <span style={{ display: 'block', fontSize: 10, lineHeight: 1.45, color: 'rgba(255,255,255,0.88)' }}>{d.desc}</span>
                </span>
            )}
        </span>
    );
}

// ═══ COMPETITION LEVEL SELECTOR ═══
export function CompLevelSel({ value, onChange, compTiers, gender, assocComps, vmcuAssocs, playerAssoc, playerDob }) {
    const [selGroup, setSelGroup] = useState(() => {
        if (!value) return null;
        const tier = (compTiers || []).find(t => t.code === value);
        if (!tier) return null;
        return TIER_GROUPS.find(g => g.tiers.some(tg => tier.tier === tg)) || null;
    });
    const [selAssoc, setSelAssoc] = useState(() => {
        if (!value) return null;
        const tier = (compTiers || []).find(t => t.code === value);
        if (!tier) return null;
        const grp = TIER_GROUPS.find(g => g.tiers.some(tg => tier.tier === tg));
        if (!grp || !isCommunityGroup(grp)) return null;
        const ac = (assocComps || []).find(c => c.competition_tier_code === value);
        return ac ? ac.association_abbrev : null;
    });
    const [autoAssoc, setAutoAssoc] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const playerAge = useMemo(() => getAge(playerDob), [playerDob]);

    // Auto-select association when Community group is picked and playerAssoc matches
    useEffect(() => {
        if (!selGroup || !isCommunityGroup(selGroup) || selAssoc) return;
        if (!playerAssoc) return;
        const uniqueAssocs = [...new Set((assocComps || []).map(c => c.association_abbrev))];
        if (uniqueAssocs.includes(playerAssoc)) {
            setSelAssoc(playerAssoc);
            setAutoAssoc(true);
            setExpanded({});
        }
    }, [selGroup, playerAssoc, assocComps, selAssoc]);

    const tiersForGroup = selGroup && !isCommunityGroup(selGroup) ? (compTiers || []).filter(t => {
        const gMatch = !gender || t.gender === gender || t.gender === 'All' || t.gender === 'Mixed' || t.gender === 'M/F';
        return selGroup.tiers.includes(t.tier) && gMatch;
    }) : [];

    const compsForAssoc = useMemo(() => (selAssoc && isCommunityGroup(selGroup)) ? (assocComps || []).filter(c => {
        if (c.association_abbrev !== selAssoc) return false;
        if (!gender) return true;
        return c.gender === gender || c.gender === 'All' || c.gender === 'Mixed';
    }) : [], [selAssoc, selGroup, assocComps, gender]);

    // Group competitions into Senior / Junior / Girls sections
    const sections = useMemo(() => {
        if (!compsForAssoc.length) return [];
        const senior = compsForAssoc.filter(c => c.age_group === 'Senior' && c.gender !== 'F');
        const junior = compsForAssoc.filter(c => c.age_group && c.age_group.startsWith('U') && c.gender !== 'F');
        const girls = compsForAssoc.filter(c => c.gender === 'F');
        const groups = [];
        if (senior.length) groups.push({ key: 'senior', label: 'Senior', icon: '🏏', comps: senior });
        if (junior.length) groups.push({ key: 'junior', label: 'Junior', icon: '🌟', comps: junior });
        if (girls.length) groups.push({ key: 'girls', label: "Girls / Women's", icon: '💜', comps: girls });
        // Age-based ordering: juniors first if player is under 18
        if (playerAge !== null && playerAge < 18 && groups.length > 1) {
            const jIdx = groups.findIndex(g => g.key === 'junior');
            if (jIdx > 0) { const [j] = groups.splice(jIdx, 1); groups.unshift(j); }
        }
        return groups;
    }, [compsForAssoc, playerAge]);

    // Expanded sections state — default: first section open
    const [expanded, setExpanded] = useState({});
    useEffect(() => {
        if (sections.length > 0 && Object.keys(expanded).length === 0) {
            setExpanded({ [sections[0].key]: true });
        }
    }, [sections, expanded]);

    // Search filtering
    const filteredSections = useMemo(() => {
        if (!searchTerm.trim()) return sections;
        const q = searchTerm.toLowerCase();
        return sections.map(s => ({
            ...s,
            comps: s.comps.filter(c => c.competition_label.toLowerCase().includes(q)),
        })).filter(s => s.comps.length > 0);
    }, [sections, searchTerm]);

    // Auto-expand matching sections when searching
    useEffect(() => {
        if (searchTerm.trim()) {
            const exp = {};
            filteredSections.forEach(s => { exp[s.key] = true; });
            setExpanded(exp);
        }
    }, [filteredSections, searchTerm]);

    const toggleSection = key => setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

    const assocFull = a => {
        const obj = (vmcuAssocs || []).find(v => v.abbrev === a);
        return obj ? obj.full_name : a;
    };

    const btnStyle = { display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 10px", border: `1px solid ${B.g200}`, borderRadius: 6, background: B.w, cursor: "pointer", textAlign: "left", fontFamily: F, fontSize: 11, color: B.g800 };
    const hdrStyle = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 };

    if (!selGroup) {
        return (<div>
            <div style={{ fontSize: 10, color: B.g400, fontFamily: F, marginBottom: 4 }}>Select level group:</div>
            <div style={{ display: "grid", gap: 6, gridTemplateColumns: "1fr 1fr" }}>
                {TIER_GROUPS.map(g => (<button key={g.label} onClick={() => setSelGroup(g)} style={btnStyle}>
                    <span style={{ fontSize: 16 }}>{g.icon}</span><span style={{ fontWeight: 600 }}>{g.label}</span>
                </button>))}
            </div>
        </div>);
    }

    if (isCommunityGroup(selGroup) && !selAssoc) {
        const uniqueAssocs = [...new Set((assocComps || []).map(c => c.association_abbrev))];
        return (<div>
            <div style={hdrStyle}>
                <div style={{ fontSize: 10, fontWeight: 700, color: B.bl, fontFamily: F }}>{selGroup.icon} {selGroup.label}</div>
                <button onClick={() => { setSelGroup(null); onChange(''); }} style={{ fontSize: 9, color: B.g400, background: "none", border: "none", cursor: "pointer", fontFamily: F }}>✕ Change</button>
            </div>
            <div style={{ fontSize: 10, color: B.g400, fontFamily: F, marginBottom: 4 }}>Select your association:</div>
            <div style={{ display: "grid", gap: 6, gridTemplateColumns: "repeat(3, 1fr)" }}>
                {uniqueAssocs.map(a => (<button key={a} onClick={() => { setSelAssoc(a); setAutoAssoc(false); }} style={{ ...btnStyle, padding: "8px 10px", flexDirection: "column", alignItems: "flex-start", gap: 2 }}>
                    <span style={{ fontWeight: 700, color: B.bl, fontSize: 12 }}>{a}</span>
                    <span style={{ color: B.g600, fontSize: 9, lineHeight: 1.2 }}>{assocFull(a)}</span>
                </button>))}
            </div>
        </div>);
    }

    // ── Community association view with grouped sections ──
    if (isCommunityGroup(selGroup)) {
        return (<div>
            <div style={hdrStyle}>
                <div style={{ fontSize: 10, fontWeight: 700, color: B.bl, fontFamily: F }}>
                    {selGroup.icon} {selGroup.label} — {selAssoc}
                </div>
                <button onClick={() => {
                    setSelAssoc(null); setAutoAssoc(false); setSearchTerm(''); setExpanded({}); onChange('');
                }} style={{ fontSize: 9, color: B.g400, background: "none", border: "none", cursor: "pointer", fontFamily: F }}>✕ Change</button>
            </div>

            {/* Search input */}
            {compsForAssoc.length > 6 && (
                <div style={{ position: 'relative', marginBottom: 6 }}>
                    <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Search competitions..." style={{
                            width: '100%', padding: '7px 30px 7px 10px', borderRadius: 6,
                            border: `1px solid ${B.g200}`, background: B.w, color: B.g800,
                            fontSize: 11, fontFamily: F, outline: 'none', boxSizing: 'border-box',
                        }} />
                    {searchTerm && (
                        <button onClick={() => setSearchTerm('')} style={{
                            position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                            background: 'none', border: 'none', cursor: 'pointer', fontSize: 12,
                            color: B.g400, fontFamily: F, padding: 2,
                        }}>✕</button>
                    )}
                </div>
            )}

            {/* Grouped sections */}
            {filteredSections.map(s => (
                <div key={s.key} style={{ marginBottom: 6 }}>
                    <button onClick={() => toggleSection(s.key)} style={{
                        display: 'flex', alignItems: 'center', gap: 6, width: '100%',
                        padding: '6px 8px', background: 'rgba(59,130,246,0.06)', border: `1px solid ${B.g200}`,
                        borderRadius: 6, cursor: 'pointer', fontFamily: F, textAlign: 'left',
                    }}>
                        <span style={{ fontSize: 10, color: B.g400, transition: 'transform 0.15s', transform: expanded[s.key] ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
                        <span style={{ fontSize: 13 }}>{s.icon}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: B.bl }}>{s.label}</span>
                        <span style={{ fontSize: 9, color: B.g400, marginLeft: 'auto' }}>{s.comps.length}</span>
                    </button>
                    {expanded[s.key] && (
                        <div style={{ display: "grid", gap: 4, gridTemplateColumns: "repeat(3, 1fr)", marginTop: 4, paddingLeft: 4 }}>
                            {s.comps.map(c => (
                                <button key={c.id} onClick={() => onChange(c.competition_tier_code)} style={{
                                    ...btnStyle, padding: "7px 8px",
                                    background: value === c.competition_tier_code ? B.bl : B.w,
                                    color: value === c.competition_tier_code ? B.w : B.g800,
                                    borderColor: value === c.competition_tier_code ? B.bl : B.g200,
                                    justifyContent: "center",
                                }}>
                                    <span style={{ fontWeight: 600, fontSize: 10 }}>{c.competition_label}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            ))}

            {filteredSections.length === 0 && searchTerm && (
                <div style={{ fontSize: 10, color: B.g400, fontFamily: F, padding: '8px 0', textAlign: 'center' }}>
                    No competitions match "{searchTerm}"
                </div>
            )}

            {/* Different association link */}
            {autoAssoc && (
                <div style={{ textAlign: 'center', marginTop: 6 }}>
                    <button onClick={() => { setSelAssoc(null); setAutoAssoc(false); setSearchTerm(''); setExpanded({}); onChange(''); }}
                        style={{ fontSize: 10, color: B.g400, background: 'none', border: 'none', cursor: 'pointer', fontFamily: F, textDecoration: 'underline' }}>
                        Different association?
                    </button>
                </div>
            )}
        </div>);
    }

    // ── Non-community tier selection (unchanged) ──
    return (<div>
        <div style={hdrStyle}>
            <div style={{ fontSize: 10, fontWeight: 700, color: B.bl, fontFamily: F }}>
                {selGroup.icon} {selGroup.label}
            </div>
            <button onClick={() => { setSelGroup(null); onChange(''); }}
                style={{ fontSize: 9, color: B.g400, background: "none", border: "none", cursor: "pointer", fontFamily: F }}>✕ Change</button>
        </div>
        <div style={{ fontSize: 10, color: B.g400, fontFamily: F, marginBottom: 4 }}>Select competition:</div>
        <div style={{ display: "grid", gap: 6, gridTemplateColumns: "repeat(3, 1fr)" }}>
            {tiersForGroup.map(t => (
                <button key={t.code} onClick={() => onChange(t.code)} style={{ ...btnStyle, padding: "8px 10px", background: value === t.code ? B.bl : B.w, color: value === t.code ? B.w : B.g800, borderColor: value === t.code ? B.bl : B.g200, justifyContent: "center" }}>
                    <span style={{ fontWeight: 600, fontSize: 11 }}>{t.competition_name}</span>
                </button>
            ))}
        </div>
    </div>);
}
