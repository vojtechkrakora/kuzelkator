import { afterEach, describe, expect, it, vi } from "vitest";
import { getStandings } from "../src/server/cka";
import { apiCache, UpstreamError } from "../src/server/cache";

const row = {
  position: 1,
  matches: 2,
  wins: 2,
  draws: 0,
  losses: 0,
  tablePoints: 4,
  averagePerformance: 3300,
  team: { id: 1, name: "Tábor" },
};
const resource = (data: unknown, stale = false) => ({
  data,
  stale,
  checkedAt: "2026-09-29T08:00:00Z",
});
afterEach(() => vi.restoreAllMocks());
describe("latest available standings", () => {
  it("uses a published current table without extra requests", async () => {
    const get = vi
      .spyOn(apiCache, "get")
      .mockResolvedValue(resource({ items: [row], total: 1 }));
    expect((await getStandings("league", 3)).data.round).toBe(3);
    expect(get).toHaveBeenCalledTimes(1);
  });
  it("skips empty rounds, deduplicates round IDs and never chooses a future table", async () => {
    const paths: string[] = [];
    vi.spyOn(apiCache, "get").mockImplementation(async (path) => {
      paths.push(path);
      if (path.endsWith("/rounds")) return resource([1, 2, 2, 3, 4, 5]);
      return resource({
        items: path.includes("/2/table") ? [row] : [],
        total: path.includes("/2/table") ? 1 : 0,
      });
    });
    const result = await getStandings("league", 4);
    expect(result.data).toEqual({ items: [row], total: 1, round: 2 });
    expect(
      paths
        .filter((path) => path.includes("/table"))
        .map((path) => path.match(/rounds\/(\d+)/)?.[1]),
    ).toEqual(["4", "3", "2"]);
  });
  it("returns an explicit empty result at the start of the season", async () => {
    const get = vi
      .spyOn(apiCache, "get")
      .mockResolvedValue(resource({ items: [], total: 0 }));
    expect((await getStandings("league", 1)).data.round).toBeNull();
    expect(get).toHaveBeenCalledTimes(1);
  });
  it("falls back for a missing table and preserves stale metadata", async () => {
    vi.spyOn(apiCache, "get")
      .mockRejectedValueOnce(new UpstreamError(404))
      .mockResolvedValueOnce(resource([1, 2]))
      .mockResolvedValueOnce(resource({ items: [row], total: 1 }, true));
    const result = await getStandings("league", 2);
    expect(result.data.round).toBe(1);
    expect(result.stale).toBe(true);
  });
  it("does not hide an upstream failure behind a previous table", async () => {
    const get = vi
      .spyOn(apiCache, "get")
      .mockRejectedValue(new UpstreamError(429));
    await expect(getStandings("league", 3)).rejects.toMatchObject({
      status: 429,
    });
    expect(get).toHaveBeenCalledTimes(1);
  });
  it("includes every team when the upstream table is paginated", async () => {
    const get = vi
      .spyOn(apiCache, "get")
      .mockResolvedValueOnce(resource({ items: [row], total: 2 }))
      .mockResolvedValueOnce(
        resource({
          items: [{ ...row, team: { id: 2, name: "Sezimovo Ústí" } }],
          total: 2,
        }),
      );
    expect((await getStandings("league", 2)).data.items).toHaveLength(2);
    expect(get.mock.calls[1][0]).toContain("offset=1");
  });
});

it("finds the latest published table without relying on matches in the date window", async () => {
  const paths: string[] = [];
  vi.spyOn(apiCache, "get").mockImplementation(async (path) => {
    paths.push(path);
    if (path.endsWith("/rounds")) return resource([1, 2, 3, 4, 5]);
    return resource({
      items: path.includes("/4/table") ? [row] : [],
      total: path.includes("/4/table") ? 1 : 0,
    });
  });
  expect((await getStandings("league")).data.round).toBe(4);
  expect(paths.filter((path) => path.endsWith("/rounds"))).toHaveLength(1);
  expect(
    paths
      .filter((path) => path.includes("/table"))
      .map((path) => path.match(/rounds\/(\d+)/)?.[1]),
  ).toEqual(["5", "4"]);
});
