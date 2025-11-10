import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CHANNEL_SLUG = "art-gallery-zdcjhk1yrrc";
const API_URL = `https://api.are.na/v2/channels/${CHANNEL_SLUG}`;
const OUTPUT_DIR = __dirname;

async function fetchChannelContents() {
  const allContents = [];
  let page = 1;
  while (true) {
    const response = await fetch(`${API_URL}?page=${page}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch channel page ${page}: ${response.statusText}`);
    }
    const data = await response.json();
    const contents = data.contents || [];
    if (contents.length === 0) break;
    allContents.push(...contents);
    page++;
  }
  return allContents;
}

async function downloadImage(url, filename) {
  console.log(`Downloading ${url} to ${filename}`);
  const response = await fetch(url);
  console.log(`Response status: ${response.status}`);
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.statusText}`);
  }
  const buffer = await response.arrayBuffer();
  const filePath = path.join(OUTPUT_DIR, filename);
  await fs.promises.writeFile(filePath, Buffer.from(buffer));
  console.log(`Downloaded ${filename}`);
}

async function main() {
  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const contents = await fetchChannelContents();
  const imageBlocks = contents.filter((block) => block.class === "Image");

  for (const block of imageBlocks) {
    if (block.image && block.image.original) {
      const url = block.image.original.url;
      const filename = block.image.filename;
      await downloadImage(url, filename);
    }
  }

  console.log("All images downloaded.");
}

main().catch(console.error);
