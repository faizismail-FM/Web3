import { CopyButton } from "@/components/common/copy-button";
import { truncateHex } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * A SHA-256 fingerprint. Shown truncated by default because the full 64
 * characters dominate any layout, but always copyable in full — a truncated
 * hash is useless for actual comparison.
 */
export function HashDisplay({
  hash,
  full = false,
  className,
}: {
  hash: string;
  full?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("flex items-center gap-1.5", className)}>
      <code
        className="hash-text text-xs text-muted-foreground"
        title={full ? undefined : hash}
      >
        {full ? hash : truncateHex(hash, 8, 6)}
      </code>
      <CopyButton
        value={hash}
        variant="ghost"
        size="icon"
        iconOnly
        label="Copy fingerprint"
        copiedLabel="Fingerprint copied"
        className="size-6"
      />
    </span>
  );
}
