// ═══ ADMIN PLAYER PROFILES — Unified directory with full management ═══
import React, { useState, useEffect, useCallback } from "react";
import { B, F, sCard, getDkWrap } from "../data/theme";
import { ROLES } from "../data/skillItems";
import { supabase } from "../supabaseClient";
import { updatePlayer, archivePlayer, restorePlayer, deletePlayer, deleteCohortPlayer, updateCohortPlayer } from "../db/adminDb";
// Note: bulkArchivePlayers, bulkDeletePlayers removed — bulk actions replaced with per-profile confirmations

const TABS = [
    { id: 'active', label: 'Completed' },
    { id: 'archived', label: 'In Progress' },
];

// ── Confirmation Modal (module-level) ──
const ConfirmModal = React.memo(({ action, onConfirm, onCancel }) => {
    if (!action) return null;
    const isDelete = action.type === 'delete';
    const color = isDelete ? B.red : B.amb;
    const names = action.names || [];
    return (
        <div onClick={onCancel} style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <div onClick={e => e.stopPropagation()} style={{ background: B.w, borderRadius: 16, padding: 24, maxWidth: 360, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
                {/* Icon */}
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <span style={{ fontSize: 24 }}>{isDelete ? '🗑' : '📦'}</span>
                </div>

                {/* Title */}
                <div style={{ fontSize: 16, fontWeight: 800, color: B.nvD, fontFamily: F, textAlign: 'center', marginBottom: 8 }}>
                    {isDelete ? 'Delete' : 'Archive'} {names.length === 1 ? names[0] : `${names.length} players`}?
                </div>

                {/* Description */}
                <div style={{ fontSize: 12, color: B.g600, fontFamily: F, textAlign: 'center', lineHeight: 1.6, marginBottom: 20 }}>
                    {isDelete
                        ? 'All assessment data, competition grades, goals, and journal entries will be permanently deleted. This cannot be undone.'
                        : 'Their profile will be hidden from the active roster but all data is preserved. You can restore them from the Archived tab.'}
                </div>

                {/* Buttons */}
                <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={onCancel}
                        style={{ flex: 1, padding: '12px 16px', borderRadius: 10, border: `1px solid ${B.g200}`, background: B.w, color: B.g600, fontSize: 13, fontWeight: 700, fontFamily: F, cursor: 'pointer' }}>
                        Cancel
                    </button>
                    <button onClick={onConfirm}
                        style={{ flex: 1, padding: '12px 16px', borderRadius: 10, border: 'none', background: color, color: B.w, fontSize: 13, fontWeight: 800, fontFamily: F, cursor: 'pointer' }}>
                        {isDelete ? 'Delete Permanently' : 'Archive'}
                    </button>
                </div>
            </div>
        </div>
    );
});

// ── Info row helper (module-level) ──
const InfoRow = React.memo(({ label, value }) => {
    if (!value) return null;
    return (
        <div style={{ display: 'flex', gap: 8, padding: '4px 0', borderBottom: `1px solid ${B.g100}` }}>
            <div style={{ width: 100, fontSize: 10, fontWeight: 700, color: B.g400, fontFamily: F, flexShrink: 0 }}>{label}</div>
            <div style={{ fontSize: 11, color: B.nvD, fontFamily: F, wordBreak: 'break-word' }}>{value}</div>
        </div>
    );
});

export default function AdminProfiles() {
    const [profiles, setProfiles] = useState([]);
    const [archivedProfiles, setArchivedProfiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [tab, setTab] = useState('active');
    const [expandedId, setExpandedId] = useState(null);
    const [editingId, setEditingId] = useState(null);
    const [editData, setEditData] = useState({});
    const [saving, setSaving] = useState(false);
    const [feedback, setFeedback] = useState(null);
    const [confirmAction, setConfirmAction] = useState(null);

    const showFeedback = (type, text) => {
        setFeedback({ type, text });
        setTimeout(() => setFeedback(null), 3000);
    };

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            // Primary source: players who have actually signed up (submitted or drafts)
            const [{ data: submittedPlayers }, { data: draftPlayers }, { data: assessments }, { data: cohort }, { data: members }] = await Promise.all([
                supabase.from('players').select('*').eq('submitted', true).order('name'),
                supabase.from('players').select('*').eq('submitted', false).order('name'),
                supabase.from('coach_assessments').select('player_id, narrative, strengths, priorities, updated_at'),
                supabase.from('official_cohort_2026').select('*'),
                supabase.from('program_members').select('display_name, username, auth_user_id, created_at').eq('active', true),
            ]);

            // Build cohort lookup by name for enrichment
            const cohortByName = {};
            (cohort || []).forEach(c => {
                if (c.player_name) cohortByName[c.player_name.toLowerCase().trim()] = c;
            });

            const buildProfile = (p) => {
                const c = cohortByName[p.name?.toLowerCase().trim()] || {};
                const assessment = (assessments || []).find(a => a.player_id === p.id);
                const member = (members || []).find(m => m.auth_user_id === p.auth_user_id);
                return {
                    id: p.id, dnaId: p.id, cohortId: c.id || null,
                    name: p.name, dob: p.dob || c.dob, age: c.age || null,
                    gender: p.gender || c.gender, suburb: c.suburb || null,
                    club: p.club || c.club,
                    email: p.email || c.email, playerEmail: c.player_email, playerPhone: c.player_phone, phone: c.phone,
                    parent1: { name: c.parent1_name, email: c.parent1_email, phone: c.parent1_phone },
                    parent2: { name: c.parent2_name, email: c.parent2_email, phone: c.parent2_phone },
                    selectedSessions: c.selected_sessions, preferredComms: c.preferred_comms,
                    shirtName: c.shirt_name, sizeTshirt: c.size_tshirt, sizeShort: c.size_short, sizePants: c.size_pants,
                    role: p.role, playerRole: c.player_role, cricketType: c.cricket_type,
                    paymentStatus: c.payment_status, paymentOption: c.payment_option_selected,
                    hasDNA: !!p.submitted, dnaRole: p.role,
                    batHand: p.batting_hand, bowlType: p.bowling_type,
                    dnaArchBat: p.player_bat_archetype, dnaArchBwl: p.player_bwl_archetype,
                    injury: p.injury, heightCm: p.height_cm,
                    hasAssessment: !!assessment, narrative: assessment?.narrative,
                    isArchived: false, source_table: 'players',
                    username: member?.username || null,
                    signupDate: member?.created_at || p.created_at,
                };
            };

            // Active = submitted DNA profiles
            setProfiles((submittedPlayers || []).map(buildProfile));

            // Drafts = players still onboarding (submitted=false)
            setArchivedProfiles((draftPlayers || []).map(p => ({
                ...buildProfile(p),
                isArchived: true,
                hasDNA: false,
            })));
        } catch (err) {
            console.error('Profile load error:', err);
        }
        setLoading(false);
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    // ── Actions ──

    const handleEdit = (profile) => {
        setEditingId(profile.id);
        setEditData({
            name: profile.name || '', role: profile.dnaRole || profile.playerRole || '',
            club: profile.club || '', suburb: profile.suburb || '',
            gender: profile.gender || '', playerRole: profile.playerRole || '',
        });
    };

    const handleSaveEdit = async (profile) => {
        setSaving(true);
        try {
            if (profile.cohortId) {
                await updateCohortPlayer(profile.cohortId, {
                    player_name: editData.name, club: editData.club,
                    suburb: editData.suburb, gender: editData.gender,
                    player_role: editData.playerRole,
                });
            }
            if (profile.dnaId) {
                await updatePlayer(profile.dnaId, {
                    name: editData.name, club: editData.club,
                    role: editData.role || undefined,
                });
            }
            setEditingId(null);
            showFeedback('ok', 'Profile updated');
            loadData();
        } catch (err) {
            console.error(err);
            showFeedback('err', 'Update failed');
        }
        setSaving(false);
    };

    const requestArchive = (profile) => {
        setConfirmAction({
            type: 'archive', names: [profile.name],
            onConfirm: async () => {
                setConfirmAction(null);
                if (!profile.dnaId) return;
                try {
                    await archivePlayer(profile.dnaId);
                    showFeedback('ok', `${profile.name} archived`);
                    loadData();
                } catch (err) { showFeedback('err', 'Archive failed'); }
            },
        });
    };

    const handleRestore = async (profile) => {
        if (profile.dnaId) {
            try {
                await restorePlayer(profile.dnaId);
                showFeedback('ok', `${profile.name} restored`);
                loadData();
            } catch (err) { showFeedback('err', 'Restore failed'); }
        }
    };

    const requestDelete = (profile) => {
        if (!profile.dnaId && !profile.cohortId) return;
        setConfirmAction({
            type: 'delete', names: [profile.name],
            onConfirm: async () => {
                setConfirmAction(null);
                try {
                    if (profile.dnaId) await deletePlayer(profile.dnaId);
                    if (profile.cohortId) await deleteCohortPlayer(profile.cohortId);
                    showFeedback('ok', `${profile.name} deleted`);
                    setEditingId(null);
                    setExpandedId(null);
                    loadData();
                } catch (err) { showFeedback('err', 'Delete failed'); }
            },
        });
    };

    // ── Render ──

    const currentProfiles = tab === 'active' ? profiles : archivedProfiles;
    const filtered = currentProfiles.filter(p => {
        if (!search) return true;
        const term = search.toLowerCase();
        return p.name?.toLowerCase().includes(term) || p.suburb?.toLowerCase().includes(term) || p.club?.toLowerCase().includes(term);
    });

    if (loading) return <div style={{ padding: 24, textAlign: 'center', color: B.g400, fontSize: 12, fontFamily: F }}>Loading profiles...</div>;

    const parseSessions = (s) => s ? s.split(' | ').map(x => x.trim()).filter(Boolean) : [];

    return (
        <div style={{ padding: 12, ...getDkWrap() }}>
            {/* Confirm modal */}
            <ConfirmModal action={confirmAction} onConfirm={() => confirmAction?.onConfirm?.()} onCancel={() => setConfirmAction(null)} />

            {/* Feedback toast */}
            {feedback && (
                <div style={{ padding: '10px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, fontFamily: F, marginBottom: 8, background: feedback.type === 'ok' ? `${B.grn}15` : '#fee2e2', color: feedback.type === 'ok' ? B.grn : '#dc2626', border: `1px solid ${feedback.type === 'ok' ? `${B.grn}30` : '#fca5a5'}` }}>
                    {feedback.text}
                </div>
            )}

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                {TABS.map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                        style={{ padding: '8px 16px', borderRadius: 8, border: tab === t.id ? `1.5px solid ${B.bl}` : `1px solid ${B.g200}`, background: tab === t.id ? `${B.bl}10` : B.w, color: tab === t.id ? B.bl : B.g600, fontSize: 11, fontWeight: tab === t.id ? 800 : 600, fontFamily: F, cursor: 'pointer' }}>
                        {t.label} ({t.id === 'active' ? profiles.length : archivedProfiles.length})
                    </button>
                ))}
            </div>

            {/* Search */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, suburb, club..."
                    style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: `1px solid ${B.g200}`, fontSize: 12, fontFamily: F, outline: 'none' }} />
            </div>

            {/* Count */}
            <div style={{ fontSize: 10, color: B.g400, fontFamily: F, marginBottom: 6, padding: '0 4px' }}>{filtered.length} players</div>

            {/* Player list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {filtered.map(p => {
                    const isExpanded = expandedId === p.id;
                    const isEditing = editingId === p.id;
                    const sessions = parseSessions(p.selectedSessions);

                    return (
                        <div key={p.id} style={{ ...sCard, padding: 0, marginBottom: 0 }}>
                            {/* Header row */}
                            <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => setExpandedId(isExpanded ? null : p.id)}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <div style={{ fontSize: 13, fontWeight: 700, color: B.nvD, fontFamily: F }}>{p.name}</div>
                                        {p.hasDNA && <span style={{ fontSize: 7, fontWeight: 800, padding: '1px 5px', borderRadius: 4, background: `${B.grn}15`, color: B.grn }}>DNA</span>}
                                        {p.hasAssessment && <span style={{ fontSize: 7, fontWeight: 800, padding: '1px 5px', borderRadius: 4, background: `${B.pk}15`, color: B.pk }}>ASSESSED</span>}
                                        {p.isArchived && <span style={{ fontSize: 7, fontWeight: 800, padding: '1px 5px', borderRadius: 4, background: `${B.red}15`, color: B.red }}>ARCHIVED</span>}
                                    </div>
                                    <div style={{ fontSize: 10, color: B.g400, fontFamily: F, marginTop: 2 }}>
                                        {[p.age ? `${p.age}yo` : null, p.gender, p.suburb, p.club].filter(Boolean).join(' · ')}
                                    </div>
                                </div>
                                {/* Quick actions — always visible */}
                                <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0 }}>
                                    <button onClick={(e) => { e.stopPropagation(); setExpandedId(p.id); handleEdit(p); }}
                                        style={{ padding: '5px 10px', borderRadius: 6, border: `1px solid ${B.bl}`, background: B.w, color: B.bl, fontSize: 10, fontWeight: 700, fontFamily: F, cursor: 'pointer' }}>
                                        Edit
                                    </button>
                                    {tab === 'active' && p.dnaId && (
                                        <button onClick={(e) => { e.stopPropagation(); requestArchive(p); }}
                                            style={{ padding: '5px 10px', borderRadius: 6, border: `1px solid ${B.amb}`, background: B.w, color: B.amb, fontSize: 10, fontWeight: 700, fontFamily: F, cursor: 'pointer' }}>
                                            Archive
                                        </button>
                                    )}
                                    {tab === 'archived' && (
                                        <button onClick={(e) => { e.stopPropagation(); handleRestore(p); }}
                                            style={{ padding: '5px 10px', borderRadius: 6, border: `1px solid ${B.grn}`, background: B.w, color: B.grn, fontSize: 10, fontWeight: 700, fontFamily: F, cursor: 'pointer' }}>
                                            Restore
                                        </button>
                                    )}
                                    <button onClick={(e) => { e.stopPropagation(); requestDelete(p); }}
                                        style={{ padding: '5px 10px', borderRadius: 6, border: `1px solid ${B.red}`, background: B.w, color: B.red, fontSize: 10, fontWeight: 700, fontFamily: F, cursor: 'pointer' }}>
                                        Delete
                                    </button>
                                    <div onClick={() => setExpandedId(isExpanded ? null : p.id)} style={{ fontSize: 10, color: B.g400, transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', cursor: 'pointer', padding: '4px' }}>▼</div>
                                </div>
                            </div>

                            {/* Expanded: edit mode or view mode */}
                            {isExpanded && (
                                <div style={{ padding: '0 14px 14px', borderTop: `1px solid ${B.g100}` }}>
                                    {isEditing ? (
                                        /* ═══ EDIT MODE ═══ */
                                        <div style={{ marginTop: 10 }}>
                                            <div style={{ fontSize: 11, fontWeight: 800, color: B.bl, fontFamily: F, marginBottom: 8 }}>EDIT PROFILE</div>
                                            {[
                                                { key: 'name', label: 'Name' },
                                                { key: 'club', label: 'Club' },
                                                { key: 'suburb', label: 'Suburb' },
                                                { key: 'gender', label: 'Gender' },
                                            ].map(f => (
                                                <div key={f.key} style={{ marginBottom: 8 }}>
                                                    <label style={{ fontSize: 9, fontWeight: 700, color: B.g400, fontFamily: F, display: 'block', marginBottom: 4 }}>{f.label}</label>
                                                    <input value={editData[f.key] || ''} onChange={e => setEditData(prev => ({ ...prev, [f.key]: e.target.value }))}
                                                        style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: `1px solid ${B.g200}`, fontSize: 12, fontFamily: F, outline: 'none', boxSizing: 'border-box' }} />
                                                </div>
                                            ))}
                                            {/* Role selector */}
                                            <div style={{ marginBottom: 8 }}>
                                                <label style={{ fontSize: 9, fontWeight: 700, color: B.g400, fontFamily: F, display: 'block', marginBottom: 4 }}>Role (DNA)</label>
                                                <select value={editData.role || ''} onChange={e => setEditData(prev => ({ ...prev, role: e.target.value }))}
                                                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: `1px solid ${B.g200}`, fontSize: 12, fontFamily: F }}>
                                                    <option value="">Not set</option>
                                                    {ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                                                </select>
                                            </div>
                                            <div style={{ marginBottom: 8 }}>
                                                <label style={{ fontSize: 9, fontWeight: 700, color: B.g400, fontFamily: F, display: 'block', marginBottom: 4 }}>Player Role (Cohort)</label>
                                                <input value={editData.playerRole || ''} onChange={e => setEditData(prev => ({ ...prev, playerRole: e.target.value }))}
                                                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: `1px solid ${B.g200}`, fontSize: 12, fontFamily: F, outline: 'none', boxSizing: 'border-box' }} />
                                            </div>
                                            {/* Action buttons */}
                                            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                                                <button onClick={() => handleSaveEdit(p)} disabled={saving}
                                                    style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: B.bl, color: B.w, fontSize: 11, fontWeight: 700, fontFamily: F, cursor: 'pointer' }}>
                                                    {saving ? 'Saving...' : 'Save Changes'}
                                                </button>
                                                <button onClick={() => setEditingId(null)}
                                                    style={{ padding: '10px 14px', borderRadius: 8, border: `1px solid ${B.g200}`, background: B.w, color: B.g600, fontSize: 11, fontFamily: F, cursor: 'pointer' }}>
                                                    Cancel
                                                </button>
                                            </div>
                                            {/* Destructive actions — separated visually */}
                                            <div style={{ display: 'flex', gap: 8, marginTop: 16, paddingTop: 12, borderTop: `1px dashed ${B.g200}` }}>
                                                {tab === 'active' && p.dnaId && (
                                                    <button onClick={() => requestArchive(p)}
                                                        style={{ flex: 1, padding: '10px', borderRadius: 8, border: `1px solid ${B.amb}`, background: `${B.amb}08`, color: B.amb, fontSize: 11, fontWeight: 700, fontFamily: F, cursor: 'pointer' }}>
                                                        Archive Player
                                                    </button>
                                                )}
                                                <button onClick={() => requestDelete(p)}
                                                    style={{ flex: 1, padding: '10px', borderRadius: 8, border: `1px solid ${B.red}`, background: `${B.red}08`, color: B.red, fontSize: 11, fontWeight: 700, fontFamily: F, cursor: 'pointer' }}>
                                                    Delete Player
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        /* ═══ VIEW MODE ═══ */
                                        <div>
                                            <div style={{ fontSize: 10, fontWeight: 800, color: B.bl, fontFamily: F, marginTop: 10, marginBottom: 6 }}>CONTACT</div>
                                            <InfoRow label="Email" value={p.email} />
                                            <InfoRow label="Player Email" value={p.playerEmail} />
                                            <InfoRow label="Player Phone" value={p.playerPhone} />
                                            <InfoRow label="Phone" value={p.phone} />
                                            {p.parent1?.name && <InfoRow label="Parent 1" value={`${p.parent1.name} · ${p.parent1.email || ''} · ${p.parent1.phone || ''}`} />}
                                            {p.parent2?.name && <InfoRow label="Parent 2" value={`${p.parent2.name} · ${p.parent2.email || ''} · ${p.parent2.phone || ''}`} />}

                                            <div style={{ fontSize: 10, fontWeight: 800, color: B.pk, fontFamily: F, marginTop: 12, marginBottom: 6 }}>CRICKET</div>
                                            <InfoRow label="Role (DNA)" value={p.dnaRole ? ROLES.find(r => r.id === p.dnaRole)?.label : null} />
                                            <InfoRow label="Role (Cohort)" value={p.playerRole || p.cricketType} />
                                            <InfoRow label="Club" value={p.club} />
                                            <InfoRow label="Bat/Bowl" value={[p.batHand, p.bowlType].filter(Boolean).join(' / ') || null} />
                                            <InfoRow label="Archetype" value={p.dnaArchBat ? `Bat: ${p.dnaArchBat}${p.dnaArchBwl ? ` · Bowl: ${p.dnaArchBwl}` : ''}` : null} />
                                            <InfoRow label="Height" value={p.heightCm ? `${p.heightCm}cm` : null} />
                                            {p.history && <InfoRow label="History" value={p.history.length > 200 ? p.history.substring(0, 200) + '...' : p.history} />}
                                            {p.injury && <InfoRow label="Medical" value={p.injury} />}

                                            {sessions.length > 0 && (
                                                <>
                                                    <div style={{ fontSize: 10, fontWeight: 800, color: B.prp, fontFamily: F, marginTop: 12, marginBottom: 6 }}>SESSION PREFERENCES</div>
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                                        {sessions.map((s, i) => (
                                                            <span key={i} style={{ padding: '3px 8px', borderRadius: 6, background: s.includes('Weekday') ? `${B.bl}12` : `${B.grn}12`, border: `1px solid ${s.includes('Weekday') ? `${B.bl}30` : `${B.grn}30`}`, fontSize: 9, fontFamily: F, color: s.includes('Weekday') ? B.bl : B.grn }}>{s}</span>
                                                        ))}
                                                    </div>
                                                </>
                                            )}

                                            {(p.shirtName || p.sizeTshirt) && (
                                                <>
                                                    <div style={{ fontSize: 10, fontWeight: 800, color: B.org, fontFamily: F, marginTop: 12, marginBottom: 6 }}>UNIFORM</div>
                                                    <InfoRow label="Shirt Name" value={p.shirtName} />
                                                    <InfoRow label="T-Shirt" value={p.sizeTshirt} />
                                                    <InfoRow label="Shorts" value={p.sizeShort} />
                                                    <InfoRow label="Pants" value={p.sizePants} />
                                                </>
                                            )}

                                            <div style={{ fontSize: 10, fontWeight: 800, color: B.amb, fontFamily: F, marginTop: 12, marginBottom: 6 }}>PROGRAM</div>
                                            <InfoRow label="Payment" value={p.paymentStatus} />
                                            <InfoRow label="Plan" value={p.paymentOption} />
                                            <InfoRow label="Source" value={p.source} />

                                            {/* Action buttons at bottom of view mode */}
                                            <div style={{ display: 'flex', gap: 8, marginTop: 16, paddingTop: 12, borderTop: `1px solid ${B.g100}` }}>
                                                <button onClick={() => { handleEdit(p); }}
                                                    style={{ flex: 1, padding: '10px', borderRadius: 8, border: `1px solid ${B.bl}`, background: `${B.bl}08`, color: B.bl, fontSize: 11, fontWeight: 700, fontFamily: F, cursor: 'pointer' }}>
                                                    Edit
                                                </button>
                                                {tab === 'active' && p.dnaId && (
                                                    <button onClick={() => requestArchive(p)}
                                                        style={{ flex: 1, padding: '10px', borderRadius: 8, border: `1px solid ${B.amb}`, background: `${B.amb}08`, color: B.amb, fontSize: 11, fontWeight: 700, fontFamily: F, cursor: 'pointer' }}>
                                                        Archive
                                                    </button>
                                                )}
                                                {tab === 'archived' && (
                                                    <button onClick={() => handleRestore(p)}
                                                        style={{ flex: 1, padding: '10px', borderRadius: 8, border: `1px solid ${B.grn}`, background: `${B.grn}08`, color: B.grn, fontSize: 11, fontWeight: 700, fontFamily: F, cursor: 'pointer' }}>
                                                        Restore
                                                    </button>
                                                )}
                                                <button onClick={() => requestDelete(p)}
                                                    style={{ padding: '10px', borderRadius: 8, border: `1px solid ${B.red}`, background: `${B.red}08`, color: B.red, fontSize: 11, fontWeight: 700, fontFamily: F, cursor: 'pointer' }}>
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
