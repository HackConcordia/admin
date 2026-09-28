const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"] as const;
const HTTP_METHOD_SET: ReadonlySet<string> = new Set(HTTP_METHODS);
const METHOD_ALTERNATION = HTTP_METHODS.join("|");

const GUARD_CALL = /requireAdmin\(|requireDiscordApiKey\(/;

const FUNCTION_HEADER_RE = new RegExp(`export\\s+(?:async\\s+)?function\\s+(${METHOD_ALTERNATION})\\b\\s*\\(`, "g");
const CONST_DECL_RE = new RegExp(`export\\s+const\\s+(${METHOD_ALTERNATION})\\b`, "g");
const EXPORT_LIST_RE = /export\s*\{([^}]*)\}/g;

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

interface DirectHeader {
  method: string;
  form: "function" | "const";
  headerIndex: number;
  /** Index right after the header text matched by the regex (see the two regexes above). */
  afterHeaderIndex: number;
}

/** Finds every `export (async) function METHOD(` and `export const METHOD` declaration, in source order. */
function findDirectHandlerHeaders(stripped: string): DirectHeader[] {
  const headers: DirectHeader[] = [];

  for (const match of stripped.matchAll(FUNCTION_HEADER_RE)) {
    const index = match.index ?? 0;
    headers.push({ method: match[1], form: "function", headerIndex: index, afterHeaderIndex: index + match[0].length });
  }

  for (const match of stripped.matchAll(CONST_DECL_RE)) {
    const index = match.index ?? 0;
    headers.push({ method: match[1], form: "const", headerIndex: index, afterHeaderIndex: index + match[0].length });
  }

  return headers.sort((a, b) => a.headerIndex - b.headerIndex);
}

/** `openParenIndex` must point AT the opening `(`. Returns the index right after its matching `)`. */
function findMatchingParenEnd(stripped: string, openParenIndex: number): number | null {
  let depth = 1;
  let i = openParenIndex + 1;
  const n = stripped.length;
  while (i < n && depth > 0) {
    if (stripped[i] === "(") depth += 1;
    else if (stripped[i] === ")") depth -= 1;
    i += 1;
  }
  return depth === 0 ? i : null;
}

/** `openBraceIndex` must point AT the opening `{`. Returns the index right after its matching `}`. */
function findMatchingBraceEnd(stripped: string, openBraceIndex: number): number | null {
  let depth = 0;
  let i = openBraceIndex;
  const n = stripped.length;
  while (i < n) {
    if (stripped[i] === "{") depth += 1;
    else if (stripped[i] === "}") {
      depth -= 1;
      if (depth === 0) return i + 1;
    }
    i += 1;
  }
  return null;
}

/**
 * From right after `export const METHOD`, finds the `=` that assigns the arrow function,
 * skipping over any `=>` that appears earlier as part of a type annotation (e.g.
 * `export const GET: (req: NextRequest) => Promise<Response> = async (req) => { ... }`).
 */
function findConstAssignmentIndex(stripped: string, fromIndex: number): number | null {
  let i = fromIndex;
  const n = stripped.length;
  while (i < n) {
    if (stripped[i] === "=") {
      if (stripped[i + 1] === ">") {
        i += 2;
        continue;
      }
      return i;
    }
    i += 1;
  }
  return null;
}

/**
 * From right after the arrow function's assigning `=`, skips an optional `async` keyword and a
 * parenthesized parameter list, so the caller can search for the function's OWN `=>` without
 * being fooled by an `=>` inside a parameter's function-type annotation. Falls back to
 * returning `fromIndex` unchanged if no parenthesized parameter list is found there.
 */
function skipAsyncAndParams(stripped: string, fromIndex: number): number {
  let i = fromIndex;
  const n = stripped.length;
  while (i < n && /\s/.test(stripped[i])) i += 1;

  if (stripped.slice(i, i + 5) === "async" && (i + 5 >= n || /\s|\(/.test(stripped[i + 5]))) {
    i += 5;
    while (i < n && /\s/.test(stripped[i])) i += 1;
  }

  if (stripped[i] !== "(") return i;

  const parenEnd = findMatchingParenEnd(stripped, i);
  return parenEnd ?? i;
}

interface BodyRange {
  start: number;
  end: number;
}

/**
 * Bounds a single handler's own body — never a sibling handler's, and never a helper function
 * that merely sits nearby in the file. Returns `null` if the body can't be confidently located,
 * which the caller treats as UNGUARDED (fail closed) rather than skipping the handler.
 */
function locateHandlerBody(stripped: string, header: DirectHeader): BodyRange | null {
  if (header.form === "function") {
    // header.afterHeaderIndex points right after the parameter list's opening `(`.
    const parenEnd = findMatchingParenEnd(stripped, header.afterHeaderIndex - 1);
    if (parenEnd === null) return null;

    const braceStart = stripped.indexOf("{", parenEnd);
    if (braceStart === -1) return null;

    const braceEnd = findMatchingBraceEnd(stripped, braceStart);
    if (braceEnd === null) return null;

    return { start: braceStart, end: braceEnd };
  }

  const assignIndex = findConstAssignmentIndex(stripped, header.afterHeaderIndex);
  if (assignIndex === null) return null;

  const afterParams = skipAsyncAndParams(stripped, assignIndex + 1);
  const arrowIndex = stripped.indexOf("=>", afterParams);
  if (arrowIndex === -1) return null;

  let k = arrowIndex + 2;
  while (k < stripped.length && /\s/.test(stripped[k])) k += 1;

  if (stripped[k] === "{") {
    const braceEnd = findMatchingBraceEnd(stripped, k);
    if (braceEnd === null) return null;
    return { start: k, end: braceEnd };
  }

  // Concise-body arrow (no braces): the body is the expression up to the terminating `;` at
  // bracket/paren/brace depth 0. If no such terminator is found, fail closed.
  let depth = 0;
  let j = k;
  let terminated = false;
  while (j < stripped.length) {
    const c = stripped[j];
    if (c === "(" || c === "{" || c === "[") depth += 1;
    else if (c === ")" || c === "}" || c === "]") depth -= 1;
    else if (c === ";" && depth === 0) {
      terminated = true;
      j += 1;
      break;
    }
    j += 1;
  }

  return terminated ? { start: k, end: j } : null;
}

/** Finds HTTP method names named in `export { ... }` lists, including `export { x as METHOD }`. */
function exportListMethods(stripped: string): string[] {
  const methods: string[] = [];

  for (const match of stripped.matchAll(EXPORT_LIST_RE)) {
    for (const rawEntry of match[1].split(",")) {
      const entry = rawEntry.trim();
      if (!entry) continue;

      const asMatch = entry.match(/\bas\b\s+(\S+)$/);
      const exportedName = (asMatch ? asMatch[1] : entry.replace(/^type\s+/, "")).trim();

      if (HTTP_METHOD_SET.has(exportedName)) methods.push(exportedName);
    }
  }

  return methods;
}

/**
 * Returns every HTTP method name exported by this route file, in any recognized form:
 * `export async function METHOD`, `export function METHOD`, `export const METHOD = ...` (with
 * or without a type annotation before the `=`), and `export { METHOD }` / `export { x as
 * METHOD }` re-export lists. This is the single definition of "what counts as an exported
 * handler" for a route file — `route-coverage.test.ts` uses this instead of keeping a second,
 * looser regex that could disagree with `findUnguardedHandlers`.
 */
export function findHandlerExports(source: string): string[] {
  const stripped = stripCommentsAndStrings(source);
  const direct = findDirectHandlerHeaders(stripped).map((header) => header.method);
  const listed = exportListMethods(stripped);
  return Array.from(new Set([...direct, ...listed]));
}

/**
 * Scans a route.ts source and returns the HTTP method names of every exported handler that is
 * not verifiably guarded. A handler counts as guarded only if a call to `requireAdmin(...)` or
 * `requireDiscordApiKey(...)` appears inside THAT handler's own body, bounded by matching that
 * handler's own parentheses/braces (or, for a concise arrow body, up to its own terminating
 * `;`) — never a sibling handler's body, and never a helper function that merely sits nearby
 * (before, between, or after the handlers) in the same file.
 *
 * This check is textual, not a real parse: a guard call anywhere inside a handler's own body
 * counts, even inside a nested function that is defined but never actually called within that
 * body. The per-route unit tests are what verify each handler's real runtime behaviour; this
 * scan only verifies that guard-calling code is textually present somewhere inside the
 * handler's own body.
 *
 * Anything this scanner cannot confidently isolate — a handler whose body it fails to bound,
 * or a method it can only see reached through an `export { ... }` re-export list it has no way
 * to follow to an actual body — is reported as unguarded (fail closed), never silently skipped.
 */
export function findUnguardedHandlers(source: string): string[] {
  const stripped = stripCommentsAndStrings(source);
  const headers = findDirectHandlerHeaders(stripped);

  const guarded = new Set<string>();
  const unguarded = new Set<string>();

  for (const header of headers) {
    const body = locateHandlerBody(stripped, header);
    if (!body) {
      unguarded.add(header.method);
      continue;
    }

    const segment = stripped.slice(body.start, body.end);
    if (GUARD_CALL.test(segment)) {
      guarded.add(header.method);
    } else {
      unguarded.add(header.method);
    }
  }

  // Re-export lists can't be followed to a real body at all — fail closed, unconditionally.
  for (const method of exportListMethods(stripped)) {
    unguarded.add(method);
  }

  return Array.from(unguarded);
}
