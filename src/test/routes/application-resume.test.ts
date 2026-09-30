import { Writable } from "node:stream";

import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

import { createFindByIdMock } from "@/test/admin-lookup";
import { MAX_RESUME_BYTES } from "@/lib/conuhacks/resume-storage";

const applicationModel = vi.hoisted(() => ({ findById: vi.fn(), findByIdAndUpdate: vi.fn() }));
const storage = vi.hoisted(() => ({ bucket: null as unknown }));

vi.mock("@/repository/mongoose", () => ({ default: vi.fn() }));
vi.mock("@/repository/models/admin", () => ({ default: { findById: createFindByIdMock() } }));
vi.mock("@/repository/models/application", () => ({ default: applicationModel }));
vi.mock("@/lib/gridfs", () => ({ getGridFSBucket: () => storage.bucket }));

import * as resume from "@/app/api/(group)/application/[applicationId]/resume/route";
import { adminCookie, routeContext } from "@/test/http";

const APP_ID = "64c000000000000000000001";

function fakeBucket(existing: unknown[] = [], options: { failWrite?: boolean } = {}) {
  const bucket = {
    find: vi.fn((_filter: unknown) => ({ toArray: async () => existing })),
    delete: vi.fn(async (_id: unknown) => undefined),
    openUploadStreamWithId: vi.fn(
      (_id: unknown, _filename: string, _options: unknown) =>
        new Writable({
          write(_chunk, _encoding, callback) {
            if (options.failWrite) {
              callback(new Error("simulated GridFS write failure"));
              return;
            }
            callback();
          },
        }),
    ),
  };
  storage.bucket = bucket;
  return bucket;
}

async function uploadRequest(applicationId: string, content: string | Buffer, filename: string, type: string) {
  const form = new FormData();
  form.append("resume", new Blob([content], { type }), filename);
  return new NextRequest(new URL(`/api/application/${applicationId}/resume`, "http://localhost"), {
    method: "POST",
    headers: { cookie: await adminCookie() },
    body: form,
  });
}

