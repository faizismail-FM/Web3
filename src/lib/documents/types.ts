import { DocumentStatus, DocumentType } from "@prisma/client";

/**
 * Human-readable labels for the document taxonomy. `OTHER` exists so a customer
 * can register paperwork we have not modelled yet; `Document.documentTypeLabel`
 * carries their own name for it.
 */
export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  [DocumentType.BILL_OF_LADING]: "Bill of Lading",
  [DocumentType.COMMERCIAL_INVOICE]: "Commercial Invoice",
  [DocumentType.PACKING_LIST]: "Packing List",
  [DocumentType.CERTIFICATE]: "Certificate",
  [DocumentType.CONTRACT]: "Contract",
  [DocumentType.DELIVERY_ORDER]: "Delivery Order",
  [DocumentType.OTHER]: "Other",
};

/** Order shown in pickers: most common first, `Other` last. */
export const DOCUMENT_TYPE_OPTIONS = [
  DocumentType.BILL_OF_LADING,
  DocumentType.COMMERCIAL_INVOICE,
  DocumentType.PACKING_LIST,
  DocumentType.DELIVERY_ORDER,
  DocumentType.CERTIFICATE,
  DocumentType.CONTRACT,
  DocumentType.OTHER,
] as const;

export function documentTypeLabel(
  type: DocumentType,
  customLabel?: string | null,
): string {
  if (type === DocumentType.OTHER && customLabel) return customLabel;
  return DOCUMENT_TYPE_LABELS[type];
}

/**
 * Status copy written for people who do not know what a blockchain is:
 * "Proof pending" rather than "transaction unconfirmed".
 */
export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  [DocumentStatus.DRAFT]: "Not registered",
  [DocumentStatus.PENDING]: "Proof pending",
  [DocumentStatus.REGISTERED]: "Proof registered",
  [DocumentStatus.VERIFIED]: "Verified",
  [DocumentStatus.FAILED]: "Registration failed",
};

export const DOCUMENT_STATUS_TONES: Record<
  DocumentStatus,
  "neutral" | "pending" | "success" | "destructive"
> = {
  [DocumentStatus.DRAFT]: "neutral",
  [DocumentStatus.PENDING]: "pending",
  [DocumentStatus.REGISTERED]: "success",
  [DocumentStatus.VERIFIED]: "success",
  [DocumentStatus.FAILED]: "destructive",
};
