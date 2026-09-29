import { describe, expect, it } from "vitest";
import {
  competitionLevel,
  discoverCompetitions,
} from "../src/domain/competition-discovery";
const south = { id: 31, name: "Jihočeský kraj" };
const highlands = { id: 63, name: "Kraj Vysočina" };
const items = [
  { id: 68, name: "OP Tábor", slug: "op-tabor", regions: [south] },
  { id: 62, name: "Krajský přebor JČK 1", slug: "kp", regions: [south] },
  {
    id: 13,
    name: "Divize Jih",
    slug: "divize-jih",
    regions: [south, highlands],
  },
  {
    id: 39,
    name: "Jihomoravská divize",
    slug: "jmk",
    regions: [{ id: 64, name: "Jihomoravský kraj" }],
  },
  {
    id: 12,
    name: "1. KLM",
    slug: "klm",
    category: "LEAGUE_COMPETITION",
    regions: [{ id: 1, name: "Celá ČR" }],
  },
  { id: 99, name: "Nová soutěž", slug: "new" },
];
describe("competition discovery", () => {
  it("uses official areas and retains shared divisions in both areas", () => {
    expect(
      discoverCompetitions(items, "31", "all", "").map((x) => x.id),
    ).toEqual([68, 62, 13]);
    expect(
      discoverCompetitions(items, "63", "all", "").map((x) => x.id),
    ).toEqual([13]);
  });
  it("finds town names and regions without diacritics", () => {
    expect(discoverCompetitions(items, "", "all", " tabor ")[0].id).toBe(68);
    expect(discoverCompetitions(items, "", "division", "jihocesky")[0].id).toBe(
      13,
    );
  });
  it("separates tiers and leaves unknown metadata discoverable", () => {
    expect(items.map(competitionLevel)).toEqual([
      "district",
      "regional",
      "division",
      "division",
      "national",
      "other",
    ]);
    expect(discoverCompetitions(items, "", "all", "")).toHaveLength(6);
    expect(discoverCompetitions(items, "31", "national", "")).toHaveLength(0);
  });
});
