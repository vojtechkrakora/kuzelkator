import { z } from "zod";

export const competitionDocumentsSchema = z.object({
  id: z.number().int().positive(),
  attachments: z
    .array(
      z.object({
        url: z.string().nullish(),
        filename: z.string().nullish(),
        extension: z.string().nullish(),
        size: z.string().nullish(),
        updatedAt: z.string().nullish(),
      }),
    )
    .default([]),
});
export const competitionArticlesSchema = z.object({
  items: z.array(
    z.object({
      id: z.number().int(),
      title: z.string(),
      slug: z.string().min(1),
      publishedAt: z.string().nullish(),
    }),
  ),
  total: z.number(),
});
export type CompetitionDocuments = z.infer<typeof competitionDocumentsSchema>;
export type CompetitionArticles = z.infer<typeof competitionArticlesSchema>;

export function officialDocumentHref(value?: string | null) {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value, "https://kuzelky.cz/");
    if (
      !["https:", "http:"].includes(url.protocol) ||
      url.username ||
      url.password
    )
      return null;
    return url.href;
  } catch {
    return null;
  }
}
export function officialArticleHref(slug: string) {
  return `https://kuzelky.cz/zpravodajstvi/${encodeURIComponent(slug)}.html`;
}
export function resourceDate(value?: string | null) {
  if (!value || !Number.isFinite(Date.parse(value))) return null;
  return new Intl.DateTimeFormat("cs-CZ", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    timeZone: "Europe/Prague",
  }).format(new Date(value));
}
