import { describe, expect, it } from "vitest";

import { formatDate, formatFileSize, truncateHex } from "@/lib/format";

describe("formatDate", () => {
  it("renders an unambiguous long-form date", () => {
    expect(formatDate("2026-09-07T10:15:00.000Z")).toBe("7 September 2026");
  });
});

describe("formatFileSize", () => {
  it.each([
    [512, "512 B"],
    [2048, "2.0 KB"],
    [1_500_000, "1.4 MB"],
    [10_485_760, "10 MB"],
  ])("formats %i bytes as %s", (bytes, expected) => {
    expect(formatFileSize(bytes)).toBe(expected);
  });
});

describe("truncateHex", () => {
  it("keeps both ends of a long hash", () => {
    const hash =
      "8c7a1f9e2d3b4c5a6e7f8091a2b3c4d5e6f708192a3b4c5d6e7f809192a391fe";
    expect(truncateHex(hash)).toBe("8c7a1f…91fe");
  });

  it("leaves a short value untouched", () => {
    expect(truncateHex("0x1234")).toBe("0x1234");
  });
});
