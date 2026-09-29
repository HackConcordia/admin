import { Writable } from "node:stream";

import { describe, expect, it, vi } from "vitest";

import {
  MAX_RESUME_BYTES,
  applicationFileId,
  deleteApplicationFile,
  replaceApplicationFile,
  sanitizeFileName,
  validateResumeUpload,
} from "@/lib/conuhacks/resume-storage";

const APP_ID = "64c000000000000000000001";

function fakeBucket(existing: unknown[] = [], options: { failWrite?: boolean } = {}) {
  const written: Buffer[] = [];
  const bucket = {
    find: vi.fn((_filter: unknown) => ({ toArray: async () => existing })),
    delete: vi.fn(async (_id: unknown) => undefined),
    openUploadStreamWithId: vi.fn(
      (_id: unknown, _filename: string, _options: unknown) =>
        new Writable({
          write(chunk, _encoding, callback) {
            if (options.failWrite) {
              callback(new Error("simulated GridFS write failure"));
              return;
            }
            written.push(Buffer.from(chunk));
            callback();
          },
        }),
    ),
  };
  return { bucket, written };
}

const VALID_PDF = Buffer.from("%PDF-1.4\n%rest of a pdf");

function pdfFile(bytes: Buffer = VALID_PDF, name = "cv.pdf", type = "application/pdf") {
  return new File([bytes], name, { type });
}

const UPLOAD = { size: 8, bytes: Buffer.from("%PDF-1.4"), originalName: "cv.pdf" };

