import { z } from "zod";
import {
  collection,
  competitionSchema,
  matchSchema,
  seasonSchema,
  standingSchema,
} from "../domain/models";
import { pragueMidnight, shiftDay } from "../lib/dates";
import { apiCache } from "./cache";

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
    teamId: optionalId,
    offset: z.coerce.number().int().min(0).max(10000).default(0),
  })
  .refine((data) => {
    const days = (Date.parse(data.to) - Date.parse(data.from)) / 86400000;
    return days >= 0 && days <= 30;
  }, "Choose a date range of at most 31 days.");

export function getMatches(filters: z.infer<typeof matchFilters>) {
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
    include: "homeTeam,awayTeam,competition,results",
  });
  if (filters.competitionId)
    query.set("competitionId", String(filters.competitionId));
  if (filters.teamId) query.set("teamId", String(filters.teamId));
  return apiCache.get(`/matches?${query}`, collection(matchSchema));
}
export function getMatch(id: number) {
  // Nested player relations work on the public endpoint, although the OpenAPI
  // include enum currently stops at results.playerResults (verified 2026-09-28).
  return apiCache.get(
    `/matches/${id}?include=homeTeam,awayTeam,competition,results,results.playerResults,results.playerResults.player,results.playerResults.substitute,venue`,
    matchSchema,
  );
}
export function getSeasons() {
  return apiCache.get("/seasons", collection(seasonSchema), 86400000);
}
export function getCompetitions(seasonId: number, offset = 0) {
  return apiCache.get(
    `/competitions?seasonId=${seasonId}&limit=100&offset=${offset}&sort=priority,name`,
    collection(competitionSchema),
    300000,
  );
}
export function getStandings(slug: string, round: number) {
  return apiCache.get(
    `/competitions/${encodeURIComponent(slug)}/rounds/${round}/table?type=ALL&include=team&sort=position`,
    collection(standingSchema),
    300000,
  );
}
