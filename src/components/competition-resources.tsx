"use client";

import { useQuery } from "@tanstack/react-query";
import { FileText, ExternalLink } from "lucide-react";
import type { Competition } from "@/domain/models";
import {
  officialDocumentHref,
  officialArticleHref,
  resourceDate,
  type CompetitionDocuments,
  type CompetitionArticles,
} from "@/domain/competition-resources";
import { getData } from "@/lib/client-api";
import { Freshness } from "./common";

export function CompetitionResources({
  competition,
}: {
  competition: Competition;
}) {
  const documents = useQuery({
    queryKey: ["competition-documents", competition.slug],
    queryFn: ({ signal }) =>
      getData<CompetitionDocuments>(
        { kind: "competition-documents", slug: competition.slug },
        signal,
      ),
    staleTime: 900000,
  });
  const articles = useQuery({
    queryKey: ["competition-articles", competition.id],
    queryFn: ({ signal }) =>
      getData<CompetitionArticles>(
        { kind: "competition-articles", id: competition.id },
        signal,
      ),
    staleTime: 900000,
  });
  const attachments = (documents.data?.data.attachments ?? []).flatMap(
    (item) => {
      const href = officialDocumentHref(item.url);
      return href ? [{ ...item, href }] : [];
    },
  );
  const news = articles.data?.data.items ?? [];
  const failed = documents.isError || articles.isError;
  const loading = documents.isPending || articles.isPending;
  if (!attachments.length && !news.length && !failed) {
    return loading ? (
      <p className="competition-resources-loading" role="status">
        Načítání dokumentů ČKA…
      </p>
    ) : null;
  }
  return (
    <details className="competition-resources">
      <summary>
        <FileText size={18} aria-hidden="true" /> Dokumenty a zprávy ČKA
        {attachments.length + news.length > 0 && (
          <span className="muted">({attachments.length + news.length})</span>
        )}
      </summary>
      <div className="competition-resources-content">
        <p className="muted">
          Oficiální podklady pro {competition.name}. Odkazy se otevřou na webu
          ČKA nebo u poskytovatele dokumentu.
        </p>
        {attachments.length > 0 && (
          <>
            <h3>Dokumenty</h3>
            <ul>
              {attachments.map((item, index) => {
                const date = resourceDate(item.updatedAt);
                const metadata = [
                  item.extension?.toUpperCase(),
                  item.size,
                  date ? `Aktualizováno ${date}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <li key={`${item.href}:${index}`}>
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <span>
                        <strong>{item.filename || "Dokument soutěže"}</strong>
                        {metadata && <small>{metadata}</small>}
                      </span>
                      <ExternalLink size={16} aria-hidden="true" />
                      <span className="sr-only"> (nová karta)</span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </>
        )}
        {news.length > 0 && (
          <>
            <h3>Poslední zprávy ČKA</h3>
            <ul>
              {news.map((item) => (
                <li key={item.id}>
                  <a
                    href={officialArticleHref(item.slug)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span>
                      <strong>{item.title}</strong>
                      {resourceDate(item.publishedAt) && (
                        <small>{resourceDate(item.publishedAt)}</small>
                      )}
                    </span>
                    <ExternalLink size={16} aria-hidden="true" />
                    <span className="sr-only"> (nová karta)</span>
                  </a>
                </li>
              ))}
            </ul>
          </>
        )}
        {loading && <p role="status">Načítání dalších podkladů…</p>}
        {failed && (
          <div className="competition-resources-error" role="status">
            <p>
              {documents.isError ? "Dokumenty" : "Zprávy"}
              {documents.isError && articles.isError ? " a zprávy" : ""} ČKA se
              nepodařilo načíst. Výsledky zápasů tím nejsou ovlivněné.
            </p>
            <button
              className="button"
              onClick={() => {
                if (documents.isError) void documents.refetch();
                if (articles.isError) void articles.refetch();
              }}
            >
              Zkusit znovu
            </button>
          </div>
        )}
        {documents.data?.stale && (
          <Freshness checkedAt={documents.data.checkedAt} stale />
        )}
        {articles.data?.stale && (
          <Freshness checkedAt={articles.data.checkedAt} stale />
        )}
      </div>
    </details>
  );
}
