import { supabase } from '../supabaseClient';

// ─── HEADSHOTS ───
// Storage bucket: 'headshots' (public). Path convention: <player_id>/photo.jpg
// One headshot per player; re-upload overwrites.

const BUCKET = 'headshots';
const TARGET_MAX_DIMENSION = 800;   // px — square crop will be clipped to this on the long side
const TARGET_QUALITY = 0.85;        // JPEG quality
const MAX_OUTPUT_BYTES = 250 * 1024; // 250 KB sweet spot for fast portal load

/**
 * Resize + JPEG-compress a File/Blob client-side using Canvas.
 * Returns a new Blob (image/jpeg) capped to TARGET_MAX_DIMENSION on the long side.
 */
export async function resizeImageToJpeg(file, { maxDim = TARGET_MAX_DIMENSION, quality = TARGET_QUALITY } = {}) {
    if (!file) throw new Error('No file provided');
    if (!file.type?.startsWith('image/')) throw new Error('Selected file is not an image.');

    // Decode using HTMLImageElement (works on iOS Safari; createImageBitmap not always reliable)
    const objectUrl = URL.createObjectURL(file);
    try {
        const img = await new Promise((resolve, reject) => {
            const i = new Image();
            i.onload = () => resolve(i);
            i.onerror = () => reject(new Error('Could not decode image. Try a different photo.'));
            i.src = objectUrl;
        });

        // Compute scaled size preserving aspect ratio
        const longSide = Math.max(img.naturalWidth, img.naturalHeight);
        const scale = longSide > maxDim ? maxDim / longSide : 1;
        const w = Math.round(img.naturalWidth * scale);
        const h = Math.round(img.naturalHeight * scale);

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        // Better quality than default
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, w, h);

        // Encode JPEG. Step quality down if blob is too big (rare with 800px).
        let q = quality;
        let blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', q));
        while (blob && blob.size > MAX_OUTPUT_BYTES && q > 0.5) {
            q = Math.max(0.5, q - 0.1);
            blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', q));
        }
        if (!blob) throw new Error('Could not encode image. Try a different photo.');
        return blob;
    } finally {
        URL.revokeObjectURL(objectUrl);
    }
}

/**
 * Upload a headshot for the given player.
 * - Resizes + compresses client-side
 * - Stores at headshots/<playerId>/photo.jpg (overwrites existing)
 * - Updates players.headshot_url + headshot_uploaded_at with cache-busted URL
 * Returns the new headshot_url.
 */
export async function uploadPlayerHeadshot(playerId, file, { onProgress } = {}) {
    if (!playerId) throw new Error('Missing playerId');
    if (!file) throw new Error('No file selected');

    onProgress?.('resizing');
    const blob = await resizeImageToJpeg(file);

    const path = `${playerId}/photo.jpg`;

    onProgress?.('uploading');
    const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, blob, {
            contentType: 'image/jpeg',
            cacheControl: '60',     // short cache so re-uploads show fast
            upsert: true,           // overwrite existing
        });
    if (upErr) {
        const msg = upErr.message || String(upErr);
        // Common case: RLS rejection if player_id doesn't match auth.uid()
        if (/policy|denied|permission|unauthor/i.test(msg)) {
            throw new Error("We couldn't save your photo. Sign out and back in, then try again.");
        }
        throw new Error(`Upload failed: ${msg}`);
    }

    // Public URL with cache-busting timestamp so the new image appears immediately
    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
    const ts = Date.now();
    const url = `${pub.publicUrl}?v=${ts}`;

    onProgress?.('saving');
    const { error: dbErr } = await supabase
        .from('players')
        .update({ headshot_url: url, headshot_uploaded_at: new Date().toISOString() })
        .eq('id', playerId);
    if (dbErr) throw new Error(`Saved photo but couldn't update profile: ${dbErr.message}`);

    onProgress?.('done');
    return url;
}

/**
 * Remove a player's headshot (if they want to retake).
 * Deletes the storage object AND clears the row column.
 */
export async function removePlayerHeadshot(playerId) {
    if (!playerId) throw new Error('Missing playerId');
    const path = `${playerId}/photo.jpg`;
    const { error: rmErr } = await supabase.storage.from(BUCKET).remove([path]);
    if (rmErr && !/not\s*found/i.test(rmErr.message || '')) {
        throw new Error(`Could not remove photo: ${rmErr.message}`);
    }
    const { error: dbErr } = await supabase
        .from('players')
        .update({ headshot_url: null, headshot_uploaded_at: null })
        .eq('id', playerId);
    if (dbErr) throw new Error(`Removed file but couldn't update profile: ${dbErr.message}`);
}
