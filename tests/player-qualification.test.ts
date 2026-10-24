import { describe, expect, it } from "vitest";
import {
  orderCompetitionPlayers,
  qualifyCompetitionPlayers,
  type CompetitionPlayerStanding,
} from "../src/domain/competition-player-standings";
import type { Match } from "../src/domain/models";

const row = (
  id: number,
  venuesPlayed: number,
  teamId = 53,
): CompetitionPlayerStanding => ({
  round: 6,
  type: "ALL",
  position: id,
  matches: venuesPlayed,
  venuesPlayed,
  averagePerformance: 650 - id * 10,
  player: { id },
  team: { id: teamId, name: "Tým" },
});
const match = (
  id: number,
  venueId: number,
  overrides: Partial<Match> = {},
): Match => ({
  id,
  slug: "zapas",
  round: 6,
  date: "2026-10-24",
  time: "10:00",
  status: "FINISHED",
  competition: { id: 16, name: "2. KLM A", slug: "2-klm-a" },
  homeTeam: { id: 53, name: "Tábor" },
  awayTeam: { id: 56, name: "Radlice" },
  venue: { id: venueId, name: "Kuželna" },
  ...overrides,
});
const qualify = (
  rows: CompetitionPlayerStanding[],
  matches: Match[],
  round = 6,
  type: "ALL" | "HOME" | "AWAY" = "ALL",
) => qualifyCompetitionPlayers(rows, matches, 16, round, type);

describe("3/5 qualification by distinct team venues", () => {
  it.each([1, 2, 3, 4, 5, 6, 7])(
    "rounds up the minimum for %i venues",
    (count) => {
      const required = Math.ceil((count * 3) / 5);
      const result = qualify(
        [row(1, required - 1), row(2, required)],
        Array.from({ length: count }, (_, i) => match(i, i)),
      );
      expect(result[0].qualification).toEqual({
        teamVenuesPlayed: count,
        requiredVenues: required,
        eligible: false,
      });
      expect(result[1].qualification?.eligible).toBe(true);
    },
  );
  it("counts repeated home venues once, includes a completed postponed fixture, excludes unfinished/future-round/other-competition matches", () => {
    const matches = [
      match(1, 43),
      match(2, 43),
      match(3, 44, { round: 2 }),
      match(4, 45, { status: "SCHEDULED" }),
      match(5, 46, { status: "IN_PROGRESS" }),
      match(6, 47, { round: 7 }),
      match(7, 48, { status: "FORFEIT" }),
      match(8, 49, { competition: { id: 99, name: "Jiná", slug: "jina" } }),
    ];
    expect(qualify([row(1, 1)], matches)[0].qualification).toEqual({
      teamVenuesPlayed: 2,
      requiredVenues: 2,
      eligible: false,
    });
    expect(
      qualify([row(1, 1)], matches, 2)[0].qualification?.teamVenuesPlayed,
    ).toBe(1);
  });
  it("uses each team's own venues and the selected home/away scope", () => {
    const matches = [
      match(1, 43),
      match(2, 44, {
        homeTeam: { id: 99, name: "Jiný" },
        awayTeam: { id: 53, name: "Tábor" },
      }),
    ];
    expect(
      qualify([row(1, 1)], matches, 6, "HOME")[0].qualification
        ?.teamVenuesPlayed,
    ).toBe(1);
    expect(
      qualify([row(1, 1)], matches, 6, "AWAY")[0].qualification
        ?.teamVenuesPlayed,
    ).toBe(1);
    expect(
      qualify([row(1, 1, 56)], matches)[0].qualification?.teamVenuesPlayed,
    ).toBe(1);
  });
  it("does not guess eligibility when venue data is missing or no games have finished", () => {
    expect(
      qualify([row(1, 1)], [match(1, 43, { venue: null })])[0].qualification,
    ).toBeNull();
    expect(
      qualify([{ ...row(1, 1), venuesPlayed: null }], [match(1, 43)])[0]
        .qualification,
    ).toBeNull();
    expect(
      qualify([row(1, 0)], [match(1, 43, { status: "SCHEDULED" })])[0]
        .qualification,
    ).toBeNull();
  });
  it("puts ineligible players below the line without numbering; keeps ties, official order and global rank through filtering", () => {
    const items = qualify(
      [
        row(1, 1),
        { ...row(2, 3), averagePerformance: 600 },
        { ...row(3, 4), averagePerformance: 600 },
        { ...row(4, 5), averagePerformance: 550 },
      ],
      Array.from({ length: 5 }, (_, i) => match(i, i)),
    );
    const ranked = orderCompetitionPlayers(items, "average");
    expect(ranked.map((r) => r.player.id)).toEqual([2, 3, 4, 1]);
    expect(ranked.map((r) => r.displayPosition)).toEqual([1, 1, 3, null]);
    expect(ranked.filter((r) => r.player.id === 4)[0].displayPosition).toBe(3);
    expect(
      orderCompetitionPlayers(items, "official").map((r) => r.displayPosition),
    ).toEqual([1, 2, 3, 4]);
  });
});
