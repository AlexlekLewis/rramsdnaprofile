import React from 'react';
import { B, F } from '../data/theme';

// Reusable round avatar. Shows headshot if URL provided, else initials on a navy circle.
//   <HeadshotAvatar url={...} name="Aadhya Patel" size={48} ringColor={B.pk} />
function getInitials(name) {
    if (!name || typeof name !== 'string') return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0][0]?.toUpperCase() || '?';
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function HeadshotAvatar({ url, name = '', size = 48, ringColor = null, style = {} }) {
    const fallback = getInitials(name);
    const dim = `${size}px`;
    const ring = ringColor ? `2px solid ${ringColor}` : 'none';
    if (url) {
        return (
            <img
                src={url}
                alt={name ? `${name} — headshot` : 'Player headshot'}
                style={{
                    width: dim, height: dim, borderRadius: '50%',
                    objectFit: 'cover', objectPosition: 'center 30%',
                    border: ring,
                    boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                    background: B.g100,
                    flexShrink: 0,
                    ...style,
                }}
                onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
            />
        );
    }
    return (
        <div
            aria-label={name ? `${name} — initials avatar` : 'Initials avatar'}
            style={{
                width: dim, height: dim, borderRadius: '50%',
                background: `linear-gradient(135deg, ${B.nvD}, ${B.bl})`,
                color: B.w, fontFamily: F, fontWeight: 800, letterSpacing: 0.5,
                fontSize: Math.max(11, Math.round(size * 0.36)),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: ring,
                boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                flexShrink: 0,
                ...style,
            }}
        >
            {fallback}
        </div>
    );
}
