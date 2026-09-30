import { describe, expect, it } from "vitest";
import type { Match } from "../src/domain/models";
import {
  orderMatchFeed,
  groupMatchFeed,
  sampleDayMatches,
} from "../src/domain/match-feed";
import { feedDayLabel } from "../src/lib/dates";
const match = (
  id: number,
  date: string | null,
  league: number,
  name: string,
  time = "14:00",
): Match => ({
  id,
  date,
  time,
  round: 1,
  slug: `m-${id}`,
  status: "SCHEDULED",
  competition: { id: league, name, slug: `c-${league}` },
});
const items = [
  match(1, "2026-10-01", 22, "Oblíbená"),
  match(2, "2026-09-30", 17, "2. liga"),
  match(3, "2026-09-30", 22, "Oblíbená"),
  match(4, "2026-09-29", 17, "2. liga"),
  match(5, "2026-09-30", 17, "2. liga", "10:00"),
];
describe("day and league feed", () => {
  it("puts dates before favourite priority, then groups league matches by time", () => {
    expect(orderMatchFeed(items, new Set([22])).map((x) => x.id)).toEqual([
      4, 3, 5, 2, 1,
    ]);
  });
  it("uses the same chronological layout and default league order without favourites", () => {
    expect(orderMatchFeed(items, new Set()).map((x) => x.id)).toEqual([
      4, 5, 2, 3, 1,
    ]);
  });
  it("keeps identical league names separate and supports undated fixtures", () => {
    const sorted = orderMatchFeed(
      [
        ...items,
        match(6, null, 17, "2. liga"),
        match(7, "2026-09-30", 99, "2. liga"),
      ],
      new Set(),
    );
    const groups = groupMatchFeed(sorted);
    expect([...groups.keys()]).toEqual([
      "2026-09-29",
      "2026-09-30",
      "2026-10-01",
      "",
    ]);
    expect(groups.get("2026-09-30")?.size).toBe(3);
  });
  it("labels yesterday, today and tomorrow while retaining the date", () => {
    expect(feedDayLabel("2026-09-29", "2026-09-30")).toContain("Včera ·");
    expect(feedDayLabel("2026-09-30", "2026-09-30")).toContain("Dnes ·");
    expect(feedDayLabel("2026-10-01", "2026-09-30")).toContain("Zítra ·");
    expect(feedDayLabel("", "2026-09-30")).toBe("Termín bude upřesněn");
  });
});

describe("day preview sample", () => {
  it("selects two distinct matches and keeps them stable when data is refreshed", () => {
    const preview = sampleDayMatches(items, 1234);
    expect(preview).toHaveLength(2);
    expect(new Set(preview.map((item) => item.id)).size).toBe(2);
    expect(
      sampleDayMatches(
        items.map((item) => ({ ...item })),
        1234,
      ),
    ).toEqual(preview);
    expect(preview).toEqual(
      items.filter((item) =>
        preview.some((selected) => selected.id === item.id),
      ),
    );
    expect(
      new Set(
        Array.from({ length: 20 }, (_, seed) =>
          sampleDayMatches(items, seed)
            .map((item) => item.id)
            .join(","),
        ),
      ).size,
    ).toBeGreaterThan(1);
  });
  it("always chooses a same-league pair when available", () => {
    const day = [
      match(1, "2026-09-30", 1, "A"),
      match(2, "2026-09-30", 2, "B"),
      match(3, "2026-09-30", 2, "B"),
      match(4, "2026-09-30", 3, "C"),
      match(5, "2026-09-30", 3, "C"),
    ];
    const chosen = new Set<number>();
    for (let seed = 0; seed < 50; seed++) {
      const preview = sampleDayMatches(day, seed);
      expect(preview).toHaveLength(2);
      expect(preview[0].competition?.id).toBe(preview[1].competition?.id);
      expect(preview[0].competition?.id).not.toBe(1);
      chosen.add(preview[0].competition!.id);
    }
    expect(chosen.size).toBe(2);
  });
  it("still offers two matches when every league has only one", () => {
    const day = [
      match(1, "2026-09-30", 1, "A"),
      match(2, "2026-09-30", 2, "B"),
      match(3, "2026-09-30", 3, "C"),
    ];
    expect(sampleDayMatches(day, 123)).toHaveLength(2);
  });
  it("handles days with fewer than two matches", () => {
    expect(sampleDayMatches([], 123)).toEqual([]);
    expect(sampleDayMatches(items.slice(0, 1), 123)).toEqual(items.slice(0, 1));
    expect(sampleDayMatches(items.slice(0, 2), 123)).toEqual(items.slice(0, 2));
  });
});
