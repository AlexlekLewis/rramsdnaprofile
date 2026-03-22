import React, { useState, useEffect } from "react";
import { loadRecentSessionsForPlayer, loadJournalHistory, saveJournalEntry, updateJournalEntry } from "../db/journalDb";
import { B, F, sCard } from "../data/theme";

const MOODS = [
    { id: 'great', label: 'Great Day', icon: '🟢', color: B.grn },
    { id: 'okay', label: 'Okay', icon: '🟡', color: B.amb },
    { id: 'tough', label: 'Tough Day', icon: '🔴', color: B.red },
];

const TABS = [
    { id: 'new', label: 'New Entry' },
    { id: 'freeform', label: 'Free Write' },
    { id: 'history', label: 'History' },
];

// Word count helper
const wordCount = (text) => (text || '').trim().split(/\s+/).filter(Boolean).length;

// Check if entry is within 24 hours (editable window)
const isEditable = (createdAt) => {
    if (!createdAt) return false;
    return (Date.now() - new Date(createdAt).getTime()) < 24 * 60 * 60 * 1000;
};

// Group entries by week/month
const groupByDate = (entries) => {
    const now = new Date();
    const groups = {};
    entries.forEach(e => {
        const d = new Date(e.created_at);
        const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));
        let key;
        if (diffDays < 7) key = 'This Week';
        else if (diffDays < 14) key = 'Last Week';
        else key = d.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });
        if (!groups[key]) groups[key] = [];
        groups[key].push(e);
    });
    return groups;
};

