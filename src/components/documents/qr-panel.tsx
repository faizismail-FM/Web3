"use client";

import { Download, QrCode } from "lucide-react";

import { CopyButton } from "@/components/common/copy-button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/**
 * The QR code and its verification link.
 *
 * The image is fetched from the server rather than generated in the browser, so
 * the code always encodes the canonical URL and cannot drift with the page's
 * current hostname.
 */
export function QrPanel({
  verificationId,
  verificationUrl,
}: {
  verificationId: string;
  verificationUrl: string;
}) {
  const svgSrc = `/api/verify/${verificationId}/qr`;
  const pngSrc = `${svgSrc}?format=png`;

  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
      <div className="shrink-0 rounded-lg border bg-white p-3">
        {/* Rendered from a server route, so a plain <img> is correct here. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={svgSrc}
          alt={`QR code linking to the verification page for ${verificationId}`}
          width={148}
          height={148}
          className="size-[148px]"
        />
      </div>

      <div className="min-w-0 flex-1 space-y-4">
        <div>
          <p className="text-sm text-muted-foreground">Verification ID</p>
          <p className="hash-text text-lg font-semibold">{verificationId}</p>
        </div>

        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">Verification link</p>
          <p className="hash-text text-xs break-all">{verificationUrl}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <CopyButton
            value={verificationUrl}
            label="Copy link"
            copiedLabel="Link copied"
          />
          <CopyButton
            value={verificationId}
            label="Copy ID"
            copiedLabel="ID copied"
            variant="ghost"
          />

          <Button asChild variant="ghost" size="sm">
            <a href={pngSrc} download={`${verificationId}-qr.png`}>
              <Download className="size-3.5" aria-hidden="true" />
              Download QR
            </a>
          </Button>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm">
                <QrCode className="size-3.5" aria-hidden="true" />
                Enlarge
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle>Verification QR code</DialogTitle>
                <DialogDescription>
                  Print this on the document. Anyone can scan it to confirm the
                  document is authentic.
                </DialogDescription>
              </DialogHeader>
              <div className="rounded-lg border bg-white p-6">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={svgSrc}
                  alt={`Enlarged QR code for ${verificationId}`}
                  className="mx-auto aspect-square w-full max-w-64"
                />
              </div>
              <p className="hash-text text-center text-xs break-all text-muted-foreground">
                {verificationUrl}
              </p>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
