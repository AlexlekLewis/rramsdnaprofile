// ═══ DNA REPORT CARD — RR-BRANDED PLAYER REPORT ═══
// Renders a 3-page A4 landscape report card as a hidden DOM element
// Captured by html2canvas → converted to PDF via jsPDF

import { B, F, LOGO } from '../data/theme';
import { BAT_ARCH, BWL_ARCH, PHASES } from '../data/skillItems';

// ── Layout constants ──
const PW = 1123; // A4 landscape @ 96dpi
const PH = 794;
const PAD = 40;

// ── Styles ──
const page = { width: PW, height: PH, padding: PAD, fontFamily: "'Montserrat', sans-serif", background: '#FFF', position: 'relative', boxSizing: 'border-box', overflow: 'hidden', pageBreakAfter: 'always' };
const topBar = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 12, borderBottom: `2px solid ${B.g200}` };

// ── Helper: Ring chart (SVG) ──
const Ring = ({ value, label, color, size = 100 }) => {
    const r = (size - 10) / 2, c = 2 * Math.PI * r, p = ((value || 0) / 100) * c;
    return (
        <div style={{ textAlign: 'center', width: size }}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={B.g200} strokeWidth={6} />
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={6} strokeDasharray={`${p} ${c - p}`} strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: 'stroke-dasharray 0.8s' }} />
                <text x={size / 2} y={size / 2 + 2} textAnchor="middle" dominantBaseline="middle" fontSize={size * 0.28} fontWeight={800} fill={B.nvD} fontFamily={F}>{value || 0}</text>
            </svg>
            <div style={{ fontSize: 9, fontWeight: 700, color: B.g600, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
        </div>
    );
};

// ── Helper: Horizontal bar ──
const Bar = ({ label, value, color, max = 100 }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <div style={{ width: 80, fontSize: 9, fontWeight: 600, color: B.g600, textAlign: 'right' }}>{label}</div>
        <div style={{ flex: 1, height: 14, background: B.g100, borderRadius: 7, overflow: 'hidden' }}>
            <div style={{ width: `${Math.min((value / max) * 100, 100)}%`, height: '100%', background: `linear-gradient(90deg, ${color}, ${color}CC)`, borderRadius: 7, transition: 'width 0.5s' }} />
        </div>
        <div style={{ width: 30, fontSize: 10, fontWeight: 700, color: B.nvD, textAlign: 'center' }}>{value}%</div>
    </div>
);

// ── Helper: Phase heatmap cell ──
const HeatCell = ({ value, label }) => {
    const intensity = Math.min((value || 0) / 5, 1);
    const bg = intensity > 0.7 ? B.nvD : intensity > 0.4 ? B.bl : B.blL;
    const fg = intensity > 0.4 ? '#FFF' : B.nvD;
    return (
        <div style={{ flex: 1, textAlign: 'center', padding: '8px 4px', borderRadius: 6, background: bg, margin: 2 }}>
            <div style={{ fontSize: 8, fontWeight: 600, color: fg, opacity: 0.8 }}>{label}</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: fg }}>{value || '-'}</div>
        </div>
    );
};

// ── Helper: Radar chart (SVG) ──
const RadarChart = ({ domains, size = 240 }) => {
    const cx = size / 2, cy = size / 2, r = size * 0.38;
    const n = domains.length;
    const pts = domains.map((d, i) => {
        const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
        const val = (d.value || 0) / 100;
        return { x: cx + r * val * Math.cos(angle), y: cy + r * val * Math.sin(angle), lx: cx + (r + 24) * Math.cos(angle), ly: cy + (r + 24) * Math.sin(angle), label: d.label, value: d.value };
    });
    const polygon = pts.map(p => `${p.x},${p.y}`).join(' ');
    const gridLines = [0.2, 0.4, 0.6, 0.8, 1.0].map(scale => {
        const gPts = Array.from({ length: n }, (_, i) => {
            const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
            return `${cx + r * scale * Math.cos(angle)},${cy + r * scale * Math.sin(angle)}`;
        });
        return <polygon key={scale} points={gPts.join(' ')} fill="none" stroke={B.g200} strokeWidth={0.5} />;
    });
    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            {gridLines}
            {pts.map((p, i) => <line key={`axis-${i}`} x1={cx} y1={cy} x2={cx + r * Math.cos((Math.PI * 2 * i) / n - Math.PI / 2)} y2={cy + r * Math.sin((Math.PI * 2 * i) / n - Math.PI / 2)} stroke={B.g200} strokeWidth={0.5} />)}
            <polygon points={polygon} fill={`${B.pk}30`} stroke={B.pk} strokeWidth={2} />
            {pts.map((p, i) => <circle key={`dot-${i}`} cx={p.x} cy={p.y} r={4} fill={B.pk} />)}
            {pts.map((p, i) => <text key={`lbl-${i}`} x={p.lx} y={p.ly} textAnchor="middle" dominantBaseline="middle" fontSize={8} fontWeight={700} fill={B.nvD} fontFamily={F}>{p.label}</text>)}
        </svg>
    );
};

