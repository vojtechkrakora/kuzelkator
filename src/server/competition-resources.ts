import {
  competitionDocumentsSchema,
  competitionArticlesSchema,
} from "../domain/competition-resources";
import { apiCache } from "./cache";

// Selected competitions only; metadata is shared across visitors for 15 minutes.
export function getCompetitionDocuments(slug: string) {
  return apiCache.get(
    `/competitions/${encodeURIComponent(slug)}`,
    competitionDocumentsSchema,
    900000,
  );
}
export function getCompetitionArticles(id: number) {
  const query = new URLSearchParams({
    competitionId: String(id),
    visible: "true",
    sort: "-publishedAt",
    limit: "5",
  });
  return apiCache.get(`/articles?${query}`, competitionArticlesSchema, 900000);
}
