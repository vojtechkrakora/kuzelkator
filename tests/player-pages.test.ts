import { afterEach, expect, it, vi } from "vitest";
import { apiCache } from "../src/server/cache";
import {
  findPlayers,
  getPlayerHistory,
  getTeamRoster,
  getPlayerTeams,
  playerSearchInput,
} from "../src/server/players";
import {
  profileSchema,
  historySchema,
  searchPlayers,
} from "../src/domain/players";
import { preferencesSchema } from "../src/components/providers";
afterEach(() => vi.restoreAllMocks());
const resource = (data: unknown) => ({
  data,
  checkedAt: "2026-10-05T10:00:00Z",
  stale: false,
});
it("loads and deduplicates the complete team roster for one season", async () => {
  const get = vi
    .spyOn(apiCache, "get")
    .mockResolvedValueOnce(
      resource({
        items: [
          { player: { id: 2, firstName: "Petr", lastName: "Žák" } },
          { player: { id: 1, firstName: "Adam", lastName: "Novák" } },
        ],
        total: 3,
      }),
    )
    .mockResolvedValueOnce({
      ...resource({
        items: [{ player: { id: 1, firstName: "Adam", lastName: "Novák" } }],
        total: 3,
      }),
      stale: true,
    });
  const result = await getTeamRoster({ teamId: 67, seasonId: 20 });
  expect(result.data.items.map((player) => player.id)).toEqual([1, 2]);
  expect(result.data.total).toBe(2);
  expect(result.stale).toBe(true);
  const url = new URL(get.mock.calls[0][0], "https://example.test");
  expect(url.pathname).toBe("/team-competition-player-table");
  expect(url.searchParams.get("teamId")).toBe("67");
  expect(url.searchParams.get("seasonId")).toBe("20");
  expect(url.searchParams.get("type")).toBe("ALL");
  expect(url.searchParams.get("include")).toBe("player,competition");
  expect(get.mock.calls[1][0]).toContain("offset=2");
});
it("looks up only season team IDs, deduplicates all pages and caches for an hour", async () => {
  const get = vi
    .spyOn(apiCache, "get")
    .mockResolvedValueOnce(
      resource({ items: [{ team: { id: 67, name: "Prušánky" } }], total: 3 }),
    )
    .mockResolvedValueOnce({
      ...resource({
        items: [
          { team: { id: 67, name: "Prušánky" } },
          { team: { id: 68, name: "Prušánky B" } },
        ],
        total: 3,
      }),
      stale: true,
    });
  const result = await getPlayerTeams(3130, 20);
  expect(result.data.teamIds).toEqual([67, 68]);
  expect(result.stale).toBe(true);
  const url = new URL(get.mock.calls[0][0], "https://example.test");
  expect(url.pathname).toBe("/members/3130/player-stats");
  expect(url.searchParams.get("seasonId")).toBe("20");
  expect(url.searchParams.get("include")).toBe("team");
  expect(get.mock.calls[0][2]).toBe(3600000);
  expect(get.mock.calls[1][0]).toContain("offset=1");
});
it("returns no inferred team when a player has no published season stats", async () => {
  vi.spyOn(apiCache, "get").mockResolvedValue(
    resource({ items: [], total: 0 }),
  );
  expect((await getPlayerTeams(3130, 21)).data.teamIds).toEqual([]);
});
it("rejects an incomplete player team lookup instead of silently dropping teams", async () => {
  vi.spyOn(apiCache, "get").mockResolvedValue(
    resource({ items: [], total: 1 }),
  );
  await expect(getPlayerTeams(3130, 20)).rejects.toThrow();
});
it("migrates existing favourites without losing teams or leagues", () => {
  const saved = {
    version: 1,
    teams: [{ id: 1, name: "Tábor" }],
    leagues: [
      {
        id: 17,
        name: "Liga",
        slug: "liga",
        seasonId: 20,
        seasonName: "2026/27",
      },
    ],
  };
  expect(preferencesSchema.parse(saved)).toEqual({ ...saved, players: [] });
});
it("searches all name words and teams without diacritics", () => {
  const players = [
    { id: 1, firstName: "Martin", lastName: "Tesařík", teams: ["Tábor"] },
    { id: 2, firstName: "Jan", lastName: "Tesařík", teams: [] },
  ];
  expect(searchPlayers(players, "tesarik martin").map((p) => p.id)).toEqual([
    1,
  ]);
  expect(searchPlayers(players, "tabor").map((p) => p.id)).toEqual([1]);
  expect(playerSearchInput.safeParse({ q: "a", seasonId: 20 }).success).toBe(
    false,
  );
});
it("does not expose unrelated member or club data", () => {
  expect(
    profileSchema.parse({
      id: 1,
      firstName: "Jan",
      lastName: "Novák",
      age: 50,
      club: { id: 2, name: "Tábor", bankNo: "private" },
    }),
  ).toEqual({
    id: 1,
    firstName: "Jan",
    lastName: "Novák",
    club: { id: 2, name: "Tábor" },
  });
});
it("builds a shared complete directory, deduplicates players across teams, and reuses it", async () => {
  const get = vi
    .spyOn(apiCache, "get")
    .mockResolvedValueOnce(
      resource({
        items: [
          {
            player: { id: 1, firstName: "Jan", lastName: "Novák" },
            team: { id: 2, name: "Tábor" },
          },
        ],
        total: 2,
      }),
    )
    .mockResolvedValueOnce(
      resource({
        items: [
          {
            player: { id: 1, firstName: "Jan", lastName: "Novák" },
            team: { id: 3, name: "Písek" },
          },
        ],
        total: 2,
      }),
    );
  const [a, b] = await Promise.all([
    findPlayers({ seasonId: 90001, q: "novak", offset: 0 }),
    findPlayers({ seasonId: 90001, q: "pisek", offset: 0 }),
  ]);
  expect(a.data.total).toBe(1);
  expect(b.data.items[0].teams).toEqual(["Tábor", "Písek"]);
  expect(get).toHaveBeenCalledTimes(2);
  await findPlayers({ seasonId: 90001, q: "jan", offset: 0 });
  expect(get).toHaveBeenCalledTimes(2);
  expect(get.mock.calls[1][0]).toContain("offset=1");
});
it("filters both season boundaries and loads all history pages", async () => {
  const get = vi
    .spyOn(apiCache, "get")
    .mockResolvedValueOnce(
      resource({ items: [{ position: 1, totalPerformance: 0 }], total: 2 }),
    )
    .mockResolvedValueOnce(
      resource({ items: [{ position: 2, totalPerformance: 500 }], total: 2 }),
    );
  const result = await getPlayerHistory(3130, 20);
  expect(result.data.items).toHaveLength(2);
  const url = new URL(get.mock.calls[0][0], "https://example.test");
  expect(url.searchParams.get("seasonFromId")).toBe("20");
  expect(url.searchParams.get("seasonToId")).toBe("20");
  expect(get.mock.calls[1][0]).toContain("offset=1");
  expect(
    historySchema.parse({ position: 1, totalPerformance: 0 }).totalPerformance,
  ).toBe(0);
});
