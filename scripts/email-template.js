import { marked } from "marked";

const SITE_URL = "https://jakewel.ch";
const BG_IMAGE = `${SITE_URL}/hidden-assets/bg-summer.png`;
const BG_FALLBACK = "#acc3aa";
const BLUE = "#0000EE";
const GRAY = "#888";

const IMAGE_EXT = new Set([
  "jpg",
  "jpeg",
  "png",
  "webp",
  "gif",
  "apng",
  "svg",
  "bmp",
  "ico",
]);
const VIDEO_EXT = new Set(["mp4", "webm"]);
const AUDIO_EXT = new Set(["mp3", "wav", "ogg", "m4a"]);

export function classifyFile(filename) {
  if (filename.endsWith("..")) return "separator";
  const dotIdx = filename.lastIndexOf(".");
  if (dotIdx === -1) return "other";
  const ext = filename.slice(dotIdx + 1).toLowerCase();
  if (IMAGE_EXT.has(ext)) return "image";
  if (VIDEO_EXT.has(ext)) return "video";
  if (AUDIO_EXT.has(ext)) return "audio";
  if (ext === "md") return "markdown";
  return "other";
}

function escapeHtml(s) {
  return String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c],
  );
}

function renderItem(item) {
  const { name, type, contents } = item;
  const urlPath = encodeURI(`my-life-lately/${name}`);
  const href = `${SITE_URL}/${urlPath}`;
  const src = href;
  const labelCommon = `font-family: monospace, monospace; font-size: 11px; margin: 14px 0 4px;`;

  if (type === "separator") {
    return `<div style="${labelCommon} color: ${GRAY};">${escapeHtml(name)}</div>`;
  }

  const label = `<div style="${labelCommon}"><a href="${href}" style="color: ${BLUE}; text-decoration: underline;">${escapeHtml(name)}</a></div>`;

  if (type === "image") {
    return `${label}<a href="${href}"><img src="${src}" alt="${escapeHtml(name)}" style="display: block; max-width: 100%; height: auto; border: 1px solid black; image-rendering: -moz-crisp-edges; image-rendering: pixelated; image-rendering: crisp-edges;"></a>`;
  }
  if (type === "video") {
    return `${label}<p style="margin: 4px 0; font-family: monospace, monospace; font-size: 11px;"><a href="${href}" style="color: ${BLUE};">watch video on jakewel.ch &rarr;</a></p>`;
  }
  if (type === "audio") {
    return `${label}<p style="margin: 4px 0; font-family: monospace, monospace; font-size: 11px;"><a href="${href}" style="color: ${BLUE};">listen on jakewel.ch &rarr;</a></p>`;
  }
  if (type === "markdown") {
    const rendered = contents ? marked.parse(contents) : "";
    return `${label}<div style="font-family: monospace, monospace; font-size: 11px; margin: 4px 0;">${rendered}</div>`;
  }
  return label;
}

export function renderEmailHtml(items) {
  const body = items.map(renderItem).join("\n");

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>jakewel.ch</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${BG_FALLBACK};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: ${BG_FALLBACK}; min-height: 100%;">
    <tr>
      <td align="center" valign="top" style="padding: 24px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="480" style="max-width: 480px; background: #ffffff; border: 1px solid #000; font-family: monospace, monospace; font-size: 11px;">
          <tr>
            <td style="padding: 16px;">
              <p style="margin: 0 0 8px; font-family: monospace, monospace; font-size: 11px;">What's new in <a href="${SITE_URL}/my-life-lately/" style="color: ${BLUE}; text-decoration: underline;">my-life-lately</a></p>
              <p style="margin: 0 0 8px; font-family: monospace, monospace; font-size: 11px;">----------------------------------</p>
              <p style="margin: 0 0 8px; font-family: monospace, monospace; font-size: 11px;"></p>
              ${body}
              <p style="margin: 24px 0 0; font-family: monospace, monospace; font-size: 10px; color: ${GRAY};">
                <a href="{{UNSUBSCRIBE_URL}}" style="color: ${GRAY}; text-decoration: underline;">unsubscribe from these updates</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function renderEmailText(items) {
  const lines = [
    "What's new in my-life-lately",
    "----------------------------------",
    "",
  ];
  for (const item of items) {
    if (item.type === "separator") {
      lines.push(`— ${item.name}`);
    } else {
      lines.push(`• ${item.name}`);
      lines.push(`  ${SITE_URL}/${encodeURI(`my-life-lately/${item.name}`)}`);
      if (item.type === "markdown" && item.contents) {
        const preview = item.contents.replace(/\s+/g, " ").trim().slice(0, 200);
        lines.push(`  ${preview}`);
      }
    }
    lines.push("");
  }
  lines.push("unsubscribe from these updates {{UNSUBSCRIBE_URL}}");
  return lines.join("\n");
}

export function buildSubject(items) {
  const content = items.filter((i) => i.type !== "separator");
  if (content.length === 0) return null;
  const top = content[0].name;
  return `${top} (${content.length} new upload${content.length === 1 ? "" : "s"})`;
}
