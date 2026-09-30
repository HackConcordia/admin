import { hashPassword, validateNewPassword } from "./password";

export interface SeedAdminInput {
  email?: string;
  firstName?: string;
  lastName?: string;
  password?: string;
}

export interface SeedAdminDocument {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  isSuperAdmin: true;
  assignedApplications: string[];
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Builds the `admins` document for the first super admin (contract C6: bcrypt cost 12). Pure apart from hashing. */
export async function buildSuperAdminDocument(
  input: SeedAdminInput,
  hash: (plain: string) => Promise<string> = hashPassword,
): Promise<SeedAdminDocument> {
  const email = (input.email ?? "").trim().toLowerCase();
  if (!EMAIL_PATTERN.test(email)) {
    throw new Error("SEED_ADMIN_EMAIL must be a valid email address");
  }

  const firstName = (input.firstName ?? "").trim();
  const lastName = (input.lastName ?? "").trim();
  if (!firstName || !lastName) {
    throw new Error("SEED_ADMIN_FIRST_NAME and SEED_ADMIN_LAST_NAME are required");
  }

  const passwordError = validateNewPassword(input.password);
  if (passwordError) {
    throw new Error(`SEED_ADMIN_PASSWORD: ${passwordError}`);
  }

  return {
    firstName,
    lastName,
    email,
    password: await hash(input.password as string),
    isSuperAdmin: true,
    assignedApplications: [],
  };
}
