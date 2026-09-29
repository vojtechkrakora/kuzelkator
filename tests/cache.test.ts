import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { ApiCache } from "../src/server/cache";

const schema = z.object({ value: z.number() });
const response = () => Response.json({ value: 0 }, { headers: { ETag: "v1" } });
describe("upstream cache", () => {
  it("deduplicates concurrent reads and sends the ETag on revalidation", async () => {
    let now = 100000;
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(response())
      .mockResolvedValueOnce(new Response(null, { status: 304 }));
    const cache = new ApiCache(fetcher, () => now);
    const [a, b] = await Promise.all([
      cache.get("/test", schema),
      cache.get("/test", schema),
    ]);
    expect(a).toEqual(b);
    expect(fetcher).toHaveBeenCalledTimes(1);
    now += 61000;
    expect((await cache.get("/test", schema)).data.value).toBe(0);
    expect(fetcher.mock.calls[1][1]?.headers).toMatchObject({
      "If-None-Match": "v1",
    });
  });
  it("serves marked stale data on a temporary failure, but not after 24 hours", async () => {
    let now = 100000;
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(response())
      .mockResolvedValue(new Response(null, { status: 500 }));
    const cache = new ApiCache(fetcher, () => now);
    const initial = await cache.get("/test", schema);
    now += 61000;
    expect(await cache.get("/test", schema)).toEqual({
      ...initial,
      stale: true,
    });
    now += 86400000;
    await expect(cache.get("/test", schema)).rejects.toMatchObject({
      status: 500,
    });
  });
  it("honours upstream rate-limit cooldown across keys", async () => {
    let now = 100000;
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(null, { status: 429, headers: { "Retry-After": "120" } }),
      )
      .mockResolvedValueOnce(response());
    const cache = new ApiCache(fetcher, () => now);
    await expect(cache.get("/a", schema)).rejects.toMatchObject({
      status: 429,
    });
    await expect(cache.get("/b", schema)).rejects.toMatchObject({
      status: 429,
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
    now += 121000;
    expect((await cache.get("/b", schema)).data.value).toBe(0);
  });
  it("does not hide a not-found response behind stale data", async () => {
    let now = 100000;
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(response())
      .mockResolvedValueOnce(new Response(null, { status: 404 }));
    const cache = new ApiCache(fetcher, () => now);
    await cache.get("/test", schema);
    now += 61000;
    await expect(cache.get("/test", schema)).rejects.toMatchObject({
      status: 404,
    });
  });
  it("bounds concurrency and cache size", async () => {
    let active = 0,
      peak = 0;
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 10));
      active--;
      return response();
    });
    const cache = new ApiCache(fetcher, Date.now, 2);
    await Promise.all(
      Array.from({ length: 8 }, (_, i) => cache.get(`/${i}`, schema)),
    );
    expect(peak).toBe(4);
    await cache.get("/0", schema);
    expect(fetcher).toHaveBeenCalledTimes(9);
  });
});
