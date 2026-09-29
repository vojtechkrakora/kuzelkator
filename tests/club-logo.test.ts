import { afterEach, describe, expect, it, vi } from "vitest";
import { clubLogoUrl } from "../src/lib/club-logo";
import { teamSchema } from "../src/domain/models";
import {
  getMatch,
  getMatches,
  getTeam,
  getTeamSeasonMatches,
  getStandings,
} from "../src/server/cka";
import { apiCache } from "../src/server/cache";
afterEach(() => vi.restoreAllMocks());
describe("club logos", () => {
  it("encodes official URLs containing spaces and Czech accents", () => {
    expect(
      clubLogoUrl("https://evidence.kuzelky.cz/assets/clubs/logo zlín.png"),
    ).toBe("https://evidence.kuzelky.cz/assets/clubs/logo%20zl%C3%ADn.png");
  });
  it("rejects missing, unexpected or active image sources", () => {
    for (const value of [
      null,
      undefined,
      "",
      "bad",
      "javascript:alert(1)",
      "https://other.test/logo.png",
      "http://evidence.kuzelky.cz/assets/clubs/a.png",
      "https://evidence.kuzelky.cz/assets/clubs/../../private.png",
      "https://evidence.kuzelky.cz/assets/clubs/a.svg",
      "https://evidence.kuzelky.cz/assets/clubs/a.png?redirect=x",
    ])
      expect(clubLogoUrl(value)).toBeNull();
  });
  it("accepts old favourites and retains only necessary public club fields", () => {
    expect(teamSchema.parse({ id: 1, name: "Team" }).club).toBeUndefined();
    expect(
      teamSchema.parse({
        id: 1,
        name: "Team",
        slug: null,
        club: { id: 2, logo: null, email: "unneeded" },
      }).club,
    ).toEqual({ id: 2, logo: null });
  });
  it("requests logos with match and standings data", async () => {
    const get = vi
      .spyOn(apiCache, "get")
      .mockResolvedValue({
        data: { items: [{ id: 1 }], total: 1 },
        checkedAt: "now",
        stale: false,
      });
    await getMatch(1);
    await getMatches({ from: "2026-09-28", to: "2026-10-04", offset: 0 });
    await getTeamSeasonMatches({ teamId: 1, seasonId: 20 });
    await getStandings("league", 1);
    for (const [path] of get.mock.calls.slice(0, 3)) {
      const includes = new URL(path, "https://test.local").searchParams.get(
        "include",
      );
      expect(includes).toContain("homeTeam.club");
      expect(includes).toContain("awayTeam.club");
    }
    expect(get.mock.calls[3][0]).toContain("team.club");
    await getTeam(1);
    expect(get.mock.calls[4][0]).toBe("/teams/1?include=club");
  });
});
