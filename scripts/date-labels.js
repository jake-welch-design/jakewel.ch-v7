// Makes sure every date represented in my-life-lately has a date label file.
// Label files are empty files named "YYYY-MM-DD.." — the garden renders them
// as the day heading. Any file prefixed with a date (2026-08-10_Photo.png,
// 2026-08-10!post.md) counts as that day being present.
//
// Runs as part of `npm run cultivate`, so it fires on every watch.sh rebuild.
// Safe to run by hand: node scripts/date-labels.js

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TARGET_DIR = path.join(__dirname, "..", "my-life-lately");

const DATE_PREFIX = /^(\d{4}-\d{2}-\d{2})/;
const labelFor = (date) => `${date}..`;

// Guards against typos like 2026-13-45 becoming a phantom day.
function isRealDate(date) {
  const [year, month, day] = date.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

const entries = await fs.readdir(TARGET_DIR);
const existingLabels = new Set(entries);
const dates = new Set();

for (const entry of entries) {
  if (entry.startsWith(".")) continue;
  const match = entry.match(DATE_PREFIX);
  if (!match) continue;
  if (entry === labelFor(match[1])) continue; // the label itself
  if (!isRealDate(match[1])) continue;
  dates.add(match[1]);
}

const created = [];
for (const date of [...dates].sort()) {
  const label = labelFor(date);
  if (existingLabels.has(label)) continue;
  await fs.writeFile(path.join(TARGET_DIR, label), "");
  created.push(label);
}

if (created.length) {
  console.log(`Added ${created.length} date label(s): ${created.join(", ")}`);
}
