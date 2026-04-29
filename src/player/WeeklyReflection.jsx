// ═══ PLAYER: WEEKLY REVIEW ═══
// Players see the latest published weekly reflection, group questions by
// category (Short Ball / Sweeps / Fielding), write text answers, and can
// edit their submission later. Past weeks live in a separate tab.

import React, { useEffect, useMemo, useState } from 'react';
import { B, F, sCard } from '../data/theme';
import {
    loadCurrentReflection,
    loadAllPublishedReflections,
    loadPlayerResponse,
    submitResponse,
    updateResponse,
    loadResponseHistory,
    groupQuestionsByCategory,
    questionType,
} from '../db/weeklyReflectionDb';
import { supabase } from '../supabaseClient';

// Category → accent colour. Falls back to navy if a new category is added later.
const CATEGORY_COLOR = {
    'Short Ball': B.org,
    'Sweeps': B.bl,
    'Fielding': B.grn,
};
const colorForCategory = (cat) => CATEGORY_COLOR[cat] || B.nvD;

export default function WeeklyReflection({ session, userProfile, playerId: playerIdProp }) {
    const authUserId = session?.user?.id;
    const [tab, setTab] = useState('current'); // 'current' | 'past'
    const [loading, setLoading] = useState(true);
    const [currentReflection, setCurrentReflection] = useState(null);
    const [existingResponse, setExistingResponse] = useState(null);
    const [history, setHistory] = useState([]);
    const [publishedReflections, setPublishedReflections] = useState([]);
    const [answers, setAnswers] = useState({});
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [feedback, setFeedback] = useState(null);
    // Catch-up: when set, the player is answering a missed past reflection.
    // Shape: { reflection, existingResponse, answers }
    const [catchUp, setCatchUp] = useState(null);
    // Resolve players.id from auth_user_id if PlayerPortal didn't pass one.
    const [playerId, setPlayerId] = useState(playerIdProp || null);

    useEffect(() => { setPlayerId(playerIdProp || null); }, [playerIdProp]);

    useEffect(() => {
        if (playerId || !authUserId) return;
        let cancelled = false;
        (async () => {
            const { data, error } = await supabase
                .from('players')
                .select('id')
                .eq('auth_user_id', authUserId)
                .eq('submitted', true)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();
            if (cancelled) return;
            if (error) { console.warn('player lookup failed:', error.message); return; }
            if (data?.id) setPlayerId(data.id);
        })();
        return () => { cancelled = true; };
    }, [authUserId, playerId]);

    const refresh = async () => {
        if (!authUserId) return;
        setLoading(true);
        try {
            const reflection = await loadCurrentReflection();
            setCurrentReflection(reflection);
            const [resp, hist, allPub] = await Promise.all([
                reflection ? loadPlayerResponse(reflection.id, authUserId) : Promise.resolve(null),
                loadResponseHistory(authUserId),
                loadAllPublishedReflections(),
            ]);
            setExistingResponse(resp);
            setHistory(hist);
            setPublishedReflections(allPub);
            // Pre-fill form if editing existing
            if (resp?.answers && typeof resp.answers === 'object') setAnswers(resp.answers);
            else setAnswers({});
        } catch (e) { console.error('Weekly reflection load error:', e); }
        setLoading(false);
    };

    // ── Derived: which past published weeks the player still hasn't answered ──
    // ALL hooks must be declared before any early return below (Rules of Hooks).
    const answeredIds = useMemo(() => new Set(history.map(h => h.reflection_id)), [history]);
    const pastPublishedReflections = useMemo(() => {
        return publishedReflections.filter(r => !currentReflection || r.id !== currentReflection.id);
    }, [publishedReflections, currentReflection]);
    const unansweredCount = useMemo(() => {
        return pastPublishedReflections.filter(r => !answeredIds.has(r.id)).length;
    }, [pastPublishedReflections, answeredIds]);
    const responseByReflectionId = useMemo(() => {
        const m = new Map();
        history.forEach(h => { if (h.reflection_id) m.set(h.reflection_id, h); });
        return m;
    }, [history]);

    useEffect(() => { refresh(); }, [authUserId]);

    const showToast = (type, text) => {
        setFeedback({ type, text });
        setTimeout(() => setFeedback(null), 3000);
    };

    const handleAnswerChange = (qid, value) => {
        setAnswers(prev => ({ ...prev, [qid]: value }));
    };

    const handleSubmit = async () => {
        if (!currentReflection) return;
        setSaving(true);
        try {
            try { await supabase.auth.refreshSession(); } catch (e) { console.warn('Pre-submit token refresh failed:', e?.message); }
            if (existingResponse) {
                await updateResponse(existingResponse.id, answers);
                showToast('ok', 'Reflection updated ✓');
            } else {
                await submitResponse(currentReflection.id, playerId, authUserId, answers);
                showToast('ok', 'Thanks for your reflection ✓');
            }
            setEditing(false);
            await refresh();
        } catch (e) {
            const msg = (e?.message || '').toLowerCase();
            if (msg.includes('auth') || msg.includes('permission') || msg.includes('jwt') || msg.includes('401') || msg.includes('403')) {
                showToast('err', 'Session expired — please sign out and sign back in, then try again.');
            } else if (msg.includes('failed to fetch') || msg.includes('network')) {
                showToast('err', 'Connection lost — your answers are kept safe, try again.');
            } else {
                showToast('err', 'Could not submit — your answers are kept safe, try again.');
            }
        } finally {
            setSaving(false);
        }
    };

    const handleStartEdit = () => {
        setAnswers((existingResponse?.answers && typeof existingResponse.answers === 'object') ? { ...existingResponse.answers } : {});
        setEditing(true);
    };

    const handleCancelEdit = () => {
        setAnswers((existingResponse?.answers && typeof existingResponse.answers === 'object') ? { ...existingResponse.answers } : {});
        setEditing(false);
    };

    // ── Catch-up: answering a past week the player missed ──
    const startCatchUp = async (reflection) => {
        // A response could already exist if the player previously answered then
        // somehow a row remained — fetch defensively so we update instead of
        // creating a duplicate.
        let resp = null;
        try { resp = await loadPlayerResponse(reflection.id, authUserId); } catch {}
        setCatchUp({
            reflection,
            existingResponse: resp,
            answers: (resp?.answers && typeof resp.answers === 'object') ? { ...resp.answers } : {},
        });
    };
    const cancelCatchUp = () => setCatchUp(null);
    const updateCatchUpAnswer = (qid, value) => {
        setCatchUp(c => c ? { ...c, answers: { ...c.answers, [qid]: value } } : c);
    };
    const submitCatchUp = async () => {
        if (!catchUp) return;
        setSaving(true);
        try {
            try { await supabase.auth.refreshSession(); } catch (e) { console.warn('Pre-submit token refresh failed:', e?.message); }
            if (catchUp.existingResponse) {
                await updateResponse(catchUp.existingResponse.id, catchUp.answers);
            } else {
                await submitResponse(catchUp.reflection.id, playerId, authUserId, catchUp.answers);
            }
            showToast('ok', 'Caught up — thanks ✓');
            setCatchUp(null);
            await refresh();
        } catch (e) {
            const msg = (e?.message || '').toLowerCase();
            if (msg.includes('auth') || msg.includes('permission') || msg.includes('jwt') || msg.includes('401') || msg.includes('403')) {
                showToast('err', 'Session expired — please sign out and sign back in, then try again.');
            } else if (msg.includes('failed to fetch') || msg.includes('network')) {
                showToast('err', 'Connection lost — your answers are kept safe, try again.');
            } else {
                showToast('err', 'Could not submit — your answers are kept safe, try again.');
            }
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div style={{ padding: 24, color: B.g400, fontSize: 12, fontFamily: F, textAlign: 'center' }}>Loading…</div>;
    }
    if (!authUserId) return null;

    // ── Tab button ──
    const TabBtn = ({ id, label, badgeCount }) => (
        <button onClick={() => setTab(id)} style={{
            flex: 1, padding: '10px 8px', border: 'none', background: 'transparent',
            borderBottom: tab === id ? `2px solid ${B.bl}` : `2px solid transparent`,
            color: tab === id ? B.bl : B.g400, fontWeight: tab === id ? 800 : 600,
            fontSize: 11, fontFamily: F, cursor: 'pointer', transition: 'all 0.2s',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
            {label}
            {badgeCount > 0 && (
                <span style={{ fontSize: 9, fontWeight: 800, padding: '1px 6px', borderRadius: 8, background: B.amb, color: B.w, lineHeight: 1.4 }}>{badgeCount}</span>
            )}
        </button>
    );

    // ── Category header ──
    const CategoryHeader = ({ category }) => {
        const color = colorForCategory(category);
        return (
            <div style={{
                fontSize: 11, fontWeight: 800, color, fontFamily: F,
                textTransform: 'uppercase', letterSpacing: 1.2,
                background: `${color}12`, border: `1px solid ${color}30`,
                padding: '6px 12px', borderRadius: 8,
                marginBottom: 12, marginTop: 18, display: 'inline-block',
            }}>{category}</div>
        );
    };

    // ── Question card (read or edit, text or multiple choice) ──
    const QuestionCard = ({ q, idx, value, readOnly, onChange }) => {
        const t = questionType(q);
        const accent = colorForCategory(q.category);
        return (
            <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: B.nvD, fontFamily: F, marginBottom: 8, lineHeight: 1.4 }}>
                    {idx + 1}. {q.question}
                </div>

                {/* Multiple choice */}
                {t === 'choice' && (
                    readOnly ? (
                        <div style={{ background: B.g50, padding: 12, borderRadius: 8, border: `1px solid ${B.g100}`, fontSize: 13, color: B.nv, fontFamily: F }}>
                            {(() => {
                                const chosen = (q.options || []).find(o => o.id === value);
                                if (!chosen) return <span style={{ color: B.g400, fontStyle: 'italic' }}>No answer provided.</span>;
                                return <span style={{ fontWeight: 700, color: accent }}>{chosen.label}</span>;
                            })()}
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {(q.options || []).map(opt => {
                                const selected = value === opt.id;
                                return (
                                    <button key={opt.id} type="button" onClick={() => onChange(q.id, opt.id)}
                                        style={{
                                            textAlign: 'left', padding: '12px 14px', borderRadius: 10,
                                            border: `2px solid ${selected ? accent : B.g200}`,
                                            background: selected ? `${accent}10` : B.w,
                                            color: selected ? accent : B.g700,
                                            fontSize: 13, fontFamily: F, fontWeight: selected ? 700 : 500,
                                            cursor: 'pointer', transition: 'all 0.15s',
                                        }}>
                                        <span style={{ display: 'inline-block', width: 18, height: 18, borderRadius: '50%', border: `2px solid ${selected ? accent : B.g400}`, background: selected ? accent : 'transparent', marginRight: 10, verticalAlign: 'middle', position: 'relative', boxSizing: 'border-box' }}>
                                            {selected && <span style={{ position: 'absolute', top: 3, left: 3, width: 8, height: 8, borderRadius: '50%', background: B.w }} />}
                                        </span>
                                        {opt.label}
                                    </button>
                                );
                            })}
                        </div>
                    )
                )}

                {/* Text */}
                {t === 'text' && (
                    readOnly ? (
                        <div style={{ background: B.g50, padding: 12, borderRadius: 8, border: `1px solid ${B.g100}`, fontSize: 13, color: B.nv, fontFamily: F, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                            {value && String(value).trim()
                                ? value
                                : <span style={{ color: B.g400, fontStyle: 'italic' }}>No answer provided.</span>}
                        </div>
                    ) : (
                        <textarea
                            value={value || ''}
                            onChange={e => onChange(q.id, e.target.value)}
                            placeholder="Write your reflection…"
                            rows={4}
                            style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: `1px solid ${B.g200}`, fontSize: 13, fontFamily: F, background: B.g50, outline: 'none', boxSizing: 'border-box', resize: 'vertical', lineHeight: 1.5 }}
                        />
                    )
                )}
            </div>
        );
    };

    // ── This Week — three states: empty / submit / submitted ──
    const renderCurrentTab = () => {
        if (!currentReflection) {
            return (
                <div style={{ ...sCard, padding: 28, textAlign: 'center' }}>
                    <div style={{ fontSize: 32, marginBottom: 10 }}>📋</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: B.nvD, fontFamily: F, marginBottom: 6 }}>No Reflection Available Yet</div>
                    <div style={{ fontSize: 12, color: B.g400, fontFamily: F, lineHeight: 1.5 }}>
                        Your coach will publish this week's reflection at the end of the week. Come back then to share what you learned.
                    </div>
                    {unansweredCount > 0 && (
                        <button onClick={() => setTab('past')}
                            style={{ marginTop: 14, padding: '10px 16px', borderRadius: 8, border: `1.5px solid ${B.amb}`, background: `${B.amb}10`, color: '#92400e', fontSize: 12, fontWeight: 800, fontFamily: F, cursor: 'pointer' }}>
                            You have {unansweredCount} past week{unansweredCount > 1 ? 's' : ''} to catch up on →
                        </button>
                    )}
                </div>
            );
        }

        const grouped = groupQuestionsByCategory(currentReflection.questions);
        const submitted = !!existingResponse && !editing;

        // Header band common to all states
        const HeaderBand = (
            <div style={{ ...sCard, padding: 16, marginBottom: 14, background: `linear-gradient(135deg, ${B.bl}08, ${B.pk}08)`, border: `1px solid ${B.bl}30` }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: B.bl, fontFamily: F, textTransform: 'uppercase', letterSpacing: 1.2 }}>
                    Week {currentReflection.week_number}
                </div>
                {currentReflection.week_label && (
                    <div style={{ fontSize: 14, fontWeight: 800, color: B.nvD, fontFamily: F, marginTop: 4 }}>
                        {currentReflection.week_label}
                    </div>
                )}
                {submitted && (
                    <div style={{ display: 'inline-block', marginTop: 10, padding: '4px 10px', borderRadius: 12, background: `${B.grn}18`, border: `1px solid ${B.grn}40`, fontSize: 10, fontWeight: 800, color: B.grn, fontFamily: F, letterSpacing: 0.5 }}>
                        ✓ SUBMITTED · {new Date(existingResponse.submitted_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                    </div>
                )}
            </div>
        );

        return (
            <div>
                {HeaderBand}
                <div style={{ ...sCard, padding: 18 }}>
                    {grouped.map(({ category, questions }, gi) => (
                        <div key={category} style={{ marginTop: gi === 0 ? 0 : 6 }}>
                            <CategoryHeader category={category} />
                            {questions.map((q, qi) => (
                                <QuestionCard
                                    key={q.id}
                                    q={q}
                                    idx={qi}
                                    value={submitted ? (existingResponse?.answers?.[q.id] || '') : (answers[q.id] || '')}
                                    readOnly={submitted}
                                    onChange={handleAnswerChange}
                                />
                            ))}
                        </div>
                    ))}

                    {/* Action row */}
                    {submitted ? (
                        <button onClick={handleStartEdit}
                            style={{ width: '100%', marginTop: 18, padding: '12px 20px', borderRadius: 8, border: `1.5px solid ${B.bl}`, background: B.w, color: B.bl, fontSize: 12, fontWeight: 800, fontFamily: F, cursor: 'pointer', letterSpacing: 0.5 }}>
                            Edit My Responses
                        </button>
                    ) : editing ? (
                        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
                            <button onClick={handleCancelEdit} disabled={saving}
                                style={{ flex: '0 0 auto', padding: '12px 18px', borderRadius: 8, border: `1px solid ${B.g200}`, background: B.w, color: B.g600, fontSize: 12, fontWeight: 700, fontFamily: F, cursor: 'pointer' }}>
                                Cancel
                            </button>
                            <button onClick={handleSubmit} disabled={saving}
                                style={{ flex: 1, padding: '12px 20px', borderRadius: 8, border: 'none', background: saving ? B.g200 : `linear-gradient(135deg, ${B.bl}, ${B.pk})`, color: B.w, fontSize: 12, fontWeight: 800, fontFamily: F, cursor: saving ? 'default' : 'pointer', letterSpacing: 0.5, opacity: saving ? 0.7 : 1 }}>
                                {saving ? 'Updating…' : 'Update Reflection'}
                            </button>
                        </div>
                    ) : (
                        <button onClick={handleSubmit} disabled={saving}
                            style={{ width: '100%', marginTop: 18, padding: '14px 20px', borderRadius: 8, border: 'none', background: saving ? B.g200 : `linear-gradient(135deg, ${B.bl}, ${B.pk})`, color: B.w, fontSize: 13, fontWeight: 800, fontFamily: F, cursor: saving ? 'default' : 'pointer', letterSpacing: 0.5, opacity: saving ? 0.7 : 1 }}>
                            {saving ? 'SUBMITTING…' : 'SUBMIT REFLECTION'}
                        </button>
                    )}
                </div>
            </div>
        );
    };

    // ── Past Weeks ──
    // The list of past published reflections (excluding current week) plus the
    // history map (responseByReflectionId, declared above with the other hooks)
    // tells us which ones are answered vs not.
    const renderCatchUpView = () => {
        if (!catchUp) return null;
        const r = catchUp.reflection;
        const grouped = groupQuestionsByCategory(r.questions);
        return (
            <div>
                <button onClick={cancelCatchUp}
                    style={{ fontSize: 10, fontWeight: 600, color: B.bl, background: 'none', border: 'none', cursor: 'pointer', marginBottom: 12, padding: 0 }}>← Back to past weeks</button>

                <div style={{ ...sCard, padding: 16, marginBottom: 14, background: `linear-gradient(135deg, ${B.amb}10, ${B.bl}08)`, border: `1px solid ${B.amb}40` }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: B.amb, fontFamily: F, textTransform: 'uppercase', letterSpacing: 1.2 }}>
                        Catching up — Week {r.week_number}
                    </div>
                    {r.week_label && (
                        <div style={{ fontSize: 14, fontWeight: 800, color: B.nvD, fontFamily: F, marginTop: 4 }}>{r.week_label}</div>
                    )}
                </div>

                <div style={{ ...sCard, padding: 18 }}>
                    {grouped.map(({ category, questions }, gi) => (
                        <div key={category} style={{ marginTop: gi === 0 ? 0 : 6 }}>
                            <CategoryHeader category={category} />
                            {questions.map((q, qi) => (
                                <QuestionCard
                                    key={q.id}
                                    q={q}
                                    idx={qi}
                                    value={catchUp.answers[q.id] || ''}
                                    readOnly={false}
                                    onChange={updateCatchUpAnswer}
                                />
                            ))}
                        </div>
                    ))}

                    <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
                        <button onClick={cancelCatchUp} disabled={saving}
                            style={{ flex: '0 0 auto', padding: '12px 18px', borderRadius: 8, border: `1px solid ${B.g200}`, background: B.w, color: B.g600, fontSize: 12, fontWeight: 700, fontFamily: F, cursor: 'pointer' }}>
                            Cancel
                        </button>
                        <button onClick={submitCatchUp} disabled={saving}
                            style={{ flex: 1, padding: '12px 20px', borderRadius: 8, border: 'none', background: saving ? B.g200 : `linear-gradient(135deg, ${B.bl}, ${B.pk})`, color: B.w, fontSize: 12, fontWeight: 800, fontFamily: F, cursor: saving ? 'default' : 'pointer', letterSpacing: 0.5, opacity: saving ? 0.7 : 1 }}>
                            {saving ? 'Submitting…' : 'Submit Reflection'}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const renderPastTab = () => {
        // If the player is mid catch-up, replace the list with the answer view.
        if (catchUp) return renderCatchUpView();

        if (pastPublishedReflections.length === 0) {
            return (
                <div style={{ ...sCard, padding: 28, textAlign: 'center' }}>
                    <div style={{ fontSize: 28, marginBottom: 10 }}>📂</div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: B.nvD, fontFamily: F, marginBottom: 6 }}>No past reflections yet</div>
                    <div style={{ fontSize: 11, color: B.g400, fontFamily: F, lineHeight: 1.5 }}>
                        Once a new week is published, you'll see your past entries here.
                    </div>
                </div>
            );
        }
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {pastPublishedReflections.map(r => {
                    const h = responseByReflectionId.get(r.id);
                    const answered = !!h;
                    if (answered) {
                        // ── Answered: expandable read-only summary (existing pattern) ──
                        const grouped = groupQuestionsByCategory(r.questions);
                        const ansObj = (h.answers && typeof h.answers === 'object') ? h.answers : {};
                        return (
                            <details key={r.id} style={{ ...sCard, padding: 14, marginBottom: 0 }}>
                                <summary style={{ cursor: 'pointer', listStyle: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <div style={{ fontSize: 10, fontWeight: 800, color: B.bl, fontFamily: F, textTransform: 'uppercase', letterSpacing: 1 }}>Week {r.week_number}</div>
                                            <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 10, background: `${B.grn}15`, color: B.grn, letterSpacing: 0.4 }}>✓ ANSWERED</span>
                                        </div>
                                        {r.week_label && (
                                            <div style={{ fontSize: 13, fontWeight: 700, color: B.nvD, fontFamily: F, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.week_label}</div>
                                        )}
                                    </div>
                                    <div style={{ fontSize: 10, color: B.g400, fontFamily: F, whiteSpace: 'nowrap' }}>
                                        {new Date(h.submitted_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </div>
                                </summary>
                                <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${B.g100}` }}>
                                    {grouped.map(({ category, questions }) => (
                                        <div key={category}>
                                            <CategoryHeader category={category} />
                                            {questions.map((q, qi) => (
                                                <QuestionCard
                                                    key={q.id}
                                                    q={q}
                                                    idx={qi}
                                                    value={ansObj[q.id] || ''}
                                                    readOnly
                                                    onChange={() => {}}
                                                />
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            </details>
                        );
                    }
                    // ── Unanswered: amber accent + Answer this week button ──
                    return (
                        <div key={r.id} style={{ ...sCard, padding: 14, marginBottom: 0, borderLeft: `3px solid ${B.amb}` }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                                <div style={{ minWidth: 0, flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <div style={{ fontSize: 10, fontWeight: 800, color: B.bl, fontFamily: F, textTransform: 'uppercase', letterSpacing: 1 }}>Week {r.week_number}</div>
                                        <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 10, background: `${B.amb}18`, color: '#92400e', letterSpacing: 0.4 }}>NOT ANSWERED YET</span>
                                    </div>
                                    {r.week_label && (
                                        <div style={{ fontSize: 13, fontWeight: 700, color: B.nvD, fontFamily: F, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.week_label}</div>
                                    )}
                                    <div style={{ fontSize: 10, color: B.g400, fontFamily: F, marginTop: 4 }}>
                                        {(r.questions || []).length} question{(r.questions || []).length !== 1 ? 's' : ''} · about a minute
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => startCatchUp(r)}
                                style={{ marginTop: 10, width: '100%', padding: '10px 14px', borderRadius: 8, border: 'none', background: `linear-gradient(135deg, ${B.bl}, ${B.pk})`, color: B.w, fontSize: 12, fontWeight: 800, fontFamily: F, cursor: 'pointer', letterSpacing: 0.5 }}>
                                Answer this week
                            </button>
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div style={{ fontFamily: F }}>
            {feedback && (
                <div style={{ padding: '10px 16px', margin: '12px 16px 0', borderRadius: 8, fontSize: 12, fontWeight: 700, fontFamily: F, background: feedback.type === 'ok' ? `${B.grn}15` : '#fee2e2', color: feedback.type === 'ok' ? B.grn : '#dc2626', border: `1px solid ${feedback.type === 'ok' ? `${B.grn}30` : '#fca5a5'}` }}>
                    {feedback.text}
                </div>
            )}

            <div style={{ display: 'flex', background: B.w, borderBottom: `1px solid ${B.g200}` }}>
                <TabBtn id="current" label="This Week" />
                <TabBtn id="past" label="Past Weeks" badgeCount={unansweredCount} />
            </div>

            <div style={{ padding: 16 }}>
                {tab === 'current' ? renderCurrentTab() : renderPastTab()}
            </div>
        </div>
    );
}
