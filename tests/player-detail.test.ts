import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LaneScore } from "../src/components/player-detail";
import { playerResultSchema } from "../src/domain/models";

const render = (total: number | null, setPoints: number | null) =>
  renderToStaticMarkup(
    createElement(LaneScore, { lane: { laneNumber: 1, total, setPoints } }),
  );
describe("lane results", () => {
  it("retains lane scores, missing data and zeroes without private fields", () => {
    const result = playerResultSchema.parse({
      position: 1,
      laneResults: [
        {
          laneNumber: 2,
          full: 0,
          spare: null,
          errors: 0,
          total: null,
          setPoints: 0.5,
          throws: [{ private: true }],
        },
      ],
    });
    expect(result.laneResults).toEqual([
      {
        laneNumber: 2,
        full: 0,
        spare: null,
        errors: 0,
        total: null,
        setPoints: 0.5,
      },
    ]);
  });
  it("highlights a full point and explicitly labels a half point", () => {
    expect(render(140, 1)).toContain("<strong>140</strong>");
    expect(render(140, 1)).toContain("lane-score-earned");
    expect(render(140, 0.5)).toContain("<strong>140</strong>");
    expect(render(140, 0.5)).toContain("½ bodu");
  });
  it("does not infer points from a high score or missing data", () => {
    expect(render(200, 0)).not.toContain("<strong>");
    expect(render(200, null)).not.toContain("lane-score-earned");
    expect(render(null, null)).toContain("—");
    expect(render(0, 0)).toContain(">0</span>");
  });
});
