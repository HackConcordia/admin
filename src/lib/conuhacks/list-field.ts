/**
 * Multi-select answers travel as a JSON-encoded string ('["english","french"]'), which Mongoose
 * stores as a one-element array (the admin app reads that shape). This normalizes every shape the
 * app meets (JSON string, one-element array of JSON, plain array, bare value) to a string array.
 */
export function parseListField(value: unknown): string[] {
  const fromString = (text: string): string[] => {
    const trimmed = text.trim();
    if (trimmed === "") return [];
    if (!trimmed.startsWith("[")) return [trimmed];
    try {
      const parsed: unknown = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === "string") : [];
    } catch {
      return [];
    }
  };
  if (typeof value === "string") return fromString(value);
  if (Array.isArray(value)) return value.flatMap((entry) => (typeof entry === "string" ? fromString(entry) : []));
  return [];
}

export const listIncludes = (value: unknown, item: string): boolean => parseListField(value).includes(item);
