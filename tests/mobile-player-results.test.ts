import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { MobilePlayerResults } from "../src/components/mobile-player-results";

it("renders names, substitutions and all score fields without losing zero values", () => {
  const markup = renderToStaticMarkup(
    createElement(MobilePlayerResults, {
      result: {
        isHome: true,
        totalPerformance: 594,
        teamPoints: 0,
        playerResults: [
          {
            position: 1,
            player: {
              id: 1,
              firstName: "Alexandra Marie",
              lastName: "Novotná-Dvořáková",
            },
            substitute: { id: 2, firstName: "Kateřina", lastName: "Černá" },
            substituteAtThrow: 61,
            totalPerformance: 594,
            totalFull: 375,
            totalSpare: 219,
            totalErrors: 0,
            teamPoints: 0,
          },
        ],
      },
    }),
  );
  expect(markup).toContain("Alexandra Marie Novotná-Dvořáková");
  expect(markup).toContain("Střídání: Kateřina Černá");
  expect(markup).toContain("hod 61");
  expect(markup).toContain("<dt>Plné</dt><dd>375</dd>");
  expect(markup).toContain("<dt>Dorážka</dt><dd>219</dd>");
  expect(markup).toContain("<dt>Chyby</dt><dd>0</dd>");
  expect(markup).toContain("<dt>Body</dt><dd>0</dd>");
  expect(markup).toContain("594");
});

it("distinguishes unpublished totals from zero", () => {
  const markup = renderToStaticMarkup(
    createElement(MobilePlayerResults, {
      result: {
        isHome: true,
        playerResults: [{ position: 1 }],
      },
    }),
  );
  expect(markup).toContain("Jméno není k dispozici");
  expect(markup).toContain("<dt>Plné</dt><dd>—</dd>");
  expect(markup).toContain("<dt>Body</dt><dd>—</dd>");
});
