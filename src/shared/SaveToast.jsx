// ═══ SAVE STATUS — Persistent indicator + floating toast for auto-save ═══
import { useState, useEffect, useCallback } from 'react';
import { B, F } from '../data/theme';

// Status types: 'idle' | 'saving' | 'saved' | 'error' | 'offline'
const ICONS = { saving: '⏳', saved: '✓', error: '⚠', offline: '📡' };
const LABELS = { saving: 'Saving…', saved: 'All changes saved', error: 'Save failed', offline: 'Offline — saved locally' };
const COLORS = { saving: B.bl, saved: B.grn, error: '#e53e3e', offline: '#dd6b20' };

export function SaveToast({ status, message }) {
    const [visible, setVisible] = useState(false);
    const [fadeOut, setFadeOut] = useState(false);

    useEffect(() => {
        if (status === 'idle') { setVisible(false); return; }
        setVisible(true);
        setFadeOut(false);

        if (status === 'saved') {
            const t = setTimeout(() => setFadeOut(true), 1800);
            const t2 = setTimeout(() => setVisible(false), 2400);
            return () => { clearTimeout(t); clearTimeout(t2); };
        }
    }, [status]);

    if (!visible || status === 'idle') return null;

    const color = COLORS[status] || B.g600;

    return (
        <div style={{
            position: 'fixed', top: 12, right: 12, zIndex: 9999,
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 8,
            background: `${color}15`, border: `1.5px solid ${color}40`,
            backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
            boxShadow: `0 4px 12px ${color}20`,
            opacity: fadeOut ? 0 : 1,
            transform: fadeOut ? 'translateY(-8px)' : 'translateY(0)',
            transition: 'opacity 0.5s, transform 0.5s',
            fontFamily: F, fontSize: 11, fontWeight: 600, color,
            pointerEvents: status === 'error' || status === 'offline' ? 'auto' : 'none',
        }}>
            <span style={{ fontSize: 14 }}>{ICONS[status]}</span>
            <span>{message || LABELS[status]}</span>
            {status === 'error' && (
                <span style={{ marginLeft: 4, fontSize: 9, opacity: 0.7 }}>— will retry</span>
            )}
        </div>
    );
}

// ═══ SaveStatusBar — Persistent inline indicator for assessment header ═══
export function SaveStatusBar({ status, message, onRetry }) {
    if (status === 'idle') return null;

    const color = COLORS[status] || B.g600;
    const label = message || LABELS[status];

    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '4px 10px', borderRadius: 6,
            background: `${color}10`, border: `1px solid ${color}30`,
            fontSize: 10, fontWeight: 700, color, fontFamily: F,
            transition: 'all 0.3s ease',
            whiteSpace: 'nowrap',
        }}>
            <span style={{ fontSize: 12 }}>{ICONS[status]}</span>
            <span>{label}</span>
            {(status === 'error' || status === 'offline') && onRetry && (
                <button onClick={onRetry} style={{
                    marginLeft: 4, padding: '2px 8px', borderRadius: 4,
                    border: `1px solid ${color}50`, background: 'transparent',
                    color, fontSize: 9, fontWeight: 700, cursor: 'pointer', fontFamily: F,
                }}>Retry</button>
            )}
        </div>
    );
}

// ═══ useSaveStatus — Companion hook ═══
export function useSaveStatus() {
    const [status, setStatus] = useState('idle');
    const [message, setMessage] = useState('');

    const setSaving = useCallback(() => { setStatus('saving'); setMessage(''); }, []);
    const setSaved = useCallback(() => { setStatus('saved'); setMessage(''); }, []);
    const setError = useCallback((msg) => { setStatus('error'); setMessage(msg || 'Save failed — retrying…'); }, []);
    const setOffline = useCallback(() => { setStatus('offline'); setMessage('Offline — saved locally'); }, []);
    const setIdle = useCallback(() => { setStatus('idle'); setMessage(''); }, []);

    return { status, message, setSaving, setSaved, setError, setOffline, setIdle };
}
