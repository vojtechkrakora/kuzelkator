import { afterEach, describe, expect, it, vi } from "vitest";
import { getTeamSeasonMatches, teamSeasonFilters } from "../src/server/cka";
import { apiCache } from "../src/server/cache";

afterEach(() => vi.restoreAllMocks());
describe("full season team matches", () => {
  it("filters by team and official season without week or status restrictions", async () => {
    const get = vi
      .spyOn(apiCache, "get")
      .mockResolvedValue({
        data: { items: [], total: 0 },
        checkedAt: "now",
        stale: false,
      });
    await getTeamSeasonMatches({ teamId: 67, seasonId: 20 });
    const params = new URL(get.mock.calls[0][0], "https://test.local")
      .searchParams;
    expect(params.get("teamId")).toBe("67");
    expect(params.get("seasonId")).toBe("20");
    expect(params.get("dateFrom")).toBeNull();
    expect(params.get("status")).toBeNull();
    expect(params.get("include")).toContain("results");
    expect(params.get("sort")).toBe("date,time,id");
  });
  it("loads every page and preserves stale metadata", async () => {
    const get = vi
      .spyOn(apiCache, "get")
      .mockResolvedValueOnce({
        data: { items: [{ id: 1 }], total: 2 },
        checkedAt: "2026-09-29",
        stale: false,
      })
      .mockResolvedValueOnce({
        data: { items: [{ id: 2 }], total: 2 },
        checkedAt: "2026-09-28",
        stale: true,
      });
    const result = await getTeamSeasonMatches({ teamId: 67, seasonId: 20 });
    expect(result.data.items).toHaveLength(2);
    expect(result.stale).toBe(true);
    expect(result.checkedAt).toBe("2026-09-28");
    expect(get.mock.calls[1][0]).toContain("offset=1");
  });
  it("reports a broken page instead of claiming to show a complete season", async () => {
    vi.spyOn(apiCache, "get")
      .mockResolvedValueOnce({
        data: { items: [{ id: 1 }], total: 2 },
        checkedAt: "now",
        stale: false,
      })
      .mockResolvedValueOnce({
        data: { items: [], total: 2 },
        checkedAt: "now",
        stale: false,
      });
    await expect(
      getTeamSeasonMatches({ teamId: 67, seasonId: 20 }),
    ).rejects.toMatchObject({ status: 502 });
  });
  it("requires valid team and season IDs", () => {
    for (const input of [
      { teamId: 1 },
      { teamId: 0, seasonId: 1 },
      { teamId: 1, seasonId: -1 },
    ])
      expect(teamSeasonFilters.safeParse(input).success).toBe(false);
  });
});
