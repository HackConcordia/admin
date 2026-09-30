import mongoose from "mongoose";
import { GridFSBucket } from "mongodb";

/** The default GridFS bucket ("fs") of the current connection. Call connectMongoDB() first. */
export function getGridFSBucket(): GridFSBucket {
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error("Database connection is not established");
  }
  return new GridFSBucket(db);
}
