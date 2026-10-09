import { afterEach, expect, it, vi } from "vitest";
import {
  teamPlayerAverage,
  type PlayerAggregate,
} from "../src/domain/player-statistics";
import { apiCache } from "../src/server/cache";
import {
  getTeamRoster,
  getTeamPlayerStatistics,
  teamPlayerStatsInput,
} from "../src/server/players";
const competition = { id: 16, name: "2. KLM A", slug: "2-klm-a" };
const player = { id: 711, firstName: "Jiří", lastName: "Semerád" };
const resource = (data: unknown) => ({
  data,
  checkedAt: "2026-10-08",
  stale: false,
});
afterEach(() => vi.restoreAllMocks());
it("discovers and deduplicates competitions across all roster pages", async () => {
  vi.spyOn(apiCache, "get")
    .mockResolvedValueOnce(
      resource({ items: [{ player, competition }], total: 3 }),
    )
    .mockResolvedValueOnce(
      resource({
        items: [
          { player, competition },
          { player, competition: { ...competition, id: 17 } },
        ],
        total: 3,
      }),
    );
  const result = await getTeamRoster({ teamId: 57, seasonId: 20 });
  expect(result.data.items).toHaveLength(1);
  expect(result.data.competitions.map((c) => c.id)).toEqual([16, 17]);
});
it("loads all players with one shared aggregate request after verifying the season", async () => {
  const rows = [
    { player, type: "TOTAL" },
    { player: { id: 2 }, type: "TOTAL" },
  ];
  const get = vi
    .spyOn(apiCache, "get")
    .mockResolvedValueOnce({
      ...resource({ items: [{ player, competition }], total: 1 }),
      stale: true,
      checkedAt: "2026-10-07",
    })
    .mockResolvedValueOnce(resource({ items: rows, total: 2 }));
  const result = await getTeamPlayerStatistics({
    teamId: 57,
    seasonId: 20,
    competitionId: 16,
  });
  expect(get).toHaveBeenCalledTimes(2);
  expect(get.mock.calls[0][0]).toContain("seasonId=20");
  expect(get.mock.calls[0][0]).toContain("teamId=57");
  expect(get.mock.calls[1][0]).toBe(
    "/teams/57/player-stats?competitionId=16&include=player",
  );
  expect(get.mock.calls[1][2]).toBe(600000);
  expect(result.data.items).toEqual(rows);
  expect(result.stale).toBe(true);
  expect(result.checkedAt).toBe("2026-10-07");
});
it("does not fetch aggregates for a competition outside the selected team season", async () => {
  const get = vi
    .spyOn(apiCache, "get")
    .mockResolvedValue(
      resource({ items: [{ player, competition }], total: 1 }),
    );
  await expect(
    getTeamPlayerStatistics({ teamId: 57, seasonId: 19, competitionId: 99 }),
  ).rejects.toMatchObject({ status: 400 });
  expect(get).toHaveBeenCalledTimes(1);
  expect(
    teamPlayerStatsInput.safeParse({
      teamId: 57,
      seasonId: 20,
      competitionId: 0,
    }).success,
  ).toBe(false);
});

it("distinguishes missing side performances from genuine zero errors", () => {
  const total: PlayerAggregate = {
    player,
    type: "TOTAL",
    matches: 3,
    substituteStarts: 1,
    averageResult: 577.33,
    averagePerformance: 586,
    homeAverage: 560,
    awayAverage: 0,
    positionStarts: {},
  };
  const errors: PlayerAggregate = {
    ...total,
    type: "ERRORS",
    homeAverage: 0,
    awayAverage: 0,
  };
  expect(teamPlayerAverage(total, total, "all")).toBe(577.33);
  expect(teamPlayerAverage(total, total, "home")).toBe(560);
  expect(teamPlayerAverage(errors, total, "home")).toBe(0);
  expect(teamPlayerAverage(total, total, "away")).toBeNull();
  expect(teamPlayerAverage(errors, total, "away")).toBeNull();
  expect(teamPlayerAverage(undefined, total, "home")).toBeNull();
  expect(teamPlayerAverage(errors, undefined, "home")).toBeNull();
  expect(
    teamPlayerAverage({ ...errors, homeAverage: null }, total, "home"),
  ).toBeNull();
  expect(teamPlayerAverage({ ...total, matches: 0 }, total, "all")).toBeNull();
  expect(
    teamPlayerAverage(errors, { ...total, homeAverage: null }, "home"),
  ).toBeNull();
});
