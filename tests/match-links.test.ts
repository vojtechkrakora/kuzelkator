import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { matchSchema } from "../src/domain/models";
import { videoHref, venueLinks } from "../src/lib/match-links";
import { MatchInformation } from "../src/components/match-information";

it("only exposes absolute HTTP(S) video links without credentials", () => {
  expect(videoHref(" https://www.youtube.com/watch?v=example ")).toBe(
    "https://www.youtube.com/watch?v=example",
  );
  for (const value of [
    undefined,
    null,
    "",
    "javascript:alert(1)",
    "data:text/html,test",
    "//example.com",
    "/video",
    "https://user:password@example.com",
    "not a url",
  ])
    expect(videoHref(value)).toBeNull();
});
it("uses the match venue coordinates and preserves valid zero coordinates", () => {
  const result = venueLinks({
    name: "Kuželna",
    street: "U Stadionu 420",
    city: "Bohušovice",
    gpsLat: "50.4941014",
    gpsLong: "14.1459516",
  });
  expect(new URL(result.directions!).searchParams.get("destination")).toBe(
    "50.4941014,14.1459516",
  );
  expect(result.address).toBe("U Stadionu 420, Bohušovice");
  expect(
    new URL(
      venueLinks({ name: "Venue", gpsLat: 0, gpsLong: 0 }).directions!,
    ).searchParams.get("destination"),
  ).toBe("0,0");
});
it("falls back to a correctly encoded full address for invalid or missing coordinates", () => {
  for (const gpsLat of [undefined, null, "", " ", "NaN", "91", "0x20"]) {
    const result = venueLinks({
      name: "TJ A & B",
      street: "Náměstí 1",
      city: "Tábor",
      zip: "390 01",
      gpsLat,
      gpsLong: "14",
    });
    const url = new URL(result.directions!);
    expect(url.searchParams.get("api")).toBe("1");
    expect(url.searchParams.get("destination")).toBe(
      "TJ A & B, Náměstí 1, 390 01 Tábor",
    );
  }
});
it("does not offer navigation to a vague or incomplete location", () => {
  for (const venue of [
    null,
    undefined,
    { name: "Kuželna" },
    { name: "Kuželna", city: "Tábor" },
    { name: "Kuželna", gpsLat: "50", gpsLong: "181" },
    { name: "Kuželna", gpsLat: "50" },
  ])
    expect(venueLinks(venue).directions).toBeNull();
});
it("retains new API fields and renders accessible actions with address and official details", () => {
  const match = matchSchema.parse({
    id: 513,
    slug: "match",
    date: null,
    time: null,
    round: 4,
    status: "FINISHED",
    videoUrl: "https://youtu.be/example",
    refereeName: "Devera Josef",
    venue: {
      id: 80,
      name: "Bohušovice",
      street: "U Stadionu 420",
      city: "Bohušovice nad Ohří",
      zip: "411 56",
      gpsLat: "50.4941014",
      gpsLong: "14.1459516",
      alleys: "4",
    },
  });
  const html = renderToStaticMarkup(createElement(MatchInformation, { match }));
  expect(html).toContain("Video zápasu");
  expect(html).toContain("Navigovat");
  expect(html).toContain("U Stadionu 420");
  expect(html).toContain("Počet drah: 4");
  expect(html).toContain("Rozhodčí: Devera Josef");
  expect(html).toContain('rel="noopener noreferrer"');
  expect(html).not.toContain("Živě");
  const missing = renderToStaticMarkup(
    createElement(MatchInformation, {
      match: {
        ...match,
        videoUrl: "javascript:alert(1)",
        venue: { name: "Kuželna", city: "Tábor" },
        refereeName: null,
      },
    }),
  );
  expect(missing).not.toContain("href=");
  expect(missing).toContain("Tábor");
});
