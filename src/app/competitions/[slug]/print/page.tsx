import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CompetitionPrint } from "@/components/competition-print";
import "./print.css";

export const metadata: Metadata = {
  title: "Tisk soutěže · Kuželkátor",
  robots: { index: false, follow: false },
};

export default async function CompetitionPrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  if (!/^[a-z0-9-]{1,180}$/.test(slug)) notFound();
  const text = (value: string | string[] | undefined) =>
    typeof value === "string" ? value.slice(0, 180) : undefined;
  const season = text(query.season);
  const competition = text(query.competition);
  return (
    <CompetitionPrint
      slug={slug}
      name={text(query.name) || slug}
      seasonId={season && /^\d{1,9}$/.test(season) ? season : undefined}
      seasonName={text(query.seasonName)}
      competitionId={
        competition && /^\d{1,9}$/.test(competition) ? competition : undefined
      }
    />
  );
}
