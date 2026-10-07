/**
 * A log-safe description of an error: its name and Mongo/provider error code only. Messages are
 * left out because driver and SendGrid errors can echo document values (an E11000 on CheckIn
 * includes the applicant's email).
 */
export function describeError(error: unknown): string {
  if (!(error instanceof Error)) return "Unknown error";

  const code = (error as { code?: unknown }).code;
  return code === undefined ? error.name : `${error.name} (code ${String(code)})`;
}
