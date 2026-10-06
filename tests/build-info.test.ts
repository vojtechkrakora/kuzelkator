import { expect, it } from "vitest";
import { getBuildInfo } from "../src/lib/build-info";

it("identifies an exact Render build with its app version and commit", () => {
  expect(
    getBuildInfo({
      KUZELKATOR_VERSION: "0.3.0",
      KUZELKATOR_COMMIT: "1234567",
      KUZELKATOR_BUILT_AT: "2026-10-06T12:34:00Z",
    }),
  ).toEqual({
    version: "0.3.0 · 1234567",
    builtAt: "2026-10-06T12:34:00.000Z",
    builtLabel: "06.10.26 14:34",
  });
});

it("uses the package version when running outside Render", () => {
  expect(
    getBuildInfo({
      KUZELKATOR_VERSION: "0.3.0",
      KUZELKATOR_BUILT_AT: "2026-10-06T12:34:00Z",
    }).version,
  ).toBe("0.3.0");
});

it("does not substitute a runtime start time when build metadata is absent", () => {
  expect(getBuildInfo({})).toEqual({
    version: "dev",
    builtAt: undefined,
    builtLabel: "čas sestavení není dostupný",
  });
});
