import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  matchSchema,
  playerResultSchema,
  resultFor,
} from "../src/domain/models";
import { PlayerIdentity } from "../src/components/player-identity";
import { getMatch } from "../src/server/cka";
import { apiCache } from "../src/server/cache";

const identity = { id: 3130, firstName: "Martin", lastName: "Tesařík" };
const render = (result: unknown) =>
  renderToStaticMarkup(
    createElement(PlayerIdentity, { result: playerResultSchema.parse(result) }),
  );

describe("player identities", () => {
  it("retains names on the correct team and position, without retaining unrelated member fields", () => {
    const match = matchSchema.parse({
      id: 640,
      slug: "test",
      date: "2026-09-26",
      time: null,
      round: 3,
      status: "FINISHED",
      results: [
        {
          isHome: false,
          playerResults: [
            {
              position: 1,
              player: { id: 2590, firstName: "Jakub", lastName: "Flek" },
            },
          ],
        },
        {
          isHome: true,
          playerResults: [
            {
              position: 1,
              player: { ...identity, age: 42 },
              totalPerformance: 594,
            },
          ],
        },
      ],
    });
    const home = resultFor(match, true)?.playerResults?.[0];
    expect(home?.player).toEqual(identity);
    expect(home?.totalPerformance).toBe(594);
    expect(render(home)).toContain("Martin Tesařík");
    expect(render(resultFor(match, false)?.playerResults?.[0])).toContain(
      "Jakub Flek",
    );
  });

  it("distinguishes missing names from an empty lineup position", () => {
    for (const player of [
      undefined,
      null,
      { id: 1, firstName: null, lastName: "" },
    ]) {
      expect(render({ position: 1, player })).toContain(
        "Jméno není k dispozici",
      );
    }
    const empty = render({ position: 1, isEmpty: true, player: identity });
    expect(empty).toContain("Neobsazená pozice");
    expect(empty).not.toContain("Martin");
  });

  it("shows both players when the API supplies a substitution", () => {
    const text = render({
      position: 2,
      player: identity,
      substitute: { id: 2, firstName: "Jan", lastName: "Novák" },
      substituteAtThrow: 61,
    });
    expect(text).toContain("Martin Tesařík");
    expect(text).toContain("Střídání: Jan Novák");
    expect(text).toContain("hod 61");
  });

  it("requests identities in the same match request, without guessing names from scores", async () => {
    const request = vi
      .spyOn(apiCache, "get")
      .mockResolvedValue({ data: {}, checkedAt: "", stale: false });
    try {
      await getMatch(640);
      const url = new URL(request.mock.calls[0][0], "https://example.test");
      expect(url.searchParams.get("include")?.split(",")).toEqual(
        expect.arrayContaining([
          "results.playerResults.player",
          "results.playerResults.substitute",
        ]),
      );
      expect(request).toHaveBeenCalledTimes(1);
    } finally {
      request.mockRestore();
    }
  });
});
