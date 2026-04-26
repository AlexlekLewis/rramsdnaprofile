import React from 'react';
import { B, F } from '../data/theme';

// Modal that prompts the player to upload a headshot.
// IMPORTANT: the parent (PlayerPortal) only mounts this when headshot_url is null,
// so as soon as the player saves a photo (state flips to truthy), this stops
// rendering — no extra logic needed here.
export default function HeadshotPrompt({ open, onUpload, onLater }) {
    if (!open) return null;
    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="headshot-prompt-title"
            style={{
                position: 'fixed', inset: 0, zIndex: 1000,
                background: 'rgba(0, 29, 72, 0.55)',
                backdropFilter: 'blur(4px)',
                WebkitBackdropFilter: 'blur(4px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 16, fontFamily: F,
            }}
        >
            <div style={{
                background: B.w, borderRadius: 16, maxWidth: 380, width: '100%',
                boxShadow: '0 12px 40px rgba(0,29,72,0.30)',
                overflow: 'hidden',
            }}>
                {/* Royals gradient strip */}
                <div style={{
                    background: `linear-gradient(135deg, ${B.nvD} 0%, ${B.bl} 60%, ${B.pk} 100%)`,
                    padding: '20px 22px 22px', color: B.w, textAlign: 'center',
                }}>
                    <div style={{ fontSize: 36, lineHeight: 1, marginBottom: 8 }}>📷</div>
                    <div id="headshot-prompt-title" style={{ fontSize: 17, fontWeight: 800, letterSpacing: -0.2, lineHeight: 1.25 }}>
                        Add your profile photo
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 600, marginTop: 6, opacity: 0.88 }}>
                        Your coaches use this to recognise you at sessions.
                    </div>
                </div>

                {/* Body */}
                <div style={{ padding: '18px 22px 8px' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: B.nv, marginBottom: 10, letterSpacing: 0.2 }}>Quick guidelines</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                        {[
                            'Wear your RRA Melbourne top',
                            'Cap optional — wear it if you usually do',
                            'Head & shoulders centred, looking at camera',
                            'Plain background, good natural light',
                        ].map((line) => (
                            <div key={line} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                                <span style={{
                                    flexShrink: 0, width: 18, height: 18, borderRadius: '50%',
                                    background: `${B.grn}22`, color: B.grn,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 11, fontWeight: 800, marginTop: 1,
                                }}>✓</span>
                                <span style={{ fontSize: 12, color: B.nv, lineHeight: 1.4, fontWeight: 600 }}>{line}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Actions */}
                <div style={{ padding: '14px 22px 18px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <button
                        onClick={onLater}
                        style={{
                            padding: '12px', borderRadius: 10,
                            border: `2px solid ${B.g200}`, background: B.w,
                            color: B.nv, fontSize: 12, fontWeight: 800, fontFamily: F, cursor: 'pointer',
                        }}>
                        Later
                    </button>
                    <button
                        onClick={onUpload}
                        autoFocus
                        style={{
                            padding: '12px', borderRadius: 10, border: 'none',
                            background: `linear-gradient(135deg, ${B.bl}, ${B.pk})`,
                            color: B.w, fontSize: 12, fontWeight: 800, fontFamily: F, cursor: 'pointer',
                            boxShadow: '0 3px 10px rgba(0,117,201,0.30)',
                        }}>
                        Upload now
                    </button>
                </div>
            </div>
        </div>
    );
}
