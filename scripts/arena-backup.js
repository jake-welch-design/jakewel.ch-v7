#!/usr/bin/env node
// Uploads new files from my-life-lately/ to the Are.na channel.
// Checks the live channel for existing blocks to avoid duplicates.
// Requires ARENA_TOKEN env var (add to your ~/.zshrc or ~/.zprofile).

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const ARENA_TOKEN = process.env.ARENA_TOKEN;
const CHANNEL_SLUG = 'my-life-lately-backup';
const CHANNEL_ID = 5013365;
const FOLDER = 'my-life-lately';
const MANIFEST_PATH = '.arena-manifest';

if (!ARENA_TOKEN) {
  console.error('Missing ARENA_TOKEN — set it in your shell profile and re-run.');
  process.exit(1);
}

const MIME_TYPES = {
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.webp': 'image/webp',
  '.mp3':  'audio/mpeg',
  '.m4a':  'audio/mp4',
  '.mp4':  'video/mp4',
  '.mov':  'video/quicktime',
};

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function arenaGet(path) {
  const res = await fetch(`https://api.are.na/v2${path}`, {
    headers: { 'Authorization': `Bearer ${ARENA_TOKEN}` },
  });
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`);
  return res.json();
}

async function arenaPost(path, body) {
  const res = await fetch(`https://api.are.na/v3${path}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ARENA_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`POST ${path} → ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

// Fetch all block titles already in the channel (paginated)
async function fetchExistingTitles() {
  const titles = new Set();
  const first = await arenaGet(`/channels/${CHANNEL_SLUG}?per=1&page=1`);
  const total = first.length;
  const pages = Math.ceil(total / 100);
  console.log(`Are.na: channel has ${total} existing blocks across ${pages} page(s).`);

  for (let page = 1; page <= pages; page++) {
    const data = await arenaGet(`/channels/${CHANNEL_SLUG}?per=100&page=${page}`);
    for (const block of data.contents || []) {
      if (block.title) titles.add(block.title.toLowerCase());
    }
    await sleep(500);
  }
  return titles;
}

async function uploadFile(file) {
  const ext = path.extname(file).toLowerCase();
  const filePath = path.join(FOLDER, file);

  if (ext === '.md') {
    const content = fs.readFileSync(filePath, 'utf8');
    return arenaPost('/blocks', { value: content, title: file, channel_ids: [CHANNEL_ID] });
  }

  const contentType = MIME_TYPES[ext];
  if (!contentType) throw new Error(`Unknown file type: ${ext}`);

  // Step 1: presign
  const presign = await arenaPost('/uploads/presign', {
    files: [{ filename: file, content_type: contentType }],
  });
  const { upload_url, key } = presign.files[0];

  // Step 2: upload to S3
  const fileBuffer = fs.readFileSync(filePath);
  const s3Res = await fetch(upload_url, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: fileBuffer,
  });
  if (!s3Res.ok) throw new Error(`S3 upload failed: ${s3Res.status}`);

  // Step 3: create block from S3 temp URL
  const s3Url = `https://s3.amazonaws.com/arena_images-temp/${key}`;
  return arenaPost('/blocks', { value: s3Url, channel_ids: [CHANNEL_ID] });
}

// --- Main ---

const existingTitles = await fetchExistingTitles();

// Load manifest and merge in what's already on the channel
const manifest = new Set(
  fs.existsSync(MANIFEST_PATH)
    ? fs.readFileSync(MANIFEST_PATH, 'utf8').split('\n').filter(Boolean)
    : []
);

// All files with real extensions (length > 1 excludes the `..` marker files whose extname is just '.')
const allFiles = fs.readdirSync(FOLDER)
  .filter(f => path.extname(f).length > 1)
  .sort();

// A file is already uploaded if it's in the manifest OR the channel has a block with that title
const newFiles = allFiles.filter(f => {
  if (manifest.has(f)) return false;
  if (existingTitles.has(f.toLowerCase())) {
    manifest.add(f); // sync manifest with reality
    return false;
  }
  return true;
});

if (newFiles.length === 0) {
  console.log('Are.na: nothing new to upload.');
  fs.writeFileSync(MANIFEST_PATH, [...manifest].sort().join('\n') + '\n');
  process.exit(0);
}

console.log(`Are.na: uploading ${newFiles.length} missing file(s)...`);

// Upload newest-first so oldest ends up deepest in the channel (chronological top-to-bottom)
for (const file of [...newFiles].reverse()) {
  try {
    const block = await uploadFile(file);
    console.log(`  ✓ ${file} → block ${block.id}`);
    manifest.add(file);
  } catch (err) {
    console.error(`  ✗ ${file}: ${err.message}`);
  }

  fs.writeFileSync(MANIFEST_PATH, [...manifest].sort().join('\n') + '\n');
  await sleep(1000);
}

// Commit updated manifest
try {
  execSync('git add .arena-manifest', { stdio: 'ignore' });
  execSync('git diff --staged --quiet || git commit -m "Update Are.na manifest" && git push origin HEAD --quiet', { stdio: 'inherit', shell: true });
} catch {
  // Non-fatal
}

console.log(`Are.na: done (${manifest.size}/${allFiles.length} files tracked).`);