describe("validateResumeUpload", () => {
  it("accepts a PDF within the size limit", async () => {
    const result = await validateResumeUpload(pdfFile());
    expect(result).toEqual({ ok: true, bytes: VALID_PDF, originalName: "cv.pdf", size: VALID_PDF.length });
  });

  it("finds the %PDF- signature anywhere in the first 1 KB", async () => {
    const padded = Buffer.concat([Buffer.alloc(500, 0x20), Buffer.from("%PDF-1.7 trailing content")]);
    const result = await validateResumeUpload(pdfFile(padded));
    expect(result.ok).toBe(true);
  });

  it("rejects when no file is provided", async () => {
    expect(await validateResumeUpload(null)).toEqual({ ok: false, status: 400, message: "A resume file is required" });
    expect(await validateResumeUpload("not-a-file")).toEqual({ ok: false, status: 400, message: "A resume file is required" });
  });

  it("rejects a 0-byte file", async () => {
    expect(await validateResumeUpload(pdfFile(Buffer.alloc(0)))).toEqual({
      ok: false,
      status: 400,
      message: "The resume file is empty",
    });
  });

  it("rejects a file over the 4 MiB limit", async () => {
    const big = new File([Buffer.alloc(MAX_RESUME_BYTES + 1, 0x41)], "cv.pdf", { type: "application/pdf" });
    expect(await validateResumeUpload(big)).toEqual({ ok: false, status: 413, message: "The resume must be 4 MB or smaller" });
  });

  it("accepts exactly 1 byte and exactly the 4 MiB limit", async () => {
    const oneByte = new File([Buffer.from("%")], "cv.pdf", { type: "application/pdf" });
    // A 1-byte file can never contain the "%PDF-" signature, so it's rejected for content, not size.
    expect(await validateResumeUpload(oneByte)).toEqual({ ok: false, status: 400, message: "The resume must be a PDF" });

    const exactlyMax = new File([Buffer.concat([Buffer.from("%PDF-"), Buffer.alloc(MAX_RESUME_BYTES - 5, 0x41)])], "cv.pdf", {
      type: "application/pdf",
    });
    expect((await validateResumeUpload(exactlyMax)).ok).toBe(true);
  });

  it("rejects a declared type other than application/pdf, ignoring its content", async () => {
    const docx = pdfFile(VALID_PDF, "cv.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    expect(await validateResumeUpload(docx)).toEqual({ ok: false, status: 400, message: "The resume must be a PDF" });
  });

  it("rejects a PDF-typed file whose content isn't actually a PDF (magic bytes)", async () => {
    const fakePdf = pdfFile(Buffer.from("this is not a pdf"), "cv.pdf", "application/pdf");
    expect(await validateResumeUpload(fakePdf)).toEqual({ ok: false, status: 400, message: "The resume must be a PDF" });
  });

  it("sanitizes the original name", async () => {
    const result = await validateResumeUpload(pdfFile(VALID_PDF, 'folder\\evil"name.pdf'));
    expect(result).toEqual({ ok: true, bytes: VALID_PDF, originalName: "evilname.pdf", size: VALID_PDF.length });
  });
});

describe("sanitizeFileName", () => {
  it("keeps only the last path segment", () => {
    expect(sanitizeFileName("C:\\Users\\me\\Documents\\resume.pdf")).toBe("resume.pdf");
    expect(sanitizeFileName("../../etc/resume.pdf")).toBe("resume.pdf");
  });

  it("strips control characters and quotes", () => {
    expect(sanitizeFileName('re"sume.pdf')).toBe("resume.pdf");
    expect(sanitizeFileName("resume\u0007.pdf")).toBe("resume.pdf");
  });

  it("treats a backslash as a path separator, like a Windows path", () => {
    expect(sanitizeFileName("folder\\resume.pdf")).toBe("resume.pdf");
  });

  it("caps the name at 200 characters", () => {
    const longName = `${"a".repeat(250)}.pdf`;
    expect(sanitizeFileName(longName).length).toBe(200);
  });

  it("falls back to resume.pdf when nothing is left", () => {
    expect(sanitizeFileName("")).toBe("resume.pdf");
    expect(sanitizeFileName("///")).toBe("resume.pdf");
  });
});

describe("replaceApplicationFile", () => {
  it("stores the file under the application id, like the registration app, with mimetype forced to application/pdf", async () => {
    const { bucket, written } = fakeBucket();

    const field = await replaceApplicationFile(bucket, APP_ID, UPLOAD);

    expect(field).toEqual({ id: APP_ID, originalName: "cv.pdf", encoding: "utf-8", size: 8, mimetype: "application/pdf" });
    const [id, filename, options] = bucket.openUploadStreamWithId.mock.calls[0];
    expect(String(id)).toBe(APP_ID);
    expect(filename).toBe("cv.pdf");
    expect(options).toEqual({ metadata: { ...field, url: "" } });
    expect(Buffer.concat(written).toString()).toBe("%PDF-1.4");
    expect(bucket.delete).not.toHaveBeenCalled();
  });

  it("deletes the file already stored under that id first", async () => {
    const { bucket } = fakeBucket([{ _id: APP_ID }]);

    await replaceApplicationFile(bucket, APP_ID, UPLOAD);

    expect(String(bucket.delete.mock.calls[0][0])).toBe(APP_ID);
  });

  it("ignores the caller's declared mime type entirely: mimetype is always application/pdf", async () => {
    const { bucket } = fakeBucket();
    const field = await replaceApplicationFile(bucket, APP_ID, { ...UPLOAD });
    expect(field.mimetype).toBe("application/pdf");
  });

  it("deletes the partial file left under this id when the GridFS write fails, and rethrows", async () => {
    const { bucket } = fakeBucket([], { failWrite: true });

    await expect(replaceApplicationFile(bucket, APP_ID, UPLOAD)).rejects.toThrow("simulated GridFS write failure");
    expect(String(bucket.delete.mock.calls[0][0])).toBe(APP_ID);
  });

  it("doesn't let a 'not found' cleanup delete mask the real write failure", async () => {
    const { bucket } = fakeBucket([], { failWrite: true });
    bucket.delete.mockRejectedValueOnce(new Error("File not found"));

    await expect(replaceApplicationFile(bucket, APP_ID, UPLOAD)).rejects.toThrow("simulated GridFS write failure");
  });
});

describe("deleteApplicationFile", () => {
  it("deletes the stored file and reports whether there was one", async () => {
    const present = fakeBucket([{ _id: APP_ID }]);
    expect(await deleteApplicationFile(present.bucket, APP_ID)).toBe(true);
    expect(String(present.bucket.delete.mock.calls[0][0])).toBe(APP_ID);

    const missing = fakeBucket([]);
    expect(await deleteApplicationFile(missing.bucket, APP_ID)).toBe(false);
    expect(missing.bucket.delete).not.toHaveBeenCalled();
  });
});

describe("applicationFileId", () => {
  it("builds the GridFS id from the application id", () => {
    expect(String(applicationFileId(APP_ID))).toBe(APP_ID);
  });
});
