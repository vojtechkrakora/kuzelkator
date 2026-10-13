import { afterEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  officialDocumentHref,
  officialArticleHref,
  resourceDate,
} from "../src/domain/competition-resources";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});
it("resolves official relative document paths and rejects executable or credential links", () => {
  expect(officialDocumentHref("/data/soupisky podzim.pdf")).toBe(
    "https://kuzelky.cz/data/soupisky%20podzim.pdf",
  );
  expect(officialDocumentHref("https://evidence.kuzelky.cz/file.pdf")).toBe(
    "https://evidence.kuzelky.cz/file.pdf",
  );
  for (const value of [
    null,
    "",
    "  ",
    "javascript:alert(1)",
    "data:text/html,hi",
    "https://user:pass@example.com/file",
  ])
    expect(officialDocumentHref(value)).toBeNull();
  expect(officialArticleHref("zprava/../test")).toBe(
    "https://kuzelky.cz/zpravodajstvi/zprava%2F..%2Ftest.html",
  );
  expect(resourceDate("invalid")).toBeNull();
  expect(resourceDate("2026-10-08T23:30:00Z")).toContain("9.");
});
it("shares selected competition metadata and only returns minimal visible article data", async () => {
  const request = vi.fn(async (url: string | URL | Request) =>
    String(url).includes("/articles?")
      ? Response.json({
          items: [
            {
              id: 3,
              title: "Zpráva",
              slug: "zprava",
              publishedAt: null,
              body: "<script>bad()</script>",
              perex: "private content",
            },
          ],
          total: 1,
        })
      : Response.json({
          id: 16,
          attachments: [
            { url: "/file.pdf", filename: "Soupiska", size: "10 KB" },
          ],
        }),
  );
  vi.stubGlobal("fetch", request);
  vi.resetModules();
  const { GET } = await import("../src/app/api/data/route");
  const read = (q: string) =>
    GET(new NextRequest(`http://localhost/api/data?${q}`));
  const [first, second] = await Promise.all([
    read("kind=competition-documents&slug=2-klm-a"),
    read("kind=competition-documents&slug=2-klm-a"),
  ]);
  expect(first.status).toBe(200);
  expect(second.status).toBe(200);
  expect(request).toHaveBeenCalledTimes(1);
  const news = await (await read("kind=competition-articles&id=16")).json();
  expect(news.data.items[0]).not.toHaveProperty("body");
  expect(news.data.items[0]).not.toHaveProperty("perex");
  expect(String(request.mock.calls[1][0])).toContain(
    "competitionId=16&visible=true&sort=-publishedAt&limit=5",
  );
});
it("rejects invalid resource filters without an upstream call", async () => {
  const request = vi.fn();
  vi.stubGlobal("fetch", request);
  vi.resetModules();
  const { GET } = await import("../src/app/api/data/route");
  for (const q of [
    "kind=competition-documents&slug=../x",
    "kind=competition-documents",
    "kind=competition-articles&id=0",
    "kind=competition-articles&id=9007199254740992",
  ])
    expect(
      (await GET(new NextRequest(`http://localhost/api/data?${q}`))).status,
    ).toBe(400);
  expect(request).not.toHaveBeenCalled();
});

it.each([true, false])(
  "documents and standings share detail without stripping cached fields (documents first: %s)",
  async (documentsFirst) => {
    const request = vi.fn(async (url: string | URL | Request) => {
      if (String(url).includes("/schedule"))
        return Response.json({ items: [], total: 0 });
      return Response.json({
        id: 16,
        attachments: [{ url: "/soupiska.pdf", filename: "Soupiska" }],
      });
    });
    vi.stubGlobal("fetch", request);
    vi.resetModules();
    const { getStandings } = await import("../src/server/cka");
    const { getCompetitionDocuments } =
      await import("../src/server/competition-resources");
    if (documentsFirst) await getCompetitionDocuments("test");
    await getStandings("test");
    const documents = await getCompetitionDocuments("test");
    expect(documents.data.id).toBe(16);
    expect(documents.data.attachments[0].filename).toBe("Soupiska");
    expect(
      request.mock.calls.filter(([url]) =>
        String(url).endsWith("/competitions/test"),
      ),
    ).toHaveLength(1);
    expect(
      request.mock.calls.some(([url]) =>
        String(url).includes("/competitions/16/schedule"),
      ),
    ).toBe(true);
  },
);
