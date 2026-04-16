#!/usr/bin/env node
// Reorders all blocks in the Are.na channel chronologically by filename.
// Newest files end up at position 1 (top), oldest at the bottom.
// Run once after the initial backfill: node scripts/arena-sort.js

import { execSync } from 'child_process';

const ARENA_TOKEN = process.env.ARENA_TOKEN;
const CHANNEL_SLUG = 'my-life-lately-backup';

if (!ARENA_TOKEN) {
  console.error('Missing ARENA_TOKEN');
  process.exit(1);
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function arenaGet(path) {
  const res = await fetch(`https://api.are.na/v2${path}`, {
    headers: { 'Authorization': `Bearer ${ARENA_TOKEN}` },
  });
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`);
  return res.json();
}

async function moveConnection(connectionId, position) {
  const res = await fetch(`https://api.are.na/v3/connections/${connectionId}/move`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ARENA_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ position }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`move ${connectionId} → ${res.status}: ${text.slice(0, 100)}`);
  }
  return res.json();
}

// Fetch all blocks with their connection_ids
console.log('Fetching all blocks from channel...');
const first = await arenaGet(`/channels/${CHANNEL_SLUG}?per=1&page=1`);
const total = first.length;
const pages = Math.ceil(total / 100);
console.log(`${total} blocks across ${pages} page(s).`);

const blocks = [];
for (let page = 1; page <= pages; page++) {
  const data = await arenaGet(`/channels/${CHANNEL_SLUG}?per=100&page=${page}`);
  for (const b of data.contents || []) {
    blocks.push({ title: b.title || '', connection_id: b.connection_id, position: b.position });
  }
  await sleep(500);
}

// Sort alphabetically by title (filenames are date-prefixed, so this is chronological)
// Oldest at position 1 (top), newest at the bottom
const sorted = [...blocks].sort((a, b) => a.title.localeCompare(b.title));

console.log(`\nReordering ${sorted.length} blocks (newest → oldest, top → bottom)...`);
console.log(`  First: ${sorted[0].title}`);
console.log(`  Last:  ${sorted[sorted.length - 1].title}\n`);

let moved = 0;
let skipped = 0;

for (let i = 0; i < sorted.length; i++) {
  const block = sorted[i];
  const targetPosition = i + 1;

  if (block.position === targetPosition) {
    skipped++;
    continue;
  }

  try {
    await moveConnection(block.connection_id, targetPosition);
    console.log(`  [${targetPosition}/${sorted.length}] ${block.title}`);
    moved++;
  } catch (err) {
    console.error(`  ✗ ${block.title}: ${err.message}`);
  }

  await sleep(300);
}

console.log(`\nDone. ${moved} moved, ${skipped} already in place.`);
