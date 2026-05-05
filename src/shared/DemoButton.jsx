// ═══ DEMO BUTTON — TINY "WATCH DEMO" PILL ═══
// Used on each exercise card in the player Fitness session view to launch
// the VideoModal at the right timestamp for that exercise.

import React from 'react';
import { B, F } from '../data/theme';

export default function DemoButton({
    onClick,
    label = 'Watch demo',
    compact = false,
    fullWidth = false,
    variant = 'subtle', // 'subtle' (chip on a card) | 'primary' (hero / headline)
    ariaLabel,
}) {
    const isPrimary = variant === 'primary';

    const base = {
        display: 'inline-flex', alignItems: 'center', gap: 6,
        border: 'none', cursor: 'pointer',
        fontFamily: F, fontWeight: 800, letterSpacing: 0.3,
        padding: compact ? '4px 10px' : '8px 14px',
        fontSize: compact ? 10 : 12,
        borderRadius: compact ? 6 : 8,
        width: fullWidth ? '100%' : 'auto',
        justifyContent: fullWidth ? 'center' : 'flex-start',
        whiteSpace: 'nowrap',
    };

    const subtle = {
        ...base,
        background: `${B.bl}12`,
        color: B.bl,
        border: `1px solid ${B.bl}30`,
    };

    const primary = {
        ...base,
        background: B.w,
        color: B.bl,
        boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
    };

    return (
        <button
            type="button"
            onClick={onClick}
            style={isPrimary ? primary : subtle}
            aria-label={ariaLabel || label}
        >
            <span aria-hidden="true" style={{ fontSize: compact ? 10 : 12, lineHeight: 1 }}>▶</span>
            <span>{label}</span>
        </button>
    );
}
