// ═══ PLAYER: WEEKLY REFLECTION ═══
// Players see the published weekly reflection for the current week (or any
// they haven't answered yet), answer the 3 multi-choice questions, and view
// a history of their past responses.

import React, { useEffect, useState } from 'react';
import { B, F, sCard } from '../data/theme';
import {
    loadPendingReflectionsForPlayer,
    loadPlayerResponseHistory,
    submitReflectionResponse,
} from '../db/reflectionsDb';

export default function WeeklyReflection({ session, userProfile, playerId }) {
    const authUserId = session?.user?.id;
    const [pending, setPending] = useState([]);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeRef, setActiveRef] = useState(null); // the reflection currently being answered
    const [answers, setAnswers] = useState({}); // { qIdx: optIdx }
    const [saving, setSaving] = useState(false);
    const [feedback, setFeedback] = useState(null);

    const refresh = async () => {
        if (!authUserId) return;
        setLoading(true);
        try {
            const [p, h] = await Promise.all([
                loadPendingReflectionsForPlayer(authUserId),
                loadPlayerResponseHistory(authUserId),
            ]);
            setPending(p);
            setHistory(h);
        } catch (e) { console.error('Reflection load error:', e); }
        setLoading(false);
    };

    useEffect(() => { refresh(); }, [authUserId]);

    const showMsg = (type, text) => {
        setFeedback({ type, text });
        setTimeout(() => setFeedback(null), 3000);
    };

    const startAnswer = (r) => {
        setActiveRef(r);
        setAnswers({});
    };

    const handleSelect = (qIdx, optIdx) => {
        setAnswers(prev => ({ ...prev, [qIdx]: optIdx }));
    };

    const handleSubmit = async () => {
        if (!activeRef) return;
        const questions = activeRef.questions || [];
        const unanswered = questions.findIndex((_, i) => answers[i] == null);
        if (unanswered !== -1) {
            showMsg('err', `Please answer question ${unanswered + 1}`);
            return;
        }
        setSaving(true);
        try {
            const payload = Object.keys(answers).map(k => {
                const qIdx = parseInt(k);
                const optIdx = answers[k];
                return {
                    question_index: qIdx,
                    option_index: optIdx,
                    option_text: questions[qIdx].options[optIdx],
                };
            });
            await submitReflectionResponse({
                reflectionId: activeRef.id,
                playerId: playerId || null,
                authUserId,
                answers: payload,
            });
            showMsg('ok', 'Thanks for your reflection ✓');
            setActiveRef(null);
            setAnswers({});
            await refresh();
        } catch (e) {
            showMsg('err', e.message || 'Failed to submit');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div style={{ padding: 16, color: B.g400, fontSize: 11, fontFamily: F, textAlign: 'center' }}>Loading reflection…</div>;

    if (!authUserId) return null;

    return (
        <div style={{ padding: 16, fontFamily: F }}>
            {feedback && (
                <div style={{ padding: '10px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, marginBottom: 12, background: feedback.type === 'ok' ? `${B.grn}15` : '#fee2e2', color: feedback.type === 'ok' ? B.grn : '#dc2626', border: `1px solid ${feedback.type === 'ok' ? `${B.grn}30` : '#fca5a5'}` }}>
                    {feedback.text}
                </div>
            )}

            {/* Active answer mode */}
            {activeRef && (
                <div style={{ ...sCard, padding: 16, marginBottom: 14 }}>
                    <button onClick={() => { setActiveRef(null); setAnswers({}); }}
                        style={{ fontSize: 10, fontWeight: 600, color: B.bl, background: 'none', border: 'none', cursor: 'pointer', marginBottom: 10 }}>← Back</button>

                    <div style={{ fontSize: 10, fontWeight: 800, color: B.bl, textTransform: 'uppercase', letterSpacing: 0.8 }}>Week {activeRef.week_number} Reflection</div>
                    {activeRef.week_label && <div style={{ fontSize: 11, color: B.g600, marginTop: 2 }}>{activeRef.week_label}</div>}

                    <div style={{ marginTop: 14 }}>
                        {(activeRef.questions || []).map((q, qIdx) => (
                            <div key={qIdx} style={{ marginBottom: 18 }}>
                                <div style={{ fontSize: 13, fontWeight: 700, color: B.nvD, marginBottom: 10 }}>
                                    {qIdx + 1}. {q.text}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {(q.options || []).map((opt, oIdx) => {
                                        const selected = answers[qIdx] === oIdx;
                                        return (
                                            <button key={oIdx} onClick={() => handleSelect(qIdx, oIdx)}
                                                style={{ textAlign: 'left', padding: '12px 14px', borderRadius: 10, border: `2px solid ${selected ? B.bl : B.g200}`, background: selected ? `${B.bl}10` : B.w, color: selected ? B.bl : B.g700, fontSize: 12, fontWeight: selected ? 700 : 500, cursor: 'pointer' }}>
                                                <span style={{ fontWeight: 800, marginRight: 8 }}>{String.fromCharCode(65 + oIdx)}.</span>
                                                {opt}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>

                    <button onClick={handleSubmit} disabled={saving}
                        style={{ width: '100%', padding: '12px', borderRadius: 10, border: 'none', background: saving ? B.g200 : `linear-gradient(135deg, ${B.bl}, ${B.pk})`, color: B.w, fontSize: 13, fontWeight: 800, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1 }}>
                        {saving ? 'Submitting…' : 'Submit Reflection'}
                    </button>
                </div>
            )}

            {/* Pending reflections */}
            {!activeRef && pending.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: B.nvD, marginBottom: 8 }}>Ready for you</div>
                    {pending.map(r => (
                        <div key={r.id} onClick={() => startAnswer(r)}
                            style={{ ...sCard, padding: 14, marginBottom: 8, cursor: 'pointer', border: `2px solid ${B.bl}`, background: `linear-gradient(135deg, ${B.bl}08, ${B.pk}08)` }}>
                            <div style={{ fontSize: 9, fontWeight: 800, color: B.bl, textTransform: 'uppercase', letterSpacing: 0.8 }}>New · Week {r.week_number}</div>
                            {r.week_label && <div style={{ fontSize: 13, fontWeight: 700, color: B.nvD, marginTop: 2 }}>{r.week_label}</div>}
                            <div style={{ fontSize: 11, color: B.g600, marginTop: 4 }}>
                                {(r.questions || []).length} question{r.questions?.length !== 1 ? 's' : ''} · about 1 minute
                            </div>
                            <div style={{ marginTop: 8, fontSize: 10, fontWeight: 700, color: B.bl }}>Tap to answer →</div>
                        </div>
                    ))}
                </div>
            )}

            {/* Zero state — no pending, no history */}
            {!activeRef && pending.length === 0 && history.length === 0 && (
                <div style={{ ...sCard, padding: 24, textAlign: 'center' }}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>🪴</div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: B.nvD, marginBottom: 4 }}>No weekly reflection yet</div>
                    <div style={{ fontSize: 11, color: B.g400, lineHeight: 1.5 }}>
                        Your coach will post 3 reflection questions at the end of each week. Come back after week 1 to see yours.
                    </div>
                </div>
            )}

            {/* Already up to date */}
            {!activeRef && pending.length === 0 && history.length > 0 && (
                <div style={{ ...sCard, padding: 16, marginBottom: 16, background: `${B.grn}08`, border: `1px solid ${B.grn}30` }}>
                    <div style={{ fontSize: 14 }}>✅</div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: B.grn, marginTop: 4 }}>You're all caught up</div>
                    <div style={{ fontSize: 10, color: B.g600, marginTop: 2 }}>No new reflections right now. Great work!</div>
                </div>
            )}

            {/* History */}
            {!activeRef && history.length > 0 && (
                <div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: B.nvD, marginBottom: 8 }}>Your past reflections</div>
                    {history.map(h => {
                        const r = h.reflection;
                        if (!r) return null;
                        return (
                            <details key={h.id} style={{ ...sCard, padding: 12, marginBottom: 8 }}>
                                <summary style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}>
                                    <div>
                                        <div style={{ fontSize: 12, fontWeight: 800, color: B.nvD }}>Week {r.week_number}</div>
                                        {r.week_label && <div style={{ fontSize: 10, color: B.g400, marginTop: 2 }}>{r.week_label}</div>}
                                    </div>
                                    <div style={{ fontSize: 9, color: B.g400, alignSelf: 'center' }}>
                                        {new Date(h.submitted_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                                    </div>
                                </summary>
                                <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${B.g100}` }}>
                                    {(r.questions || []).map((q, qIdx) => {
                                        const ans = (h.answers || []).find(a => a.question_index === qIdx);
                                        return (
                                            <div key={qIdx} style={{ marginBottom: 10 }}>
                                                <div style={{ fontSize: 11, color: B.g600, fontWeight: 600, marginBottom: 4 }}>{q.text}</div>
                                                <div style={{ fontSize: 11, color: B.bl, fontWeight: 700 }}>
                                                    → {ans?.option_text || 'No answer'}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </details>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
