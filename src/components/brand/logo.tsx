import { cn } from "@/lib/utils";

/**
 * A geometric mark: a shield outline (trust) enclosing a link glyph (chain).
 * Deliberately abstract — no coins, no cubes, no crypto iconography.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={cn("size-6", className)}
    >
      <path
        d="M12 2.5 4.5 5.5v6.2c0 4.6 3.1 8.4 7.5 9.8 4.4-1.4 7.5-5.2 7.5-9.8V5.5L12 2.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M9.6 12.9a2.2 2.2 0 0 1 0-3.1l1.1-1.1a2.2 2.2 0 0 1 3.1 3.1l-.4.4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M14.4 11.1a2.2 2.2 0 0 1 0 3.1l-1.1 1.1a2.2 2.2 0 0 1-3.1-3.1l.4-.4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Wordmark({
  className,
  markClassName,
}: {
  className?: string;
  markClassName?: string;
}) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <LogoMark className={cn("text-primary", markClassName)} />
      <span className="text-[15px] font-semibold tracking-tight">
        ProofChain
      </span>
    </span>
  );
}
