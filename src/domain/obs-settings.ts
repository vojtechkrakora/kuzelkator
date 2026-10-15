import type { OverlayPanel, OverlayDensity } from "./obs-overlay";

export type ObsSettings = {
  width: number;
  height: number;
  scale: number;
  gap: number;
  density: OverlayDensity;
};
export const obsStorageKey = "kuzelkator:obs-settings:v1";
export function obsSettings(
  panel: OverlayPanel,
  input: unknown = {},
): ObsSettings {
  const value =
    input && typeof input === "object"
      ? (input as Record<string, unknown>)
      : {};
  const density = value.density === "full" ? "full" : "compact";
  const number = (key: string, fallback: number, min: number, max: number) => {
    const raw = value[key];
    const n =
      typeof raw === "number" || (typeof raw === "string" && raw.trim())
        ? Number(raw)
        : NaN;
    return Number.isFinite(n)
      ? Math.round(Math.min(max, Math.max(min, n)))
      : fallback;
  };
  return {
    width: number(
      "width",
      panel === "score" ? 1920 : density === "full" ? 360 : 240,
      200,
      3840,
    ),
    height: number(
      "height",
      panel === "score" ? 120 : density === "full" ? 1320 : 720,
      100,
      2160,
    ),
    scale: number("scale", 100, 75, 150),
    gap: number("gap", 0, 0, 24),
    density,
  };
}
export function obsPath(
  id: number,
  panel: OverlayPanel,
  settings: ObsSettings,
) {
  return `/matches/${id}/overlay?${new URLSearchParams({ panel, ...Object.fromEntries(Object.entries(settings).map(([k, v]) => [k, String(v)])) })}`;
}
