import type { z } from "zod";
import type { Resource } from "../domain/models";

export class UpstreamError extends Error {
  constructor(
    public status: number,
    message = "Oficiální výsledky teď nejsou dostupné.",
    public retryAfter?: string,
  ) {
    super(message);
  }
}
type Entry = { data: unknown; checked: number; etag: string | null };

/** Process-local, bounded cache. No upstream cookies or private credentials are used. */
export class ApiCache {
  private entries = new Map<string, Entry>();
  private pending = new Map<string, Promise<Resource<unknown>>>();
  private blockedUntil = 0;
  private active = 0;
  private queue: (() => void)[] = [];
  constructor(
    private request: typeof fetch = fetch,
    private now = Date.now,
    private capacity = 300,
  ) {}

  async get<T>(
    path: string,
    schema: z.ZodType<T>,
    ttl = 60000,
  ): Promise<Resource<T>> {
    const existing = this.entries.get(path);
    if (existing && this.now() - existing.checked < ttl)
      return this.resource(existing, false) as Resource<T>;
    const pending = this.pending.get(path);
    if (pending) return pending as Promise<Resource<T>>;
    const operation = this.load(path, schema, existing).finally(() =>
      this.pending.delete(path),
    );
    this.pending.set(path, operation);
    return operation;
  }
  private resource(entry: Entry, stale: boolean): Resource<unknown> {
    return {
      data: entry.data,
      checkedAt: new Date(entry.checked).toISOString(),
      stale,
    };
  }
  private async load<T>(
    path: string,
    schema: z.ZodType<T>,
    existing?: Entry,
  ): Promise<Resource<T>> {
    if (this.active >= 4) {
      if (this.queue.length >= 40) throw new UpstreamError(503);
      await new Promise<void>((resolve) => this.queue.push(resolve));
    } else this.active++;
    try {
      if (this.blockedUntil > this.now())
        throw new UpstreamError(
          429,
          undefined,
          String(Math.ceil((this.blockedUntil - this.now()) / 1000)),
        );
      const response = await this.request(
        `https://kuzelky.cz/api/v1/public${path}`,
        {
          headers: {
            Accept: "application/json",
            ...(existing?.etag ? { "If-None-Match": existing.etag } : {}),
          },
          signal: AbortSignal.timeout(10000),
          cache: "no-store",
          redirect: "error",
        },
      );
      let entry: Entry;
      if (response.status === 304 && existing)
        entry = { ...existing, checked: this.now() };
      else {
        if (!response.ok) {
          const retry = response.headers.get("retry-after");
          if (response.status === 429 || response.status === 503) {
            const delay = retry
              ? /^\d+$/.test(retry)
                ? Number(retry) * 1000
                : Date.parse(retry) - this.now()
              : 60000;
            this.blockedUntil =
              this.now() +
              Math.max(1000, Number.isFinite(delay) ? delay : 60000);
          }
          throw new UpstreamError(
            response.status,
            undefined,
            retry ?? undefined,
          );
        }
        entry = {
          data: schema.parse(await response.json()),
          checked: this.now(),
          etag: response.headers.get("etag"),
        };
      }
      this.entries.delete(path);
      this.entries.set(path, entry);
      if (this.entries.size > this.capacity)
        this.entries.delete(this.entries.keys().next().value!);
      return this.resource(entry, false) as Resource<T>;
    } catch (error) {
      const temporary =
        !(error instanceof UpstreamError) ||
        error.status === 429 ||
        error.status >= 500;
      if (temporary && existing && this.now() - existing.checked < 86400000)
        return this.resource(existing, true) as Resource<T>;
      if (error instanceof UpstreamError) throw error;
      console.error(
        "ČKA request failed",
        path.split("?")[0],
        error instanceof Error ? error.name : "Unknown",
      );
      throw new UpstreamError(502);
    } finally {
      const next = this.queue.shift();
      if (next) next();
      else this.active--;
    }
  }
}
export const apiCache = new ApiCache();