export default function Journal({ session, userProfile }) {
    const [activeTab, setActiveTab] = useState("new");
    const [recentSessions, setRecentSessions] = useState([]);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    // Session-linked entry state
    const [selectedSessId, setSelectedSessId] = useState("");
    const [answers, setAnswers] = useState({});
    const [mood, setMood] = useState(null);
    const [saving, setSaving] = useState(false);
    const [saveMsg, setSaveMsg] = useState(null);

    // Free-form entry state
    const [freeText, setFreeText] = useState("");
    const [freeTitle, setFreeTitle] = useState("");
    const [freeMood, setFreeMood] = useState(null);

    // Edit state
    const [editingId, setEditingId] = useState(null);
    const [editAnswers, setEditAnswers] = useState({});
    const [editFreeText, setEditFreeText] = useState("");
    const [editMood, setEditMood] = useState(null);

    useEffect(() => {
        if (!userProfile?.id) return;
        setLoading(true);
        Promise.all([
            loadRecentSessionsForPlayer(userProfile.id),
            loadJournalHistory(userProfile.id)
        ]).then(([sessData, histData]) => {
            const journalSessIds = new Set(histData.map(h => h.session_id));
            const availableSess = sessData.filter(s => !journalSessIds.has(s.id));
            setRecentSessions(availableSess);
            setHistory(histData);
            if (availableSess.length > 0) setSelectedSessId(availableSess[0].id);
        }).catch(err => console.error("Error loading journal data:", err))
            .finally(() => setLoading(false));
    }, [userProfile?.id]);

    const activeSess = recentSessions.find(s => s.id === selectedSessId);
    const questions = activeSess?.journal_questions?.length > 0
        ? activeSess.journal_questions
        : ["What went well today?", "What was challenging?", "What's my focus for next session?"];

    const showToast = (type, text, duration = 3000) => {
        setSaveMsg({ type, text });
        setTimeout(() => setSaveMsg(null), duration);
    };

    // Save session-linked entry
    const handleSave = async () => {
        if (!selectedSessId || !activeSess) return;
        setSaving(true);
        try {
            const entry = {
                session_id: selectedSessId,
                program_id: activeSess.program_id,
                answers: questions.map(q => ({ q, a: answers[q] || '' })),
                mood: mood,
            };
            await saveJournalEntry(entry, userProfile.id);
            showToast('ok', 'Journal saved!');
            const savedEntry = {
                ...entry, id: Date.now(), created_at: new Date().toISOString(),
                sessions: { title: activeSess.title, session_date: activeSess.session_date },
                programs: { name: activeSess.programs?.name || 'Program' }
            };
            setHistory([savedEntry, ...history]);
            const newAvailable = recentSessions.filter(s => s.id !== selectedSessId);
            setRecentSessions(newAvailable);
            setSelectedSessId(newAvailable[0]?.id || "");
            setAnswers({});
            setMood(null);
            setActiveTab("history");
        } catch (err) {
            console.error(err);
            showToast('err', 'Failed to save — check your connection', 5000);
        } finally { setSaving(false); }
    };

    // Save free-form entry
    const handleSaveFreeForm = async () => {
        if (!freeText.trim()) return;
        setSaving(true);
        try {
            const entry = {
                answers: [{ q: freeTitle.trim() || 'Free Write', a: freeText.trim() }],
                mood: freeMood,
            };
            const saved = await saveJournalEntry(entry, userProfile.id);
            showToast('ok', 'Entry saved!');
            setHistory([{ ...saved, sessions: null, programs: null }, ...history]);
            setFreeText("");
            setFreeTitle("");
            setFreeMood(null);
            setActiveTab("history");
        } catch (err) {
            console.error(err);
            showToast('err', 'Failed to save', 5000);
        } finally { setSaving(false); }
    };

    // Edit existing entry
    const startEdit = (entry) => {
        setEditingId(entry.id);
        setEditMood(entry.mood || null);
        if (entry.session_id) {
            const ans = {};
            (entry.answers || []).forEach(a => { ans[a.q] = a.a; });
            setEditAnswers(ans);
        } else {
            setEditFreeText(entry.answers?.[0]?.a || '');
        }
    };

    const saveEdit = async (entry) => {
        setSaving(true);
        try {
            const updates = { mood: editMood };
            if (entry.session_id) {
                const qs = (entry.answers || []).map(a => a.q);
                updates.answers = qs.map(q => ({ q, a: editAnswers[q] || '' }));
            } else {
                updates.answers = [{ q: entry.answers?.[0]?.q || 'Free Write', a: editFreeText }];
            }
            await updateJournalEntry(entry.id, updates);
            setHistory(prev => prev.map(h => h.id === entry.id ? { ...h, ...updates } : h));
            setEditingId(null);
            showToast('ok', 'Entry updated!');
        } catch (err) {
            console.error(err);
            showToast('err', 'Failed to update', 5000);
        } finally { setSaving(false); }
    };

    if (loading) return <div style={{ padding: 24, fontSize: 13, color: B.g400, fontFamily: F, textAlign: 'center' }}>Loading...</div>;

    const MoodPicker = ({ value, onChange, size = 'normal' }) => (
        <div style={{ display: 'flex', gap: 6, marginTop: size === 'small' ? 0 : 8 }}>
            {MOODS.map(m => (
                <button key={m.id} onClick={() => onChange(value === m.id ? null : m.id)}
                    style={{ padding: size === 'small' ? '3px 8px' : '6px 12px', borderRadius: 20, border: `1.5px solid ${value === m.id ? m.color : B.g200}`, background: value === m.id ? `${m.color}15` : 'transparent', fontSize: size === 'small' ? 9 : 10, fontWeight: value === m.id ? 700 : 500, color: value === m.id ? m.color : B.g400, fontFamily: F, cursor: 'pointer', transition: 'all 0.15s' }}>
                    {m.icon} {m.label}
                </button>
            ))}
        </div>
    );

    const WordCounter = ({ text }) => {
        const wc = wordCount(text);
        return <div style={{ fontSize: 9, color: B.g400, fontFamily: F, textAlign: 'right', marginTop: 4 }}>{wc} word{wc !== 1 ? 's' : ''}</div>;
    };

    const TabBtn = ({ id, label }) => (
        <button onClick={() => setActiveTab(id)} style={{
            flex: 1, padding: '12px', border: 'none', background: 'transparent',
            borderBottom: activeTab === id ? `2px solid ${B.bl}` : `2px solid transparent`,
            color: activeTab === id ? B.bl : B.g400, fontWeight: activeTab === id ? 800 : 600,
            fontSize: 11, fontFamily: F, cursor: 'pointer', transition: 'all 0.2s'
        }}>{label}</button>
    );

    const groupedHistory = groupByDate(history);

    return (
        <div>
            {/* TOAST */}
            {saveMsg && (
                <div style={{ padding: '10px 16px', margin: '8px 16px 0', borderRadius: 8, fontSize: 12, fontWeight: 700, fontFamily: F, background: saveMsg.type === 'ok' ? `${B.grn}15` : '#fee2e2', color: saveMsg.type === 'ok' ? B.grn : '#dc2626', border: `1px solid ${saveMsg.type === 'ok' ? `${B.grn}30` : '#fca5a5'}` }}>
                    {saveMsg.text}
                </div>
            )}
            {/* TABS */}
            <div style={{ display: 'flex', background: B.w, borderBottom: `1px solid ${B.g200}` }}>
                {TABS.map(t => <TabBtn key={t.id} id={t.id} label={t.label} />)}
            </div>

            <div style={{ padding: 16 }}>
                {/* ═══ SESSION-LINKED ENTRY ═══ */}
                {activeTab === "new" && (
                    <div style={{ ...sCard, padding: 20 }}>
                        {recentSessions.length === 0 ? (
                            <div style={{ fontSize: 13, color: B.g400, fontFamily: F, textAlign: 'center', padding: '24px 0' }}>
                                No pending session reflections.
                                <br /><span style={{ fontSize: 11 }}>Try the Free Write tab to journal anytime.</span>
                            </div>
                        ) : (
                            <>
                                <div style={{ marginBottom: 20 }}>
                                    <label style={{ fontSize: 10, fontWeight: 700, color: B.g400, fontFamily: F, textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 8 }}>Select Session</label>
                                    <select value={selectedSessId} onChange={e => { setSelectedSessId(e.target.value); setAnswers({}); }}
                                        style={{ width: '100%', padding: '12px 16px', borderRadius: 8, border: `1px solid ${B.g200}`, fontSize: 13, fontWeight: 600, fontFamily: F, outline: 'none', cursor: 'pointer' }}>
                                        {recentSessions.map(s => (
                                            <option key={s.id} value={s.id}>{s.session_date} — {s.title} ({s.programs?.name})</option>
                                        ))}
                                    </select>
                                </div>

                                <MoodPicker value={mood} onChange={setMood} />

                                {questions.map((q, i) => (
                                    <div key={i} style={{ marginTop: 16 }}>
                                        <div style={{ fontSize: 12, fontWeight: 700, color: B.g600, fontFamily: F, marginBottom: 8 }}>{q}</div>
                                        <textarea value={answers[q] || ''} onChange={e => setAnswers(prev => ({ ...prev, [q]: e.target.value }))}
                                            placeholder="Write your reflection..." rows={4}
                                            style={{ width: '100%', padding: '12px 16px', borderRadius: 8, border: `1px solid ${B.g200}`, fontSize: 13, fontFamily: F, background: B.g50, outline: 'none', boxSizing: 'border-box', resize: 'vertical' }} />
                                        <WordCounter text={answers[q]} />
                                    </div>
                                ))}

                                <button onClick={handleSave} disabled={saving}
                                    style={{ width: '100%', marginTop: 12, padding: '14px 20px', borderRadius: 8, border: 'none', background: `linear-gradient(135deg, ${B.bl}, ${B.pk})`, color: B.w, fontSize: 13, fontWeight: 800, fontFamily: F, cursor: saving ? 'default' : 'pointer', letterSpacing: 0.5, opacity: saving ? 0.7 : 1 }}>
                                    {saving ? 'SAVING...' : 'SAVE JOURNAL ENTRY'}
                                </button>
                            </>
                        )}
                    </div>
                )}

                {/* ═══ FREE-FORM ENTRY ═══ */}
                {activeTab === "freeform" && (
                    <div style={{ ...sCard, padding: 20 }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: B.nvD, fontFamily: F, marginBottom: 4 }}>Free Write</div>
                        <div style={{ fontSize: 11, color: B.g400, fontFamily: F, marginBottom: 16 }}>Write about anything — no session required.</div>

                        <input value={freeTitle} onChange={e => setFreeTitle(e.target.value)}
                            placeholder="Title (optional)" maxLength={100}
                            style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: `1px solid ${B.g200}`, fontSize: 13, fontFamily: F, outline: 'none', boxSizing: 'border-box', marginBottom: 12 }} />

                        <MoodPicker value={freeMood} onChange={setFreeMood} />

                        <textarea value={freeText} onChange={e => setFreeText(e.target.value)}
                            placeholder="What's on your mind?" rows={8}
                            style={{ width: '100%', marginTop: 12, padding: '12px 16px', borderRadius: 8, border: `1px solid ${B.g200}`, fontSize: 13, fontFamily: F, background: B.g50, outline: 'none', boxSizing: 'border-box', resize: 'vertical' }} />
                        <WordCounter text={freeText} />

                        <button onClick={handleSaveFreeForm} disabled={saving || !freeText.trim()}
                            style={{ width: '100%', marginTop: 8, padding: '14px 20px', borderRadius: 8, border: 'none', background: !freeText.trim() ? B.g200 : `linear-gradient(135deg, ${B.bl}, ${B.pk})`, color: !freeText.trim() ? B.g400 : B.w, fontSize: 13, fontWeight: 800, fontFamily: F, cursor: saving || !freeText.trim() ? 'default' : 'pointer', letterSpacing: 0.5, opacity: saving ? 0.7 : 1 }}>
                            {saving ? 'SAVING...' : 'SAVE ENTRY'}
                        </button>
                    </div>
                )}

                {/* ═══ HISTORY ═══ */}
                {activeTab === "history" && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {history.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '32px 0', color: B.g400, fontSize: 13, fontFamily: F }}>
                                No journal entries yet. Start writing to build your reflection habit.
                            </div>
                        ) : (
                            Object.entries(groupedHistory).map(([groupLabel, entries]) => (
                                <div key={groupLabel}>
                                    <div style={{ fontSize: 11, fontWeight: 800, color: B.g400, fontFamily: F, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, paddingLeft: 4 }}>{groupLabel}</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                        {entries.map(h => {
                                            const isEdit = editingId === h.id;
                                            const canEdit = isEditable(h.created_at);
                                            const moodObj = MOODS.find(m => m.id === h.mood);
                                            const isFreeForm = !h.session_id;

                                            return (
                                                <div key={h.id} style={{ ...sCard, padding: 16, marginBottom: 0 }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                                                        <div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                <div style={{ fontSize: 14, fontWeight: 800, color: B.nvD, fontFamily: F }}>
                                                                    {isFreeForm ? (h.answers?.[0]?.q || 'Free Write') : (h.sessions?.title || 'Session')}
                                                                </div>
                                                                {moodObj && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 8, background: `${moodObj.color}15`, color: moodObj.color, fontWeight: 600 }}>{moodObj.icon}</span>}
                                                            </div>
                                                            <div style={{ fontSize: 11, color: B.g400, fontFamily: F, marginTop: 2 }}>
                                                                {isFreeForm ? new Date(h.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : `${h.sessions?.session_date || ''} · ${h.programs?.name || ''}`}
                                                            </div>
                                                        </div>
                                                        {canEdit && !isEdit && (
                                                            <button onClick={() => startEdit(h)} style={{ fontSize: 10, fontWeight: 700, color: B.bl, background: `${B.bl}10`, border: `1px solid ${B.bl}30`, borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontFamily: F }}>Edit</button>
                                                        )}
                                                    </div>

                                                    {isEdit ? (
                                                        <div>
                                                            <MoodPicker value={editMood} onChange={setEditMood} size="small" />
                                                            {isFreeForm ? (
                                                                <textarea value={editFreeText} onChange={e => setEditFreeText(e.target.value)}
                                                                    rows={6} style={{ width: '100%', marginTop: 8, padding: '10px 14px', borderRadius: 8, border: `1px solid ${B.g200}`, fontSize: 12, fontFamily: F, outline: 'none', boxSizing: 'border-box', resize: 'vertical' }} />
                                                            ) : (
                                                                (h.answers || []).map((ans, i) => (
                                                                    <div key={i} style={{ marginTop: 8 }}>
                                                                        <div style={{ fontSize: 11, fontWeight: 700, color: B.g600, fontFamily: F, marginBottom: 4 }}>{ans.q}</div>
                                                                        <textarea value={editAnswers[ans.q] || ''} onChange={e => setEditAnswers(prev => ({ ...prev, [ans.q]: e.target.value }))}
                                                                            rows={3} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: `1px solid ${B.g200}`, fontSize: 12, fontFamily: F, outline: 'none', boxSizing: 'border-box', resize: 'vertical' }} />
                                                                    </div>
                                                                ))
                                                            )}
                                                            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                                                                <button onClick={() => saveEdit(h)} disabled={saving}
                                                                    style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: B.bl, color: B.w, fontSize: 11, fontWeight: 700, fontFamily: F, cursor: 'pointer' }}>
                                                                    {saving ? 'Saving...' : 'Save Changes'}
                                                                </button>
                                                                <button onClick={() => setEditingId(null)}
                                                                    style={{ padding: '10px 14px', borderRadius: 8, border: `1px solid ${B.g200}`, background: B.w, color: B.g600, fontSize: 11, fontWeight: 600, fontFamily: F, cursor: 'pointer' }}>
                                                                    Cancel
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                                            {(h.answers || []).map((ans, i) => (
                                                                <div key={i} style={{ background: B.g50, padding: 12, borderRadius: 8 }}>
                                                                    {!isFreeForm && <div style={{ fontSize: 11, fontWeight: 700, color: B.g600, fontFamily: F, marginBottom: 4 }}>{ans.q}</div>}
                                                                    <div style={{ fontSize: 13, color: B.nv, fontFamily: F, lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>
                                                                        {ans.a || <span style={{ color: B.g400, fontStyle: 'italic' }}>No answer provided.</span>}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
