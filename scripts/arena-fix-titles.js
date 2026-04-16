#!/usr/bin/env node
// One-time script: finds text blocks in the channel with blank titles,
// matches them to .md files by content, and sets the title to the filename.

import fs from 'fs';
import path from 'path';

const ARENA_TOKEN = process.env.ARENA_TOKEN;
const CHANNEL_SLUG = 'my-life-lately-backup';
const FOLDER = 'my-life-lately';

if (!ARENA_TOKEN) { console.error('Missing ARENA_TOKEN'); process.exit(1); }

const sleep = ms => new Promise(r => setTimeout(r, ms));

// Load all .md files as a map of first-200-chars → filename
const mdFiles = {};
for (const f of fs.readdirSync(FOLDER).filter(f => f.endsWith('.md'))) {
  const content = fs.readFileSync(path.join(FOLDER, f), 'utf8');
  mdFiles[content.slice(0, 200)] = f;
}

// Fetch all text blocks from channel (both pages)
async function getTextBlocks() {
  const blocks = [];
  for (let page = 1; page <= 2; page++) {
    const res = await fetch(`https://api.are.na/v2/channels/${CHANNEL_SLUG}?per=100&page=${page}`, {
      headers: { 'Authorization': `Bearer ${ARENA_TOKEN}` },
    });
    const data = await res.json();
    for (const b of data.contents || []) {
      if (b.class === 'Text') blocks.push(b);
    }
    await sleep(500);
  }
  return blocks;
}

// Fetch full content of a single block
async function getBlockContent(id) {
  const res = await fetch(`https://api.are.na/v2/blocks/${id}`, {
    headers: { 'Authorization': `Bearer ${ARENA_TOKEN}` },
  });
  const data = await res.json();
  return data.content || '';
}

// Update block title
async function updateTitle(id, title) {
  const res = await fetch(`https://api.are.na/v3/blocks/${id}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${ARENA_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new Error(`${res.status}`);
}

console.log('Fetching text blocks...');
const textBlocks = await getTextBlocks();
console.log(`Found ${textBlocks.length} text blocks.`);

let fixed = 0;
let unmatched = 0;

for (const block of textBlocks) {
  const content = await getBlockContent(block.id);
  await sleep(300);

  const key = content.slice(0, 200);
  const filename = mdFiles[key];

  if (!filename) {
    console.log(`  ? block ${block.id} — no matching .md file found`);
    unmatched++;
    continue;
  }

  try {
    await updateTitle(block.id, filename);
    console.log(`  ✓ block ${block.id} → "${filename}"`);
    fixed++;
  } catch (err) {
    console.error(`  ✗ block ${block.id}: ${err.message}`);
  }

  await sleep(300);
}

console.log(`\nDone. ${fixed} titles fixed, ${unmatched} unmatched.`);
