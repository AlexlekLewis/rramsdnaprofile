// ═══ VIDEO MODAL — INSTRUCTIONAL DEMO PLAYER ═══
// Plays a single MP4 file but jumps to a specific start time and auto-pauses
// when the segment ends, so each Demo button shows exactly one exercise.
//
// Mobile-friendly: playsInline keeps it inside the page on iOS rather than
// triggering the OS fullscreen player. preload="metadata" means we only
// download the timeline header until play is hit, then byte-range requests
// fetch just the chunks being watched.
//
// Fallback: if the URL is missing (file not yet uploaded) we render a
// friendly placeholder. If a player can't get the embedded player to play
// on a flaky connection, the "Open in new tab" button hands the URL to
// their phone's native video app, which handles weak networks better.
//
// Auto-pause: an onTimeUpdate watcher pauses the video when it reaches
// endSeconds, then shows a Replay / Close overlay.

import React, { useEffect, useRef, useState } from 'react';
import { B, F } from '../data/theme';

const overlayStyle = {
    position: 'fixed', inset: 0, zIndex: 1000,
    background: 'rgba(0, 0, 0, 0.85)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 12, fontFamily: F,
};

const dialogStyle = {
    background: B.nvD,
    borderRadius: 12,
    width: '100%', maxWidth: 720,
    boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
    overflow: 'hidden',
    display: 'flex', flexDirection: 'column',
};

const headerStyle = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '10px 14px',
    background: B.nvD, color: B.w,
    borderBottom: `1px solid rgba(255,255,255,0.1)`,
    gap: 8,
};

const closeBtnStyle = {
    background: 'none', border: 'none', color: B.w,
    fontSize: 22, lineHeight: 1, cursor: 'pointer',
    padding: '4px 8px', flexShrink: 0,
};

const videoWrapStyle = {
    position: 'relative', background: '#000',
    aspectRatio: '16 / 9', width: '100%',
};

const videoElStyle = {
    width: '100%', height: '100%', display: 'block', background: '#000',
};

const overlayCardStyle = {
    position: 'absolute', inset: 0,
    background: 'rgba(0,0,0,0.65)',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    color: B.w, padding: 16, textAlign: 'center', gap: 14,
};

const primaryBtnStyle = {
    background: B.bl, color: B.w, border: 'none',
    padding: '10px 18px', borderRadius: 10,
    fontFamily: F, fontSize: 13, fontWeight: 800,
    cursor: 'pointer', letterSpacing: 0.4,
};

const secondaryBtnStyle = {
    background: 'transparent', color: B.w,
    border: `1px solid ${B.w}80`,
    padding: '10px 18px', borderRadius: 10,
    fontFamily: F, fontSize: 13, fontWeight: 700,
    cursor: 'pointer', letterSpacing: 0.4,
};

const footerStyle = {
    padding: '10px 14px',
    background: B.nvD, color: '#C7D0DA',
    fontSize: 11, fontFamily: F, lineHeight: 1.5,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    gap: 12, flexWrap: 'wrap',
};

const fallbackLinkStyle = {
    color: '#9FC4E8', fontWeight: 700, fontSize: 11,
    textDecoration: 'underline', whiteSpace: 'nowrap',
};

