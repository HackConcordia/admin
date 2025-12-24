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

    // Convert Node Readable to Web ReadableStream
    const stream = new ReadableStream({
      start(controller) {
        downloadStream.on("data", (chunk) => controller.enqueue(chunk));
        downloadStream.on("end", () => controller.close());
        downloadStream.on("error", (err) => controller.error(err));
      },
      cancel() {
        downloadStream.destroy();
      },
    });

    // Use metadata.originalName first, then fall back to filename
    const originalName = file.metadata?.originalName || file.filename || "resume.pdf";
    const fallbackName = "resume.pdf";

    // Properly encode the filename for Content-Disposition header (RFC 5987)
    let utf8Name: string;
    try {
      // originalName is already a string, just encode it directly
      utf8Name = encodeURIComponent(originalName);
    } catch (error) {
      // Fallback if encoding fails
      utf8Name = encodeURIComponent(fallbackName);
    }

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
    console.error("Error retrieving file:", error);

    // Properly serialize error for JSON response
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    return new NextResponse(
      JSON.stringify({
        status: "error",
        message: "Error retrieving file",
        error: errorMessage,
        ...(errorStack && { stack: errorStack })
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
