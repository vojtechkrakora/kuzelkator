import { z } from "zod";
import { apiCache, UpstreamError } from "./cache";
import { collection, type Competition, type Resource } from "../domain/models";
import {
  playerStandingSchema,
  playerAggregateSchema,
  type PlayerStatistics,
} from "../domain/player-statistics";
import {
  directoryRowSchema,
  profileSchema,
  historySchema,
  searchPlayers,
  type DirectoryPlayer,
} from "../domain/players";

export const playerSearchInput = z.object({
  seasonId: z.coerce.number().int().positive(),
  q: z.string().trim().min(2).max(100),
  offset: z.coerce.number().int().min(0).max(10000).default(0),
});
export const teamRosterInput = z.object({
  teamId: z.coerce.number().int().positive(),
  seasonId: z.coerce.number().int().positive(),
});
export const teamPlayerStatsInput = teamRosterInput.extend({
  competitionId: z.coerce.number().int().positive(),
});
const directories = new Map<
  number,
  { expires: number; value: Promise<Resource<DirectoryPlayer[]>> }
>();
async function buildDirectory(seasonId: number) {
  const players = new Map<number, DirectoryPlayer>();
  let offset = 0,
    total = 1,
    stale = false,
    checkedAt = "";
  while (offset < total) {
    const query = new URLSearchParams({
      seasonId: String(seasonId),
      type: "ALL",
      limit: "100",
      offset: String(offset),
      sort: "player.id,competition.id,team.id",
      include: "player,team,competition",
    });
    const page = await apiCache.get(
      `/team-competition-player-table?${query}`,
      collection(directoryRowSchema),
      3600000,
    );
    total = page.data.total;
    if (total > 10000 || (!page.data.items.length && offset < total))
      throw new UpstreamError(502);
    for (const row of page.data.items) {
      const p = players.get(row.player.id) ?? { ...row.player, teams: [] };
      if (row.team && !p.teams.includes(row.team.name))
        p.teams.push(row.team.name);
      players.set(p.id, p);
    }
    offset += page.data.items.length;
    stale ||= page.stale;
    if (!checkedAt || page.checkedAt < checkedAt) checkedAt = page.checkedAt;
  }
  return {
    data: [...players.values()].sort(
      (a, b) =>
        `${a.lastName} ${a.firstName}`.localeCompare(
          `${b.lastName} ${b.firstName}`,
          "cs",
        ) || a.id - b.id,
    ),
    checkedAt,
    stale,
  };
}
export async function findPlayers(input: z.infer<typeof playerSearchInput>) {
  let entry = directories.get(input.seasonId);
  if (!entry || entry.expires < Date.now()) {
    if (directories.size >= 2)
      directories.delete(directories.keys().next().value!);
    const value = buildDirectory(input.seasonId);
    entry = { value, expires: Date.now() + 3600000 };
    directories.set(input.seasonId, entry);
    value.catch(() => {
      if (directories.get(input.seasonId)?.value === value)
        directories.delete(input.seasonId);
    });
  }
  const result = await entry.value;
  const found = searchPlayers(result.data, input.q);
  return {
    ...result,
    data: {
      items: found.slice(input.offset, input.offset + 20),
      total: found.length,
    },
  };
}
export function getPlayer(id: number) {
  return apiCache.get(`/members/${id}?include=club`, profileSchema, 3600000);
}
export async function getTeamRoster(input: z.infer<typeof teamRosterInput>) {
  const query = new URLSearchParams({
    seasonId: String(input.seasonId),
    teamId: String(input.teamId),
    type: "ALL",
    limit: "100",
    offset: "0",
    sort: "player.lastName,player.firstName,player.id",
    include: "player,competition",
  });
  const schema = collection(
    directoryRowSchema.pick({ player: true, competition: true }),
  );
  const competitions = new Map<number, Competition>();
  const players = new Map<number, Omit<DirectoryPlayer, "teams">>();
  let offset = 0,
    total = 1,
    stale = false,
    checkedAt = "";
  while (offset < total) {
    query.set("offset", String(offset));
    const page = await apiCache.get(
      `/team-competition-player-table?${query}`,
      schema,
      3600000,
    );
    total = page.data.total;
    if (!page.data.items.length && offset < total) throw new UpstreamError(502);
    for (const row of page.data.items) {
      players.set(row.player.id, row.player);
      if (row.competition)
        competitions.set(row.competition.id, row.competition);
    }
    offset += page.data.items.length;
    stale ||= page.stale;
    if (!checkedAt || page.checkedAt < checkedAt) checkedAt = page.checkedAt;
  }
  const items = [...players.values()].sort(
    (a, b) =>
      `${a.lastName ?? ""} ${a.firstName ?? ""}`.localeCompare(
        `${b.lastName ?? ""} ${b.firstName ?? ""}`,
        "cs",
      ) || a.id - b.id,
  );
  return {
    data: {
      items,
      total: items.length,
      competitions: [...competitions.values()].sort((a, b) =>
        a.name.localeCompare(b.name, "cs"),
      ),
    },
    stale,
    checkedAt,
  };
}

