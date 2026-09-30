import { z } from "zod";
import {
  collection,
  competitionSchema,
  matchSchema,
  seasonSchema,
  standingSchema,
  teamSchema,
} from "../domain/models";
import { orderMatchFeed } from "../domain/match-feed";
import { pragueMidnight, shiftDay } from "../lib/dates";
import { apiCache, UpstreamError } from "./cache";

export const dateInput = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T12:00:00Z`);
    return (
      !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
    );
  });
const optionalId = z.coerce.number().int().positive().optional();
export const matchFilters = z
  .object({
    from: dateInput,
    to: dateInput,
    competitionId: optionalId,
    daily: z.literal("1").optional(),
    favoriteCompetitionIds: z
      .string()
      .max(240)
      .regex(/^\d+(,\d+)*$/)
      .transform((value) => value.split(",").map(Number))
      .pipe(z.array(z.number().int().positive()).max(20))
      .optional(),
    teamId: optionalId,
    offset: z.coerce.number().int().min(0).max(10000).default(0),
  })
  .refine((data) => {
    const days = (Date.parse(data.to) - Date.parse(data.from)) / 86400000;
    return days >= 0 && days <= 30;
  }, "Choose a date range of at most 31 days.");

export async function getMatches(filters: z.infer<typeof matchFilters>) {
  // ČKA accepts whole seconds with an explicit offset, not JS fractional-second ISO strings.
  const apiDate = (value: string) => value.replace(/\.\d{3}Z$/, "+00:00");
  const query = new URLSearchParams({
    limit: "24",
    offset: String(filters.offset),
    sort: "date,time,id",
    dateFrom: apiDate(pragueMidnight(filters.from)),
    dateTo: apiDate(
      new Date(
        Date.parse(pragueMidnight(shiftDay(filters.to, 1))) - 1000,
      ).toISOString(),
    ),
    include:
      "homeTeam,homeTeam.club,awayTeam,awayTeam.club,competition,results",
  });
  if (filters.competitionId)
    query.set("competitionId", String(filters.competitionId));
  if (filters.teamId) query.set("teamId", String(filters.teamId));
  const favourites = new Set(filters.favoriteCompetitionIds ?? []);
  if (filters.competitionId || filters.teamId)
    return apiCache.get(`/matches?${query}`, collection(matchSchema));

  // Order the whole date range before taking the requested page. Upstream
  // date-sorted pages are shared in cache across users with different favourites.
  query.set("limit", "100");
  query.set("offset", "0");
  const first = await apiCache.get(
    `/matches?${query}`,
    collection(matchSchema),
  );
  const items = [...first.data.items];
  let stale = first.stale;
  let checkedAt = first.checkedAt;
  while (items.length < first.data.total) {
    query.set("offset", String(items.length));
    const next = await apiCache.get(
      `/matches?${query}`,
      collection(matchSchema),
    );
    if (!next.data.items.length) throw new UpstreamError(502);
    items.push(...next.data.items);
    stale ||= next.stale;
    if (next.checkedAt < checkedAt) checkedAt = next.checkedAt;
  }
  return {
    data: {
      items:
        filters.daily === "1"
          ? orderMatchFeed(items, favourites)
          : orderMatchFeed(items, favourites).slice(
              filters.offset,
              filters.offset + 24,
            ),
      total: first.data.total,
    },
    checkedAt,
    stale,
  };
}
export const teamSeasonFilters = z.object({
  teamId: z.coerce.number().int().positive(),
  seasonId: z.coerce.number().int().positive(),
});

export async function getTeamSeasonMatches(
  filters: z.infer<typeof teamSeasonFilters>,
) {
  const query = new URLSearchParams({
    teamId: String(filters.teamId),
    seasonId: String(filters.seasonId),
    limit: "100",
    sort: "date,time,id",
    include:
      "homeTeam,homeTeam.club,awayTeam,awayTeam.club,competition,results",
  });
  const first = await apiCache.get(
    `/matches?${query}`,
    collection(matchSchema),
  );
  const items = [...first.data.items];
  let stale = first.stale;
  let checkedAt = first.checkedAt;
  while (items.length < first.data.total) {
    query.set("offset", String(items.length));
    const next = await apiCache.get(
      `/matches?${query}`,
      collection(matchSchema),
    );
    if (!next.data.items.length) throw new UpstreamError(502);
    items.push(...next.data.items);
    stale ||= next.stale;
    if (next.checkedAt < checkedAt) checkedAt = next.checkedAt;
  }
  return { data: { items, total: first.data.total }, stale, checkedAt };
}

export function getMatch(id: number) {
  // Nested player relations work on the public endpoint, although the OpenAPI
  // include enum currently stops at results.playerResults (verified 2026-09-28).
  return apiCache.get(
    `/matches/${id}?include=homeTeam,homeTeam.club,awayTeam,awayTeam.club,competition,results,results.playerResults,results.playerResults.player,results.playerResults.substitute,venue`,
    matchSchema,
  );
}
export function getSeasons() {
  return apiCache.get("/seasons", collection(seasonSchema), 86400000);
}
export function getCompetitions(seasonId: number, offset = 0) {
  return apiCache.get(
    `/competitions?seasonId=${seasonId}&limit=100&offset=${offset}&sort=priority,name&include=regions`,
    collection(competitionSchema),
    300000,
  );
}
async function getRoundStandings(slug: string, round: number) {
  const path = `/competitions/${encodeURIComponent(slug)}/rounds/${round}/table?type=ALL&include=team,team.club&sort=position&limit=100`;
  const first = await apiCache.get(path, collection(standingSchema), 300000);
  const items = [...first.data.items];
  let stale = first.stale;
  let checkedAt = first.checkedAt;
  while (items.length < first.data.total) {
    const next = await apiCache.get(
      `${path}&offset=${items.length}`,
      collection(standingSchema),
      300000,
    );
    if (!next.data.items.length) throw new UpstreamError(502);
    items.push(...next.data.items);
    stale ||= next.stale;
    if (next.checkedAt < checkedAt) checkedAt = next.checkedAt;
  }
  return { ...first, stale, checkedAt, data: { ...first.data, items } };
}

export async function getStandings(slug: string, round: number) {
  async function read(candidate: number) {
    try {
      return await getRoundStandings(slug, candidate);
    } catch (error) {
      // A missing table is different from an outage or rate limit.
      if (error instanceof UpstreamError && error.status === 404) return null;
      throw error;
    }
  }
  const current = await read(round);
  if (current?.data.items.length)
    return { ...current, data: { ...current.data, round } };

  // Use the official round list rather than probing arbitrary round numbers.
  const rounds =
    round > 1
      ? await apiCache.get(
          `/competitions/${encodeURIComponent(slug)}/rounds`,
          z.array(z.number().int().positive()),
          300000,
        )
      : null;
  const previous = [...new Set(rounds?.data ?? [])]
    .filter((value) => value < round)
    .sort((a, b) => b - a);
  for (const candidate of previous) {
    const table = await read(candidate);
    if (table?.data.items.length) {
      return {
        ...table,
        stale: table.stale || !!current?.stale || !!rounds?.stale,
        data: { ...table.data, round: candidate },
      };
    }
  }
  return {
    checkedAt:
      current?.checkedAt ?? rounds?.checkedAt ?? new Date().toISOString(),
    stale: !!current?.stale || !!rounds?.stale,
    data: { items: [], total: 0, round: null },
  };
}

export function getTeam(id: number) {
  return apiCache.get(`/teams/${id}?include=club`, teamSchema, 86400000);
}
