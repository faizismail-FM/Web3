import QRCode from "qrcode";

import { verificationUrl } from "@/lib/verification/urls";

/**
 * Error correction level M tolerates ~15% damage, which is the usual choice for
 * a code that will be printed on a document and may be scanned from a scuffed
 * or photocopied page.
 */
const OPTIONS = {
  errorCorrectionLevel: "M",
  margin: 2,
} as const;

/** An inline SVG, for crisp rendering at any size. */
export function verificationQrSvg(verificationId: string): Promise<string> {
  return QRCode.toString(verificationUrl(verificationId), {
    ...OPTIONS,
    type: "svg",
  });
}

/** A PNG, for downloading and pasting into other documents. */
export function verificationQrPng(
  verificationId: string,
  width = 1024,
): Promise<Buffer> {
  return QRCode.toBuffer(verificationUrl(verificationId), {
    ...OPTIONS,
    type: "png",
    width,
  });
}
