import { NextResponse } from "next/server";
import { GridFSBucket } from "mongodb";
import JSZip from "jszip";
import { XMLParser } from "fast-xml-parser";
import { getMongoDb } from "@/lib/mongodb";
import { getSessionUserId } from "@/lib/server/session";
import type { LearningPlan, LearningStepMedia } from "@/lib/documents";

export const maxDuration = 60;

function inferMimeType(fileName: string) {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".mp4")) return "video/mp4";
  if (lower.endsWith(".mov")) return "video/quicktime";
  if (lower.endsWith(".webm")) return "video/webm";
  if (lower.endsWith(".m4v")) return "video/x-m4v";
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".pptx")) {
    return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  }
  return "application/octet-stream";
}

function inferBaseName(fileName: string) {
  const idx = fileName.lastIndexOf(".");
  return idx > 0 ? fileName.slice(0, idx) : fileName;
}

function countPdfPages(buffer: Buffer) {
  const raw = buffer.toString("latin1");
  const matches = raw.match(/\/Type\s*\/Page\b/g);
  return Math.max(1, matches?.length ?? 1);
}

function resolvePptxTarget(target: string) {
  const normalized = target.replace(/\\/g, "/").replace(/^\/+/, "");
  if (normalized.startsWith("ppt/")) return normalized;
  if (normalized.startsWith("../")) return `ppt/${normalized.replace(/^(\.\.\/)+/, "")}`;
  if (normalized.startsWith("media/")) return `ppt/${normalized}`;
  return `ppt/slides/${normalized}`;
}

function isVideoPath(path: string) {
  const lower = path.toLowerCase();
  return (
    lower.endsWith(".mp4") ||
    lower.endsWith(".mov") ||
    lower.endsWith(".webm") ||
    lower.endsWith(".m4v")
  );
}

async function uploadBufferToGridFs(
  bucket: GridFSBucket,
  filename: string,
  buffer: Buffer,
  contentType: string
) {
  const stream = bucket.openUploadStream(filename, {
    chunkSizeBytes: 255 * 1024,
    metadata: {
      contentType,
      originalName: filename,
      size: buffer.length,
      uploadedAt: new Date().toISOString(),
    },
  });

  await new Promise<void>((resolve, reject) => {
    stream.end(buffer, (error?: Error | null) => {
      if (error) reject(error);
      else resolve();
    });
  });

  return stream.id.toString();
}

function buildPdfLearningPlan(buffer: Buffer): LearningPlan {
  const pageCount = countPdfPages(buffer);
  return {
    sourceType: "pdf",
    generatedAt: new Date().toISOString(),
    steps: Array.from({ length: pageCount }, (_, index) => ({
      id: `page-${index + 1}`,
      title: `Trang ${index + 1}`,
      kind: "page" as const,
      pageNumber: index + 1,
      estimatedSeconds: 25,
    })),
  };
}

async function buildPptxLearningPlan(
  buffer: Buffer,
  bucket: GridFSBucket,
  originalName: string
): Promise<LearningPlan | undefined> {
  const zip = await JSZip.loadAsync(buffer);
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
  });

  const slidePaths = Object.keys(zip.files)
    .filter((filePath) => /^ppt\/slides\/slide\d+\.xml$/.test(filePath))
    .sort((a, b) => {
      const aNum = Number(a.match(/slide(\d+)\.xml$/)?.[1] ?? "0");
      const bNum = Number(b.match(/slide(\d+)\.xml$/)?.[1] ?? "0");
      return aNum - bNum;
    });

  if (slidePaths.length === 0) return undefined;

  const mediaCache = new Map<string, LearningStepMedia>();
  const baseName = inferBaseName(originalName);

  const steps = await Promise.all(
    slidePaths.map(async (slidePath, idx) => {
      const slideNumber = idx + 1;
      const relPath = `ppt/slides/_rels/slide${slideNumber}.xml.rels`;
      const media: LearningStepMedia[] = [];

      const relFile = zip.file(relPath);
      if (relFile) {
        const relXml = await relFile.async("text");
        const parsed = parser.parse(relXml) as {
          Relationships?: { Relationship?: Array<Record<string, string>> | Record<string, string> };
        };

        const relationshipNode = parsed.Relationships?.Relationship;
        const relationships = Array.isArray(relationshipNode)
          ? relationshipNode
          : relationshipNode
            ? [relationshipNode]
            : [];

        for (const rel of relationships) {
          const target = rel.Target;
          const relType = rel.Type ?? "";
          if (!target) continue;
          const resolvedPath = resolvePptxTarget(target);
          const isVideo = relType.toLowerCase().includes("/video") || isVideoPath(resolvedPath);
          if (!isVideo) continue;

          const mediaFile = zip.file(resolvedPath);
          if (!mediaFile) continue;

          let mediaEntry = mediaCache.get(resolvedPath);
          if (!mediaEntry) {
            const mediaBuffer = await mediaFile.async("nodebuffer");
            const mediaName = resolvedPath.split("/").pop() ?? `slide-${slideNumber}-video.mp4`;
            const contentType = inferMimeType(mediaName);
            const mediaId = await uploadBufferToGridFs(
              bucket,
              `${baseName}-slide-${slideNumber}-${mediaName}`,
              mediaBuffer,
              contentType
            );
            mediaEntry = {
              id: `media-${mediaId}`,
              type: "video",
              url: `/api/files/${mediaId}`,
              mimeType: contentType,
              fileName: mediaName,
            };
            mediaCache.set(resolvedPath, mediaEntry);
          }
          media.push(mediaEntry);
        }
      }

      return {
        id: `slide-${slideNumber}`,
        title: `Slide ${slideNumber}`,
        kind: "slide" as const,
        slideNumber,
        estimatedSeconds: media.length > 0 ? 0 : 25,
        media,
      };
    })
  );

  return {
    sourceType: "pptx",
    generatedAt: new Date().toISOString(),
    steps,
  };
}

export async function POST(request: Request) {
  try {
    await getSessionUserId();

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ ok: false, message: "No file provided" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const db = await getMongoDb();
    const bucket = new GridFSBucket(db, { bucketName: "uploads" });

    const mimeType = file.type || "application/octet-stream";
    const fileId = await uploadBufferToGridFs(bucket, file.name, buffer, mimeType);
    const url = `/api/files/${fileId}`;
    const lowerName = file.name.toLowerCase();
    const learningPlan =
      lowerName.endsWith(".pdf")
        ? buildPdfLearningPlan(buffer)
        : lowerName.endsWith(".pptx")
          ? await buildPptxLearningPlan(buffer, bucket, file.name)
          : undefined;

    return NextResponse.json({ ok: true, fileId, url, learningPlan });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json(
      { ok: false, message: msg },
      { status: msg === "Unauthorized" ? 401 : 500 }
    );
  }
}