// ═══ REPORT CARD COMPONENT ═══
export default function ReportCard({ player, assessment, engine, isAdmin }) {
    const { name, dob, club, role, playerBatArch, playerBwlArch, gotoShots, pressureShot, bwlVariations, spinComfort, shortBallComfort, heightCm } = player || {};
    const { overall, pathway, cohort, agePct, grade, pdi, domains, strengths, growthAreas, sagi, phaseScores, narrative, plan, squad } = engine || {};
    const batArch = BAT_ARCH.find(a => a.id === playerBatArch);
    const bwlArch = BWL_ARCH.find(a => a.id === playerBwlArch);
    const archLabel = batArch?.nm || bwlArch?.nm || role?.toUpperCase() || 'PLAYER';
    const age = dob ? Math.floor((Date.now() - new Date(dob.split('/').reverse().join('-')).getTime()) / 31557600000) : '—';
    const stars = grade ? '★'.repeat(Math.min(grade, 5)) : '★★★';
    const gradeLabel = grade >= 4 ? 'ELITE' : grade >= 3 ? 'ADVANCED' : grade >= 2 ? 'DEVELOPING' : 'EMERGING';
    const domainList = domains || [
        { label: 'Technical', value: 0, color: B.pk }, { label: 'Game IQ', value: 0, color: B.bl },
        { label: 'Mental', value: 0, color: B.prp }, { label: 'Physical', value: 0, color: B.org },
        { label: 'Phase', value: 0, color: B.grn }, { label: 'Statistical', value: 0, color: B.nv },
    ];
    const sagiData = sagi || {};
    const phData = phaseScores || {};

    return (
        <div id="rra-report-card" style={{ position: 'absolute', left: -9999, top: 0 }}>
            {/* ═══ PAGE 1: Player Identity & Overall Score ═══ */}
            <div style={page} data-page="1">
                <div style={topBar}>
                    <img src={LOGO} alt="RRA" style={{ height: 36 }} crossOrigin="anonymous" />
                    <div style={{ fontSize: 18, fontWeight: 800, color: B.nvD, letterSpacing: 1.5, textTransform: 'uppercase' }}>DNA Development Report</div>
                    <div style={{ fontSize: 10, color: B.g400 }}>Season {new Date().getFullYear()}</div>
                </div>

                <div style={{ display: 'flex', gap: 24 }}>
                    {/* Player Bio */}
                    <div style={{ flex: '0 0 260px' }}>
                        <div style={{ width: 100, height: 100, borderRadius: 12, background: `linear-gradient(135deg, ${B.g200}, ${B.g100})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, color: B.g400, marginBottom: 12 }}>👤</div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: B.nvD }}>{name || 'Player Name'}</div>
                        <div style={{ fontSize: 11, color: B.g600, marginTop: 4 }}>Age: {age} | Club: {club || '—'} | Role: {(role || 'batter').toUpperCase()}</div>
                        {heightCm && <div style={{ fontSize: 10, color: B.g400, marginTop: 2 }}>Height: {heightCm}cm</div>}
                        <div style={{ display: 'inline-block', marginTop: 8, padding: '4px 14px', borderRadius: 20, background: `${B.pk}18`, border: `1.5px solid ${B.pk}`, fontSize: 10, fontWeight: 800, color: B.pk, letterSpacing: 0.8 }}>{archLabel}</div>
                    </div>

                    {/* Score Rings */}
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 10 }}>
                            <Ring value={overall || 0} label="Overall" color={B.pk} />
                            <Ring value={pathway || 0} label="Pathway" color={B.bl} />
                            <Ring value={cohort || 0} label="Cohort" color={B.nv} />
                            <Ring value={agePct || 0} label="Age" color={B.grn} />
                        </div>

                        {/* Grade Banner */}
                        <div style={{ marginTop: 16, background: B.nvD, borderRadius: 8, padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontSize: 12, fontWeight: 800, color: '#FFC107', letterSpacing: 1 }}>GRADE: {stars} {gradeLabel}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: 10, color: B.g400 }}>PDI:</span>
                                <span style={{ fontSize: 12, fontWeight: 700, color: '#FFF' }}>{(pdi || 0).toFixed(2)} / 5.00</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Phase Heatmap */}
                <div style={{ marginTop: 20, background: B.g50, borderRadius: 12, padding: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: B.nvD, marginBottom: 10, letterSpacing: 0.5 }}>T20 ROLE IDENTITY — PHASE HEATMAP</div>
                    <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                        <div style={{ width: 60 }} />
                        {PHASES.map(p => <div key={p.id} style={{ flex: 1, textAlign: 'center', fontSize: 8, fontWeight: 700, color: B.g600, textTransform: 'uppercase' }}>{p.nm.split('(')[0].trim()}</div>)}
                    </div>
                    {['Batting', 'Bowling'].map(type => (
                        <div key={type} style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                            <div style={{ width: 60, fontSize: 9, fontWeight: 700, color: B.nvD, display: 'flex', alignItems: 'center' }}>{type}</div>
                            {PHASES.map(p => <HeatCell key={`${type}-${p.id}`} value={phData[`${type.toLowerCase()}_${p.id}`]} label={`${(phData[`${type.toLowerCase()}_${p.id}`] || 0)}/5`} />)}
                        </div>
                    ))}
                </div>
            </div>

            {/* ═══ PAGE 2: Domain Breakdown & Strengths ═══ */}
            <div style={page} data-page="2">
                <div style={topBar}>
                    <img src={LOGO} alt="RRA" style={{ height: 36 }} crossOrigin="anonymous" />
                    <div style={{ fontSize: 18, fontWeight: 800, color: B.nvD, letterSpacing: 1.5, textTransform: 'uppercase' }}>DNA Development Report</div>
                    <div style={{ fontSize: 10, color: B.g400 }}>Page 2 of 3</div>
                </div>

                <div style={{ display: 'flex', gap: 24 }}>
                    <div style={{ flex: '0 0 280px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <RadarChart domains={domainList} size={260} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 800, color: B.nvD, marginBottom: 10 }}>DEVELOPMENT DOMAINS</div>
                        {domainList.map(d => <Bar key={d.label} label={d.label} value={d.value || 0} color={d.color || B.pk} />)}
                    </div>
                </div>

                {/* Strengths & Growth */}
                <div style={{ display: 'flex', gap: 16, marginTop: 16 }}>
                    <div style={{ flex: 1, background: `${B.grn}08`, border: `1px solid ${B.grn}30`, borderRadius: 10, padding: 14 }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: B.grn, marginBottom: 8 }}>✦ STRENGTHS</div>
                        {(strengths || ['—']).map((s, i) => <div key={i} style={{ fontSize: 10, color: B.g600, marginBottom: 4 }}>✦ {s}</div>)}
                    </div>
                    <div style={{ flex: 1, background: `${B.amb}08`, border: `1px solid ${B.amb}30`, borderRadius: 10, padding: 14 }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: B.amb, marginBottom: 8 }}>→ AREAS FOR GROWTH</div>
                        {(growthAreas || ['—']).map((g, i) => <div key={i} style={{ fontSize: 10, color: B.g600, marginBottom: 4 }}>→ {g}</div>)}
                    </div>
                </div>

                {/* SAGI */}
                <div style={{ marginTop: 16, background: B.g50, borderRadius: 10, padding: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: B.nvD }}>SELF-AWARENESS INDEX</div>
                        <div style={{ padding: '2px 10px', borderRadius: 12, background: `${B.grn}18`, border: `1px solid ${B.grn}`, fontSize: 9, fontWeight: 700, color: B.grn }}>{sagiData.alignment || 'Aligned'}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {domainList.slice(0, 4).map(d => (
                            <div key={d.label} style={{ flex: '1 1 120px' }}>
                                <div style={{ fontSize: 8, fontWeight: 600, color: B.g400, marginBottom: 3 }}>{d.label}</div>
                                <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                    <div style={{ flex: 1, height: 6, background: B.g200, borderRadius: 3 }}>
                                        <div style={{ width: `${sagiData[`coach_${d.label.toLowerCase()}`] || d.value || 0}%`, height: '100%', background: B.nv, borderRadius: 3 }} />
                                    </div>
                                    <div style={{ flex: 1, height: 6, background: B.g200, borderRadius: 3 }}>
                                        <div style={{ width: `${sagiData[`player_${d.label.toLowerCase()}`] || d.value || 0}%`, height: '100%', background: B.pk, borderRadius: 3 }} />
                                    </div>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 2 }}>
                                    <span style={{ fontSize: 7, color: B.nv }}>Coach</span>
                                    <span style={{ fontSize: 7, color: B.pk }}>Player</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ═══ PAGE 3: Narrative & 12-Week Plan ═══ */}
            <div style={page} data-page="3">
                <div style={topBar}>
                    <img src={LOGO} alt="RRA" style={{ height: 36 }} crossOrigin="anonymous" />
                    <div style={{ fontSize: 18, fontWeight: 800, color: B.nvD, letterSpacing: 1.5, textTransform: 'uppercase' }}>DNA Development Report</div>
                    <div style={{ fontSize: 10, color: B.g400 }}>Page 3 of 3</div>
                </div>

                {/* Narrative */}
                <div style={{ borderLeft: `3px solid ${B.pk}`, background: B.pkL, borderRadius: '0 10px 10px 0', padding: '16px 20px', marginBottom: 16 }}>
                    <div style={{ fontSize: 11, color: B.g600, lineHeight: 1.7, fontStyle: 'italic' }}>{narrative || 'Coach narrative will appear here once written. This section captures the coach\'s personalised assessment of the player\'s game, strengths, and development pathway.'}</div>
                    <div style={{ fontSize: 9, fontWeight: 700, color: B.nvD, marginTop: 8 }}>— Head Coach, Royals Academy Melbourne</div>
                </div>

                {/* 12-Week Plan */}
                <div style={{ fontSize: 11, fontWeight: 800, color: B.nvD, marginBottom: 8 }}>12-WEEK DEVELOPMENT PLAN</div>
                <div style={{ display: 'flex', gap: 10 }}>
                    {[{ phase: 'EXPLORE', weeks: '1-4', color: B.pk, items: plan?.explore || ['Focus area 1', 'Focus area 2', 'Focus area 3'] },
                    { phase: 'CHALLENGE', weeks: '5-8', color: B.bl, items: plan?.challenge || ['Challenge goal 1', 'Challenge goal 2', 'Challenge goal 3'] },
                    { phase: 'EXECUTE', weeks: '9-12', color: B.nvD, items: plan?.execute || ['Execute goal 1', 'Execute goal 2', 'Execute goal 3'] }
                    ].map(p => (
                        <div key={p.phase} style={{ flex: 1, borderRadius: 10, overflow: 'hidden', border: `1px solid ${B.g200}` }}>
                            <div style={{ background: p.color, padding: '8px 12px' }}>
                                <div style={{ fontSize: 10, fontWeight: 800, color: '#FFF', letterSpacing: 0.5 }}>{p.phase}</div>
                                <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.7)' }}>Weeks {p.weeks}</div>
                            </div>
                            <div style={{ padding: '10px 12px' }}>
                                {p.items.map((item, i) => <div key={i} style={{ fontSize: 9, color: B.g600, marginBottom: 4, lineHeight: 1.4 }}>• {item}</div>)}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Bottom row: toolkit + batting style */}
                <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                    <div style={{ flex: 1, background: B.g50, borderRadius: 10, padding: 12 }}>
                        <div style={{ fontSize: 10, fontWeight: 800, color: B.bl, marginBottom: 6 }}>BOWLING TOOLKIT</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {(bwlVariations || []).map(v => <span key={v} style={{ padding: '3px 10px', borderRadius: 12, background: `${B.bl}18`, border: `1px solid ${B.bl}`, fontSize: 8, fontWeight: 600, color: B.bl }}>✓ {v}</span>)}
                            {(!bwlVariations || bwlVariations.length === 0) && <span style={{ fontSize: 9, color: B.g400 }}>No variations recorded</span>}
                        </div>
                    </div>
                    <div style={{ flex: 1, background: B.g50, borderRadius: 10, padding: 12 }}>
                        <div style={{ fontSize: 10, fontWeight: 800, color: B.pk, marginBottom: 6 }}>BATTING STYLE</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
                            {(gotoShots || []).map(s => <span key={s} style={{ padding: '3px 10px', borderRadius: 12, background: `${B.pk}18`, border: `1px solid ${B.pk}`, fontSize: 8, fontWeight: 600, color: B.pk }}>{s}</span>)}
                        </div>
                        {pressureShot && <div style={{ fontSize: 9, color: B.g600 }}>Pressure shot: <strong>{pressureShot}</strong></div>}
                        <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
                            <div style={{ fontSize: 8, color: B.g600 }}>Spin: {'●'.repeat(spinComfort || 0)}{'○'.repeat(5 - (spinComfort || 0))}</div>
                            <div style={{ fontSize: 8, color: B.g600 }}>Short: {'●'.repeat(shortBallComfort || 0)}{'○'.repeat(5 - (shortBallComfort || 0))}</div>
                        </div>
                    </div>
                </div>

                {/* Squad recommendation */}
                {squad && isAdmin && <div style={{ marginTop: 10, background: `${B.prp}08`, border: `1px solid ${B.prp}30`, borderRadius: 8, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: B.prp }}>SQUAD RECOMMENDATION:</div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: B.g600 }}>{squad}</div>
                </div>}

                {/* Footer */}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: `linear-gradient(135deg, ${B.nvD}, ${B.bl})`, padding: '10px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <img src={LOGO} alt="RRA" style={{ height: 24, opacity: 0.8 }} crossOrigin="anonymous" />
                    <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>Royals Academy Melbourne</div>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)' }}>Report generated: {new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                </div>
            </div>
        </div>
    );
}
