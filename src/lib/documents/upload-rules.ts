import { ApiError } from "@/lib/api/response";

/**
 * Only PDFs are accepted for now. The declared MIME type is a client-supplied
 * hint, so it is checked *and* the file's own signature is verified below.
 */
export const ALLOWED_MIME_TYPES = ["application/pdf"] as const;
export const ALLOWED_EXTENSIONS = [".pdf"] as const;

/** `%PDF-` — the magic bytes every PDF begins with. */
const PDF_SIGNATURE = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]);

export function hasPdfSignature(bytes: Uint8Array): boolean {
  if (bytes.length < PDF_SIGNATURE.length) return false;
  return PDF_SIGNATURE.every((byte, index) => bytes[index] === byte);
}

/** Control characters, which have no place in a stored or displayed filename. */
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/g;

/** Characters that are reserved or ambiguous across filesystems. */
const RESERVED_CHARACTERS = /[<>:"|?*]/g;

/**
 * Reduces an arbitrary client-supplied filename to something safe to store and
 * display: no directory traversal, no control characters, no leading dots, and
 * a bounded length.
 *
 * The original name is never used as a path in any case — `storage.ts`
 * generates its own opaque filename — so this protects display surfaces and
 * downloads rather than being the only line of defence.
 */
export function sanitizeFilename(input: string): string {
  // Take the basename only; a client may send "../../etc/passwd".
  const base = input.split(/[/\\]/).pop() ?? "";

  const cleaned = base
    .replace(CONTROL_CHARACTERS, "")
    .replace(RESERVED_CHARACTERS, "")
    .replace(/\s+/g, " ")
    .replace(/^[.\s]+/, "")
    .trim();

  if (!cleaned) return "document.pdf";
  return cleaned.length > 200 ? cleaned.slice(-200) : cleaned;
}

export function assertAllowedUpload(options: {
  filename: string;
  mimeType: string;
  size: number;
  maxBytes: number;
  bytes: Uint8Array;
}): void {
  const { filename, mimeType, size, maxBytes, bytes } = options;

  if (size === 0) {
    throw new ApiError("BAD_REQUEST", "That file is empty.");
  }

  if (size > maxBytes) {
    const limitMb = Math.floor(maxBytes / (1024 * 1024));
    throw new ApiError(
      "PAYLOAD_TOO_LARGE",
      `File is too large. The maximum size is ${limitMb} MB.`,
    );
  }

  const declaredType = mimeType.split(";")[0].trim().toLowerCase();
  const hasAllowedExtension = ALLOWED_EXTENSIONS.some((extension) =>
    filename.toLowerCase().endsWith(extension),
  );

  if (
    !ALLOWED_MIME_TYPES.includes(
      declaredType as (typeof ALLOWED_MIME_TYPES)[number],
    ) ||
    !hasAllowedExtension
  ) {
    throw new ApiError(
      "UNSUPPORTED_MEDIA_TYPE",
      "Only PDF documents are currently supported.",
    );
  }

  // The decisive check: a file renamed to .pdf and sent with a PDF content type
  // is still rejected unless its bytes actually begin with a PDF header.
  if (!hasPdfSignature(bytes)) {
    throw new ApiError(
      "UNSUPPORTED_MEDIA_TYPE",
      "That file is not a valid PDF. It may be renamed or corrupted.",
    );
  }
}