/** Shared with player profiles: one cached team request, never one per player. */
function getTeamAggregates(teamId: number, competitionId: number) {
  return apiCache.get(
    `/teams/${teamId}/player-stats?competitionId=${competitionId}&include=player`,
    collection(playerAggregateSchema),
    600000,
  );
}

export async function getTeamPlayerStatistics(
  input: z.infer<typeof teamPlayerStatsInput>,
) {
  const roster = await getTeamRoster(input);
  if (!roster.data.competitions.some((c) => c.id === input.competitionId))
    throw new UpstreamError(400);
  const result = await getTeamAggregates(input.teamId, input.competitionId);
  return {
    ...result,
    stale: result.stale || roster.stale,
    checkedAt:
      result.checkedAt < roster.checkedAt ? result.checkedAt : roster.checkedAt,
  };
}
/** Small season-specific lookup; no match histories or nationwide directory scan. */
export async function getPlayerTeams(id: number, seasonId: number) {
  const query = new URLSearchParams({
    seasonId: String(seasonId),
    type: "ALL",
    limit: "100",
    offset: "0",
    sort: "team.id,competition.id",
    include: "team",
  });
  const schema = collection(directoryRowSchema.pick({ team: true }));
  const teamIds = new Set<number>();
  let offset = 0,
    total = 1,
    stale = false,
    checkedAt = "";
  while (offset < total) {
    query.set("offset", String(offset));
    const page = await apiCache.get(
      `/members/${id}/player-stats?${query}`,
      schema,
      3600000,
    );
    total = page.data.total;
    if (!page.data.items.length && offset < total) throw new UpstreamError(502);
    for (const row of page.data.items) if (row.team) teamIds.add(row.team.id);
    offset += page.data.items.length;
    stale ||= page.stale;
    if (!checkedAt || page.checkedAt < checkedAt) checkedAt = page.checkedAt;
  }
  return { data: { teamIds: [...teamIds] }, stale, checkedAt };
}
export async function getPlayerHistory(id: number, seasonId: number) {
  const query = new URLSearchParams({
    seasonFromId: String(seasonId),
    seasonToId: String(seasonId),
    limit: "100",
    offset: "0",
    sort: "-teamMatchResult.teamMatch.date,-id",
    include:
      "player,substitute,laneResults,teamMatchResult,teamMatchResult.team,teamMatchResult.teamMatch,teamMatchResult.teamMatch.homeTeam,teamMatchResult.teamMatch.awayTeam,teamMatchResult.teamMatch.competition,teamMatchResult.teamMatch.venue,teamMatchResult.substitutions,teamMatchResult.substitutions.playerOut,teamMatchResult.substitutions.playerIn",
  });
  const path = () => `/members/${id}/match-results?${query}`;
  const first = await apiCache.get(path(), collection(historySchema));
  const items = [...first.data.items];
  let stale = first.stale,
    checkedAt = first.checkedAt;
  while (items.length < first.data.total) {
    query.set("offset", String(items.length));
    const next = await apiCache.get(path(), collection(historySchema));
    if (!next.data.items.length) throw new UpstreamError(502);
    items.push(...next.data.items);
    stale ||= next.stale;
    if (next.checkedAt < checkedAt) checkedAt = next.checkedAt;
  }
  return { data: { items, total: items.length }, stale, checkedAt };
}

export async function getPlayerStatistics(id: number, seasonId: number) {
  const query = new URLSearchParams({
    seasonId: String(seasonId),
    type: "ALL",
    include: "team,competition",
    limit: "100",
    offset: "0",
    sort: "team.id,competition.id",
  });
  const summaries: z.infer<typeof playerStandingSchema>[] = [];
  let total = 1,
    stale = false,
    checkedAt = "";
  const record = (page: { stale: boolean; checkedAt: string }) => {
    stale ||= page.stale;
    if (!checkedAt || page.checkedAt < checkedAt) checkedAt = page.checkedAt;
  };
  while (summaries.length < total) {
    query.set("offset", String(summaries.length));
    const page = await apiCache.get(
      `/members/${id}/player-stats?${query}`,
      collection(playerStandingSchema),
      600000,
    );
    total = page.data.total;
    if (!page.data.items.length && summaries.length < total)
      throw new UpstreamError(502);
    summaries.push(...page.data.items);
    record(page);
  }
  const items: PlayerStatistics[] = [];
  for (const summary of summaries) {
    const page = await getTeamAggregates(
      summary.team.id,
      summary.competition.id,
    );
    record(page);
    items.push({
      ...summary,
      aggregates: page.data.items.filter((r) => r.player.id === id),
    });
  }
  return { data: { items, total: items.length }, stale, checkedAt };
}
