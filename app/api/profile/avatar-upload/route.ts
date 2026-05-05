import { randomUUID } from "node:crypto";
import { GridFSBucket } from "mongodb";
import { getMongoDb } from "@/lib/mongodb";
import { getSessionUserId } from "@/lib/server/session";

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const sessionUserId = await getSessionUserId();
    if (!sessionUserId) {
      return Response.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return Response.json({ ok: false, message: "Thiếu file ảnh." }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return Response.json(
        { ok: false, message: "Chỉ hỗ trợ ảnh JPG, PNG, WEBP hoặc GIF." },
        { status: 400 }
      );
    }

    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      return Response.json(
        { ok: false, message: "Ảnh đại diện tối đa 5MB." },
        { status: 400 }
      );
    }

    const db = await getMongoDb();
    const bucket = new GridFSBucket(db, { bucketName: "uploads" });
    const buffer = Buffer.from(await file.arrayBuffer());
    const extension = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")) : "";
    const safeName = `avatar_${Date.now()}_${randomUUID()}${extension}`;

    const stream = bucket.openUploadStream(safeName, {
      metadata: {
        contentType: file.type,
        originalName: file.name,
        size: file.size,
        uploadedAt: new Date().toISOString(),
        category: "avatar",
      },
    });

    await new Promise<void>((resolve, reject) => {
      stream.end(buffer, (error?: Error | null) => {
        if (error) reject(error);
        else resolve();
      });
    });

    const fileId = stream.id.toString();
    return Response.json({ ok: true, fileId, url: `/api/files/${fileId}` });
  } catch (error) {
    return Response.json(
      { ok: false, message: error instanceof Error ? error.message : "Upload thất bại." },
      { status: 500 }
    );
  }
}

