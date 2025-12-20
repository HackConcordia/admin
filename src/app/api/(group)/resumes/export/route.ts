import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import mongoose from "mongoose";
import { GridFSBucket } from "mongodb";
import archiver from "archiver";
import { Readable } from "stream";

import { sendErrorResponse } from "@/repository/response";
import connectMongoDB from "@/repository/mongoose";
import Application from "@/repository/models/application";
import { COOKIE_NAME, verifyAuthToken } from "@/lib/auth-token";

export const GET = async (req: NextRequest) => {
  const token = req.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    return sendErrorResponse("Unauthorized", {}, 401);
  }

  const payload = await verifyAuthToken(token);
  if (!payload) {
    return sendErrorResponse("Unauthorized", {}, 401);
  }

  // Check if user is SuperAdmin
  if (!payload.isSuperAdmin) {
    return sendErrorResponse("Forbidden: Only SuperAdmins can export resumes", {}, 403);
  }

  // Get status filter from query params
  const { searchParams } = new URL(req.url);
  const statusFilter = searchParams.get("statusFilter") || "all";

  // Validate status filter
  if (!["all", "admitted", "confirmed"].includes(statusFilter)) {
    return sendErrorResponse("Invalid status filter. Must be: all, admitted, or confirmed", {}, 400);
  }

  try {
    await connectMongoDB();

    // Build query based on status filter
    let statusQuery: any = {};
    if (statusFilter === "all") {
      statusQuery = { status: { $in: ["Submitted", "Admitted", "Waitlisted", "Confirmed", "CheckedIn"] } };
    } else if (statusFilter === "admitted") {
      statusQuery = { status: "Admitted" };
    } else if (statusFilter === "confirmed") {
      statusQuery = { status: "Confirmed" };
    }

    // Query applications with resumes - lean() for better performance
    const applications = await Application.find({
      ...statusQuery,
      "resume.id": { $exists: true, $nin: [null, ""] },
    })
      .select("firstName lastName resume.id _id")
      .lean()
      .exec();

    if (!applications || applications.length === 0) {
      return sendErrorResponse("No resumes found for the selected filter", {}, 404);
    }

    console.log(`Found ${applications.length} applications with resumes for filter: ${statusFilter}`);

    if (!mongoose.connection.db) {
      return sendErrorResponse("Database connection is not established", {}, 500);
    }

    const gridFSBucket = new GridFSBucket(mongoose.connection.db);

    // Create a ZIP archive
    const archive = archiver("zip", {
      zlib: { level: 6 }, // Balanced compression (faster than level 9)
    });

    // Collect chunks for the ZIP file
    const chunks: Buffer[] = [];

    // Track statistics
    let successCount = 0;
    let failCount = 0;

    // Handle archive warnings
    archive.on("warning", (err) => {
      if (err.code === "ENOENT") {
        console.warn("Archive warning:", err);
      } else {
        throw err;
      }
    });

    // Handle archive errors
    archive.on("error", (err) => {
      console.error("Archive error:", err);
      throw err;
    });

    // Collect data chunks
    archive.on("data", (chunk) => {
      chunks.push(chunk);
    });

    // Process files with concurrency control for better performance
    const processFile = async (application: any) => {
      try {
        const resumeId = application.resume?.id;
        if (!resumeId) {
          console.log(`Skipping application ${application._id}: no resume ID`);
          failCount++;
          return null;
        }

        const objectId = new mongoose.Types.ObjectId(resumeId);

        // Create filename: FirstName_LastName_ApplicationId.pdf
        const firstName = application.firstName?.replace(/[^a-zA-Z0-9]/g, "_") || "Unknown";
        const lastName = application.lastName?.replace(/[^a-zA-Z0-9]/g, "_") || "Unknown";
        const filename = `${firstName}_${lastName}_${application._id}.pdf`;

        return new Promise<string | null>((resolve) => {
          try {
            // Check if file exists first to avoid stream errors
            gridFSBucket
              .find({ _id: objectId })
              .toArray()
              .then((files) => {
                if (files.length === 0) {
                  console.log(`Resume not found in GridFS for application ${application._id}`);
                  failCount++;
                  resolve(null);
                  return;
                }

                const downloadStream = gridFSBucket.openDownloadStream(objectId);

                let errorHandled = false;

                // Handle stream errors
                downloadStream.on("error", (err) => {
                  if (!errorHandled) {
                    errorHandled = true;
                    console.log(`Error streaming resume for application ${application._id}:`, err.message);
                    failCount++;
                    resolve(null);
                  }
                });

                // Convert GridFS stream to Node.js Readable for archiver
                const nodeReadableStream = Readable.from(downloadStream);

                // Handle errors on the readable stream as well
                nodeReadableStream.on("error", (err) => {
                  if (!errorHandled) {
                    errorHandled = true;
                    console.log(`Error in readable stream for application ${application._id}:`, err.message);
                    failCount++;
                    resolve(null);
                  }
                });

                // Add file to archive
                archive.append(nodeReadableStream, { name: filename });
                successCount++;

                console.log(`Added resume: ${filename}`);

                // Only resolve after stream is properly attached
                if (!errorHandled) {
                  resolve(filename);
                }
              })
              .catch((err) => {
                console.log(`Error checking file existence for application ${application._id}:`, err.message);
                failCount++;
                resolve(null);
              });
          } catch (error) {
            console.error(`Error processing resume for application ${application._id}:`, error);
            failCount++;
            resolve(null);
          }
        });
      } catch (error) {
        console.error(`Error processing resume for application ${application._id}:`, error);
        failCount++;
        return null;
      }
    };

    // Build the complete archive before sending
    const buildArchive = async () => {
      const CONCURRENCY_LIMIT = 10; // Process 10 files at a time

      for (let i = 0; i < applications.length; i += CONCURRENCY_LIMIT) {
        const batch = applications.slice(i, i + CONCURRENCY_LIMIT);
        await Promise.all(batch.map((app) => processFile(app)));
      }

      // Finalize the archive after all files are added
      await archive.finalize();
      console.log(`Archive finalized. Success: ${successCount}, Failed: ${failCount}`);
    };

    // Wait for archive to be completely built
    await buildArchive();

    // Combine all chunks into a single buffer
    const zipBuffer = Buffer.concat(chunks);

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
    const zipFilename = `resumes_${statusFilter}_${timestamp}.zip`;

    return new NextResponse(zipBuffer, {
      headers: {
        "Content-Type": "application/zip",
        // Ensure proper Content-Disposition format with explicit .zip extension
        "Content-Disposition": `attachment; filename="${zipFilename}"`,
        "Content-Length": zipBuffer.length.toString(),
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("Error exporting resumes:", error);
    return sendErrorResponse("Error exporting resumes", error, 500);
  }
};
