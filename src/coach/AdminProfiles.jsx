// ═══ ADMIN PLAYER PROFILES — Unified directory with full management ═══
import React, { useState, useEffect, useCallback } from "react";
import { B, F, sCard, getDkWrap } from "../data/theme";
import { ROLES } from "../data/skillItems";
import { supabase } from "../supabaseClient";
import { updatePlayer, archivePlayer, restorePlayer, deletePlayer, bulkArchivePlayers, bulkDeletePlayers, updateCohortPlayer, deleteCohortPlayer, bulkDeleteCohortPlayers } from "../db/adminDb";

const TABS = [
    { id: 'active', label: 'Active' },
    { id: 'archived', label: 'Archived' },
];

export default function AdminProfiles() {
    const [profiles, setProfiles] = useState([]);
    const [archivedProfiles, setArchivedProfiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [tab, setTab] = useState('active');
    const [expandedId, setExpandedId] = useState(null);
    const [editingId, setEditingId] = useState(null);
    const [editData, setEditData] = useState({});
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [saving, setSaving] = useState(false);
    const [feedback, setFeedback] = useState(null);

    const showFeedback = (type, text) => {
        setFeedback({ type, text });
        setTimeout(() => setFeedback(null), 3000);
    };

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [{ data: cohort }, { data: apps }, { data: dnaPlayers }, { data: assessments }, { data: archivedDna }] = await Promise.all([
                supabase.from('official_cohort_2026').select('*').order('player_name'),
                supabase.from('applications').select('*').order('first_name'),
                supabase.from('players').select('*').eq('submitted', true),
                supabase.from('coach_assessments').select('player_id, narrative, strengths, priorities, updated_at'),
                supabase.from('players').select('*').eq('submitted', false),
            ]);

            // Deduplicate cohort
            const deduped = {};
            (cohort || []).filter(c => c.player_name && c.player_name.length > 3).forEach(c => {
                const key = c.player_name.toLowerCase().trim();
                if (!deduped[key]) { deduped[key] = c; return; }
                const existing = deduped[key];
                const es = (existing.dob ? 1 : 0) + (existing.selected_sessions ? 1 : 0) + (existing.age ? 1 : 0);
                const ns = (c.dob ? 1 : 0) + (c.selected_sessions ? 1 : 0) + (c.age ? 1 : 0);
                if (ns > es) deduped[key] = c;
            });

            const mergeProfile = (c, source) => {
                const app = (apps || []).find(a => a.email && c.email && a.email.toLowerCase() === c.email.toLowerCase());
                const dna = (dnaPlayers || []).concat(archivedDna || []).find(p => p.name?.toLowerCase().trim() === c.player_name?.toLowerCase().trim());
                const assessment = dna ? (assessments || []).find(a => a.player_id === dna.id) : null;
                return {
                    id: c.id, cohortId: c.id, dnaId: dna?.id,
                    name: c.player_name, firstName: c.first_name, lastName: c.last_name,
                    dob: c.dob || app?.dob, age: c.age || app?.age,
                    gender: c.gender, suburb: c.suburb,
                    club: c.club || dna?.club || app?.club,
                    email: c.email, playerEmail: c.player_email, playerPhone: c.player_phone, phone: c.phone,
                    parent1: { name: c.parent1_name, email: c.parent1_email, phone: c.parent1_phone },
                    parent2: { name: c.parent2_name, email: c.parent2_email, phone: c.parent2_phone },
                    selectedSessions: c.selected_sessions, preferredComms: c.preferred_comms,
                    shirtName: c.shirt_name, sizeTshirt: c.size_tshirt, sizeShort: c.size_short, sizePants: c.size_pants,
                    role: dna?.role, playerRole: c.player_role, cricketType: c.cricket_type,
                    paymentStatus: c.payment_status, paymentOption: c.payment_option_selected,
                    acceptedOffer: c.accepted_offer, groupChatConsent: c.group_chat_consent,
                    profileLink: c.profile_link || app?.profile_link,
                    history: c.history || app?.history, bio: c.bio || app?.bio, goals: c.goals || app?.goals,
                    source: c.source || app?.source,
                    hasDNA: !!dna && dna.submitted, dnaRole: dna?.role,
                    batHand: dna?.batting_hand, bowlType: dna?.bowling_type,
                    dnaArchBat: dna?.player_bat_archetype, dnaArchBwl: dna?.player_bwl_archetype,
                    injury: dna?.injury, heightCm: dna?.height_cm,
                    hasAssessment: !!assessment, narrative: assessment?.narrative,
                    isArchived: dna ? !dna.submitted : false,
                    source_table: source,
                };
            };

            setProfiles(Object.values(deduped).map(c => mergeProfile(c, 'cohort')));

            // Archived = DNA players with submitted=false
            setArchivedProfiles((archivedDna || []).map(p => ({
                id: p.id, dnaId: p.id, name: p.name, dob: p.dob, age: null,
                gender: p.gender, suburb: null, club: p.club, email: p.email,
                role: p.role, isArchived: true, source_table: 'players',
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
            // Update cohort table
            if (profile.cohortId) {
                await updateCohortPlayer(profile.cohortId, {
                    player_name: editData.name, club: editData.club,
                    suburb: editData.suburb, gender: editData.gender,
                    player_role: editData.playerRole,
                });
            }
            // Update DNA player if linked
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

    const handleArchive = async (profile) => {
        if (profile.dnaId) {
            try {
                await archivePlayer(profile.dnaId);
                showFeedback('ok', `${profile.name} archived`);
                loadData();
            } catch (err) { showFeedback('err', 'Archive failed'); }
        } else {
            showFeedback('err', `${profile.name} has no DNA profile to archive`);
        }
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

    const handleDelete = async (profile) => {
        if (!profile.dnaId && !profile.cohortId) return;
        if (!window.confirm(`Permanently delete ${profile.name} and all their data? This cannot be undone.`)) return;
        try {
            if (profile.dnaId) await deletePlayer(profile.dnaId);
            if (profile.cohortId) await deleteCohortPlayer(profile.cohortId);
            showFeedback('ok', `${profile.name} deleted`);
            loadData();
        } catch (err) { showFeedback('err', 'Delete failed'); }
    };

    const toggleSelect = (id) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const selectAll = () => {
        const visible = filtered.map(p => p.id);
        if (selectedIds.size === visible.length) setSelectedIds(new Set());
        else setSelectedIds(new Set(visible));
    };

    const handleBulkArchive = async () => {
        const selected = filtered.filter(p => selectedIds.has(p.id));
        const dnaIds = selected.filter(p => p.dnaId).map(p => p.dnaId);
        if (dnaIds.length === 0) { showFeedback('err', 'No DNA profiles to archive in selection'); return; }
        try {
            await bulkArchivePlayers(dnaIds);
            showFeedback('ok', `${dnaIds.length} players archived`);
            setSelectedIds(new Set());
            loadData();
        } catch (err) { showFeedback('err', 'Bulk archive failed'); }
    };

    const handleBulkDelete = async () => {
        const selected = filtered.filter(p => selectedIds.has(p.id));
        const dnaIds = selected.filter(p => p.dnaId).map(p => p.dnaId);
        const cohortOnlyIds = selected.filter(p => !p.dnaId && p.cohortId).map(p => p.cohortId);
        const total = dnaIds.length + cohortOnlyIds.length;
        if (total === 0) { showFeedback('err', 'No profiles to delete'); return; }
        if (!window.confirm(`Permanently delete ${total} players? This cannot be undone.`)) return;
        try {
            if (dnaIds.length > 0) await bulkDeletePlayers(dnaIds);
            if (cohortOnlyIds.length > 0) await bulkDeleteCohortPlayers(cohortOnlyIds);
            showFeedback('ok', `${total} players deleted`);
            setSelectedIds(new Set());
            loadData();
        } catch (err) { showFeedback('err', 'Bulk delete failed'); }
    };

    const handleArchiveAll = async () => {
        const dnaIds = filtered.filter(p => p.dnaId).map(p => p.dnaId);
        if (dnaIds.length === 0) { showFeedback('err', 'No DNA profiles to archive'); return; }
        if (!window.confirm(`Archive all ${dnaIds.length} visible players? They can be restored later.`)) return;
        try {
            await bulkArchivePlayers(dnaIds);
            showFeedback('ok', `${dnaIds.length} players archived`);
            setSelectedIds(new Set());
            loadData();
        } catch (err) { showFeedback('err', 'Archive all failed'); }
    };

    const handleDeleteAll = async () => {
        const dnaIds = filtered.filter(p => p.dnaId).map(p => p.dnaId);
        const cohortOnlyIds = filtered.filter(p => !p.dnaId && p.cohortId).map(p => p.cohortId);
        const total = dnaIds.length + cohortOnlyIds.length;
        if (total === 0) { showFeedback('err', 'No profiles to delete'); return; }
        if (!window.confirm(`⚠️ PERMANENTLY DELETE ALL ${total} visible players? This cannot be undone!`)) return;
        if (!window.confirm(`Are you absolutely sure? This will delete ${total} players and ALL their data permanently.`)) return;
        try {
            if (dnaIds.length > 0) await bulkDeletePlayers(dnaIds);
            if (cohortOnlyIds.length > 0) await bulkDeleteCohortPlayers(cohortOnlyIds);
            showFeedback('ok', `${total} players deleted`);
            setSelectedIds(new Set());
            loadData();
        } catch (err) { showFeedback('err', 'Delete all failed'); }
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

    const InfoRow = ({ label, value }) => {
        if (!value) return null;
        return (
            <div style={{ display: 'flex', gap: 8, padding: '4px 0', borderBottom: `1px solid ${B.g100}` }}>
                <div style={{ width: 100, fontSize: 10, fontWeight: 700, color: B.g400, fontFamily: F, flexShrink: 0 }}>{label}</div>
                <div style={{ fontSize: 11, color: B.nvD, fontFamily: F, wordBreak: 'break-word' }}>{value}</div>
            </div>
        );
    };

    return (
        <div style={{ padding: 12, ...getDkWrap() }}>
            {/* Feedback toast */}
            {feedback && (
                <div style={{ padding: '10px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, fontFamily: F, marginBottom: 8, background: feedback.type === 'ok' ? `${B.grn}15` : '#fee2e2', color: feedback.type === 'ok' ? B.grn : '#dc2626', border: `1px solid ${feedback.type === 'ok' ? `${B.grn}30` : '#fca5a5'}` }}>
                    {feedback.text}
                </div>
            )}

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                {TABS.map(t => (
                    <button key={t.id} onClick={() => { setTab(t.id); setSelectedIds(new Set()); }}
                        style={{ padding: '8px 16px', borderRadius: 8, border: tab === t.id ? `1.5px solid ${B.bl}` : `1px solid ${B.g200}`, background: tab === t.id ? `${B.bl}10` : B.w, color: tab === t.id ? B.bl : B.g600, fontSize: 11, fontWeight: tab === t.id ? 800 : 600, fontFamily: F, cursor: 'pointer' }}>
                        {t.label} ({t.id === 'active' ? profiles.length : archivedProfiles.length})
                    </button>
                ))}
            </div>

            {/* Search + bulk actions */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, suburb, club..."
                    style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: `1px solid ${B.g200}`, fontSize: 12, fontFamily: F, outline: 'none' }} />
                {tab === 'active' && (
                    <button onClick={handleArchiveAll}
                        style={{ fontSize: 10, fontWeight: 700, padding: '8px 12px', borderRadius: 8, border: `1px solid ${B.amb}`, background: `${B.amb}10`, color: B.amb, cursor: 'pointer', fontFamily: F, whiteSpace: 'nowrap' }}>
                        Archive All
                    </button>
                )}
                <button onClick={handleDeleteAll}
                    style={{ fontSize: 10, fontWeight: 700, padding: '8px 12px', borderRadius: 8, border: `1px solid ${B.red}`, background: `${B.red}10`, color: B.red, cursor: 'pointer', fontFamily: F, whiteSpace: 'nowrap' }}>
                    Delete All
                </button>
            </div>

            {/* Bulk action bar */}
            {selectedIds.size > 0 && (
                <div style={{ display: 'flex', gap: 6, marginBottom: 8, padding: '8px 12px', background: `${B.bl}08`, borderRadius: 8, border: `1px solid ${B.bl}30`, alignItems: 'center' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: B.bl, fontFamily: F, flex: 1 }}>{selectedIds.size} selected</div>
                    <button onClick={handleBulkArchive} style={{ fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 6, border: `1px solid ${B.amb}`, background: `${B.amb}10`, color: B.amb, cursor: 'pointer', fontFamily: F }}>Archive</button>
                    <button onClick={handleBulkDelete} style={{ fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 6, border: `1px solid ${B.red}`, background: `${B.red}10`, color: B.red, cursor: 'pointer', fontFamily: F }}>Delete</button>
                    <button onClick={() => setSelectedIds(new Set())} style={{ fontSize: 10, color: B.g400, background: 'none', border: 'none', cursor: 'pointer', fontFamily: F }}>Clear</button>
                </div>
            )}

            {/* Select all */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, padding: '0 4px' }}>
                <div style={{ fontSize: 10, color: B.g400, fontFamily: F }}>{filtered.length} players</div>
                <button onClick={selectAll} style={{ fontSize: 9, color: B.bl, background: 'none', border: 'none', cursor: 'pointer', fontFamily: F }}>
                    {selectedIds.size === filtered.length ? 'Deselect all' : 'Select all'}
                </button>
            </div>

            {/* Player list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {filtered.map(p => {
                    const isExpanded = expandedId === p.id;
                    const isEditing = editingId === p.id;
                    const isSelected = selectedIds.has(p.id);
                    const sessions = parseSessions(p.selectedSessions);

                    return (
                        <div key={p.id} style={{ ...sCard, padding: 0, marginBottom: 0, borderLeft: isSelected ? `3px solid ${B.bl}` : undefined }}>
                            {/* Header row with checkbox */}
                            <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                                <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(p.id)}
                                    style={{ width: 16, height: 16, cursor: 'pointer', flexShrink: 0 }} />
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
                                {/* Quick action buttons */}
                                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                                    <button onClick={(e) => { e.stopPropagation(); handleEdit(p); setExpandedId(p.id); }}
                                        style={{ fontSize: 9, fontWeight: 600, padding: '3px 8px', borderRadius: 4, border: `1px solid ${B.bl}30`, background: `${B.bl}08`, color: B.bl, cursor: 'pointer', fontFamily: F }}>Edit</button>
                                    {tab === 'active' && p.dnaId && (
                                        <button onClick={(e) => { e.stopPropagation(); handleArchive(p); }}
                                            style={{ fontSize: 9, fontWeight: 600, padding: '3px 8px', borderRadius: 4, border: `1px solid ${B.amb}30`, background: `${B.amb}08`, color: B.amb, cursor: 'pointer', fontFamily: F }}>Archive</button>
                                    )}
                                    {tab === 'archived' && (
                                        <button onClick={(e) => { e.stopPropagation(); handleRestore(p); }}
                                            style={{ fontSize: 9, fontWeight: 600, padding: '3px 8px', borderRadius: 4, border: `1px solid ${B.grn}30`, background: `${B.grn}08`, color: B.grn, cursor: 'pointer', fontFamily: F }}>Restore</button>
                                    )}
                                    {(p.dnaId || p.cohortId) && (
                                        <button onClick={(e) => { e.stopPropagation(); handleDelete(p); }}
                                            style={{ fontSize: 9, fontWeight: 600, padding: '3px 8px', borderRadius: 4, border: `1px solid ${B.red}30`, background: `${B.red}08`, color: B.red, cursor: 'pointer', fontFamily: F }}>Delete</button>
                                    )}
                                </div>
                                <div onClick={() => setExpandedId(isExpanded ? null : p.id)}
                                    style={{ fontSize: 10, color: B.g400, cursor: 'pointer', transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</div>
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
                                            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                                                <button onClick={() => handleSaveEdit(p)} disabled={saving}
                                                    style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: B.bl, color: B.w, fontSize: 11, fontWeight: 700, fontFamily: F, cursor: 'pointer' }}>
                                                    {saving ? 'Saving...' : 'Save Changes'}
                                                </button>
                                                <button onClick={() => setEditingId(null)}
                                                    style={{ padding: '10px 14px', borderRadius: 8, border: `1px solid ${B.g200}`, background: B.w, color: B.g600, fontSize: 11, fontFamily: F, cursor: 'pointer' }}>
                                                    Cancel
                                                </button>
                                                {p.dnaId && (
                                                    <button onClick={() => handleDelete(p)}
                                                        style={{ padding: '10px 14px', borderRadius: 8, border: `1px solid ${B.red}`, background: `${B.red}08`, color: B.red, fontSize: 11, fontWeight: 700, fontFamily: F, cursor: 'pointer' }}>
                                                        Delete
                                                    </button>
                                                )}
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
