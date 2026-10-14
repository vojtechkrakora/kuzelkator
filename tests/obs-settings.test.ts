import { describe, expect, it } from "vitest";
import { obsSettings, obsPath } from "../src/domain/obs-settings";
describe("OBS settings", () => {
  it("keeps legacy defaults and independent dimensions", () => {
    expect(obsSettings("home")).toMatchObject({ width: 240, height: 720 });
    expect(
      obsSettings("away", { density: "full", height: 1100 }),
    ).toMatchObject({ width: 360, height: 1100 });
  });
  it("bounds URL and stored input without trusting arbitrary objects", () => {
    expect(
      obsSettings("home", {
        width: "NaN",
        height: Infinity,
        scale: 999,
        gap: -10,
      }),
    ).toMatchObject({ width: 240, height: 720, scale: 150, gap: 0 });
    expect(obsSettings("score", null).width).toBe(1920);
  });
  it("roundtrips shared configuration", () => {
    const settings = obsSettings("home", {
      width: 300,
      height: 750,
      gap: 8,
      scale: 125,
    });
    const query = new URL(
      obsPath(513, "home", settings),
      "https://example.test",
    ).searchParams;
    expect(obsSettings("home", Object.fromEntries(query))).toEqual(settings);
  });
});
