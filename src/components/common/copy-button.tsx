"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Copies a value to the clipboard with inline confirmation. Falls back to a
 * toast when the Clipboard API is unavailable (insecure origins, older
 * browsers), so the action never fails silently.
 */
export function CopyButton({
  value,
  label = "Copy",
  copiedLabel = "Copied",
  className,
  variant = "outline",
  size = "sm",
  iconOnly = false,
}: {
  value: string;
  label?: string;
  copiedLabel?: string;
  className?: string;
  variant?: "outline" | "ghost" | "secondary";
  size?: "sm" | "icon";
  iconOnly?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy automatically. Select the text and copy it.");
    }
  }

  const Icon = copied ? Check : Copy;

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={copy}
      className={cn(className)}
      aria-label={iconOnly ? (copied ? copiedLabel : label) : undefined}
    >
      <Icon
        className={cn("size-3.5", copied && "text-success")}
        aria-hidden="true"
      />
      {iconOnly ? null : copied ? copiedLabel : label}
    </Button>
  );
}
