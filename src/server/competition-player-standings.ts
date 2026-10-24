import { collection, matchSchema } from "../domain/models";
import {
  competitionPlayerStandingSchema,
  qualifyCompetitionPlayers,
  type CompetitionPlayerTable,
} from "../domain/competition-player-standings";
import type { Resource } from "../domain/models";
import { standingsRounds } from "../domain/standings-rounds";
import { todayPrague } from "../lib/dates";
import { getCompetitionSchedule } from "./cka";
import { apiCache, UpstreamError } from "./cache";

export async function getCompetitionPlayerStandings(
  slug: string,
  round?: number,
  type: "ALL" | "HOME" | "AWAY" = "ALL",
): Promise<Resource<CompetitionPlayerTable>> {
  const { competition, schedule } = await getCompetitionSchedule(slug);
  const { playedRounds } = standingsRounds(schedule.data.items, todayPrague());
  const candidates = playedRounds.filter((r) => round == null || r <= round);
  let stale = competition.stale || schedule.stale;
  let checkedAt =
    competition.checkedAt < schedule.checkedAt
      ? competition.checkedAt
      : schedule.checkedAt;
  for (const candidate of candidates) {
    const query = new URLSearchParams({
      type,
      include: "player,team",
      sort: "position,player.id,team.id",
      limit: "100",
      offset: "0",
    });
    const path = `/competitions/${encodeURIComponent(slug)}/rounds/${candidate}/player-table`;
    let first;
    try {
      first = await apiCache.get(
        `${path}?${query}`,
        collection(competitionPlayerStandingSchema),
        300000,
      );
    } catch (error) {
      if (error instanceof UpstreamError && error.status === 404) continue;
      throw error;
    }
    stale ||= first.stale;
    if (first.checkedAt < checkedAt) checkedAt = first.checkedAt;
    if (first.data.total === 0 && first.data.items.length === 0) continue;
    if (first.data.total > 10000 || !first.data.items.length)
      throw new UpstreamError(502);
    const items = [...first.data.items];
    while (items.length < first.data.total) {
      query.set("offset", String(items.length));
      const next = await apiCache.get(
        `${path}?${query}`,
        collection(competitionPlayerStandingSchema),
        300000,
      );
      if (!next.data.items.length || next.data.total !== first.data.total)
        throw new UpstreamError(502);
      items.push(...next.data.items);
      stale ||= next.stale;
      if (next.checkedAt < checkedAt) checkedAt = next.checkedAt;
    }
    // Never label a partial/mixed snapshot as a complete official ranking.
    if (
      items.length !== first.data.total ||
      items.some((row) => row.round !== candidate || row.type !== type) ||
      new Set(items.map((row) => `${row.player.id}:${row.team.id}`)).size !==
        items.length
    )
      throw new UpstreamError(502);
    items.sort(
      (a, b) =>
        (a.position > 0 ? a.position : Infinity) -
          (b.position > 0 ? b.position : Infinity) ||
        a.player.id - b.player.id ||
        a.team.id - b.team.id,
    );
    let qualifiedItems = items.map((row) => ({
      ...row,
      qualification: null,
    })) as CompetitionPlayerTable["items"];
    try {
      const matches = await qualificationMatches(competition.data.id);
      stale ||= matches.stale;
      if (matches.checkedAt < checkedAt) checkedAt = matches.checkedAt;
      qualifiedItems = qualifyCompetitionPlayers(
        items,
        matches.data.items,
        competition.data.id,
        candidate,
        type,
      );
    } catch (error) {
      // An unavailable venue listing must not hide the ranking or invent eligibility.
      if (!(error instanceof UpstreamError)) throw error;
    }
    return {
      stale,
      checkedAt,
      data: {
        items: qualifiedItems,
        total: items.length,
        round: candidate,
        latestStartedRound: playedRounds[0] ?? null,
      },
    };
  }
  return {
    stale,
    checkedAt,
    data: {
      items: [],
      total: 0,
      round: null,
      latestStartedRound: playedRounds[0] ?? null,
    },
  };
}

async function qualificationMatches(competitionId: number) {
  const query = new URLSearchParams({
    competitionId: String(competitionId),
    limit: "100",
    offset: "0",
    sort: "id",
    include: "homeTeam,awayTeam,competition,venue",
  });
  const first = await apiCache.get(
    `/matches?${query}`,
    collection(matchSchema),
    300000,
  );
  const items = [...first.data.items];
  let stale = first.stale,
    checkedAt = first.checkedAt;
  while (items.length < first.data.total) {
    query.set("offset", String(items.length));
    const next = await apiCache.get(
      `/matches?${query}`,
      collection(matchSchema),
      300000,
    );
    if (!next.data.items.length || next.data.total !== first.data.total)
      throw new UpstreamError(502);
    items.push(...next.data.items);
    stale ||= next.stale;
    if (next.checkedAt < checkedAt) checkedAt = next.checkedAt;
  }
  if (
    items.length !== first.data.total ||
    new Set(items.map((m) => m.id)).size !== items.length
  )
    throw new UpstreamError(502);
  return { data: { items }, stale, checkedAt };
}
