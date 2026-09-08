import { describe, expect, it } from "vitest";

import { ApiError } from "@/lib/api/response";
import {
  assertAllowedUpload,
  hasPdfSignature,
  sanitizeFilename,
} from "@/lib/documents/upload-rules";

const PDF_HEADER = new TextEncoder().encode("%PDF-1.7\nbody");
const NOT_A_PDF = new TextEncoder().encode("MZ\u0090\u0000 an executable");

function upload(
  overrides: Partial<Parameters<typeof assertAllowedUpload>[0]> = {},
) {
  return {
    filename: "bill-of-lading.pdf",
    mimeType: "application/pdf",
    size: PDF_HEADER.byteLength,
    maxBytes: 10_485_760,
    bytes: PDF_HEADER,
    ...overrides,
  };
}

describe("hasPdfSignature", () => {
  it("accepts bytes beginning with %PDF-", () => {
    expect(hasPdfSignature(PDF_HEADER)).toBe(true);
  });

  it("rejects other content", () => {
    expect(hasPdfSignature(NOT_A_PDF)).toBe(false);
  });

  it("rejects a file shorter than the signature", () => {
    expect(hasPdfSignature(new Uint8Array([0x25, 0x50]))).toBe(false);
  });
});

describe("sanitizeFilename", () => {
  it("strips directory traversal", () => {
    expect(sanitizeFilename("../../etc/passwd.pdf")).toBe("passwd.pdf");
    expect(sanitizeFilename("..\\..\\windows\\system32.pdf")).toBe(
      "system32.pdf",
    );
  });

  it("removes control characters", () => {
    expect(sanitizeFilename("in\u0000\u001fvoice.pdf")).toBe("invoice.pdf");
  });

  it("removes characters that are reserved by filesystems", () => {
    expect(sanitizeFilename('in<>:"|?*voice.pdf')).toBe("invoice.pdf");
  });

  it("strips leading dots so no hidden file is produced", () => {
    expect(sanitizeFilename("...hidden.pdf")).toBe("hidden.pdf");
  });

  it("falls back to a default when nothing usable remains", () => {
    expect(sanitizeFilename("../")).toBe("document.pdf");
    expect(sanitizeFilename("   ")).toBe("document.pdf");
  });

  it("bounds the length", () => {
    expect(sanitizeFilename(`${"a".repeat(400)}.pdf`)).toHaveLength(200);
  });
});

describe("assertAllowedUpload", () => {
  it("accepts a genuine PDF", () => {
    expect(() => assertAllowedUpload(upload())).not.toThrow();
  });

  it("rejects an empty file", () => {
    expect(() =>
      assertAllowedUpload(upload({ size: 0, bytes: new Uint8Array() })),
    ).toThrow(ApiError);
  });

  it("rejects a file over the size limit", () => {
    try {
      assertAllowedUpload(upload({ size: 20_000_000, maxBytes: 10_485_760 }));
      expect.unreachable("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).code).toBe("PAYLOAD_TOO_LARGE");
      expect((error as ApiError).message).toContain("10 MB");
    }
  });

  it("rejects a non-PDF content type", () => {
    expect(() =>
      assertAllowedUpload(
        upload({ mimeType: "image/png", filename: "photo.png" }),
      ),
    ).toThrow(/Only PDF/);
  });

  it("rejects an executable renamed to .pdf with a spoofed content type", () => {
    // The whole point of the signature check: extension and MIME type both
    // claim PDF, and the bytes say otherwise.
    expect(() =>
      assertAllowedUpload(
        upload({ bytes: NOT_A_PDF, size: NOT_A_PDF.byteLength }),
      ),
    ).toThrow(/not a valid PDF/);
  });

  it("rejects a PDF content type with a non-PDF extension", () => {
    expect(() =>
      assertAllowedUpload(upload({ filename: "invoice.exe" })),
    ).toThrow(/Only PDF/);
  });

  it("tolerates a content type with parameters", () => {
    expect(() =>
      assertAllowedUpload(
        upload({ mimeType: "application/pdf; charset=binary" }),
      ),
    ).not.toThrow();
  });
});
