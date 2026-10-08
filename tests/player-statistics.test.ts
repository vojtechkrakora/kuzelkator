import { afterEach, describe, expect, it, vi } from "vitest";
import {
  completePlayerPerformances,
  playerAggregateSchema,
  type PlayerStatistics,
} from "../src/domain/player-statistics";
import type { PlayerHistory } from "../src/domain/players";
import { getPlayerStatistics } from "../src/server/players";
import { apiCache } from "../src/server/cache";

const summary = {
  team: { id: 57, name: "Bohušovice" },
  competition: { id: 16, name: "2. KLM A", slug: "2-klm-a" },
  matches: 3,
  venuesPlayed: 2,
  teamPointsWon: 3,
  setPointsWon: 9,
};
const aggregate = {
  player: { id: 711, firstName: "Jiří", lastName: "Semerád" },
  type: "TOTAL",
  matches: 3,
  substituteStarts: 0,
  averagePerformance: 586,
  averageResult: 577.33333333,
  homeAverage: 560,
  awayAverage: 612,
  positionStarts: { "5": 2, "6": 1 },
};
const stats: PlayerStatistics = {
  ...summary,
  aggregates: [playerAggregateSchema.parse(aggregate)],
};
function performance(overrides: Partial<PlayerHistory> = {}): PlayerHistory {
  return {
    position: 5,
    player: { id: 711 },
    totalPerformance: 550,
    teamMatchResult: {
      isHome: true,
      team: summary.team,
      substitutions: [],
      teamMatch: {
        id: 502,
        slug: "match",
        date: "2026-09-19",
        time: "09:00",
        round: 2,
        status: "FINISHED",
        competition: summary.competition,
      },
    },
    ...overrides,
  };
}
afterEach(() => vi.restoreAllMocks());
describe("player statistics", () => {
  it("keeps the two official averages distinct and accepts keyed lineup counts", () => {
    const parsed = playerAggregateSchema.parse(aggregate);
    expect(parsed.averageResult).toBeCloseTo((550 + 612 + 570) / 3);
    expect(parsed.averagePerformance).toBe(((550 + 570) / 2 + 612) / 2);
    expect(parsed.positionStarts).toEqual({ "5": 2, "6": 1 });
    expect(
      playerAggregateSchema.parse({ ...aggregate, positionStarts: [] })
        .positionStarts,
    ).toEqual({});
  });
  it("excludes every substitution representation, unfinished games and other teams from graphs", () => {
    const complete = performance();
    const base = complete.teamMatchResult!;
    const rows = [
      complete,
      performance({ substitute: { id: 2 } }),
      performance({ substituteAtThrow: 0 }),
      performance({ player: { id: 2 } }),
      performance({ isEmpty: true }),
      performance({ totalPerformance: null }),
      performance({
        teamMatchResult: {
          ...base,
          substitutions: [{ id: 1, playerIn: { id: 711 } }],
        },
      }),
      performance({
        teamMatchResult: {
          ...base,
          substitutions: [{ id: 1, playerOut: { id: 711 } }],
        },
      }),
      performance({
        teamMatchResult: { ...base, team: { id: 1, name: "Other" } },
      }),
      performance({
        teamMatchResult: {
          ...base,
          teamMatch: { ...base.teamMatch, status: "IN_PROGRESS" },
        },
      }),
      performance({
        teamMatchResult: {
          ...base,
          teamMatch: {
            ...base.teamMatch,
            competition: { ...summary.competition, id: 99 },
          },
        },
      }),
    ];
    expect(completePlayerPerformances(rows, 711, stats)).toEqual([complete]);
    expect(
      completePlayerPerformances([performance({ totalErrors: 0 })], 711, stats),
    ).toHaveLength(1);
  });
  it("paginates season summaries, scopes aggregates by competition and removes other players", async () => {
    const second = {
      ...summary,
      competition: { ...summary.competition, id: 99 },
    };
    const get = vi
      .spyOn(apiCache, "get")
      .mockResolvedValueOnce({
        data: { items: [summary], total: 2 },
        stale: false,
        checkedAt: "2026-10-08",
      })
      .mockResolvedValueOnce({
        data: { items: [second], total: 2 },
        stale: false,
        checkedAt: "2026-10-08",
      })
      .mockResolvedValueOnce({
        data: {
          items: [aggregate, { ...aggregate, player: { id: 99 } }],
          total: 2,
        },
        stale: true,
        checkedAt: "2026-10-07",
      })
      .mockResolvedValueOnce({
        data: { items: [], total: 0 },
        stale: false,
        checkedAt: "2026-10-08",
      });
    const result = await getPlayerStatistics(711, 20);
    expect(get.mock.calls[0][0]).toContain("seasonId=20");
    expect(get.mock.calls[1][0]).toContain("offset=1");
    expect(get.mock.calls[2][0]).toContain("competitionId=16");
    expect(get.mock.calls[3][0]).toContain("competitionId=99");
    expect(result.data.items[0].aggregates).toEqual([aggregate]);
    expect(result.data.items[1].aggregates).toEqual([]);
    expect(result.stale).toBe(true);
    expect(result.checkedAt).toBe("2026-10-07");
  });
  it("fails rather than silently presenting incomplete pagination", async () => {
    vi.spyOn(apiCache, "get").mockResolvedValue({
      data: { items: [], total: 1 },
      stale: false,
      checkedAt: "now",
    });
    await expect(getPlayerStatistics(711, 20)).rejects.toMatchObject({
      status: 502,
    });
  });
});
