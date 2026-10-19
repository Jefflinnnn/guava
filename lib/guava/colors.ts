/** Preset category colors, in picker order. */
export const CATEGORY_COLORS = [
  "oklch(0.646 0.222 41.116)",
  "oklch(0.6 0.118 184.704)",
  "oklch(0.398 0.07 227.392)",
  "oklch(0.828 0.189 84.429)",
  "oklch(0.769 0.188 70.08)",
  "oklch(0.6 0.2 300)",
  "oklch(0.6 0.2 15)",
];

/** An oklch() preset or a #hex custom pick, as stored on a category. */
export function isCategoryColor(v: unknown): v is string {
  return (
    typeof v === "string" &&
    v.length <= 64 &&
    (/^#[0-9a-f]{6}$/i.test(v) || /^oklch\([\d.%\s]+\)$/.test(v))
  );
}
