import React, { useState, useEffect } from "react";
import { loadRecentSessionsForPlayer, loadJournalHistory, saveJournalEntry } from "../db/journalDb";
import { B, F, sCard } from "../data/theme";

export default function Journal({ session, userProfile }) {
    const [activeTab, setActiveTab] = useState("new"); // new | history
    const [recentSessions, setRecentSessions] = useState([]);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    const [selectedSessId, setSelectedSessId] = useState("");
    const [answers, setAnswers] = useState({});
    const [saving, setSaving] = useState(false);
    const [saveMsg, setSaveMsg] = useState(null); // { type: 'ok'|'err', text }

    useEffect(() => {
        if (!userProfile?.id) return;
        setLoading(true);
        Promise.all([
            loadRecentSessionsForPlayer(userProfile.id),
            loadJournalHistory(userProfile.id)
        ]).then(([sessData, histData]) => {
            // Filter out sessions that already have a journal entry
            const journalSessIds = new Set(histData.map(h => h.session_id));
            const availableSess = sessData.filter(s => !journalSessIds.has(s.id));

            setRecentSessions(availableSess);
            setHistory(histData);
            if (availableSess.length > 0) setSelectedSessId(availableSess[0].id);
        }).catch(err => {
            console.error("Error loading journal data:", err);
        }).finally(() => {
            setLoading(false);
        });
    }, [userProfile?.id]);

    const activeSess = recentSessions.find(s => s.id === selectedSessId);
    const questions = activeSess?.journal_questions?.length > 0
        ? activeSess.journal_questions
        : ["What went well today?", "What was challenging?", "What's my focus for next session?"];

    const handleSave = async () => {
        if (!selectedSessId || !activeSess) return;
        setSaving(true);
        try {
            const entry = {
                session_id: selectedSessId,
                answers: questions.map(q => ({ q, a: answers[q] || '' }))
            };
            await saveJournalEntry(entry, userProfile.id);
            setSaveMsg({ type: 'ok', text: '✓ Journal saved!' });
            setTimeout(() => setSaveMsg(null), 3000);

            // Move session from recent to history (locally)
            const savedEntry = {
                ...entry,
                id: Date.now(), // fake id for instant update
                created_at: new Date().toISOString(),
                sessions: { title: activeSess.title, session_date: activeSess.session_date },
                programs: { name: activeSess.programs?.name || 'Program' }
            };
            setHistory([savedEntry, ...history]);
            const newAvailable = recentSessions.filter(s => s.id !== selectedSessId);
            setRecentSessions(newAvailable);
            setSelectedSessId(newAvailable[0]?.id || "");
            setAnswers({});
            setActiveTab("history");
        } catch (err) {
            console.error(err);
            setSaveMsg({ type: 'err', text: '⚠ Failed to save — check your connection' });
            setTimeout(() => setSaveMsg(null), 5000);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div style={{ padding: 24, fontSize: 13, color: B.g400, fontFamily: F, textAlign: 'center' }}>Loading...</div>;

    const TabBtn = ({ id, label }) => (
        <button
            onClick={() => setActiveTab(id)}
            style={{
                flex: 1, padding: '12px', border: 'none', background: 'transparent',
                borderBottom: activeTab === id ? `2px solid ${B.bl}` : `2px solid transparent`,
                color: activeTab === id ? B.bl : B.g400,
                fontWeight: activeTab === id ? 800 : 600,
                fontSize: 12, fontFamily: F, cursor: 'pointer', transition: 'all 0.2s'
            }}
        >
            {label}
        </button>
    );

    return (
        <div>
            {/* TOAST */}
            {saveMsg && (
                <div style={{ padding: '10px 16px', margin: '8px 16px 0', borderRadius: 8, fontSize: 12, fontWeight: 700, fontFamily: F, background: saveMsg.type === 'ok' ? `${B.grn}15` : '#fee2e2', color: saveMsg.type === 'ok' ? B.grn : '#dc2626', border: `1px solid ${saveMsg.type === 'ok' ? `${B.grn}30` : '#fca5a5'}`, transition: 'all 0.3s' }}>
                    {saveMsg.text}
                </div>
            )}
            {/* TABS */}
            <div style={{ display: 'flex', background: B.w, borderBottom: `1px solid ${B.g200}` }}>
                <TabBtn id="new" label="New Entry" />
                <TabBtn id="history" label="History" />
            </div>

            <div style={{ padding: 16 }}>
                {activeTab === "new" && (
                    <div style={{ ...sCard, padding: 20 }}>
                        {recentSessions.length === 0 ? (
                            <div style={{ fontSize: 13, color: B.g400, fontFamily: F, textAlign: 'center', padding: '24px 0' }}>
                                You have no pending reflections for recent sessions.
                            </div>
                        ) : (
                            <>
                                <div style={{ marginBottom: 20 }}>
                                    <label style={{ fontSize: 10, fontWeight: 700, color: B.g400, fontFamily: F, textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 8 }}>Select Session</label>
                                    <select
                                        value={selectedSessId}
                                        onChange={e => { setSelectedSessId(e.target.value); setAnswers({}); }}
                                        style={{ width: '100%', padding: '12px 16px', borderRadius: 8, border: `1px solid ${B.g200}`, fontSize: 13, fontWeight: 600, fontFamily: F, outline: 'none', cursor: 'pointer' }}
                                    >
                                        {recentSessions.map(s => (
                                            <option key={s.id} value={s.id}>
                                                {s.session_date} — {s.title} ({s.programs?.name})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {questions.map((q, i) => (
                                    <div key={i} style={{ marginBottom: 16 }}>
                                        <div style={{ fontSize: 12, fontWeight: 700, color: B.g600, fontFamily: F, marginBottom: 8 }}>{q}</div>
                                        <textarea
                                            value={answers[q] || ''}
                                            onChange={e => setAnswers(prev => ({ ...prev, [q]: e.target.value }))}
                                            placeholder="Write your reflection..."
                                            rows={4}
                                            style={{ width: '100%', padding: '12px 16px', borderRadius: 8, border: `1px solid ${B.g200}`, fontSize: 13, fontFamily: F, background: B.g50, outline: 'none', boxSizing: 'border-box', resize: 'vertical' }}
                                        />
                                    </div>
                                ))}

                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    style={{ width: '100%', marginTop: 8, padding: '14px 20px', borderRadius: 8, border: 'none', background: `linear-gradient(135deg, ${B.bl}, ${B.pk})`, color: B.w, fontSize: 13, fontWeight: 800, fontFamily: F, cursor: saving ? 'default' : 'pointer', letterSpacing: 0.5, transform: saving ? 'scale(0.98)' : 'none', opacity: saving ? 0.7 : 1 }}
                                >
                                    {saving ? 'SAVING...' : 'SAVE JOURNAL ENTRY'}
                                </button>
                            </>
                        )}
                    </div>
                )}

                {activeTab === "history" && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {history.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '32px 0', color: B.g400, fontSize: 13, fontFamily: F }}>
                                No journal entries yet.
                            </div>
                        ) : (
                            history.map(h => (
                                <div key={h.id} style={{ ...sCard, padding: 16 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                                        <div>
                                            <div style={{ fontSize: 14, fontWeight: 800, color: B.nvD, fontFamily: F }}>{h.sessions?.title || 'Unknown Session'}</div>
                                            <div style={{ fontSize: 11, color: B.g400, fontFamily: F, marginTop: 2 }}>{h.sessions?.session_date} · {h.programs?.name}</div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                        {(h.answers || []).map((ans, i) => (
                                            <div key={i} style={{ background: B.g50, padding: 12, borderRadius: 8 }}>
                                                <div style={{ fontSize: 11, fontWeight: 700, color: B.g600, fontFamily: F, marginBottom: 4 }}>{ans.q}</div>
                                                <div style={{ fontSize: 13, color: B.nv, fontFamily: F, lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>
                                                    {ans.a || <span style={{ color: B.g400, fontStyle: 'italic' }}>No answer provided.</span>}
                                                </div>
                                            </div>
                                        ))}
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