export default function VideoModal({
    open,
    onClose,
    videoUrl,
    startSeconds = 0,
    endSeconds = null,
    title,
    note,
}) {
    const videoRef = useRef(null);
    const [reachedEnd, setReachedEnd] = useState(false);

    // Reset end state and seek to start every time the modal re-opens with
    // new bounds. We also call play() because mobile browsers throttle
    // autoplay unless it's coming from a user gesture (the Demo button click
    // counts as one).
    useEffect(() => {
        if (!open) return;
        setReachedEnd(false);
        const v = videoRef.current;
        if (!v || !videoUrl) return;
        const seekAndPlay = () => {
            try {
                v.currentTime = startSeconds || 0;
                const p = v.play();
                if (p && typeof p.catch === 'function') p.catch(() => { /* user can press play manually */ });
            } catch { /* ignore */ }
        };
        if (v.readyState >= 1) {
            seekAndPlay();
        } else {
            const onLoaded = () => { seekAndPlay(); v.removeEventListener('loadedmetadata', onLoaded); };
            v.addEventListener('loadedmetadata', onLoaded);
            return () => v.removeEventListener('loadedmetadata', onLoaded);
        }
    }, [open, videoUrl, startSeconds]);

    // Esc closes the modal.
    useEffect(() => {
        if (!open) return;
        const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    // Pause when the video reaches the end of the segment. Some seek/scrub
    // operations can briefly report a time past the boundary, so we only
    // act on the first crossing per open.
    const onTimeUpdate = () => {
        if (reachedEnd) return;
        const v = videoRef.current;
        if (!v || endSeconds == null) return;
        if (v.currentTime >= endSeconds) {
            v.pause();
            setReachedEnd(true);
        }
    };

    const replay = () => {
        const v = videoRef.current;
        if (!v) return;
        setReachedEnd(false);
        try {
            v.currentTime = startSeconds || 0;
            v.play().catch(() => {});
        } catch { /* ignore */ }
    };

    if (!open) return null;

    // Click outside the dialog closes the modal; clicks on the dialog itself
    // don't bubble up.
    const stop = (e) => e.stopPropagation();

    const hasUrl = typeof videoUrl === 'string' && videoUrl.length > 0;

    return (
        <div style={overlayStyle} onClick={onClose} role="dialog" aria-modal="true" aria-label={title || 'Demo video'}>
            <div style={dialogStyle} onClick={stop}>
                <div style={headerStyle}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 9, fontWeight: 800, opacity: 0.7, letterSpacing: 0.5, textTransform: 'uppercase' }}>Demo</div>
                        <div style={{ fontSize: 14, fontWeight: 800, marginTop: 2, lineHeight: 1.25 }}>{title || 'Instructional video'}</div>
                    </div>
                    <button onClick={onClose} style={closeBtnStyle} aria-label="Close demo">×</button>
                </div>

                <div style={videoWrapStyle}>
                    {hasUrl ? (
                        <>
                            <video
                                ref={videoRef}
                                src={videoUrl}
                                style={videoElStyle}
                                controls
                                playsInline
                                preload="metadata"
                                onTimeUpdate={onTimeUpdate}
                            />
                            {reachedEnd && (
                                <div style={overlayCardStyle}>
                                    <div style={{ fontSize: 16, fontWeight: 800 }}>Demo complete</div>
                                    <div style={{ fontSize: 12, opacity: 0.85, maxWidth: 320 }}>
                                        That's the end of this exercise. Replay it or close to get back to your session.
                                    </div>
                                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
                                        <button onClick={replay} style={primaryBtnStyle}>Replay</button>
                                        <button onClick={onClose} style={secondaryBtnStyle}>Close</button>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div style={{ ...overlayCardStyle, background: B.nvD, position: 'relative' }}>
                            <div style={{ fontSize: 28 }}>🎬</div>
                            <div style={{ fontSize: 14, fontWeight: 800 }}>Video being prepared</div>
                            <div style={{ fontSize: 12, opacity: 0.85, maxWidth: 320 }}>
                                The instructional video is being uploaded. Check back shortly — this button will play the right section automatically.
                            </div>
                        </div>
                    )}
                </div>

                <div style={footerStyle}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        {note ? note : 'Tap Replay to watch again, or close to return to your session.'}
                    </div>
                    {hasUrl && (
                        <a
                            href={videoUrl}
                            target="_blank"
                            rel="noreferrer"
                            style={fallbackLinkStyle}
                            aria-label="Open the video in a new tab"
                        >
                            Trouble playing? Open in new tab ↗
                        </a>
                    )}
                </div>
            </div>
        </div>
    );
}
