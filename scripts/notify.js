import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildSubject,
  classifyFile,
  renderEmailHtml,
  renderEmailText,
} from "./email-template.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const STATE_FILE = path.join(repoRoot, ".last-notified-commit");

const WORKER_URL =
  process.env.WORKER_URL || "https://jakewelch-api.jakewelch.workers.dev";
const ADMIN_TOKEN = process.env.NOTIFY_ADMIN_TOKEN;

function sh(cmd) {
  return execSync(cmd, { cwd: repoRoot, encoding: "utf8" }).trim();
}

function readLastNotifiedSha() {
  try {
    return fs.readFileSync(STATE_FILE, "utf8").trim();
  } catch {
    return null;
  }
}

function writeLastNotifiedSha(sha) {
  fs.writeFileSync(STATE_FILE, sha + "\n");
}

function currentHeadSha() {
  return sh("git rev-parse HEAD");
}

function listNewItems(fromSha, toSha) {
  const range = fromSha ? `${fromSha}..${toSha}` : toSha;
  const raw = sh(
    `git diff --name-only --diff-filter=A ${range} -- my-life-lately/`,
  );
  const files = raw ? raw.split("\n") : [];
  return files
    .map((f) => f.replace(/^my-life-lately\//, ""))
    .filter((name) => {
      if (!name) return false;
      if (name === "index.html") return false;
      if (name === ".DS_Store") return false;
      if (name.includes("/")) return false;
      return true;
    })
    .sort((a, b) => b.localeCompare(a));
}

function loadItems(names) {
  return names.map((name) => {
    const type = classifyFile(name);
    const item = { name, type };
    if (type === "markdown") {
      try {
        item.contents = fs.readFileSync(
          path.join(repoRoot, "my-life-lately", name),
          "utf8",
        );
      } catch (err) {
        console.warn(`could not read ${name}: ${err.message}`);
        item.contents = "";
      }
    }
    return item;
  });
}

async function main() {
  if (!ADMIN_TOKEN) {
    console.error(
      "error: NOTIFY_ADMIN_TOKEN not set. Set it in your shell:\n" +
        "  export NOTIFY_ADMIN_TOKEN='...'\n" +
        "or add it to ~/.zshrc.",
    );
    process.exit(1);
  }

  // Check for command-line args specifying which emails to send to
  const targetEmails = process.argv.slice(2).map((e) => e.toLowerCase());

  const head = currentHeadSha();
  const last = readLastNotifiedSha();

  if (last === head && targetEmails.length === 0) {
    console.log("already notified for this commit. nothing to do.");
    return;
  }

  let names;
  if (targetEmails.length > 0 && last === head) {
    // When resending to specific emails, use items from the last notified commit
    // Get items from the commit before last to last
    try {
      const beforeLast = sh(`git rev-parse ${last}~1`);
      names = listNewItems(beforeLast, last);
    } catch {
      names = [];
    }
  } else {
    names = listNewItems(last, head);
  }

  if (names.length === 0 && targetEmails.length === 0) {
    console.log(
      "no new my-life-lately items since last notification. skipping.",
    );
    writeLastNotifiedSha(head);
    return;
  }

  const items = loadItems(names);
  const contentCount = items.filter((i) => i.type !== "separator").length;
  if (contentCount === 0 && targetEmails.length === 0) {
    console.log(
      "only date separators changed. skipping send, but updating baseline.",
    );
    writeLastNotifiedSha(head);
    return;
  }

  let subject = buildSubject(items);
  // When resending to specific emails, use a resend subject if no new items
  if (targetEmails.length > 0 && !subject) {
    subject = "jakewel.ch - Resend";
  }
  const html = renderEmailHtml(items);
  const text = renderEmailText(items);

  console.log(`would send: "${subject}"`);
  console.log(
    `items: ${items.length} (${contentCount} content, ${items.length - contentCount} separators)`,
  );
  for (const item of items)
    console.log(`  ${item.type.padEnd(10)} ${item.name}`);

  if (targetEmails.length > 0) {
    console.log(`\nresending to ${targetEmails.length} specific email(s):`);
    targetEmails.forEach((e) => console.log(`  - ${e}`));
  }

  const resp = await fetch(`${WORKER_URL}/notify`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ADMIN_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      subject,
      html,
      text,
      ...(targetEmails.length > 0 && { emails: targetEmails }),
    }),
  });

  const result = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    console.error(`notify failed (${resp.status}):`, result);
    process.exit(1);
  }
  console.log(`sent: ${result.sent}/${result.total}`);
  if (result.failures?.length) {
    console.warn("failures:", result.failures);
  }
  if (targetEmails.length === 0) {
    writeLastNotifiedSha(head);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
