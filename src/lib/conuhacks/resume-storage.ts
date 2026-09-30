import mongoose from "mongoose";

/**
 * Registration app convention (HackDecouverte-registration-2025/my-app/lib/files/{resumeUpload,
 * resumeStore}.ts): only a PDF, verified by both its declared type and its magic bytes, is
 * accepted; it's stored in GridFS under _id = the application _id, and application.resume =
 * { id: <application id>, originalName, encoding: "utf-8", size, mimetype: "application/pdf" }.
 * Keeping the same shape and limits means the applicant's own dashboard keeps serving a resume
 * replaced here, and a forged or corrupted upload can't slip through as something it isn't.
 */
export const MAX_RESUME_BYTES = 4 * 1024 * 1024;
const PDF_MIME_TYPE = "application/pdf";
const PDF_SIGNATURE = "%PDF-";
/** PDF readers accept the header anywhere in the first 1 KB (some generators prepend bytes). */
const PDF_HEADER_WINDOW = 1024;

export interface ApplicationFileField {
  id: string | null;
  originalName: string | null;
  encoding: string;
  size: number;
  mimetype: string;
}

/** The registration schema's defaults for the resume. */
export const EMPTY_FILE_FIELD: ApplicationFileField = {
  id: null,
  originalName: null,
  encoding: "utf-8",
  size: 0,
  mimetype: "",
};

export type ResumeUploadResult =
  | { ok: true; bytes: Buffer; originalName: string; size: number }
  | { ok: false; status: 400 | 413; message: string };

/**
 * Accepts only a non-empty PDF (by declared type AND magic bytes) of at most MAX_RESUME_BYTES,
 * exactly like the registration app's own validateResumeUpload. The client's declared type is
 * used only for this early rejection, never trusted for storage: buildFileField always records
 * mimetype "application/pdf".
 */
export async function validateResumeUpload(value: FormDataEntryValue | null): Promise<ResumeUploadResult> {
  if (!value || typeof value === "string") {
    return { ok: false, status: 400, message: "A resume file is required" };
  }
  if (value.size === 0) {
    return { ok: false, status: 400, message: "The resume file is empty" };
  }
  if (value.size > MAX_RESUME_BYTES) {
    return { ok: false, status: 413, message: "The resume must be 4 MB or smaller" };
  }
  if (value.type !== PDF_MIME_TYPE) {
    return { ok: false, status: 400, message: "The resume must be a PDF" };
  }
  const bytes = Buffer.from(await value.arrayBuffer());
  if (bytes.subarray(0, PDF_HEADER_WINDOW).indexOf(PDF_SIGNATURE, 0, "latin1") === -1) {
    return { ok: false, status: 400, message: "The resume must be a PDF" };
  }
  return { ok: true, bytes, originalName: sanitizeFileName(value.name), size: bytes.length };
}

/** Last path segment, without control characters, quotes or backslashes, max 200 chars. */
export function sanitizeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "";
  const cleaned = Array.from(base)
    .filter((ch) => {
      const code = ch.charCodeAt(0);
      return code >= 0x20 && code !== 0x7f && ch !== '"' && ch !== "\\";
    })
    .join("")
    .trim()
    .slice(0, 200);
  return cleaned || "resume.pdf";
}

export interface UploadedFile {
  originalName: string;
  size: number;
  bytes: Buffer;
}

interface WritableLike {
  once(event: "finish" | "error", listener: (...args: unknown[]) => void): unknown;
  end(chunk: Buffer): unknown;
}

/** The part of mongodb's GridFSBucket this module uses (lets tests pass a fake). */
export interface FileBucket {
  find(filter: { _id: mongoose.Types.ObjectId }): { toArray(): Promise<unknown[]> };
  delete(id: mongoose.Types.ObjectId): Promise<void>;
  openUploadStreamWithId(
    id: mongoose.Types.ObjectId,
    filename: string,
    options: { metadata: Record<string, unknown> },
  ): WritableLike;
}

export function applicationFileId(applicationId: string): mongoose.Types.ObjectId {
  return new mongoose.Types.ObjectId(applicationId);
}

/** mimetype is always "application/pdf": a client-declared type is never trusted for storage. */
export function buildFileField(applicationId: string, file: Pick<UploadedFile, "originalName" | "size">): ApplicationFileField {
  return { id: applicationId, originalName: file.originalName, encoding: "utf-8", size: file.size, mimetype: PDF_MIME_TYPE };
}

function isFileNotFoundError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /not found/i.test(message);
}

/** Best-effort delete: a file that's already gone (or never existed) is not an error. */
async function deleteIfExists(bucket: FileBucket, id: mongoose.Types.ObjectId): Promise<void> {
  try {
    await bucket.delete(id);
  } catch (error) {
    if (isFileNotFoundError(error)) return;
    console.error("[resume-storage] Failed to remove a resume file during cleanup:", error);
  }
}

export async function replaceApplicationFile(
  bucket: FileBucket,
  applicationId: string,
  file: UploadedFile,
): Promise<ApplicationFileField> {
  const id = applicationFileId(applicationId);
  const field = buildFileField(applicationId, file);
  const filename = field.originalName ?? "resume.pdf";

  const existing = await bucket.find({ _id: id }).toArray();
  if (existing.length > 0) {
    await bucket.delete(id);
  }

  try {
    await new Promise<void>((resolve, reject) => {
      // GridFS metadata mirrors the registration app's (its IFile, with an empty url).
      const stream = bucket.openUploadStreamWithId(id, filename, { metadata: { ...field, url: "" } });
      stream.once("finish", () => resolve());
      stream.once("error", (error) => reject(error));
      stream.end(file.bytes);
    });
  } catch (error) {
    // The write failed partway through, possibly after the old file (if any) was already
    // deleted above. Don't leave a partial file behind under this id, and don't let a missing
    // (already-deleted) file mask the real failure being propagated to the caller.
    await deleteIfExists(bucket, id);
    throw error;
  }

  return field;
}

export async function deleteApplicationFile(bucket: FileBucket, applicationId: string): Promise<boolean> {
  const id = applicationFileId(applicationId);
  const existing = await bucket.find({ _id: id }).toArray();
  if (existing.length === 0) return false;
  await bucket.delete(id);
  return true;
}
