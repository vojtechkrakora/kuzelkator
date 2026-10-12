import { afterEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  vi.resetModules();
});
it("three OBS sources share the full match cache, including simultaneous expiry refresh", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-12T08:00:00Z"));
  const request = vi
    .fn()
    .mockImplementation(async () =>
      Response.json({
        id: 513,
        slug: "test",
        date: null,
        time: null,
        round: null,
        status: "IN_PROGRESS",
        results: [],
      }),
    );
  vi.stubGlobal("fetch", request);
  vi.resetModules();
  const { GET } = await import("../src/app/api/data/route");
  const sources = () =>
    Promise.all(
      ["home", "away", "score"].map((panel) =>
        GET(
          new NextRequest(
            `http://localhost/api/data?kind=match&id=513&panel=${panel}`,
          ),
        ),
      ),
    );
  const results = await sources();
  expect(results.every((r) => r.status === 200)).toBe(true);
  expect(request).toHaveBeenCalledTimes(1);
  expect(request.mock.calls[0][0]).toContain("/matches/513?fullLineup=true");
  await vi.advanceTimersByTimeAsync(15000);
  await sources();
  expect(request).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(46000);
  await sources();
  expect(request).toHaveBeenCalledTimes(2);
});
it("rejects unsafe, missing and non-positive match IDs before contacting upstream", async () => {
  const request = vi.fn();
  vi.stubGlobal("fetch", request);
  vi.resetModules();
  const { GET } = await import("../src/app/api/data/route");
  for (const id of ["0", "-1", "abc", "9007199254740992", ""])
    expect(
      (
        await GET(
          new NextRequest(`http://localhost/api/data?kind=match&id=${id}`),
        )
      ).status,
    ).toBe(400);
  expect(request).not.toHaveBeenCalled();
});
