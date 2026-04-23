import { GridFSBucket, ObjectId } from "mongodb";
import { getMongoDb } from "@/lib/mongodb";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params;

    let objectId: ObjectId;
    try {
      objectId = new ObjectId(fileId);
    } catch {
      return new Response("Invalid file ID", { status: 400 });
    }

    const db = await getMongoDb();
    const bucket = new GridFSBucket(db, { bucketName: "uploads" });

    const files = await bucket.find({ _id: objectId }).toArray();
    if (files.length === 0) {
      return new Response("File not found", { status: 404 });
    }

    const fileInfo = files[0]!;
    const contentType =
      (fileInfo.metadata as Record<string, string> | undefined)?.contentType ??
      "application/octet-stream";
    const fileSize = fileInfo.length;

    const rangeHeader = request.headers.get("range");

    if (rangeHeader) {
      // Parse Range: bytes=start-end
      const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
      if (!match) {
        return new Response("Invalid range", { status: 416 });
      }
      const start = parseInt(match[1]!, 10);
      const end = match[2] ? parseInt(match[2], 10) : fileSize - 1;
      const clampedEnd = Math.min(end, fileSize - 1);
      const chunkSize = clampedEnd - start + 1;

      const downloadStream = bucket.openDownloadStream(objectId, {
        start,
        end: clampedEnd + 1, // GridFS end is exclusive
      });

      const readable = new ReadableStream({
        start(controller) {
          downloadStream.on("data", (chunk: Buffer) => controller.enqueue(chunk));
          downloadStream.on("end", () => controller.close());
          downloadStream.on("error", (err: Error) => controller.error(err));
        },
        cancel() {
          downloadStream.destroy();
        },
      });

      return new Response(readable, {
        status: 206,
        headers: {
          "Content-Range": `bytes ${start}-${clampedEnd}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunkSize.toString(),
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }

    // Full file response
    const downloadStream = bucket.openDownloadStream(objectId);

    const readable = new ReadableStream({
      start(controller) {
        downloadStream.on("data", (chunk: Buffer) => controller.enqueue(chunk));
        downloadStream.on("end", () => controller.close());
        downloadStream.on("error", (err: Error) => controller.error(err));
      },
      cancel() {
        downloadStream.destroy();
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": contentType,
        "Content-Length": fileSize.toString(),
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Disposition": `inline; filename="${fileInfo.filename}"`,
      },
    });
  } catch {
    return new Response("Server error", { status: 500 });
  }
}
