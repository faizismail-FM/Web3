import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { getServerEnv } from "@/lib/env";

/**
 * Off-chain document storage.
 *
 * The interface is deliberately narrow so the filesystem driver below can be
 * swapped for object storage without touching any caller. Documents are stored
 * outside the web root and are only ever served through an authorized route —
 * there is no public URL for a stored file.
 */
export type StoredObject = {
  /** Opaque, storage-relative path. Never derived from the uploaded filename. */
  storagePath: string;
};

function storageRoot(): string {
  return path.resolve(process.cwd(), getServerEnv().STORAGE_DIR);
}

/**
 * Resolves a storage-relative path to an absolute one, refusing anything that
 * escapes the storage root. Paths come from our own database rather than from
 * a request, but a traversal check costs nothing and turns a future bug into a
 * failure rather than an arbitrary file read.
 */
function resolveWithinRoot(storagePath: string): string {
  const root = storageRoot();
  const absolute = path.resolve(root, storagePath);
  const relative = path.relative(root, absolute);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Refusing to access a path outside the storage root");
  }
  return absolute;
}

/**
 * Writes a document and returns its storage path.
 *
 * The stored filename is a fresh UUID: two uploads with the same name never
 * collide, and a hostile filename can never influence where bytes land.
 */
export async function storeDocument(
  organizationId: string,
  bytes: Uint8Array,
): Promise<StoredObject> {
  const storagePath = path.posix.join(organizationId, `${randomUUID()}.pdf`);
  const absolute = resolveWithinRoot(storagePath);

  await mkdir(path.dirname(absolute), { recursive: true });
  await writeFile(absolute, bytes, { flag: "wx" });

  return { storagePath };
}

export async function readDocument(storagePath: string): Promise<Buffer> {
  return readFile(resolveWithinRoot(storagePath));
}

/**
 * Best-effort cleanup used when a database write fails after the bytes have
 * already landed. A leftover orphan file is harmless; throwing here would mask
 * the original error.
 */
export async function deleteDocumentQuietly(
  storagePath: string,
): Promise<void> {
  try {
    await unlink(resolveWithinRoot(storagePath));
  } catch (error) {
    console.error("[storage] Failed to remove orphaned file:", error);
  }
}
