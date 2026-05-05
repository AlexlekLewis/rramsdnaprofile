// One-off upload script: pushes the converted MP4 into the Supabase Storage
// `videos` bucket using the resumable TUS protocol (works for files larger
// than the 50 MB REST-API limit). The bucket has anon-upload and public-read
// policies so the publishable anon key is enough.
//
// Run from repo root:
//   node scripts/upload-fitness-video.mjs <local-file-path> <bucket-path>

import * as tus from 'tus-js-client';
import { createReadStream, statSync } from 'node:fs';

const SUPABASE_URL = 'https://pudldzgmluwoocwxtzhw.supabase.co';
// Publishable anon key — same one the live app uses; safe to commit.
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1ZGxkemdtbHV3b29jd3h0emh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0MTA0OTQsImV4cCI6MjA4NDk4NjQ5NH0.X-pDkxLGDGIpno_HVmPTURXf4IZ2jucZURXjj3si0gg';
const BUCKET = 'videos';

const localPath = process.argv[2];
const bucketPath = process.argv[3];

if (!localPath || !bucketPath) {
    console.error('Usage: node scripts/upload-fitness-video.mjs <local-file-path> <bucket-path>');
    process.exit(2);
}

const stats = statSync(localPath);
const sizeMb = (stats.size / (1024 * 1024)).toFixed(1);
console.log(`Source: ${localPath} (${sizeMb} MiB, ${stats.size} bytes)`);
console.log(`Target: ${BUCKET}/${bucketPath}`);

const fileStream = createReadStream(localPath);

const upload = new tus.Upload(fileStream, {
    endpoint: `${SUPABASE_URL}/storage/v1/upload/resumable`,
    retryDelays: [0, 3000, 5000, 10000, 20000],
    headers: {
        authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'x-upsert': 'true',
    },
    uploadDataDuringCreation: true,
    removeFingerprintOnSuccess: true,
    metadata: {
        bucketName: BUCKET,
        objectName: bucketPath,
        contentType: 'video/mp4',
        cacheControl: '31536000',
    },
    chunkSize: 6 * 1024 * 1024, // 6 MiB chunks
    uploadSize: stats.size,
    onError(err) {
        console.error('Upload failed:', err.message || err);
        if (err.originalResponse) {
            console.error('Status:', err.originalResponse.getStatus(), 'Body:', err.originalResponse.getBody());
        }
        process.exit(1);
    },
    onProgress(bytesUploaded, bytesTotal) {
        const pct = ((bytesUploaded / bytesTotal) * 100).toFixed(1);
        const mb = (bytesUploaded / (1024 * 1024)).toFixed(1);
        process.stdout.write(`\r  ${pct}% (${mb} MiB)`);
    },
    onSuccess() {
        process.stdout.write('\n');
        const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${bucketPath}`;
        console.log('Upload complete.');
        console.log(`\nPublic URL:\n${publicUrl}`);
        process.exit(0);
    },
});

console.log('Starting resumable upload…');
upload.start();
