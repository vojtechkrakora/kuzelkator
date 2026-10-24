import { afterEach, describe, expect, it, vi } from "vitest";
import {
  completePlayerPerformances,
  playerSubstitutionMatches,
  playerAggregateSchema,
  type PlayerStatistics,
} from "../src/domain/player-statistics";
import type { PlayerHistory } from "../src/domain/players";
import { getPlayerStatistics } from "../src/server/players";
import { apiCache } from "../src/server/cache";
import type { Match } from "../src/domain/models";

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
  it("counts the confirmed Tábor–Radlice substitution for both players once, scoped to team and competition", () => {
    const match: Match = {
      id: 520,
      slug: "tabor-radlice",
      date: "2026-10-10",
      time: "14:00",
      round: 5,
      status: "FINISHED",
      homeTeam: { id: 53, name: "Tábor A" },
      awayTeam: { id: 56, name: "Radlice" },
      competition: summary.competition,
      results: [
        {
          isHome: true,
          substitutions: [
            {
              id: 216,
              throwNumber: 61,
              playerOut: { id: 2709 },
              playerIn: { id: 2725 },
            },
            { id: 217, playerOut: { id: 2725 }, playerIn: { id: 99 } },
          ],
        },
        { isHome: false, substitutions: [] },
      ],
    };
    for (const id of [2709, 2725, 99])
      expect(playerSubstitutionMatches([match], id, 53, 16)).toBe(1);
    expect(playerSubstitutionMatches([match], 2725, 56, 16)).toBe(0);
    expect(playerSubstitutionMatches([match], 2725, 53, 99)).toBe(0);
    expect(
      playerSubstitutionMatches(
        [{ ...match, status: "SCHEDULED" }],
        2725,
        53,
        16,
      ),
    ).toBe(0);
    expect(
      playerSubstitutionMatches(
        [{ ...match, results: [{ isHome: true }] }],
        2725,
        53,
        16,
      ),
    ).toBeNull();
  });
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
    expect(get.mock.calls[3][0]).toContain("/matches?");
    expect(get.mock.calls[3][0]).toContain("seasonId=20");
    expect(get.mock.calls[3][0]).toContain("results.substitutions.playerIn");
    expect(get.mock.calls[4][0]).toContain("competitionId=99");
    expect(result.data.items[0].aggregates).toEqual([aggregate]);
    expect(result.data.items[1].aggregates).toEqual([]);
    expect(result.data.items[0].substitutionMatches).toBe(0);
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
  it.each([false, true])(
    "uses the full team season and shows unknown rather than zero on a truncated listing (%s)",
    async (truncated) => {
      const match: Match = {
        id: 520,
        slug: "zapas",
        round: 5,
        date: "2026-10-10",
        time: "14:00",
        status: "FINISHED",
        competition: summary.competition,
        homeTeam: summary.team,
        results: [
          {
            isHome: true,
            substitutions: [
              { id: 216, playerOut: { id: 711 }, playerIn: { id: 2725 } },
            ],
          },
        ],
      };
      const resource = (items: unknown[], total = items.length) => ({
        data: { items, total },
        stale: false,
        checkedAt: "2026-10-24",
      });
      const get = vi
        .spyOn(apiCache, "get")
        .mockResolvedValueOnce(resource([summary]))
        .mockResolvedValueOnce(resource([aggregate]))
        .mockResolvedValueOnce(
          resource([{ ...match, id: 519, status: "SCHEDULED" }], 2),
        )
        .mockResolvedValueOnce(resource(truncated ? [] : [match], 2));
      const result = await getPlayerStatistics(711, 20);
      expect(result.data.items[0].substitutionMatches).toBe(
        truncated ? null : 1,
      );
      expect(result.data.items[0].aggregates[0].averageResult).toBe(
        aggregate.averageResult,
      );
      expect(get.mock.calls[3][0]).toContain("offset=1");
    },
  );
});
