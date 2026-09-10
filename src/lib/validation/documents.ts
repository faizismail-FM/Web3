import { DocumentStatus, DocumentType } from "@prisma/client";
import { z } from "zod";

export const uploadMetadataSchema = z.object({
  documentType: z.nativeEnum(DocumentType).default(DocumentType.OTHER),
  documentTypeLabel: z
    .string()
    .trim()
    .max(80, "Keep the document type under 80 characters")
    .optional()
    .or(z.literal("")),
});

/** Query parameters accepted by the document list endpoint and page. */
export const documentListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sort: z
    .enum(["createdAt", "filename", "status", "documentType"])
    .default("createdAt"),
  direction: z.enum(["asc", "desc"]).default("desc"),
  status: z.nativeEnum(DocumentStatus).optional(),
  type: z.nativeEnum(DocumentType).optional(),
  /** Free-text search across filename, verification id and fingerprint. */
  q: z.string().trim().max(200).optional(),
});

export type UploadMetadataInput = z.infer<typeof uploadMetadataSchema>;
export type DocumentListQuery = z.infer<typeof documentListQuerySchema>;
