import {
  ActivityType,
  DocumentStatus,
  DocumentType,
  Prisma,
} from "@prisma/client";

import { ApiError } from "@/lib/api/response";
import { assertAllowedUpload, sanitizeFilename } from "@/lib/documents/upload-rules";
import { getServerEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/services/activity";
import { sha256 } from "@/lib/services/hashing";
import { deleteDocumentQuietly, storeDocument } from "@/lib/services/storage";
import type { DocumentListQuery } from "@/lib/validation/documents";

type CreateDocumentInput = {
  organizationId: string;
  userId: string;
  file: File;
  documentType: DocumentType;
  documentTypeLabel?: string | null;
};

/**
 * Validates, hashes and stores an uploaded document.
 *
 * Order matters here. The bytes are read once, validated, and hashed on the
 * server; nothing about the fingerprint comes from the client. Storage happens
 * before the database write so a failed insert leaves at most an orphan file,
 * never a database row pointing at a file that does not exist.
 */
export async function createDocumentFromUpload(input: CreateDocumentInput) {
  const env = getServerEnv();
  const { file } = input;

  // Reject on the declared size before reading, so an oversized upload does not
  // have to be buffered in full just to be refused.
  if (file.size > env.MAX_UPLOAD_BYTES) {
    const limitMb = Math.floor(env.MAX_UPLOAD_BYTES / (1024 * 1024));
    throw new ApiError(
      "PAYLOAD_TOO_LARGE",
      `File is too large. The maximum size is ${limitMb} MB.`,
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const filename = sanitizeFilename(file.name);

  assertAllowedUpload({
    filename,
    mimeType: file.type,
    size: bytes.byteLength,
    maxBytes: env.MAX_UPLOAD_BYTES,
    bytes,
  });

  const sha256Hash = sha256(bytes);

  const existing = await prisma.document.findUnique({
    where: {
      organizationId_sha256Hash: {
        organizationId: input.organizationId,
        sha256Hash,
      },
    },
    select: { id: true, filename: true },
  });

  if (existing) {
    throw new ApiError(
      "CONFLICT",
      `This exact document is already registered as "${existing.filename}".`,
    );
  }

  const { storagePath } = await storeDocument(input.organizationId, bytes);

  try {
    const document = await prisma.$transaction(async (tx) => {
      const created = await tx.document.create({
        data: {
          organizationId: input.organizationId,
          uploadedBy: input.userId,
          filename,
          documentType: input.documentType,
          documentTypeLabel: input.documentTypeLabel || null,
          fileSize: bytes.byteLength,
          mimeType: "application/pdf",
          storagePath,
          sha256Hash,
          status: DocumentStatus.DRAFT,
        },
      });

      await recordActivity(
        {
          type: ActivityType.DOCUMENT_UPLOADED,
          message: `Uploaded ${created.filename}`,
          organizationId: input.organizationId,
          userId: input.userId,
          documentId: created.id,
        },
        tx,
      );

      await recordActivity(
        {
          type: ActivityType.HASH_GENERATED,
          message: `Fingerprint computed for ${created.filename}`,
          organizationId: input.organizationId,
          userId: input.userId,
          documentId: created.id,
          metadata: { sha256Hash },
        },
        tx,
      );

      return created;
    });

    return document;
  } catch (error) {
    await deleteDocumentQuietly(storagePath);

    // A concurrent upload of the same bytes can lose the race against the
    // duplicate check above; the unique index is the real guarantee.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new ApiError(
        "CONFLICT",
        "This exact document is already registered in your organization.",
      );
    }
    throw error;
  }
}

const SORT_FIELDS = {
  createdAt: "createdAt",
  filename: "filename",
  status: "status",
  documentType: "documentType",
} as const;

/** Lists documents for one organization. The scope is not optional. */
export async function listDocuments(
  organizationId: string,
  query: DocumentListQuery,
) {
  const where: Prisma.DocumentWhereInput = {
    organizationId,
    ...(query.status ? { status: query.status } : {}),
    ...(query.type ? { documentType: query.type } : {}),
  };

  const [total, documents] = await Promise.all([
    prisma.document.count({ where }),
    prisma.document.findMany({
      where,
      orderBy: { [SORT_FIELDS[query.sort]]: query.direction },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      select: {
        id: true,
        filename: true,
        documentType: true,
        documentTypeLabel: true,
        fileSize: true,
        sha256Hash: true,
        status: true,
        createdAt: true,
        uploader: { select: { id: true, name: true } },
        organization: { select: { id: true, name: true } },
        registration: {
          select: {
            verificationId: true,
            status: true,
            transactionHash: true,
            networkName: true,
          },
        },
      },
    }),
  ]);

  return {
    documents,
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    },
  };
}

export type DocumentListItem = Awaited<
  ReturnType<typeof listDocuments>
>["documents"][number];

/**
 * Loads a single document, scoped to the caller's organization.
 *
 * The organization is part of the `where` clause rather than checked after
 * loading, so a document id belonging to another tenant simply does not exist
 * as far as this query is concerned.
 */
export async function getDocumentForOrganization(
  documentId: string,
  organizationId: string,
) {
  return prisma.document.findFirst({
    where: { id: documentId, organizationId },
    include: {
      uploader: { select: { id: true, name: true, email: true } },
      organization: { select: { id: true, name: true, walletAddress: true } },
      registration: true,
      verifications: {
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          result: true,
          method: true,
          createdAt: true,
          user: { select: { name: true } },
        },
      },
      activityLogs: {
        orderBy: { createdAt: "desc" },
        take: 25,
        select: {
          id: true,
          type: true,
          message: true,
          createdAt: true,
          user: { select: { name: true } },
        },
      },
    },
  });
}

export type DocumentDetail = NonNullable<
  Awaited<ReturnType<typeof getDocumentForOrganization>>
>;
