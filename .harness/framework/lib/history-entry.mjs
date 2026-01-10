const FRONTMATTER_DELIMITER = "---";

export const HISTORY_TYPES = new Set([
  "fix",
  "decision",
  "incident",
  "refactor",
  "investigation",
  "meta",
  "feature",
  "note",
]);

export const STRICT_TYPES = new Set(["fix", "incident"]);
export const META_TYPES = new Set(["meta"]);

function parseInlineValue(value) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    const inner = trimmed.slice(1, -1).trim();
    if (!inner) return [];
    return inner
      .split(",")
      .map((item) => item.trim().replace(/^["']|["']$/g, ""))
      .filter(Boolean);
  }
  return trimmed.replace(/^["']|["']$/g, "");
}

export function parseFrontmatter(content) {
  const lines = content.split("\n");
  if (lines[0]?.trim() !== FRONTMATTER_DELIMITER) {
    return { data: null, body: content };
  }

  const data = {};
  let currentKey = null;
  let i = 1;

  for (; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === FRONTMATTER_DELIMITER) {
      i++;
      break;
    }
    if (!line.trim()) continue;

    const keyMatch = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (keyMatch) {
      const key = keyMatch[1];
      const valueRaw = keyMatch[2];
      if (!valueRaw) {
        data[key] = [];
        currentKey = key;
      } else {
        data[key] = parseInlineValue(valueRaw);
        currentKey = null;
      }
      continue;
    }

    const listMatch = line.match(/^\s*-\s+(.*)$/);
    if (currentKey && listMatch) {
      data[currentKey].push(listMatch[1].trim().replace(/^["']|["']$/g, ""));
    }
  }

  const body = lines.slice(i).join("\n").replace(/^\n+/, "");
  return { data, body };
}

export function normalizeList(value) {
  if (Array.isArray(value)) return value.filter((item) => item !== "");
  if (value === null || value === undefined) return [];
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    return [trimmed];
  }
  return [];
}

export function extractMarkdownSection(content, heading) {
  const match = content.match(
    new RegExp(`## ${heading}\\s*\\n([\\s\\S]*?)(?=\\n## |$)`),
  );
  return match ? match[1].trim() : "";
}

export function countWords(text) {
  if (!text) return 0;
  return text
    .replace(/[^\w\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
}
