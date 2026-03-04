// ═══ SHARED UI COMPONENTS ═══
import { useState } from 'react';
import { B, F, LOGO, sGrad, sCard, _isDesktop, DSZ, DSF } from '../data/theme';
import { TIER_GROUPS, isCommunityGroup } from '../data/competitionData';

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
        <div style={{ display: "flex", gap: _isDesktop ? 6 : 5 }}>
            {[1, 2, 3, 4, 5].map(n => (
                <button key={n} onClick={() => onChange(value === n ? 0 : n)}
                    style={{
                        width: DSZ, height: DSZ, borderRadius: "50%", border: `2px solid ${value >= n ? color : B.g200}`,
                        background: value >= n ? color : "transparent", cursor: "pointer", transition: "all 0.2s",
                        display: "flex", alignItems: "center", justifyContent: "center", fontSize: DSF, fontWeight: 700,
                        color: value >= n ? B.w : B.g400, fontFamily: F
                    }}>{n}</button>
            ))}
        </div>
    );
}

// ═══ ASSESSMENT GRID — 3-column accordion tiles with green completion ring ═══
const RATING_LABELS = ['', 'Just Starting', 'Developing', 'Solid', 'Strong', 'Elite'];
const COACH_LABELS = ['', 'Novice', 'Developing', 'Competent', 'Advanced', 'Elite'];

