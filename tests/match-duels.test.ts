import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MatchDuels, MatchDuelDetails } from "../src/components/match-duels";
import type { Match } from "../src/domain/models";

const person = (id: number) => ({
  id,
  firstName: `Hráč ${id}`,
  lastName: "Test",
});
const player = (position: number, id: number) => ({
  position,
  player: person(id),
  isEmpty: false,
  substitute: null,
  substituteAtThrow: null,
  totalPerformance: 500,
  totalErrors: 0,
  teamPoints: 0.5,
  setPoints: 1,
  laneResults: [
    {
      laneNumber: 2,
      total: 250,
      full: 180,
      spare: 70,
      errors: 0,
      setPoints: 0.5,
    },
    {
      laneNumber: 1,
      total: 250,
      full: 180,
      spare: 70,
      errors: 0,
      setPoints: 0.5,
    },
  ],
});
function match(): Match {
  return {
    id: 1,
    slug: "test",
    date: null,
    time: null,
    round: null,
    status: "FINISHED",
    discipline: "T100",
    results: [
      {
        isHome: true,
        substitutions: [],
        playerResults: [player(2, 2), player(1, 1)],
      },
      { isHome: false, substitutions: [], playerResults: [player(1, 11)] },
    ],
  };
}
describe("compact match details", () => {
  it("pairs and sorts by lineup position with an explicit missing opponent; initially closed", () => {
    const html = renderToStaticMarkup(
      createElement(MatchDuels, { match: match() }),
    );
    expect(html).toContain("Duel 1: Hráč 1 Test proti Hráč 11 Test");
    expect(html).toContain("Duel 2: Hráč 2 Test proti Hosté");
    expect(html.indexOf("Duel 1:")).toBeLessThan(html.indexOf("Duel 2:"));
    expect(html.match(/aria-expanded="false"/g)).toHaveLength(2);
    expect(html).not.toContain('class="duel-lane"');
  });
  it("renders only published T100 lanes, sorted; preserves zeroes, half points and missing values", () => {
    const m = match();
    const html = renderToStaticMarkup(
      createElement(MatchDuelDetails, {
        left: m.results![0].playerResults![0],
        home: m.results![0],
        seasonId: 20,
      }),
    );
    expect(html).toContain("Dráha 1");
    expect(html).toContain("Dráha 2");
    expect(html).not.toContain("Dráha 3");
    expect(html.indexOf('aria-label="Dráha 1"')).toBeLessThan(
      html.indexOf('aria-label="Dráha 2"'),
    );
    expect(html).toContain("½ bodu");
    expect(html).toContain("<dd>0</dd>");
    expect(html).toContain("<dd>—</dd>");
    expect(html).toContain("/players/2?season=20");
  });
  it("shows all substitution participants and throws, including chains", () => {
    const m = match(),
      home = m.results![0];
    home.substitutions = [
      { id: 1, playerOut: person(1), playerIn: person(3), throwNumber: 31 },
      { id: 2, playerOut: person(3), playerIn: person(4), throwNumber: 61 },
    ];
    const html = renderToStaticMarkup(
      createElement(MatchDuelDetails, { left: home.playerResults![1], home }),
    );
    for (const id of [1, 3, 4]) expect(html).toContain(`/players/${id}`);
    expect(html).toContain("od 31. hodu");
    expect(html).toContain("od 61. hodu");
    expect(html).toContain("společný");
  });
  it("shows an empty state without inventing duels or best performances for stale data", () => {
    expect(
      renderToStaticMarkup(
        createElement(MatchDuels, { match: { ...match(), results: [] } }),
      ),
    ).toContain("Individuální výsledky zatím nejsou zveřejněné");
    expect(
      renderToStaticMarkup(
        createElement(MatchDuels, { match: match(), stale: true }),
      ),
    ).not.toContain("social-best-label");
  });
});
