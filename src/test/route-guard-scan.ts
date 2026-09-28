import ts from "typescript";

const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"] as const;
const HTTP_METHOD_SET: ReadonlySet<string> = new Set(HTTP_METHODS);
/** Guard name -> the module it must be imported (unaliased) from for a call to it to count. */
const GUARD_MODULES: ReadonlyMap<string, string> = new Map([["requireAdmin", "@/lib/require-admin"]]);

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

function hasDefaultModifier(node: ts.Node): boolean {
  if (!ts.canHaveModifiers(node)) return false;
  const modifiers = ts.getModifiers(node);
  return modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.DefaultKeyword) ?? false;
}

/**
 * Returns the set of guard names (from GUARD_MODULES) that this file actually imports, by their
 * real name, from the exact module the guard is defined in. A guard imported under an alias
 * (`import { requireAdmin as x }`) does not count — the alias fails closed, since the local
 * identifier `x` no longer matches the guard name a call site would need to use for
 * `bodyContainsGuardCall` to recognize it anyway, and this function never adds the alias itself
 * to the returned set. A same-named local function that merely shadows a guard (no such import
 * present at all) is never counted, since nothing here is added for it.
 */
function collectImportedGuardNames(sourceFile: ts.SourceFile): ReadonlySet<string> {
  const imported = new Set<string>();

  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement)) continue;
    if (!ts.isStringLiteral(statement.moduleSpecifier)) continue;

    const namedBindings = statement.importClause?.namedBindings;
    if (!namedBindings || !ts.isNamedImports(namedBindings)) continue;

    for (const element of namedBindings.elements) {
      // `element.propertyName` is set only for an aliased specifier (`{ requireAdmin as x }`);
      // an unaliased specifier (`{ requireAdmin }`) leaves it undefined and `element.name` is
      // the real imported name. Aliased imports are skipped entirely: fail closed.
      if (element.propertyName) continue;

      const importedName = element.name.text;
      const expectedModule = GUARD_MODULES.get(importedName);
      if (expectedModule && expectedModule === statement.moduleSpecifier.text) {
        imported.add(importedName);
      }
    }
  }

  return imported;
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
 * True iff a call expression to one of `importedGuardNames` exists anywhere in this subtree (an
 * `await` wrapping it doesn't matter — the CallExpression node itself is still found by the
 * recursive walk regardless of its parent). `importedGuardNames` is the file-level set from
 * `collectImportedGuardNames`, so a same-named local shadow (no matching import present) or a
 * call through an alias never counts.
 */
function bodyContainsGuardCall(node: ts.Node, importedGuardNames: ReadonlySet<string>): boolean {
  let found = false;

  const visit = (current: ts.Node): void => {
    if (found) return;
    if (ts.isCallExpression(current) && ts.isIdentifier(current.expression) && importedGuardNames.has(current.expression.text)) {
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
 * `export default ...` is ignored (checked via the DefaultKeyword modifier, not just the absence
 * of a matching name): it can never be a Next.js route method handler, and a default-exported
 * function that happens to be named e.g. `GET` must not be mistaken for one.
 */
function collectHandlers(source: string): HandlerRecord[] {
  const sourceFile = ts.createSourceFile("route.ts", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const handlers: HandlerRecord[] = [];
  const importedGuardNames = collectImportedGuardNames(sourceFile);

  for (const statement of sourceFile.statements) {
    if (ts.isFunctionDeclaration(statement) && hasExportModifier(statement) && !hasDefaultModifier(statement)) {
      const name = statement.name?.text;
      if (name && HTTP_METHOD_SET.has(name)) {
        handlers.push({
          method: name,
          form: "function",
          guarded: statement.body ? bodyContainsGuardCall(statement.body, importedGuardNames) : false,
        });
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
            guarded = bodyContainsGuardCall(unwrapped.body, importedGuardNames);
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
 * The guard check itself is still textual in one sense: a call to `requireAdmin(...)` anywhere
 * in a handler's own body counts, even inside a nested function that is defined but never
 * actually invoked within that body. The per-route unit
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
