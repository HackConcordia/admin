/**
 * Creates the first super admin in the database named by --db. Never prints the password or hash.
 *
 *   read -rs -p "MONGODB_URI: " MONGODB_URI && export MONGODB_URI && echo
 *   read -rs -p "Password: " SEED_ADMIN_PASSWORD && export SEED_ADMIN_PASSWORD && echo
 *   SEED_ADMIN_EMAIL=organizer@example.com SEED_ADMIN_FIRST_NAME=Ada SEED_ADMIN_LAST_NAME=Lovelace \
 *     npm run seed:super-admin -- --db=<XI database name>
 */
import mongoose from "mongoose";

import { buildSuperAdminDocument } from "../src/lib/seed-admin";

const DB_FLAG = "--db=";

async function main(): Promise<void> {
  const expectedDb = process.argv.find((arg) => arg.startsWith(DB_FLAG))?.slice(DB_FLAG.length);
  if (!expectedDb) throw new Error("Pass --db=<database name> to confirm the target database");

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is required (include the database name in the URI path)");

  const doc = await buildSuperAdminDocument({
    email: process.env.SEED_ADMIN_EMAIL,
    firstName: process.env.SEED_ADMIN_FIRST_NAME,
    lastName: process.env.SEED_ADMIN_LAST_NAME,
    password: process.env.SEED_ADMIN_PASSWORD,
  });

  await mongoose.connect(uri);
  try {
    const db = mongoose.connection.db;
    if (!db) throw new Error("MongoDB connection has no database handle");
    if (db.databaseName !== expectedDb) {
      throw new Error(`Connected to "${db.databaseName}", expected "${expectedDb}". Nothing was written.`);
    }

    const admins = db.collection("admins");
    if (await admins.findOne({ email: doc.email })) {
      throw new Error(`An admin with email ${doc.email} already exists in ${db.databaseName}. Nothing was written.`);
    }

    const result = await admins.insertOne({ ...doc });
    console.log(`Created super admin ${doc.email} (${String(result.insertedId)}) in ${db.databaseName}`);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
