"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** Sentinel for "no filter", since a Select cannot hold an empty value. */
export const ANY_VALUE = "__any__";

export function FilterSelect({
  value,
  onChange,
  options,
  anyLabel,
  label,
  className,
}: {
  value: string | undefined;
  onChange: (next: string | undefined) => void;
  options: Array<{ value: string; label: string }>;
  anyLabel: string;
  label: string;
  className?: string;
}) {
  return (
    <Select
      value={value ?? ANY_VALUE}
      onValueChange={(next) => onChange(next === ANY_VALUE ? undefined : next)}
    >
      <SelectTrigger aria-label={label} className={className}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ANY_VALUE}>{anyLabel}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
