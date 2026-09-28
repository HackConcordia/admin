/**
 * One-off, idempotent migration (contract C6): bcrypt-hash every Admin password
 * that is not already a bcrypt hash. Dry run unless --apply is passed.
 *
 *   MONGODB_URI="mongodb+srv://.../Registration_Website_2026?..." npm run migrate:hash-admin-passwords
 *   MONGODB_URI="mongodb+srv://.../Registration_Website_2026?..." npm run migrate:hash-admin-passwords -- --apply
 *
 * Plaintext passwords are held in memory only and never printed.
 */
import mongoose from "mongoose";

import { hashPassword } from "../src/lib/password";
import { planPasswordMigration } from "../src/lib/password-migration";

async function main(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is required (include the database name in the URI path)");
  }
  const apply = process.argv.includes("--apply");

  await mongoose.connect(uri);
  try {
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error("MongoDB connection has no database handle");
    }

    const admins = db.collection("admins");
    const docs = await admins.find({}, { projection: { email: 1, password: 1 } }).toArray();
    const plan = await planPasswordMigration(docs, (plain) => hashPassword(plain));

    console.log(`Database:        ${db.databaseName}`);
    console.log(`Admins found:    ${docs.length}`);
    console.log(`Already hashed:  ${plan.alreadyHashed.length}`);
    console.log(`To hash:         ${plan.updates.length} ${plan.updates.map((u) => u.email).join(", ")}`);
    if (plan.invalid.length > 0) {
      console.warn(`Left untouched (missing/empty password): ${plan.invalid.join(", ")}`);
    }

    if (!apply) {
      console.log("Dry run only. Re-run with --apply to write changes.");
      return;
    }

    let modified = 0;
    for (const update of plan.updates) {
      // Compare-and-set: only overwrite if the stored value is still the plaintext we hashed.
      const result = await admins.updateOne(
        { _id: update._id, password: update.currentPassword } as Record<string, unknown>,
        { $set: { password: update.hashedPassword } },
      );
      modified += result.modifiedCount;
    }
    console.log(`Updated ${modified} of ${plan.updates.length} admins.`);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
