import React, { useState, useEffect, useRef } from "react";
import { loadRecentSessionsForPlayer, loadJournalHistory, saveJournalEntry, updateJournalEntry, flushJournalEntryBeacon } from "../db/journalDb";
import { calculateJournalStreak } from "../db/assessmentDb";
import { supabase } from "../supabaseClient";
import { B, F, sCard } from "../data/theme";

// localStorage keys for unsaved draft recovery — survives tab suspension on mobile
const DRAFT_KEYS = {
    weekly: 'rra_journal_weekly_draft',
    session: 'rra_journal_session_draft',
    freeform: 'rra_journal_freeform_draft',
};

const MOODS = [
    { id: 'great', label: 'Great Day', icon: '🟢', color: B.grn },
    { id: 'okay', label: 'Okay', icon: '🟡', color: B.amb },
    { id: 'tough', label: 'Tough Day', icon: '🔴', color: B.red },
];

const TABS = [
    { id: 'weekly', label: 'Weekly Review' },
    { id: 'new', label: 'Session Entry' },
    { id: 'freeform', label: 'Free Write' },
    { id: 'history', label: 'History' },
];

// Fixed weekly review questions — appear every week
const WEEKLY_CORE_QUESTIONS = [
    "What did I do well this week?",
    "What was my biggest challenge this week?",
    "What's my #1 focus for next week?",
    "One thing I learned about my game this week",
];

// Word count helper
const wordCount = (text) => (text || '').trim().split(/\s+/).filter(Boolean).length;

// Check if entry is within 24 hours (editable window)
const isEditable = (createdAt) => {
    if (!createdAt) return false;
    return (Date.now() - new Date(createdAt).getTime()) < 24 * 60 * 60 * 1000;
};

