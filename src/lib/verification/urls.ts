import { publicEnv } from "@/lib/env";

/**
 * The canonical public URL for a proof.
 *
 * Built from `NEXT_PUBLIC_APP_URL` rather than the incoming request host: this
 * URL is printed on paper and encoded into QR codes, so it must not vary with
 * whichever hostname a particular request happened to arrive on.
 */
export function verificationUrl(verificationId: string): string {
  const base = publicEnv.appUrl.replace(/\/+$/, "");
  return `${base}/verify/${verificationId}`;
}
