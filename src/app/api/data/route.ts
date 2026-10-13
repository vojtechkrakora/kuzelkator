import { getTeamRecords, teamRecordsInput } from "@/server/team-records";

import { getCompetitionPlayerStandings } from "@/server/competition-player-standings";
import {
  getCompetitionDocuments,
  getCompetitionArticles,
} from "@/server/competition-resources";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getMatch,
  getCompetitions,
  getMatchDays,
  dateInput,
  getMatches,
  getTeamSeasonMatches,
  teamSeasonFilters,
  getSeasons,
  getTeam,
  getStandings,
  matchFilters,
} from "@/server/cka";
import { UpstreamError } from "@/server/cache";

import {
  findPlayers,
  getPlayerHistory,
  getPlayerStatistics,
  getTeamRoster,
  getTeamPlayerStatistics,
  teamPlayerStatsInput,
  getPlayerTeams,
  playerSearchInput,
  teamRosterInput,
} from "@/server/players";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const params = Object.fromEntries(request.nextUrl.searchParams);
  try {
    let result;
    switch (params.kind) {
      case "match":
        result = await getMatch(
          z.coerce
            .number()
            .int()
            .positive()
            .max(Number.MAX_SAFE_INTEGER)
            .parse(params.id),
        );
        break;
      case "player-search":
        result = await findPlayers(playerSearchInput.parse(params));
        break;
      case "team-roster":
        result = await getTeamRoster(teamRosterInput.parse(params));
        break;
      case "team-player-statistics":
        result = await getTeamPlayerStatistics(
          teamPlayerStatsInput.parse(params),
        );
        break;
      case "player-teams":
      case "player-statistics":
      case "player-history": {
        const input = z
          .object({
            id: z.coerce.number().int().positive(),
            seasonId: z.coerce.number().int().positive(),
          })
          .parse(params);
        result = await (
          params.kind === "player-teams"
            ? getPlayerTeams
            : params.kind === "player-statistics"
              ? getPlayerStatistics
              : getPlayerHistory
        )(input.id, input.seasonId);
        break;
      }
      case "team":
        result = await getTeam(
          z.coerce.number().int().positive().parse(params.id),
        );
        break;
      case "seasons":
        result = await getSeasons();
        break;
      case "competitions": {
        const input = z
          .object({
            seasonId: z.coerce.number().int().positive(),
            offset: z.coerce.number().int().min(0).max(10000).default(0),
          })
          .parse(params);
        result = await getCompetitions(input.seasonId, input.offset);
        break;
      }
      case "competition-documents":
        result = await getCompetitionDocuments(
          z
            .string()
            .regex(/^[a-z0-9-]{1,180}$/)
            .parse(params.slug),
        );
        break;
      case "competition-articles":
        result = await getCompetitionArticles(
          z.coerce
            .number()
            .int()
            .positive()
            .max(Number.MAX_SAFE_INTEGER)
            .parse(params.id),
        );
        break;
      case "team-records":
        result = await getTeamRecords(teamRecordsInput.parse(params));
        break;
      case "team-season":
        result = await getTeamSeasonMatches(teamSeasonFilters.parse(params));
        break;
      case "match-days":
        result = await getMatchDays(
          dateInput.parse(params.day),
          z.coerce
            .number()
            .int()
            .positive()
            .optional()
            .parse(params.competitionId),
        );
        break;
      case "matches":
        result = await getMatches(matchFilters.parse(params));
        break;
      case "competition-player-standings": {
        const input = z
          .object({
            slug: z.string().regex(/^[a-z0-9-]{1,180}$/),
            round: z.coerce.number().int().min(1).max(1000).optional(),
            type: z.enum(["ALL", "HOME", "AWAY"]).default("ALL"),
          })
          .parse(params);
        result = await getCompetitionPlayerStandings(
          input.slug,
          input.round,
          input.type,
        );
        break;
      }
      case "standings": {
        const input = z
          .object({
            slug: z.string().regex(/^[a-z0-9-]{1,180}$/),
            round: z.coerce.number().int().min(1).max(1000).optional(),
            type: z.enum(["ALL", "HOME", "AWAY"]).default("ALL"),
          })
          .parse(params);
        result = await getStandings(input.slug, input.round, input.type);
        break;
      }
      default:
        return NextResponse.json(
          { error: "Neznámý požadavek." },
          { status: 400 },
        );
    }
    return NextResponse.json(result, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    const invalid = error instanceof z.ZodError;
    const retry = error instanceof UpstreamError ? error.retryAfter : undefined;
    return NextResponse.json(
      {
        error: invalid
          ? "Neplatné filtry požadavku."
          : "Výsledkový servis ČKA teď neodpovídá. Zkuste to za chvíli.",
      },
      {
        status: invalid
          ? 400
          : error instanceof UpstreamError && error.status === 429
            ? 429
            : 502,
        headers: {
          "Cache-Control": "no-store",
          ...(retry ? { "Retry-After": retry } : {}),
        },
      },
    );
  }
}
