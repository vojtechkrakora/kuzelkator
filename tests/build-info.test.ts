import { expect, it } from "vitest";
import { getBuildInfo } from "../src/lib/build-info";

it("identifies an exact Render build with its app version and commit", () => {
  expect(
    getBuildInfo(
      {
        npm_package_version: "0.2.0",
        RENDER_GIT_COMMIT: "1234567890abcdef",
      },
      new Date("2026-10-06T12:34:00Z"),
    ),
  ).toEqual({
    version: "0.2.0 · 1234567",
    builtAt: "2026-10-06T12:34:00.000Z",
    builtLabel: "06.10.26 14:34",
  });
});

it("uses the package version when running outside Render", () => {
  expect(
    getBuildInfo(
      { npm_package_version: "0.2.0" },
      new Date("2026-10-06T12:34:00Z"),
    ).version,
  ).toBe("0.2.0");
});
