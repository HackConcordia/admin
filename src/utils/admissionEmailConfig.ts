// Minimal email helpers to unblock status updates.
// Replace implementations with real email service integration when ready.

export async function sendAdmittedEmail(email: string, firstName: string, lastName: string): Promise<boolean> {
  console.log(`[Email] Admitted -> to: ${email}, name: ${firstName} ${lastName}`);
  return true;
}

export async function sendWaitlistedEmail(email: string, firstName: string, lastName: string): Promise<boolean> {
  console.log(`[Email] Waitlisted -> to: ${email}, name: ${firstName} ${lastName}`);
  return true;
}

export async function sendRefusedEmail(email: string, firstName: string, lastName: string): Promise<boolean> {
  console.log(`[Email] Refused -> to: ${email}, name: ${firstName} ${lastName}`);
  return true;
}