// Get current week number of the year
const getCurrentWeekNumber = () => {
    const now = new Date();
    const jan1 = new Date(now.getFullYear(), 0, 1);
    return Math.ceil(((now - jan1) / 86400000 + jan1.getDay() + 1) / 7);
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

export default function Journal({ session, userProfile, playerId }) {
    const [activeTab, setActiveTab] = useState("weekly");
    const [recentSessions, setRecentSessions] = useState([]);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [streak, setStreak] = useState(0);

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

    // Weekly review state
    const [weeklyAnswers, setWeeklyAnswers] = useState({});
    const [weeklyMood, setWeeklyMood] = useState(null);
    const [effortRating, setEffortRating] = useState(0);
    const [weeklyAlreadyDone, setWeeklyAlreadyDone] = useState(false);

    // Edit state
    const [editingId, setEditingId] = useState(null);
    const [editAnswers, setEditAnswers] = useState({});
    const [editFreeText, setEditFreeText] = useState("");
    const [editMood, setEditMood] = useState(null);

    // Synchronously readable copies for mobile lifecycle handlers
    const authCacheRef = useRef({ token: null, userId: null });
    const editingEntryRef = useRef(null); // the entry currently being edited (with id)
    const draftDirtyRef = useRef({ weekly: false, session: false, freeform: false });

    // Cache token for keepalive beacon firing during tab suspension
    useEffect(() => {
        let cancelled = false;
        const apply = (s) => { if (!cancelled) authCacheRef.current = { token: s?.access_token || null, userId: s?.user?.id || null }; };
        supabase.auth.getSession().then(({ data }) => apply(data?.session));
        const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => apply(s));
        return () => { cancelled = true; try { sub?.subscription?.unsubscribe?.(); } catch {} };
    }, []);

    // ── Restore unsaved drafts from localStorage on mount ──
    // If iOS killed the tab mid-typing, the draft is still here.
    useEffect(() => {
        try {
            const w = localStorage.getItem(DRAFT_KEYS.weekly);
            if (w) {
                const d = JSON.parse(w);
                if (d?.weeklyAnswers) setWeeklyAnswers(d.weeklyAnswers);
                if (d?.weeklyMood) setWeeklyMood(d.weeklyMood);
                if (d?.effortRating) setEffortRating(d.effortRating);
            }
            const s = localStorage.getItem(DRAFT_KEYS.session);
            if (s) {
                const d = JSON.parse(s);
                if (d?.answers) setAnswers(d.answers);
                if (d?.mood) setMood(d.mood);
                if (d?.selectedSessId) setSelectedSessId(d.selectedSessId);
            }
            const f = localStorage.getItem(DRAFT_KEYS.freeform);
            if (f) {
                const d = JSON.parse(f);
                if (d?.freeText) setFreeText(d.freeText);
                if (d?.freeTitle) setFreeTitle(d.freeTitle);
                if (d?.freeMood) setFreeMood(d.freeMood);
            }
        } catch (e) { console.warn('Restore journal draft failed:', e?.message); }
    }, []);

    // ── Auto-stash in-progress drafts to localStorage on every change ──
    // This is the safety net that prevents data loss if iOS suspends the tab.
    useEffect(() => {
        const hasContent = Object.values(weeklyAnswers).some(v => (v || '').trim()) || weeklyMood || effortRating;
        if (hasContent) {
            try { localStorage.setItem(DRAFT_KEYS.weekly, JSON.stringify({ weeklyAnswers, weeklyMood, effortRating })); } catch {}
            draftDirtyRef.current.weekly = true;
        }
    }, [weeklyAnswers, weeklyMood, effortRating]);

    useEffect(() => {
        const hasContent = Object.values(answers).some(v => (v || '').trim()) || mood;
        if (hasContent && selectedSessId) {
            try { localStorage.setItem(DRAFT_KEYS.session, JSON.stringify({ answers, mood, selectedSessId })); } catch {}
            draftDirtyRef.current.session = true;
        }
    }, [answers, mood, selectedSessId]);

    useEffect(() => {
        const hasContent = (freeText || '').trim() || (freeTitle || '').trim() || freeMood;
        if (hasContent) {
            try { localStorage.setItem(DRAFT_KEYS.freeform, JSON.stringify({ freeText, freeTitle, freeMood })); } catch {}
            draftDirtyRef.current.freeform = true;
        }
    }, [freeText, freeTitle, freeMood]);

    // Track whichever entry is currently being edited so the beacon can flush it
    useEffect(() => {
        if (editingId) {
            editingEntryRef.current = { id: editingId, answers: editAnswers, mood: editMood, freeText: editFreeText };
        } else {
            editingEntryRef.current = null;
        }
    }, [editingId, editAnswers, editMood, editFreeText]);

    // ── Mobile lifecycle: flush edits via keepalive beacon when tab backgrounds ──
    useEffect(() => {
        const flush = () => {
            const entry = editingEntryRef.current;
            if (!entry?.id) return; // only flushes EDITS to existing entries; new drafts are in localStorage
            const { token, userId } = authCacheRef.current;
            const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
            if (!token || !userId) return;
            // Build the payload shape that flushJournalEntryBeacon expects
            const payload = entry.freeText
                ? { id: entry.id, answers: [{ q: 'Free Write', a: entry.freeText }], mood: entry.mood }
                : { id: entry.id, answers: Object.entries(entry.answers || {}).map(([q, a]) => ({ q, a: a || '' })), mood: entry.mood };
            flushJournalEntryBeacon(payload, token, anonKey, userId);
        };
        const onVisibility = () => { if (document.visibilityState === 'hidden') flush(); };
        const onPageHide = () => flush();
        document.addEventListener('visibilitychange', onVisibility);
        window.addEventListener('pagehide', onPageHide);
        return () => {
            document.removeEventListener('visibilitychange', onVisibility);
            window.removeEventListener('pagehide', onPageHide);
        };
    }, []);

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

            // Calculate streak
            setStreak(calculateJournalStreak(histData));

            // Check if weekly review already done this week
            const weekNum = getCurrentWeekNumber();
            const year = new Date().getFullYear();
            const thisWeekReview = histData.find(h =>
                h.entry_type === 'weekly_review' &&
                h.week_number === weekNum &&
                new Date(h.created_at).getFullYear() === year
            );
            setWeeklyAlreadyDone(!!thisWeekReview);
        }).catch(err => console.error("Error loading journal data:", err))
            .finally(() => setLoading(false));
    }, [userProfile?.id]);

    // Get coach-set prompts from the most recent session
    const latestSessionWithPrompts = recentSessions.find(s => s.journal_questions?.length > 0) || null;
    const coachPrompts = latestSessionWithPrompts?.journal_questions || [];

    // Combine fixed + coach questions for weekly review
    const weeklyQuestions = [
        ...WEEKLY_CORE_QUESTIONS,
        ...coachPrompts.map(q => `Coach Focus: ${q}`),
    ];

    const activeSess = recentSessions.find(s => s.id === selectedSessId);
    const sessionQuestions = activeSess?.journal_questions?.length > 0
        ? activeSess.journal_questions
        : ["What went well today?", "What was challenging?", "What's my focus for next session?"];

    const showToast = (type, text, duration = 3000) => {
        setSaveMsg({ type, text });
        setTimeout(() => setSaveMsg(null), duration);
    };

    // Map an error to player-friendly copy
    const errorCopy = (err) => {
        const msg = (err?.message || '').toLowerCase();
        if (msg.includes('auth') || msg.includes('permission') || msg.includes('jwt') || msg.includes('401') || msg.includes('403')) {
            return 'Session expired — please sign out and sign back in, then try again.';
        }
        if (msg.includes('failed to fetch') || msg.includes('network')) {
            return 'Connection lost — your draft is kept safe, try again in a moment.';
        }
        return 'Could not save — your draft is kept safe, try again in a moment.';
    };

    // Refresh the auth token right before a save fires. Mobile tabs often hold
    // expired tokens; the SDK doesn't auto-refresh while the tab is asleep.
    const refreshTokenBeforeSave = async () => {
        try { await supabase.auth.refreshSession(); } catch (e) { console.warn('Pre-save token refresh failed:', e?.message); }
    };

    // Save weekly review
    const handleSaveWeekly = async () => {
        setSaving(true);
        try {
            await refreshTokenBeforeSave();
            const allAnswers = weeklyQuestions.map(q => ({ q, a: weeklyAnswers[q] || '' }));

            // Save as weekly_review type with effort_rating as a proper DB column
            const saved = await saveJournalEntry({
                session_id: latestSessionWithPrompts?.id || null,
                program_id: latestSessionWithPrompts?.program_id || null,
                answers: allAnswers,
                mood: weeklyMood,
                _entryType: 'weekly_review',
                _weekNumber: getCurrentWeekNumber(),
                _effortRating: effortRating || null,
            }, userProfile.id);

            showToast('ok', 'Weekly review saved!');
            const savedEntry = {
                ...saved,
                entry_type: 'weekly_review',
                week_number: getCurrentWeekNumber(),
                sessions: latestSessionWithPrompts ? { title: latestSessionWithPrompts.title, session_date: latestSessionWithPrompts.session_date } : null,
                programs: latestSessionWithPrompts?.programs || null,
            };
            setHistory([savedEntry, ...history]);
            setWeeklyAnswers({});
            setWeeklyMood(null);
            setEffortRating(0);
            setWeeklyAlreadyDone(true);
            setStreak(prev => prev + 1);
            setActiveTab("history");
            try { localStorage.removeItem(DRAFT_KEYS.weekly); } catch {}
            draftDirtyRef.current.weekly = false;
        } catch (err) {
            console.error(err);
            showToast('err', errorCopy(err), 6000);
        } finally { setSaving(false); }
    };

    // Save session-linked entry
    const handleSave = async () => {
        if (!selectedSessId || !activeSess) return;
        setSaving(true);
        try {
            await refreshTokenBeforeSave();
            const entry = {
                session_id: selectedSessId,
                program_id: activeSess.program_id,
                answers: sessionQuestions.map(q => ({ q, a: answers[q] || '' })),
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
            try { localStorage.removeItem(DRAFT_KEYS.session); } catch {}
            draftDirtyRef.current.session = false;
        } catch (err) {
            console.error(err);
            showToast('err', errorCopy(err), 6000);
        } finally { setSaving(false); }
    };

    // Save free-form entry
    const handleSaveFreeForm = async () => {
        if (!freeText.trim()) return;
        setSaving(true);
        try {
            await refreshTokenBeforeSave();
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
            try { localStorage.removeItem(DRAFT_KEYS.freeform); } catch {}
            draftDirtyRef.current.freeform = false;
        } catch (err) {
            console.error(err);
            showToast('err', errorCopy(err), 6000);
        } finally { setSaving(false); }
    };

    // Edit existing entry
    const startEdit = (entry) => {
        setEditingId(entry.id);
        setEditMood(entry.mood || null);
        if (entry.session_id || entry.entry_type === 'weekly_review') {
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
            await refreshTokenBeforeSave();
            const updates = { mood: editMood };
            if (entry.session_id || entry.entry_type === 'weekly_review') {
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
            showToast('err', errorCopy(err), 6000);
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
            flex: 1, padding: '10px 8px', border: 'none', background: 'transparent',
            borderBottom: activeTab === id ? `2px solid ${B.bl}` : `2px solid transparent`,
            color: activeTab === id ? B.bl : B.g400, fontWeight: activeTab === id ? 800 : 600,
            fontSize: 10, fontFamily: F, cursor: 'pointer', transition: 'all 0.2s'
        }}>{label}</button>
    );

    // Effort rating dots (1-5)
    const EffortDots = ({ value, onChange }) => (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: B.g600, fontFamily: F, marginRight: 4 }}>Effort:</div>
            {[1, 2, 3, 4, 5].map(n => (
                <button key={n} onClick={() => onChange(value === n ? 0 : n)}
                    style={{
                        width: 32, height: 32, borderRadius: '50%',
                        border: `2px solid ${value >= n ? B.bl : B.g200}`,
                        background: value >= n ? B.bl : 'transparent',
                        color: value >= n ? B.w : B.g400,
                        fontSize: 12, fontWeight: 800, fontFamily: F,
                        cursor: 'pointer', transition: 'all 0.15s',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                    {n}
                </button>
            ))}
        </div>
    );

    // Streak badge
    const StreakBadge = () => (
        streak > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 20, background: `${B.org}12`, border: `1.5px solid ${B.org}30` }}>
                <span style={{ fontSize: 14 }}>🔥</span>
                <span style={{ fontSize: 12, fontWeight: 800, color: B.org, fontFamily: F }}>{streak} week{streak !== 1 ? 's' : ''}</span>
            </div>
        ) : null
    );

    const groupedHistory = groupByDate(history);

    const entryTypeLabel = (h) => {
        if (h.entry_type === 'weekly_review') return 'Weekly Review';
        if (!h.session_id) return 'Free Write';
        return 'Session';
    };

    const entryTypeColor = (h) => {
        if (h.entry_type === 'weekly_review') return B.prp;
        if (!h.session_id) return B.org;
        return B.bl;
    };

    return (
        <div>
            {/* TOAST */}
            {saveMsg && (
                <div style={{ padding: '10px 16px', margin: '8px 16px 0', borderRadius: 8, fontSize: 12, fontWeight: 700, fontFamily: F, background: saveMsg.type === 'ok' ? `${B.grn}15` : '#fee2e2', color: saveMsg.type === 'ok' ? B.grn : '#dc2626', border: `1px solid ${saveMsg.type === 'ok' ? `${B.grn}30` : '#fca5a5'}` }}>
                    {saveMsg.text}
                </div>
            )}

            {/* STREAK + TABS */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px 0' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: B.g400, fontFamily: F, textTransform: 'uppercase', letterSpacing: 1 }}>
                    Week {getCurrentWeekNumber()} · {history.length} entries
                </div>
                <StreakBadge />
            </div>

            <div style={{ display: 'flex', background: B.w, borderBottom: `1px solid ${B.g200}`, marginTop: 8 }}>
                {TABS.map(t => <TabBtn key={t.id} id={t.id} label={t.label} />)}
            </div>

            <div style={{ padding: 16 }}>

                {/* ═══ WEEKLY REVIEW ═══ */}
                {activeTab === "weekly" && (
                    <div style={{ ...sCard, padding: 20 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <div style={{ fontSize: 14, fontWeight: 800, color: B.nvD, fontFamily: F }}>Weekly Review</div>
                            <div style={{ fontSize: 10, fontWeight: 700, color: B.prp, background: `${B.prp}12`, padding: '3px 10px', borderRadius: 12, fontFamily: F }}>
                                Week {getCurrentWeekNumber()}
                            </div>
                        </div>
                        <div style={{ fontSize: 11, color: B.g400, fontFamily: F, marginBottom: 16 }}>
                            Reflect on your week — core questions plus any coach focus areas.
                        </div>

                        {weeklyAlreadyDone ? (
                            <div style={{ textAlign: 'center', padding: '24px 0' }}>
                                <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
                                <div style={{ fontSize: 14, fontWeight: 700, color: B.grn, fontFamily: F, marginBottom: 4 }}>Weekly review complete!</div>
                                <div style={{ fontSize: 11, color: B.g400, fontFamily: F }}>Check back next week. Keep building that streak.</div>
                            </div>
                        ) : (
                            <>
                                <MoodPicker value={weeklyMood} onChange={setWeeklyMood} />
                                <EffortDots value={effortRating} onChange={setEffortRating} />

                                {weeklyQuestions.map((q, i) => {
                                    const isCoachQ = q.startsWith('Coach Focus:');
                                    return (
                                        <div key={i} style={{ marginTop: 16 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                                                <div style={{ fontSize: 12, fontWeight: 700, color: B.g600, fontFamily: F }}>{q}</div>
                                                {isCoachQ && <span style={{ fontSize: 8, fontWeight: 700, padding: '1px 6px', borderRadius: 6, background: `${B.pk}15`, color: B.pk, fontFamily: F }}>COACH</span>}
                                            </div>
                                            <textarea value={weeklyAnswers[q] || ''} onChange={e => setWeeklyAnswers(prev => ({ ...prev, [q]: e.target.value }))}
                                                placeholder="Write your reflection..." rows={3}
                                                style={{ width: '100%', padding: '12px 16px', borderRadius: 8, border: `1px solid ${B.g200}`, fontSize: 13, fontFamily: F, background: B.g50, outline: 'none', boxSizing: 'border-box', resize: 'vertical' }} />
                                            <WordCounter text={weeklyAnswers[q]} />
                                        </div>
                                    );
                                })}

                                <button onClick={handleSaveWeekly} disabled={saving}
                                    style={{ width: '100%', marginTop: 16, padding: '14px 20px', borderRadius: 8, border: 'none', background: `linear-gradient(135deg, ${B.prp}, ${B.pk})`, color: B.w, fontSize: 13, fontWeight: 800, fontFamily: F, cursor: saving ? 'default' : 'pointer', letterSpacing: 0.5, opacity: saving ? 0.7 : 1 }}>
                                    {saving ? 'SAVING...' : 'SAVE WEEKLY REVIEW'}
                                </button>
                            </>
                        )}
                    </div>
                )}

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

                                {sessionQuestions.map((q, i) => (
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
                                No journal entries yet. Start with a Weekly Review to build your reflection habit.
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
                                            const isFreeForm = !h.session_id && h.entry_type !== 'weekly_review';
                                            const typeColor = entryTypeColor(h);

                                            return (
                                                <div key={h.id} style={{ ...sCard, padding: 16, marginBottom: 0, borderLeft: `3px solid ${typeColor}` }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                                                        <div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                <div style={{ fontSize: 14, fontWeight: 800, color: B.nvD, fontFamily: F }}>
                                                                    {h.entry_type === 'weekly_review'
                                                                        ? `Week ${h.week_number || ''} Review`
                                                                        : isFreeForm
                                                                            ? (h.answers?.[0]?.q || 'Free Write')
                                                                            : (h.sessions?.title || 'Session')}
                                                                </div>
                                                                <span style={{ fontSize: 8, fontWeight: 700, padding: '1px 6px', borderRadius: 6, background: `${typeColor}15`, color: typeColor, fontFamily: F }}>
                                                                    {entryTypeLabel(h)}
                                                                </span>
                                                                {moodObj && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 8, background: `${moodObj.color}15`, color: moodObj.color, fontWeight: 600 }}>{moodObj.icon}</span>}
                                                            </div>
                                                            <div style={{ fontSize: 11, color: B.g400, fontFamily: F, marginTop: 2 }}>
                                                                {isFreeForm
                                                                    ? new Date(h.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
                                                                    : `${h.sessions?.session_date || new Date(h.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} · ${h.programs?.name || ''}`}
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
