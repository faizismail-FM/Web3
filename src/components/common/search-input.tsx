"use client";

import { Search, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Debounced search box.
 *
 * The delay keeps a page navigation from firing on every keystroke; 350ms is
 * short enough to feel immediate and long enough that typing a filename does
 * not produce a query per character.
 */
export function SearchInput({
  value,
  onChange,
  placeholder = "Search",
  label,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  label: string;
}) {
  const [draft, setDraft] = useState(value);
  const [lastValue, setLastValue] = useState(value);

  // Keep in step when the URL changes from elsewhere (back button, "clear
  // all"). Adjusting during render rather than in an effect avoids the extra
  // commit that would briefly show a stale term.
  if (value !== lastValue) {
    setLastValue(value);
    setDraft(value);
  }

  useEffect(() => {
    if (draft === value) return;
    const timer = setTimeout(() => onChange(draft), 350);
    return () => clearTimeout(timer);
  }, [draft, value, onChange]);

  return (
    <div className="relative w-full sm:max-w-xs">
      <Search
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        type="search"
        value={draft}
        aria-label={label}
        placeholder={placeholder}
        onChange={(event) => setDraft(event.target.value)}
        className="pl-9"
      />
      {draft ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Clear search"
          onClick={() => {
            setDraft("");
            onChange("");
          }}
          className="absolute top-1/2 right-1 size-7 -translate-y-1/2"
        >
          <X className="size-3.5" aria-hidden="true" />
        </Button>
      ) : null}
    </div>
  );
}
