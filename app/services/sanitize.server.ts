// Conservative rich-text sanitizer for merchant-entered consent copy.
// Allowlist only: b, strong, i, em, u, p, br, and a[href^=http(s)].
// Everything else — tags, attributes, event handlers — is stripped.
// The storefront script sanitizes again with a DOM walker (two layers).

const ALLOWED_BARE = new Set(["b", "strong", "i", "em", "u", "p", "br"]);
const TAG_TOKEN = /<[^>]*>|<+/g;
const HREF_PATTERN = /href\s*=\s*("([^"]*)"|'([^']*)')/i;

function escapeText(text: string): string {
  return text
    .replace(/&(?![a-zA-Z#0-9]+;)/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function sanitizeRichText(input: string): string {
  let out = "";
  let cursor = 0;
  const openStack: string[] = [];

  for (const match of input.matchAll(TAG_TOKEN)) {
    const token = match[0];
    const index = match.index ?? 0;
    out += escapeText(input.slice(cursor, index));
    cursor = index + token.length;

    const tagMatch = /^<\s*(\/?)\s*([a-zA-Z]+)/.exec(token);
    if (!tagMatch) continue; // stray "<" runs — dropped

    const closing = tagMatch[1] === "/";
    const name = tagMatch[2].toLowerCase();

    if (ALLOWED_BARE.has(name)) {
      if (name === "br") {
        if (!closing) out += "<br>";
      } else if (closing) {
        if (openStack.lastIndexOf(name) !== -1) {
          // close any unclosed inner tags to keep nesting valid
          let popped: string | undefined;
          while ((popped = openStack.pop()) !== undefined) {
            out += `</${popped}>`;
            if (popped === name) break;
          }
        }
      } else {
        out += `<${name}>`;
        openStack.push(name);
      }
    } else if (name === "a") {
      if (closing) {
        if (openStack.lastIndexOf("a") !== -1) {
          let popped: string | undefined;
          while ((popped = openStack.pop()) !== undefined) {
            out += `</${popped}>`;
            if (popped === "a") break;
          }
        }
      } else {
        const href = HREF_PATTERN.exec(token);
        const url = href?.[2] ?? href?.[3] ?? "";
        if (/^https?:\/\//i.test(url)) {
          out += `<a href="${url.replace(/"/g, "%22")}">`;
          openStack.push("a");
        }
        // <a> without a safe href is dropped entirely
      }
    }
    // all other tags are stripped
  }
  out += escapeText(input.slice(cursor));

  // close anything left open
  for (let i = openStack.length - 1; i >= 0; i--) {
    out += `</${openStack[i]}>`;
  }
  return out.trim();
}

// Plain-text projection, used for length/emptiness validation.
export function richTextToPlain(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .trim();
}
