import "server-only";

function decodePdfEscapes(value: string) {
  let output = "";
  for (let i = 0; i < value.length; i++) {
    const ch = value[i];
    if (ch !== "\\") {
      output += ch;
      continue;
    }

    const next = value[++i];
    if (!next) break;

    if (next >= "0" && next <= "7") {
      let octal = next;
      for (let j = 0; j < 2; j++) {
        const peek = value[i + 1];
        if (peek && peek >= "0" && peek <= "7") {
          octal += peek;
          i++;
        } else {
          break;
        }
      }
      output += String.fromCharCode(parseInt(octal, 8));
      continue;
    }

    switch (next) {
      case "n":
        output += "\n";
        break;
      case "r":
        output += "\r";
        break;
      case "t":
        output += "\t";
        break;
      case "b":
        output += "\b";
        break;
      case "f":
        output += "\f";
        break;
      case "(":
      case ")":
      case "\\":
        output += next;
        break;
      default:
        output += next;
        break;
    }
  }
  return output;
}

function decodePdfHexString(hex: string) {
  const normalized = hex.length % 2 === 0 ? hex : `${hex}0`;
  const buffer = Buffer.from(normalized, "hex");
  if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) {
    const body = buffer.subarray(2);
    const swapped = Buffer.allocUnsafe(body.length);
    for (let i = 0; i < body.length - 1; i += 2) {
      swapped[i] = body[i + 1] ?? 0;
      swapped[i + 1] = body[i] ?? 0;
    }
    if (body.length % 2 === 1) swapped[body.length - 1] = body[body.length - 1] ?? 0;
    return swapped.toString("utf16le");
  }
  return buffer.toString("utf8");
}

function normalizePdfText(text: string) {
  return text
    .replace(/\r/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function extractFromTextObject(textObject: string, collector: string[]) {
  const literalRegex = /\((?:\\.|[^\\()])*\)/g;
  const hexRegex = /<([0-9A-Fa-f]+)>/g;

  const literalMatches = textObject.match(literalRegex) ?? [];
  for (const match of literalMatches) {
    const inner = match.slice(1, -1);
    const decoded = decodePdfEscapes(inner).trim();
    if (decoded) collector.push(decoded);
  }

  let hexMatch: RegExpExecArray | null;
  while ((hexMatch = hexRegex.exec(textObject)) !== null) {
    const decoded = decodePdfHexString(hexMatch[1] ?? "").trim();
    if (decoded) collector.push(decoded);
  }
}

function extractPdfTextContentFallback(buffer: Buffer) {
  const source = buffer.toString("latin1");
  const textObjects = source.match(/BT[\s\S]*?ET/g) ?? [];
  const segments: string[] = [];

  for (const textObject of textObjects) {
    extractFromTextObject(textObject, segments);
  }

  return normalizePdfText(segments.join("\n"));
}

export async function extractPdfTextContent(buffer: Buffer) {
  try {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(buffer),
      useWorkerFetch: false,
      isEvalSupported: false,
      disableFontFace: true,
      useSystemFonts: false,
      stopAtErrors: false,
      verbosity: pdfjs.VerbosityLevel.ERRORS,
    });

    const document = await loadingTask.promise;
    const pages: string[] = [];

    for (let pageIndex = 1; pageIndex <= document.numPages; pageIndex++) {
      const page = await document.getPage(pageIndex);
      const textContent = await page.getTextContent({
        disableNormalization: false,
        includeMarkedContent: false,
      });
      const lines = textContent.items
        .map((item) => ("str" in item ? item.str : ""))
        .map((value) => value.trim())
        .filter(Boolean);
      pages.push(lines.join("\n"));
    }

    return normalizePdfText(pages.join("\n\n"));
  } catch {
    return extractPdfTextContentFallback(buffer);
  }
}

export function countPdfPages(buffer: Buffer) {
  const raw = buffer.toString("latin1");
  const matches = raw.match(/\/Type\s*\/Page\b/g);
  return Math.max(1, matches?.length ?? 1);
}

export function splitTextByPage(text: string, pageCount: number) {
  const normalizedLines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (normalizedLines.length === 0 || pageCount <= 1) {
    return [text];
  }

  const chunkSize = Math.max(1, Math.ceil(normalizedLines.length / pageCount));
  const chunks: string[] = [];
  for (let i = 0; i < pageCount; i++) {
    const start = i * chunkSize;
    const end = start + chunkSize;
    chunks.push(normalizedLines.slice(start, end).join("\n").trim());
  }
  return chunks;
}

