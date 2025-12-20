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

    if (!mongoose.connection.db) return;

    const gridFSBucket = new GridFSBucket(mongoose.connection.db);
    const objectId = new mongoose.Types.ObjectId(fileId);

    // Check if the file exists
    const files = await gridFSBucket.find({ _id: objectId }).toArray();

    if (files.length === 0) {
      return new NextResponse("File not found", { status: 404 });
    }

    const file = files[0];
    const downloadStream = gridFSBucket.openDownloadStream(objectId);

    // Convert Node.js Readable stream to Web Streams API ReadableStream
    const stream = new ReadableStream({
      start(controller) {
        downloadStream.on("data", (chunk) => controller.enqueue(chunk));
        downloadStream.on("end", () => controller.close());
        downloadStream.on("error", (err) => controller.error(err));
      },
    });

    // Provide default values for Content-Type and Content-Disposition if metadata is undefined
    const contentType = file.metadata?.mimetype || "application/octet-stream";
    const filename = file.filename || "file";

    return new NextResponse(stream, {
      headers: {
        "Content-Type": contentType, // Adjust according to the file type
        "Content-Disposition": `inline; filename="${filename}"`, // Display file in the browser with the original filename
      },
    });
  } catch (error) {
    console.error("Error during file download:", error);

    return new NextResponse("Failed to retrieve file", { status: 500 });
  }
};
