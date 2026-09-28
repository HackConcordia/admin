import ts from "typescript";

const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"] as const;
const HTTP_METHOD_SET: ReadonlySet<string> = new Set(HTTP_METHODS);
const GUARD_NAMES: ReadonlySet<string> = new Set(["requireAdmin", "requireDiscordApiKey"]);

interface HandlerRecord {
  method: string;
  /** "list" entries (export { GET } / export { x as GET }) are always fail-closed-unguarded. */
  form: "function" | "const" | "list";
  guarded: boolean;
}

function hasExportModifier(node: ts.Node): boolean {
  if (!ts.canHaveModifiers(node)) return false;
  const modifiers = ts.getModifiers(node);
  return modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) ?? false;
}

/** Unwraps `(expr)`, `expr as T`, `expr satisfies T`, and `<T>expr` down to the real expression. */
function unwrapExpression(expression: ts.Expression): ts.Expression {
  let current = expression;
  while (true) {
    if (ts.isParenthesizedExpression(current)) {
      current = current.expression;
      continue;
    }
    if (ts.isAsExpression(current) || ts.isSatisfiesExpression(current) || ts.isTypeAssertionExpression(current)) {
      current = current.expression;
      continue;
    }
    return current;
  }
}

/**
 * True iff a `requireAdmin(...)` or `requireDiscordApiKey(...)` call expression exists anywhere
 * in this subtree (an `await` wrapping it doesn't matter — the CallExpression node itself is
 * still found by the recursive walk regardless of its parent).
 */
function bodyContainsGuardCall(node: ts.Node): boolean {
  let found = false;

  const visit = (current: ts.Node): void => {
    if (found) return;
    if (ts.isCallExpression(current) && ts.isIdentifier(current.expression) && GUARD_NAMES.has(current.expression.text)) {
      found = true;
      return;
    }
    ts.forEachChild(current, visit);
  };

  visit(node);
  return found;
}

/**
 * Parses `source` as a TypeScript source file and returns one record per exported HTTP-method
 * handler found among the file's top-level statements:
 *   (a) `export (async) function METHOD(...) { ... }` — guarded iff `node.body` contains a
 *       guard call.
 *   (b) `export const METHOD = ...` — the initializer is unwrapped through
 *       ParenthesizedExpression / AsExpression / SatisfiesExpression / TypeAssertion; if what's
 *       left is an ArrowFunction or FunctionExpression, guarded iff ITS body contains a guard
 *       call. Any other initializer (e.g. `withAuth(handler)`, a bare identifier, or no
 *       initializer at all) fails closed — reported unguarded, since this scanner has no way
 *       to look inside whatever that initializer actually resolves to.
 *   (c) `export { METHOD }` / `export { x as METHOD }` named re-exports — always fail closed
 *       (form "list"), since there is no body here to inspect at all.
 * `export default ...` is ignored: it can never be a Next.js route method handler.
 */
function collectHandlers(source: string): HandlerRecord[] {
  const sourceFile = ts.createSourceFile("route.ts", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const handlers: HandlerRecord[] = [];

  for (const statement of sourceFile.statements) {
    if (ts.isFunctionDeclaration(statement) && hasExportModifier(statement)) {
      const name = statement.name?.text;
      if (name && HTTP_METHOD_SET.has(name)) {
        handlers.push({ method: name, form: "function", guarded: statement.body ? bodyContainsGuardCall(statement.body) : false });
      }
      continue;
    }

    if (ts.isVariableStatement(statement) && hasExportModifier(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (!ts.isIdentifier(declaration.name) || !HTTP_METHOD_SET.has(declaration.name.text)) continue;

        const method = declaration.name.text;
        let guarded = false;

        if (declaration.initializer) {
          const unwrapped = unwrapExpression(declaration.initializer);
          if (ts.isArrowFunction(unwrapped) || ts.isFunctionExpression(unwrapped)) {
            guarded = bodyContainsGuardCall(unwrapped.body);
          }
          // Any other initializer form (a call like `withAuth(h)`, a bare identifier, etc.)
          // can't be followed by this scanner, so `guarded` stays false — fail closed.
        }

        handlers.push({ method, form: "const", guarded });
      }
      continue;
    }

    if (ts.isExportDeclaration(statement) && statement.exportClause && ts.isNamedExports(statement.exportClause)) {
      for (const specifier of statement.exportClause.elements) {
        const exportedName = specifier.name.text;
        if (HTTP_METHOD_SET.has(exportedName)) {
          handlers.push({ method: exportedName, form: "list", guarded: false });
        }
      }
    }

    // `export default ...` and anything else is not a route method handler; ignored.
  }

  return handlers;
}

/**
 * Returns every HTTP method name exported by this route file, in any recognized form: a direct
 * `export (async) function METHOD`, a direct `export const METHOD = ...`, or a `export { ... }`
 * named re-export list (including `export { x as METHOD }`). This is the single definition of
 * "what counts as an exported handler" for a route file — `route-coverage.test.ts` uses this
 * instead of a separate, looser check that could disagree with `findUnguardedHandlers`.
 */
export function findHandlerExports(source: string): string[] {
  return Array.from(new Set(collectHandlers(source).map((handler) => handler.method)));
}

/**
 * Returns the HTTP method names of every exported handler in `source` that is not verifiably
 * guarded. This is AST-based (via the TypeScript compiler API), not text matching: comments and
 * string/regex literal contents are never a concern because the parser treats them as opaque
 * leaf tokens the walk never descends into, and each handler's own body is exactly the subtree
 * the parser attached to it — never a sibling handler's body, and never a helper function that
 * merely sits nearby in the file.
 *
 * The guard check itself is still textual in one sense: a call to `requireAdmin(...)` or
 * `requireDiscordApiKey(...)` anywhere in a handler's own body counts, even inside a nested
 * function that is defined but never actually invoked within that body. The per-route unit
 * tests are what verify each handler's real runtime behaviour; this scan only verifies that a
 * guard call is present somewhere in the body's syntax tree.
 *
 * Anything this scanner cannot confidently resolve to an inspectable function body — an
 * initializer it doesn't recognize (e.g. `export const GET = withAuth(handler)`), or a method
 * only reachable through an `export { ... }` re-export list it has no way to follow — is
 * reported as unguarded (fail closed), never silently skipped.
 */
export function findUnguardedHandlers(source: string): string[] {
  const unguarded = new Set<string>();

  for (const handler of collectHandlers(source)) {
    if (handler.form === "list" || !handler.guarded) {
      unguarded.add(handler.method);
    }
  }

  return Array.from(unguarded);
}
