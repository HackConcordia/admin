const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"] as const;

const GUARD_CALL = /requireAdmin\(|requireDiscordApiKey\(/;

const METHOD_ALTERNATION = HTTP_METHODS.join("|");

const HANDLER_HEADER = new RegExp(
  `export\\s+(?:async\\s+function\\s+(${METHOD_ALTERNATION})\\b` +
    `|function\\s+(${METHOD_ALTERNATION})\\b` +
    `|const\\s+(${METHOD_ALTERNATION})\\s*=)`,
  "g",
);

/**
 * Removes `//` line comments, `/* *\/` block comments, and the CONTENTS of string/template
 * literals (single, double, backtick quoted), replacing each with equal-length whitespace so
 * character offsets into the original source are preserved. This stops a guard call name that
 * only appears in a comment or a string literal from being mistaken for a real guard call.
 */
function stripCommentsAndStrings(source: string): string {
  let out = "";
  let i = 0;
  const n = source.length;

  while (i < n) {
    const c = source[i];
    const next = source[i + 1];

    if (c === "/" && next === "/") {
      let j = i + 2;
      while (j < n && source[j] !== "\n") j += 1;
      out += " ".repeat(j - i);
      i = j;
      continue;
    }

    if (c === "/" && next === "*") {
      let j = i + 2;
      while (j < n && !(source[j] === "*" && source[j + 1] === "/")) j += 1;
      j = Math.min(j + 2, n);
      out += " ".repeat(j - i);
      i = j;
      continue;
    }

    if (c === "'" || c === '"' || c === "`") {
      const quote = c;
      let j = i + 1;
      while (j < n && source[j] !== quote) {
        if (source[j] === "\\") j += 1;
        j += 1;
      }
      j = Math.min(j + 1, n);
      out += " ".repeat(j - i);
      i = j;
      continue;
    }

    out += c;
    i += 1;
  }

  return out;
}

/**
 * Scans a route.ts source and returns the HTTP method names of every exported handler
 * (`export async function METHOD`, `export function METHOD`, `export const METHOD =`) whose
 * own body — sliced from its header to the next exported handler's header, or EOF — contains
 * no call to requireAdmin(...) or requireDiscordApiKey(...). Comments and string/template
 * literal contents are stripped first, so a guard name mentioned only in prose or a string
 * cannot satisfy the check, and each handler is checked on its own so one guarded handler
 * cannot cover for a sibling handler in the same file.
 */
export function findUnguardedHandlers(source: string): string[] {
  const stripped = stripCommentsAndStrings(source);

  const headers: Array<{ method: string; index: number }> = [];
  for (const match of stripped.matchAll(HANDLER_HEADER)) {
    const method = match[1] ?? match[2] ?? match[3];
    if (method) headers.push({ method, index: match.index ?? 0 });
  }

  return headers
    .filter(({ index }, i) => {
      const end = i + 1 < headers.length ? headers[i + 1].index : stripped.length;
      const segment = stripped.slice(index, end);
      return !GUARD_CALL.test(segment);
    })
    .map(({ method }) => method);
}