describe("POST /api/application/[applicationId]/resume", () => {
  it("stores the resume under the application id with registration-format metadata", async () => {
    const bucket = fakeBucket();
    applicationModel.findById.mockResolvedValue({ _id: APP_ID, resume: { id: null, size: 0 } });
    applicationModel.findByIdAndUpdate.mockResolvedValue({ _id: APP_ID });

    const res = await resume.POST(await uploadRequest(APP_ID, "%PDF-1.4", "cv.pdf", "application/pdf"), routeContext({ applicationId: APP_ID }));

    expect(res.status).toBe(200);
    expect(String(bucket.openUploadStreamWithId.mock.calls[0][0])).toBe(APP_ID);
    expect(applicationModel.findByIdAndUpdate).toHaveBeenCalledWith(
      APP_ID,
      { $set: { resume: { id: APP_ID, originalName: "cv.pdf", encoding: "utf-8", size: 8, mimetype: "application/pdf" } } },
      { new: true },
    );
  });

  it("sanitizes a hostile original name before storing it", async () => {
    const bucket = fakeBucket();
    applicationModel.findById.mockResolvedValue({ _id: APP_ID, resume: { id: null, size: 0 } });
    applicationModel.findByIdAndUpdate.mockResolvedValue({ _id: APP_ID });

    const res = await resume.POST(
      await uploadRequest(APP_ID, "%PDF-1.4", 'folder\\evil"name.pdf', "application/pdf"),
      routeContext({ applicationId: APP_ID }),
    );

    expect(res.status).toBe(200);
    expect(bucket.openUploadStreamWithId.mock.calls[0][1]).toBe("evilname.pdf");
  });

  it("rejects a file type the registration app doesn't accept (DOCX)", async () => {
    const bucket = fakeBucket();
    applicationModel.findById.mockResolvedValue({ _id: APP_ID, resume: { id: null, size: 0 } });

    const res = await resume.POST(
      await uploadRequest(APP_ID, "docx content", "cv.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
      routeContext({ applicationId: APP_ID }),
    );

    expect(res.status).toBe(400);
    expect((await res.json()).message).toBe("The resume must be a PDF");
    expect(bucket.openUploadStreamWithId).not.toHaveBeenCalled();
  });

  it("rejects a 0-byte file", async () => {
    fakeBucket();
    applicationModel.findById.mockResolvedValue({ _id: APP_ID, resume: { id: null, size: 0 } });

    const res = await resume.POST(await uploadRequest(APP_ID, "", "cv.pdf", "application/pdf"), routeContext({ applicationId: APP_ID }));

    expect(res.status).toBe(400);
    expect((await res.json()).message).toBe("The resume file is empty");
  });

  it("rejects a file over the 4 MiB limit", async () => {
    fakeBucket();
    applicationModel.findById.mockResolvedValue({ _id: APP_ID, resume: { id: null, size: 0 } });

    const oversized = Buffer.alloc(MAX_RESUME_BYTES + 1, 0x41);
    const res = await resume.POST(await uploadRequest(APP_ID, oversized, "cv.pdf", "application/pdf"), routeContext({ applicationId: APP_ID }));

    expect(res.status).toBe(413);
    expect((await res.json()).message).toBe("The resume must be 4 MB or smaller");
  });

  it("rejects a PDF-typed file whose bytes don't start with the %PDF- signature within the first 1 KB", async () => {
    fakeBucket();
    applicationModel.findById.mockResolvedValue({ _id: APP_ID, resume: { id: null, size: 0 } });

    const res = await resume.POST(
      await uploadRequest(APP_ID, "not actually a pdf file", "cv.pdf", "application/pdf"),
      routeContext({ applicationId: APP_ID }),
    );

    expect(res.status).toBe(400);
    expect((await res.json()).message).toBe("The resume must be a PDF");
  });

  it("cleans up the partial file and clears the resume field when the GridFS write fails", async () => {
    const bucket = fakeBucket([], { failWrite: true });
    applicationModel.findById.mockResolvedValue({ _id: APP_ID, resume: { id: null, size: 0 } });
    applicationModel.findByIdAndUpdate.mockResolvedValue({ _id: APP_ID });

    const res = await resume.POST(await uploadRequest(APP_ID, "%PDF-1.4", "cv.pdf", "application/pdf"), routeContext({ applicationId: APP_ID }));

    expect(res.status).toBe(500);
    expect((await res.json()).error).toBeNull();
    expect(String(bucket.delete.mock.calls[0][0])).toBe(APP_ID);
    expect(applicationModel.findByIdAndUpdate).toHaveBeenCalledWith(
      APP_ID,
      { $set: { resume: { id: null, originalName: null, encoding: "utf-8", size: 0, mimetype: "" } } },
    );
  });

  it("returns 400 for an invalid application id before touching the database", async () => {
    fakeBucket();

    const res = await resume.POST(await uploadRequest("not-an-id", "%PDF-1.4", "cv.pdf", "application/pdf"), routeContext({ applicationId: "not-an-id" }));

    expect(res.status).toBe(400);
    expect(applicationModel.findById).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/application/[applicationId]/resume", () => {
  it("removes the stored file and resets the field to the registration defaults", async () => {
    const bucket = fakeBucket([{ _id: APP_ID }]);
    applicationModel.findById.mockResolvedValue({ _id: APP_ID, resume: { id: APP_ID, size: 8 } });
    applicationModel.findByIdAndUpdate.mockResolvedValue({});

    const res = await resume.DELETE(
      new NextRequest(new URL(`/api/application/${APP_ID}/resume`, "http://localhost"), {
        method: "DELETE",
        headers: { cookie: await adminCookie() },
      }),
      routeContext({ applicationId: APP_ID }),
    );

    expect(res.status).toBe(200);
    expect(String(bucket.delete.mock.calls[0][0])).toBe(APP_ID);
    expect(applicationModel.findByIdAndUpdate).toHaveBeenCalledWith(
      APP_ID,
      { $set: { resume: { id: null, originalName: null, encoding: "utf-8", size: 0, mimetype: "" } } },
      { new: true },
    );
  });

  it("returns 400 for an invalid application id before touching the database", async () => {
    fakeBucket();

    const res = await resume.DELETE(
      new NextRequest(new URL("/api/application/not-an-id/resume", "http://localhost"), {
        method: "DELETE",
        headers: { cookie: await adminCookie() },
      }),
      routeContext({ applicationId: "not-an-id" }),
    );

    expect(res.status).toBe(400);
    expect(applicationModel.findById).not.toHaveBeenCalled();
  });
});
