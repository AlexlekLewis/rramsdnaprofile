import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { B, F } from '../data/theme';

// Reusable round avatar. Shows headshot if URL provided, else initials on a navy circle.
//   <HeadshotAvatar url={...} name="Aadhya Patel" size={48} ringColor={B.pk} />
// Hovering (desktop) or tapping (mobile/tablet) the avatar reveals an enlarged preview
// so a coach can quick-glance who the player is. Tapping the avatar does NOT trigger
// any parent card click (it stops propagation), so it is safe to drop into clickable rows.
function getInitials(name) {
    if (!name || typeof name !== 'string') return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0][0]?.toUpperCase() || '?';
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const PREVIEW_SIZE = 200;
const PREVIEW_BOX_HEIGHT = PREVIEW_SIZE + 56; // image + name label + padding

export default function HeadshotAvatar({ url, name = '', size = 48, ringColor = null, style = {} }) {
    const [enlarged, setEnlarged] = useState(false);
    const [placeAbove, setPlaceAbove] = useState(false);
    const wrapRef = useRef(null);

    const fallback = getInitials(name);
    const dim = `${size}px`;
    const ring = ringColor ? `2px solid ${ringColor}` : 'none';

    // If there isn't room below for the preview, flip it above the avatar.
    useLayoutEffect(() => {
        if (!enlarged || !wrapRef.current) return;
        const rect = wrapRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        setPlaceAbove(spaceBelow < PREVIEW_BOX_HEIGHT + 16);
    }, [enlarged]);

    // Dismiss the preview if the user taps outside or scrolls (touch/tablet).
    useEffect(() => {
        if (!enlarged) return;
        const onPointer = (e) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target)) {
                setEnlarged(false);
            }
        };
        const onScroll = () => setEnlarged(false);
        document.addEventListener('pointerdown', onPointer);
        window.addEventListener('scroll', onScroll, true);
        return () => {
            document.removeEventListener('pointerdown', onPointer);
            window.removeEventListener('scroll', onScroll, true);
        };
    }, [enlarged]);

    const baseAvatarStyle = {
        width: dim, height: dim, borderRadius: '50%',
        border: ring,
        boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
        flexShrink: 0,
        cursor: 'zoom-in',
        display: 'block',
        ...style,
    };

    const avatarElement = url ? (
        <img
            src={url}
            alt={name ? `${name} — headshot` : 'Player headshot'}
            style={{
                ...baseAvatarStyle,
                objectFit: 'cover', objectPosition: 'center 30%',
                background: B.g100,
            }}
            onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
        />
    ) : (
        <div
            aria-label={name ? `${name} — initials avatar` : 'Initials avatar'}
            style={{
                ...baseAvatarStyle,
                background: `linear-gradient(135deg, ${B.nvD}, ${B.bl})`,
                color: B.w, fontFamily: F, fontWeight: 800, letterSpacing: 0.5,
                fontSize: Math.max(11, Math.round(size * 0.36)),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
        >
            {fallback}
        </div>
    );

    const popoverPosStyle = placeAbove
        ? { bottom: 'calc(100% + 8px)' }
        : { top: 'calc(100% + 8px)' };

    return (
        <span
            ref={wrapRef}
            style={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}
            // Pointer events distinguish mouse from touch — only enlarge on mouse hover,
            // so a tap on a touchscreen doesn't trigger hover-then-click flash-dismiss.
            onPointerEnter={(e) => { if (e.pointerType === 'mouse') setEnlarged(true); }}
            onPointerLeave={(e) => { if (e.pointerType === 'mouse') setEnlarged(false); }}
            onClick={(e) => {
                // Don't fire the parent card's onClick (which navigates/expands).
                e.stopPropagation();
                setEnlarged((v) => !v);
            }}
        >
            {avatarElement}
            {enlarged && (
                <div
                    aria-hidden="true"
                    style={{
                        position: 'absolute',
                        left: 0,
                        ...popoverPosStyle,
                        zIndex: 1000,
                        background: B.w,
                        borderRadius: 14,
                        padding: 8,
                        boxShadow: '0 12px 32px rgba(0,0,0,0.28)',
                        border: `1px solid ${B.g200}`,
                        pointerEvents: 'none',
                    }}
                >
                    {url ? (
                        <img
                            src={url}
                            alt=""
                            style={{
                                width: PREVIEW_SIZE, height: PREVIEW_SIZE,
                                borderRadius: 10,
                                objectFit: 'cover', objectPosition: 'center 25%',
                                display: 'block',
                                background: B.g100,
                            }}
                        />
                    ) : (
                        <div style={{
                            width: PREVIEW_SIZE, height: PREVIEW_SIZE,
                            borderRadius: 10,
                            background: `linear-gradient(135deg, ${B.nvD}, ${B.bl})`,
                            color: B.w, fontFamily: F, fontWeight: 800,
                            fontSize: Math.round(PREVIEW_SIZE * 0.36),
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            {fallback}
                        </div>
                    )}
                    {name && (
                        <div style={{
                            marginTop: 6,
                            textAlign: 'center',
                            fontFamily: F,
                            fontWeight: 700,
                            fontSize: 13,
                            color: B.nv,
                            maxWidth: PREVIEW_SIZE,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                        }}>
                            {name}
                        </div>
                    )}
                </div>
            )}
        </span>
    );
}
