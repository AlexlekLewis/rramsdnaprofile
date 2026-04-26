import React, { useState, useRef, useEffect } from 'react';
import { B, F, sCard, getDkWrap } from '../data/theme';
import { uploadPlayerHeadshot, removePlayerHeadshot } from '../db/headshotDb';
import HeadshotAvatar from '../shared/HeadshotAvatar';

const RULES = [
    { ok: true,  text: <>Wear your <strong>RRA Melbourne top</strong></> },
    { ok: true,  text: <>Your <strong>cap is optional</strong> — wear it if you usually do</> },
    { ok: true,  text: <>Head &amp; shoulders centred, looking at the camera</> },
    { ok: true,  text: <>Plain background, good natural light</> },
    { ok: false, text: <>No filters, group photos, sunglasses, or full-body shots</> },
];

export default function HeadshotUpload({ playerId, playerName, currentUrl, onSaved, onClose }) {
    const fileInputRef = useRef(null);
    const cameraInputRef = useRef(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [pickedFile, setPickedFile] = useState(null);
    const [stage, setStage] = useState('idle');   // idle | resizing | uploading | saving | done | error
    const [errorMsg, setErrorMsg] = useState('');
    const [savedUrl, setSavedUrl] = useState(currentUrl || null);

    // Clean up preview blob URL on unmount / change
    useEffect(() => {
        return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
    }, [previewUrl]);

    const handlePick = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            setErrorMsg('Please choose a photo (JPEG or PNG).');
            return;
        }
        if (file.size > 15 * 1024 * 1024) {
            setErrorMsg('That photo is over 15 MB — please pick a smaller one.');
            return;
        }
        setErrorMsg('');
        setStage('idle');
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(URL.createObjectURL(file));
        setPickedFile(file);
    };

    const handleSave = async () => {
        if (!pickedFile || !playerId) return;
        setErrorMsg('');
        try {
            const url = await uploadPlayerHeadshot(playerId, pickedFile, {
                onProgress: setStage,
            });
            setSavedUrl(url);
            setStage('done');
            onSaved?.(url);
        } catch (err) {
            setErrorMsg(err.message || 'Upload failed. Please try again.');
            setStage('error');
        }
    };

    const handleRemove = async () => {
        if (!playerId) return;
        if (!window.confirm('Remove your current photo? You can always upload a new one.')) return;
        setErrorMsg('');
        try {
            await removePlayerHeadshot(playerId);
            setSavedUrl(null);
            setPreviewUrl(null);
            setPickedFile(null);
            setStage('idle');
            onSaved?.(null);
        } catch (err) {
            setErrorMsg(err.message || 'Remove failed.');
        }
    };

    const handleRetake = () => {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
        setPickedFile(null);
        setStage('idle');
        setErrorMsg('');
    };

    const isWorking = ['resizing', 'uploading', 'saving'].includes(stage);
    const stageText = {
        resizing: 'Optimising photo…',
        uploading: 'Uploading…',
        saving: 'Saving to your profile…',
    }[stage] || '';

    return (
        <div style={{ minHeight: '100vh', background: B.g50, fontFamily: F }}>
            <div style={{ padding: 16, ...getDkWrap() }}>

                {/* ═══ HEADER STRIP ═══ */}
                <div style={{
                    background: `linear-gradient(135deg, ${B.nvD} 0%, ${B.bl} 70%, ${B.pk} 100%)`,
                    borderRadius: 14, padding: '18px 20px', marginBottom: 16, color: B.w,
                    boxShadow: '0 4px 14px rgba(0,29,72,0.15)',
                }}>
                    <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.4, textTransform: 'uppercase', opacity: 0.85 }}>📷 Profile Photo</div>
                    <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4, lineHeight: 1.2 }}>Upload your headshot</div>
                    <div style={{ fontSize: 12, fontWeight: 600, marginTop: 6, opacity: 0.85 }}>Make sure your photo follows the guidelines below — your coaches will use it to recognise you at sessions.</div>
                </div>

                {/* ═══ CURRENT PHOTO (if any) ═══ */}
                {savedUrl && !previewUrl && (
                    <div style={{ ...sCard, padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
                        <HeadshotAvatar url={savedUrl} name={playerName} size={68} ringColor={B.bl} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 800, color: B.nvD }}>Your current photo</div>
                            <div style={{ fontSize: 11, color: B.g400, marginTop: 2 }}>Tap "Replace photo" below to upload a new one.</div>
                        </div>
                    </div>
                )}

                {/* ═══ INSTRUCTIONS ═══ */}
                <div style={{ ...sCard, padding: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: B.nvD, marginBottom: 10 }}>Photo guidelines</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {RULES.map((r, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                                <span style={{
                                    flexShrink: 0, width: 22, height: 22, borderRadius: '50%',
                                    background: r.ok ? `${B.grn}22` : `${B.red}22`,
                                    color: r.ok ? B.grn : B.red,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 12, fontWeight: 800, marginTop: 1,
                                }}>{r.ok ? '✓' : '✕'}</span>
                                <span style={{ fontSize: 12, color: B.nv, lineHeight: 1.4, fontWeight: 600 }}>{r.text}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ═══ PREVIEW + ACTIONS ═══ */}
                <div style={{ ...sCard, padding: 16 }}>
                    {!previewUrl ? (
                        <div style={{ textAlign: 'center', padding: '8px 0 0' }}>
                            <div style={{ fontSize: 13, fontWeight: 800, color: B.nvD, marginBottom: 4 }}>{savedUrl ? 'Replace your photo' : 'Choose your photo'}</div>
                            <div style={{ fontSize: 11, color: B.g400, marginBottom: 16 }}>Take a fresh one or pick from your gallery.</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                <button
                                    onClick={() => cameraInputRef.current?.click()}
                                    style={{
                                        padding: '14px 12px', borderRadius: 10, border: 'none',
                                        background: `linear-gradient(135deg, ${B.bl}, ${B.pk})`,
                                        color: B.w, fontSize: 13, fontWeight: 800, fontFamily: F, cursor: 'pointer',
                                    }}>
                                    📸 Take photo
                                </button>
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    style={{
                                        padding: '14px 12px', borderRadius: 10,
                                        border: `2px solid ${B.nvD}`, background: B.w,
                                        color: B.nvD, fontSize: 13, fontWeight: 800, fontFamily: F, cursor: 'pointer',
                                    }}>
                                    🖼 Choose from gallery
                                </button>
                            </div>
                            <input ref={cameraInputRef} type="file" accept="image/*" capture="user" style={{ display: 'none' }} onChange={handlePick} />
                            <input ref={fileInputRef}   type="file" accept="image/*"                style={{ display: 'none' }} onChange={handlePick} />
                            {savedUrl && (
                                <button onClick={handleRemove}
                                    style={{
                                        marginTop: 12, padding: '10px 14px', borderRadius: 10,
                                        border: 'none', background: 'transparent',
                                        color: B.red, fontSize: 11, fontWeight: 700, fontFamily: F, cursor: 'pointer',
                                    }}>
                                    Remove current photo
                                </button>
                            )}
                        </div>
                    ) : (
                        <div>
                            <div style={{ fontSize: 13, fontWeight: 800, color: B.nvD, marginBottom: 10, textAlign: 'center' }}>Preview</div>
                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
                                <img src={previewUrl} alt="Preview"
                                    style={{
                                        width: 180, height: 180, borderRadius: '50%',
                                        objectFit: 'cover', objectPosition: 'center 30%',
                                        border: `3px solid ${B.bl}`,
                                        boxShadow: '0 4px 14px rgba(0,29,72,0.18)',
                                        background: B.g100,
                                    }} />
                            </div>
                            {isWorking && (
                                <div style={{ textAlign: 'center', fontSize: 12, color: B.bl, fontWeight: 700, marginBottom: 10 }}>
                                    {stageText}
                                </div>
                            )}
                            {stage === 'done' && (
                                <div style={{ textAlign: 'center', fontSize: 12, color: B.grn, fontWeight: 800, marginBottom: 10 }}>
                                    ✓ Photo saved to your profile
                                </div>
                            )}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                <button
                                    onClick={handleRetake}
                                    disabled={isWorking}
                                    style={{
                                        padding: '12px', borderRadius: 10,
                                        border: `2px solid ${B.g200}`, background: B.w,
                                        color: B.nv, fontSize: 12, fontWeight: 800, fontFamily: F,
                                        cursor: isWorking ? 'not-allowed' : 'pointer', opacity: isWorking ? 0.5 : 1,
                                    }}>
                                    Retake
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={isWorking || stage === 'done'}
                                    style={{
                                        padding: '12px', borderRadius: 10, border: 'none',
                                        background: stage === 'done' ? B.grn : `linear-gradient(135deg, ${B.bl}, ${B.pk})`,
                                        color: B.w, fontSize: 12, fontWeight: 800, fontFamily: F,
                                        cursor: (isWorking || stage === 'done') ? 'not-allowed' : 'pointer',
                                        opacity: isWorking ? 0.7 : 1,
                                    }}>
                                    {isWorking ? 'Working…' : stage === 'done' ? '✓ Saved' : 'Save photo'}
                                </button>
                            </div>
                        </div>
                    )}
                    {errorMsg && (
                        <div style={{ marginTop: 12, padding: 10, borderRadius: 8, background: `${B.red}10`, color: B.red, fontSize: 11, fontWeight: 700, textAlign: 'center' }}>
                            ⚠ {errorMsg}
                        </div>
                    )}
                </div>

                {/* ═══ DONE / BACK ═══ */}
                <div style={{ marginTop: 8, textAlign: 'center' }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '12px 20px', borderRadius: 10,
                            border: 'none', background: 'transparent',
                            color: B.nvD, fontSize: 12, fontWeight: 700, fontFamily: F, cursor: 'pointer',
                        }}>
                        ← Back to portal
                    </button>
                </div>
            </div>
        </div>
    );
}
