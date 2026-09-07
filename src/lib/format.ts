/**
 * Display formatting helpers. Dates render in a fixed, unambiguous format
 * (`7 September 2026`) rather than a locale-dependent numeric one, so a
 * verification record reads the same to every party.
 */

const DATE_FORMAT = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const DATE_TIME_FORMAT = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
  timeZoneName: "short",
});

export function formatDate(value: Date | string): string {
  return DATE_FORMAT.format(new Date(value));
}

export function formatDateTime(value: Date | string): string {
  return DATE_TIME_FORMAT.format(new Date(value));
}

/** Bytes as a human-readable size, e.g. `2.4 MB`. */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`;
}

/**
 * Shortens a long hexadecimal value for display while keeping both ends, which
 * is what people actually compare against an explorer.
 */
export function truncateHex(
  value: string,
  leading = 6,
  trailing = 4,
): string {
  if (value.length <= leading + trailing + 3) return value;
  return `${value.slice(0, leading)}…${value.slice(-trailing)}`;
}

export function formatRelativeTime(value: Date | string): string {
  const seconds = Math.round((Date.now() - new Date(value).getTime()) / 1000);
  if (seconds < 45) return "just now";

  /** Divisor and the largest value still expressed in that unit. */
  const units: Array<[Intl.RelativeTimeFormatUnit, number, number]> = [
    ["second", 1, 60],
    ["minute", 60, 3600],
    ["hour", 3600, 86400],
    ["day", 86400, 604800],
    ["week", 604800, 2629800],
    ["month", 2629800, 31557600],
    ["year", 31557600, Number.POSITIVE_INFINITY],
  ];

  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const [unit, divisor] = units.find(([, , limit]) => seconds < limit)!;
  return formatter.format(-Math.round(seconds / divisor), unit);
}
