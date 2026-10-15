import { expect, it } from "vitest";
import { shareUrl } from "../src/lib/share-url";
it("shares public feed context without favourites or offset", () => {
  expect(
    shareUrl(
      "https://example.test/?date=2026-10-15&competition=16&season=20&team=57&favourites=1&favoriteTeamIds=57,58&offset=48#private",
    ),
  ).toBe(
    "https://example.test/?date=2026-10-15&competition=16&team=57&season=20",
  );
});
it("preserves player context and strips match query data", () => {
  expect(
    shareUrl(
      "https://example.test/players/711?season=19&competition=16&team=57&favourites=1",
    ),
  ).toBe("https://example.test/players/711?season=19&competition=16&team=57");
  expect(
    shareUrl("https://example.test/matches/513?token=private#home-results"),
  ).toBe("https://example.test/matches/513");
});
it("discards invalid public filter values", () => {
  expect(
    shareUrl(
      "https://example.test/?date=2026-02-30&team=-1&season=9007199254740999&competition=hello",
    ),
  ).toBe("https://example.test/");
});