export function AssGrid({ items, values, onRate, color, SKILL_DEFS, keyPrefix }) {
    const [openIdx, setOpenIdx] = useState(null);
    return (
        <div style={{ display: 'grid', gridTemplateColumns: _isDesktop ? 'repeat(3, 1fr)' : '1fr', gap: 6 }}>
            {items.map((item, i) => {
                const k = `${keyPrefix}_${i}`;
                const v = values[k] || 0;
                const isOpen = openIdx === i;
                const defs = SKILL_DEFS?.[item];
                const done = v > 0;
                return (
                    <div key={item} style={{
                        background: isOpen ? B.w : B.g100,
                        borderRadius: 10,
                        border: isOpen ? `2px solid ${color}40` : `1.5px solid ${done ? `${B.grn}50` : B.g200}`,
                        overflow: 'hidden',
                        transition: 'all 0.25s ease',
                        gridColumn: isOpen && _isDesktop ? '1 / -1' : undefined,
                        boxShadow: isOpen ? `0 4px 16px ${color}15` : 'none',
                    }}>
                        {/* ── Collapsed tile header ── */}
                        <div
                            onClick={() => setOpenIdx(isOpen ? null : i)}
                            style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: isOpen ? '10px 14px' : '10px 12px',
                                cursor: 'pointer', userSelect: 'none',
                                background: isOpen ? `linear-gradient(135deg, ${color}08, ${color}03)` : 'transparent',
                                transition: 'background 0.2s',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
                                {/* Green completion ring */}
                                <div style={{
                                    width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                                    border: `2px solid ${done ? B.grn : B.g200}`,
                                    background: done ? `${B.grn}15` : 'transparent',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    transition: 'all 0.3s',
                                }}>
                                    {done ? (
                                        <span style={{ fontSize: 11, color: B.grn, fontWeight: 800, lineHeight: 1 }}>✓</span>
                                    ) : (
                                        <span style={{ fontSize: 8, color: B.g400, fontWeight: 600 }}>—</span>
                                    )}
                                </div>
                                <div style={{
                                    fontSize: 11, fontWeight: 600, color: B.g800, fontFamily: F,
                                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                }}>
                                    {item}
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                                {done && !isOpen && (
                                    <div style={{
                                        fontSize: 9, fontWeight: 700, color: B.w, fontFamily: F,
                                        background: color, borderRadius: 4, padding: '2px 6px',
                                        lineHeight: 1.3,
                                    }}>
                                        {v}/5
                                    </div>
                                )}
                                <span style={{
                                    fontSize: 10, color: B.g400, transition: 'transform 0.25s',
                                    transform: isOpen ? 'rotate(180deg)' : 'rotate(0)',
                                    display: 'inline-block',
                                }}>▾</span>
                            </div>
                        </div>

                        {/* ── Expanded accordion body ── */}
                        {isOpen && (
                            <div style={{ padding: '0 14px 14px' }}>
                                {/* Rating tiles */}
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: _isDesktop ? 'repeat(5, 1fr)' : 'repeat(5, 1fr)',
                                    gap: 6, marginBottom: defs ? 10 : 0,
                                }}>
                                    {[1, 2, 3, 4, 5].map(n => {
                                        const sel = v === n;
                                        const labels = defs ? COACH_LABELS : RATING_LABELS;
                                        return (
                                            <button key={n} onClick={() => onRate(k, v === n ? 0 : n)}
                                                style={{
                                                    border: sel ? `2px solid ${color}` : `1.5px solid ${B.g200}`,
                                                    borderRadius: 8,
                                                    background: sel ? `${color}12` : B.w,
                                                    padding: '8px 4px',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s',
                                                    display: 'flex', flexDirection: 'column',
                                                    alignItems: 'center', gap: 3,
                                                    boxShadow: sel ? `0 2px 8px ${color}20` : 'none',
                                                }}
                                            >
                                                <div style={{
                                                    width: 26, height: 26, borderRadius: '50%',
                                                    border: `2px solid ${sel ? color : B.g200}`,
                                                    background: sel ? color : 'transparent',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: 11, fontWeight: 800,
                                                    color: sel ? B.w : B.g400, fontFamily: F,
                                                    transition: 'all 0.2s',
                                                }}>{n}</div>
                                                <div style={{
                                                    fontSize: 8, fontWeight: 700, color: sel ? color : B.g400,
                                                    fontFamily: F, textTransform: 'uppercase', letterSpacing: 0.3,
                                                    lineHeight: 1.2, textAlign: 'center',
                                                }}>{labels[n]}</div>
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Definition text for selected rating */}
                                {defs && v > 0 && (
                                    <div style={{
                                        background: `${color}08`, borderRadius: 8,
                                        padding: '8px 12px', border: `1px solid ${color}20`,
                                        marginBottom: 6,
                                    }}>
                                        <div style={{ fontSize: 10, color: color, fontWeight: 700, fontFamily: F, marginBottom: 2 }}>
                                            Level {v} — {(defs === SKILL_DEFS?.[item] ? COACH_LABELS : RATING_LABELS)[v]}
                                        </div>
                                        <div style={{ fontSize: 10, color: B.g600, fontFamily: F, lineHeight: 1.5 }}>
                                            {defs[v]}
                                        </div>
                                    </div>
                                )}

                                {/* All definitions (collapsed by default, show on tap) */}
                                {defs && v === 0 && (
                                    <div style={{
                                        background: B.g50, borderRadius: 8, padding: '8px 10px',
                                        border: `1px solid ${B.g200}`,
                                    }}>
                                        <div style={{ fontSize: 9, fontWeight: 700, color: B.g400, fontFamily: F, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                            Tap a rating to see its definition
                                        </div>
                                        {[1, 2, 3, 4, 5].map(n => (
                                            <div key={n} style={{
                                                display: 'flex', gap: 6, marginBottom: n < 5 ? 3 : 0,
                                                alignItems: 'flex-start', opacity: 0.7,
                                            }}>
                                                <div style={{
                                                    fontSize: 8, fontWeight: 800, color: B.g400, fontFamily: F,
                                                    width: 12, flexShrink: 0, marginTop: 1,
                                                }}>{n}.</div>
                                                <div style={{
                                                    fontSize: 9, color: B.g500, fontFamily: F, lineHeight: 1.4,
                                                }}>{defs[n]}</div>
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
        <div style={{ background: B.g100, borderRadius: 6, padding: _isDesktop ? '10px 14px' : '10px 12px', marginBottom: 5 }}>
            <div style={{ ...(_isDesktop ? { display: 'flex', alignItems: 'center', justifyContent: 'space-between' } : {}) }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: _isDesktop ? 0 : 6 }}>
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

// ═══ COMPETITION LEVEL SELECTOR ═══
export function CompLevelSel({ value, onChange, compTiers, gender, assocComps, vmcuAssocs }) {
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

    const tiersForGroup = selGroup && !isCommunityGroup(selGroup) ? (compTiers || []).filter(t => {
        const gMatch = !gender || t.gender === gender || t.gender === 'All' || t.gender === 'Mixed' || t.gender === 'M/F';
        return selGroup.tiers.includes(t.tier) && gMatch;
    }) : [];

    const compsForAssoc = (selAssoc && isCommunityGroup(selGroup)) ? (assocComps || []).filter(c => {
        if (c.association_abbrev !== selAssoc) return false;
        if (!gender) return true;
        return c.gender === gender || c.gender === 'All' || c.gender === 'Mixed';
    }) : [];

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
                {uniqueAssocs.map(a => (<button key={a} onClick={() => setSelAssoc(a)} style={{ ...btnStyle, padding: "8px 10px", flexDirection: "column", alignItems: "flex-start", gap: 2 }}>
                    <span style={{ fontWeight: 700, color: B.bl, fontSize: 12 }}>{a}</span>
                    <span style={{ color: B.g600, fontSize: 9, lineHeight: 1.2 }}>{assocFull(a)}</span>
                </button>))}
            </div>
        </div>);
    }

    return (<div>
        <div style={hdrStyle}>
            <div style={{ fontSize: 10, fontWeight: 700, color: B.bl, fontFamily: F }}>
                {selGroup.icon} {selGroup.label}{selAssoc ? ` — ${selAssoc}` : ''}
            </div>
            <button onClick={() => {
                if (isCommunityGroup(selGroup)) { setSelAssoc(null); onChange(''); }
                else { setSelGroup(null); onChange(''); }
            }} style={{ fontSize: 9, color: B.g400, background: "none", border: "none", cursor: "pointer", fontFamily: F }}>✕ Change</button>
        </div>
        <div style={{ fontSize: 10, color: B.g400, fontFamily: F, marginBottom: 4 }}>Select competition:</div>
        {isCommunityGroup(selGroup) ? (
            <div style={{ display: "grid", gap: 6, gridTemplateColumns: "repeat(3, 1fr)" }}>
                {compsForAssoc.map(c => (
                    <button key={c.id} onClick={() => onChange(c.competition_tier_code)} style={{ ...btnStyle, padding: "8px 10px", background: value === c.competition_tier_code ? B.bl : B.w, color: value === c.competition_tier_code ? B.w : B.g800, borderColor: value === c.competition_tier_code ? B.bl : B.g200, justifyContent: "center" }}>
                        <span style={{ fontWeight: 600, fontSize: 11 }}>{c.competition_label}</span>
                    </button>
                ))}
            </div>
        ) : (
            <div style={{ display: "grid", gap: 6, gridTemplateColumns: "repeat(3, 1fr)" }}>
                {tiersForGroup.map(t => (
                    <button key={t.code} onClick={() => onChange(t.code)} style={{ ...btnStyle, padding: "8px 10px", background: value === t.code ? B.bl : B.w, color: value === t.code ? B.w : B.g800, borderColor: value === t.code ? B.bl : B.g200, justifyContent: "center" }}>
                        <span style={{ fontWeight: 600, fontSize: 11 }}>{t.competition_name}</span>
                    </button>
                ))}
            </div>
        )}
    </div>);
}
