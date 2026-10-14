import { collection } from "../domain/models";
import { historySchema } from "../domain/players";
import {
  eligiblePerformance,
  type BestPerformance,
  type BestPerformancesInput,
} from "../domain/best-performances";
import { apiCache, UpstreamError } from "./cache";

/** Read enough descending pages for twenty eligible performances, including all cutoff ties. */
export async function getBestPerformances(input: BestPerformancesInput) {
  const query = new URLSearchParams({
    competitionId: String(input.competitionId),
    seasonFromId: String(input.seasonId),
    seasonToId: String(input.seasonId),
    discipline: input.discipline,
    sort: "-totalPerformance,id",
    limit: "100",
    offset: "0",
    include:
      "player,substitute,teamMatchResult,teamMatchResult.team,teamMatchResult.teamMatch,teamMatchResult.teamMatch.competition,teamMatchResult.teamMatch.competition.season,teamMatchResult.teamMatch.venue,teamMatchResult.substitutions,teamMatchResult.substitutions.playerOut,teamMatchResult.substitutions.playerIn",
  });
  const items: BestPerformance[] = [];
  const seen = new Set<string>();
  let offset = 0,
    total: number | undefined,
    cutoff: number | undefined;
  let previous = Infinity,
    rank = 0,
    stale = false,
    checkedAt = "";
  while (total == null || offset < total) {
    query.set("offset", String(offset));
    const page = await apiCache.get(
      `/player-match-results?${query}`,
      collection(historySchema),
      300000,
    );
    stale ||= page.stale;
    if (!checkedAt || page.checkedAt < checkedAt) checkedAt = page.checkedAt;
    if (
      (total != null && total !== page.data.total) ||
      page.data.total > 10000 ||
      offset + page.data.items.length > page.data.total ||
      (!page.data.items.length && offset < page.data.total)
    )
      throw new UpstreamError(502);
    total = page.data.total;
    for (const row of page.data.items) {
      const score = row.totalPerformance ?? -Infinity;
      if (score > previous) throw new UpstreamError(502);
      previous = score;
      // Remaining rows cannot reach the published cutoff; no need to download a season's full history.
      if (cutoff != null && score < cutoff)
        return { data: { items }, checkedAt, stale };
      const result = row.teamMatchResult;
      if (result) {
        const key = `${result.teamMatch.id}:${result.isHome}:${row.position}`;
        if (seen.has(key)) throw new UpstreamError(502);
        seen.add(key);
      }
      if (!eligiblePerformance(row, input)) continue;
      if (score !== items.at(-1)?.performance) rank = items.length + 1;
      items.push({
        rank,
        performance: score,
        full: row.totalFull ?? null,
        spare: row.totalSpare ?? null,
        errors: row.totalErrors ?? null,
        player: row.player!,
        team: result!.team!,
        matchId: result!.teamMatch.id,
        date: result!.teamMatch.date,
        venue: result!.teamMatch.venue?.name ?? null,
      });
      if (items.length === 20) cutoff = score;
    }
    offset += page.data.items.length;
  }
  return { data: { items }, checkedAt, stale };
}
