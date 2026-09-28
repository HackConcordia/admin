import { isBcryptHash } from "./password";

export interface StoredAdmin {
  _id: unknown;
  email?: unknown;
  password?: unknown;
}

export interface PlannedPasswordUpdate {
  _id: unknown;
  email: string;
  currentPassword: string;
  hashedPassword: string;
}

export interface PasswordMigrationPlan {
  updates: PlannedPasswordUpdate[];
  alreadyHashed: string[];
  invalid: string[];
}

/** Pure planning step for the C6 migration. Never mutates its input. */
export async function planPasswordMigration(
  admins: readonly StoredAdmin[],
  hash: (plain: string) => Promise<string>,
): Promise<PasswordMigrationPlan> {
  const updates: PlannedPasswordUpdate[] = [];
  const alreadyHashed: string[] = [];
  const invalid: string[] = [];

  for (const admin of admins) {
    const label = typeof admin.email === "string" && admin.email ? admin.email : String(admin._id);

    if (isBcryptHash(admin.password)) {
      alreadyHashed.push(label);
      continue;
    }

    if (typeof admin.password !== "string" || admin.password.length === 0) {
      invalid.push(label);
      continue;
    }

    updates.push({
      _id: admin._id,
      email: label,
      currentPassword: admin.password,
      hashedPassword: await hash(admin.password),
    });
  }

  return { updates, alreadyHashed, invalid };
}
