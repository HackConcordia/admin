import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import mongoose from "mongoose";
import { GridFSBucket } from "mongodb";

import connectMongoDB from "@/repository/mongoose";

export const GET = async (req: NextRequest, { params }: { params: Promise<{ fileId: string }> }) => {
  try {
    const { fileId } = await params;

    if (!fileId) {
      return new NextResponse("Invalid fileId", { status: 400 });
    }

    await connectMongoDB();

    if (!mongoose.connection.db) {
      return new NextResponse("Database not connected", { status: 500 });
    }

    const gridFSBucket = new GridFSBucket(mongoose.connection.db);

    const objectId = new mongoose.Types.ObjectId(fileId);

    const files = await gridFSBucket.find({ _id: objectId }).toArray();
    if (!files.length) {
      return new NextResponse("File not found", { status: 404 });
    }

    const file = files[0];
    const downloadStream = gridFSBucket.openDownloadStream(objectId);

    const stream = new ReadableStream({
      start(controller) {
        downloadStream.on("data", (chunk) => {
          controller.enqueue(new Uint8Array(chunk));
        });
        downloadStream.on("end", () => controller.close());
        downloadStream.on("error", (err) => controller.error(err));
      },
    });

    // ----- Filename handling (ASCII-safe + UTF-8) -----
    const originalName = file.filename || "resume.pdf";
    const fallbackName = "resume.pdf"; // ASCII only
    const utf8Name = encodeURIComponent(originalName);

    const contentDisposition =
      `inline; filename="${fallbackName}"; filename*=UTF-8''${utf8Name}`;

    return new NextResponse(stream, {
      headers: {
        "Content-Type": file.metadata?.mimetype || "application/pdf",
        "Content-Disposition": contentDisposition,
        "Accept-Ranges": "bytes",
      },
    });
  } catch (error) {
    console.error("Error during file download:", error);
    return new NextResponse("Failed to retrieve file", { status: 500 });
  }
};
