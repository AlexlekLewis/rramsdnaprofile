// ═══ PLAYER: WEEKLY REVIEW ═══
// Players see the latest published weekly reflection, group questions by
// category (Short Ball / Sweeps / Fielding), write text answers, and can
// edit their submission later. Past weeks live in a separate tab.

import React, { useEffect, useState } from 'react';
import { B, F, sCard } from '../data/theme';
import {
    loadCurrentReflection,
    loadPlayerResponse,
    submitResponse,
    updateResponse,
    loadResponseHistory,
} from '../db/weeklyReflectionDb';
import { supabase } from '../supabaseClient';

// Category → accent colour. Falls back to navy if a new category is added later.
const CATEGORY_COLOR = {
    'Short Ball': B.org,
    'Sweeps': B.bl,
    'Fielding': B.grn,
};
const colorForCategory = (cat) => CATEGORY_COLOR[cat] || B.nvD;

// Group a flat questions array into [{ category, questions: [...] }]
// preserving the order categories first appear.
function groupByCategory(questions) {
    const order = [];
    const groups = {};
    (questions || []).forEach(q => {
        const cat = q.category || 'Other';
        if (!groups[cat]) { groups[cat] = []; order.push(cat); }
        groups[cat].push(q);
    });
    return order.map(cat => ({ category: cat, questions: groups[cat] }));
}

export default function WeeklyReflection({ session, userProfile, playerId: playerIdProp }) {
    const authUserId = session?.user?.id;
    const [tab, setTab] = useState('current'); // 'current' | 'past'
    const [loading, setLoading] = useState(true);
    const [currentReflection, setCurrentReflection] = useState(null);
    const [existingResponse, setExistingResponse] = useState(null);
    const [history, setHistory] = useState([]);
    const [answers, setAnswers] = useState({});
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [feedback, setFeedback] = useState(null);
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
            const [resp, hist] = await Promise.all([
                reflection ? loadPlayerResponse(reflection.id, authUserId) : Promise.resolve(null),
                loadResponseHistory(authUserId),
            ]);
            setExistingResponse(resp);
            setHistory(hist);
            // Pre-fill form if editing existing
            if (resp?.answers && typeof resp.answers === 'object') setAnswers(resp.answers);
            else setAnswers({});
        } catch (e) { console.error('Weekly reflection load error:', e); }
        setLoading(false);
    };

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

    if (loading) {
        return <div style={{ padding: 24, color: B.g400, fontSize: 12, fontFamily: F, textAlign: 'center' }}>Loading…</div>;
    }
    if (!authUserId) return null;

    // ── Tab button ──
    const TabBtn = ({ id, label }) => (
        <button onClick={() => setTab(id)} style={{
            flex: 1, padding: '10px 8px', border: 'none', background: 'transparent',
            borderBottom: tab === id ? `2px solid ${B.bl}` : `2px solid transparent`,
            color: tab === id ? B.bl : B.g400, fontWeight: tab === id ? 800 : 600,
            fontSize: 11, fontFamily: F, cursor: 'pointer', transition: 'all 0.2s',
        }}>{label}</button>
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

    // ── Question card (read or edit) ──
    const QuestionCard = ({ q, idx, value, readOnly, onChange }) => (
        <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: B.nvD, fontFamily: F, marginBottom: 8, lineHeight: 1.4 }}>
                {idx + 1}. {q.question}
            </div>
            {readOnly ? (
                <div style={{ background: B.g50, padding: 12, borderRadius: 8, border: `1px solid ${B.g100}`, fontSize: 13, color: B.nv, fontFamily: F, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                    {value && value.trim()
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
            )}
        </div>
    );

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
                </div>
            );
        }

        const grouped = groupByCategory(currentReflection.questions);
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
    const pastResponses = history.filter(h => !currentReflection || h.reflection_id !== currentReflection.id);

    const renderPastTab = () => {
        if (pastResponses.length === 0) {
            return (
                <div style={{ ...sCard, padding: 28, textAlign: 'center' }}>
                    <div style={{ fontSize: 28, marginBottom: 10 }}>📂</div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: B.nvD, fontFamily: F, marginBottom: 6 }}>No past reflections yet</div>
                    <div style={{ fontSize: 11, color: B.g400, fontFamily: F, lineHeight: 1.5 }}>
                        Once you submit a reflection and a new week starts, you'll see your past entries here.
                    </div>
                </div>
            );
        }
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {pastResponses.map(h => {
                    const r = h.reflection;
                    if (!r) return null;
                    const grouped = groupByCategory(r.questions);
                    const ansObj = (h.answers && typeof h.answers === 'object') ? h.answers : {};
                    return (
                        <details key={h.id} style={{ ...sCard, padding: 14, marginBottom: 0 }}>
                            <summary style={{ cursor: 'pointer', listStyle: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ fontSize: 10, fontWeight: 800, color: B.bl, fontFamily: F, textTransform: 'uppercase', letterSpacing: 1 }}>Week {r.week_number}</div>
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
                <TabBtn id="past" label="Past Weeks" />
            </div>

            <div style={{ padding: 16 }}>
                {tab === 'current' ? renderCurrentTab() : renderPastTab()}
            </div>
        </div>
    );
}
