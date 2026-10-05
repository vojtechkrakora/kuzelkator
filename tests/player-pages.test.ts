import { afterEach, expect, it, vi } from "vitest";
import { apiCache } from "../src/server/cache";
import {
  findPlayers,
  getPlayerHistory,
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
