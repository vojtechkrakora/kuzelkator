"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Camera, RefreshCw, Trophy } from "lucide-react";
import { z } from "zod";
import {
  matchSchema,
  playerName,
  resultFor,
  statusLabel,
  type Match,
} from "@/domain/models";
import { overlayPositions } from "@/domain/obs-overlay";
import { highestSocialPerformance } from "@/domain/social-match";
import { getData } from "@/lib/client-api";
import { dayLabel } from "@/lib/dates";
import { TeamLogo } from "./team-logo";

const response = z.object({
  data: matchSchema,
  checkedAt: z.string().datetime(),
  stale: z.boolean(),
});
const number = (value: number | null | undefined) =>
  value == null ? "—" : String(value).replace(".", ",");
import { MatchDuelPlayer as Player } from "./match-duel-player";

export function SocialMatch({ id }: { id: number }) {
  const query = useQuery({
    queryKey: ["social-match", id],
    queryFn: async ({ signal }) => {
      const value = response.parse(
        await getData<Match>({ kind: "match", id }, signal),
      );
      if (value.data.id !== id) throw Error("Nesprávný zápas");
      return value;
    },
    staleTime: Infinity,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });
  const resource = query.data;
  const match = resource?.data;
  const home = match && resultFor(match, true),
    away = match && resultFor(match, false);
  const highest =
    match && !resource?.stale && !query.isError
      ? highestSocialPerformance(match)
      : undefined;
  const difference =
    home?.totalPerformance != null && away?.totalPerformance != null
      ? home.totalPerformance - away.totalPerformance
      : undefined;
  return (
    <main id="main" className="social-page" data-social-match>
      <nav className="social-tools" aria-label="Ovládání obrázku">
        <Link href={`/matches/${id}`} prefetch={false}>
          <ArrowLeft size={17} /> Detail zápasu
        </Link>
        <button
          type="button"
          onClick={() => void query.refetch()}
          disabled={query.isFetching}
        >
          <RefreshCw size={16} /> Obnovit
        </button>
      </nav>
      <p className="social-instructions">
        <Camera size={16} aria-hidden="true" /> Připraveno pro screenshot. Obsah
        se sám neobnovuje. Delší kartu zachytíte snímkem celé stránky.
      </p>
      {query.isFetching ? (
        <p role="status">Načítání výsledku…</p>
      ) : !match || !resource ? (
        <p role="alert">Výsledek se nepodařilo načíst. Zkuste Obnovit.</p>
      ) : (
        <article className="social-card" aria-label="Výsledek pro sdílení">
          <header className="social-card-header">
            <p className="social-context">
              {match.competition?.name ?? "Soutěž neuvedena"}
              {match.round != null ? ` · ${match.round}. kolo` : ""}
            </p>
            <h1 className="social-title">
              {match.status === "FINISHED"
                ? "Výsledek zápasu"
                : match.status === "FORFEIT"
                  ? "Kontumace"
                  : "Průběžný stav"}
            </h1>
            <p className="social-date">
              {dayLabel(match.date, true)}
              {match.time ? ` · ${match.time.slice(0, 5)}` : ""} ·{" "}
              {(match.discipline ?? match.competition?.discipline)?.replace(
                "T",
                "",
              ) ?? "—"}{" "}
              hodů
            </p>
            {match.status !== "FINISHED" && (
              <p className="social-state">{statusLabel(match.status)}</p>
            )}
            {(resource.stale || query.isError) && (
              <p className="social-stale" role="alert">
                Neaktuální data · aktuální stav se nepodařilo ověřit
              </p>
            )}
            <div className="social-scoreboard">
              <div className="social-team">
                <TeamLogo
                  team={
                    match.homeTeam
                      ? { ...match.homeTeam, club: match.homeTeam.club ?? null }
                      : null
                  }
                  size={32}
                />
                <strong>{match.homeTeam?.name ?? "Domácí"}</strong>
                <small>DOMÁCÍ</small>
              </div>
              <strong className="social-main-score">
                {number(home?.teamPoints)}
                <span>:</span>
                {number(away?.teamPoints)}
              </strong>
              <div className="social-team">
                <TeamLogo
                  team={
                    match.awayTeam
                      ? { ...match.awayTeam, club: match.awayTeam.club ?? null }
                      : null
                  }
                  size={32}
                />
                <strong>{match.awayTeam?.name ?? "Hosté"}</strong>
                <small>HOSTÉ</small>
              </div>
            </div>
            <div className="social-pins">
              <strong>{number(home?.totalPerformance)}</strong>
              <span>KUŽELKY</span>
              <strong>{number(away?.totalPerformance)}</strong>
            </div>
            {difference != null && (
              <p className="social-difference">
                {difference === 0
                  ? "Shodný počet kuželek"
                  : `Rozdíl kuželek: +${Math.abs(difference)} pro ${difference > 0 ? "domácí" : "hosty"}`}
              </p>
            )}
            {match.venue?.name && (
              <p className="social-venue">
                {match.venue.name}
                {match.venue.city ? ` · ${match.venue.city}` : ""}
              </p>
            )}
          </header>
          <div className="social-duels">
            {overlayPositions(match).map((position) => {
              const left = home?.playerResults?.find(
                  (p) => p.position === position,
                ),
                right = away?.playerResults?.find(
                  (p) => p.position === position,
                );
              return (
                <section
                  className="social-duel"
                  key={position}
                  aria-label={`Duel ${position}`}
                >
                  <Player
                    player={left}
                    opponent={right}
                    result={home}
                    highest={highest}
                  />
                  <div className="social-duel-center">
                    <span>{position}.</span>
                    <strong>
                      {number(left?.setPoints)}:{number(right?.setPoints)}
                    </strong>
                    <small>dílčí b.</small>
                  </div>
                  <Player
                    player={right}
                    opponent={left}
                    result={away}
                    highest={highest}
                  />
                </section>
              );
            })}
            {!overlayPositions(match).length && (
              <p className="social-empty">
                Individuální výsledky zatím nejsou zveřejněné.
              </p>
            )}
          </div>
          {[home, away].map((result, index) => {
            const unmatched = result?.substitutions?.filter(
              (s) =>
                !(result.playerResults ?? []).some(
                  (p) =>
                    p.player?.id === s.playerOut?.id ||
                    p.player?.id === s.playerIn?.id ||
                    p.substitute?.id === s.playerOut?.id ||
                    p.substitute?.id === s.playerIn?.id,
                ),
            );
            return unmatched?.length ? (
              <p className="social-unmatched" key={index}>
                Střídání ({index ? "hosté" : "domácí"}):{" "}
                {unmatched
                  .map(
                    (s) =>
                      `${playerName(s.playerOut)} → ${playerName(s.playerIn)}`,
                  )
                  .join("; ")}
              </p>
            ) : null;
          })}
          <footer className="social-card-footer">
            <strong>Kuželkátor</strong>
            <span>
              ● získané body · <Trophy size={10} aria-hidden="true" /> nejvyšší
              výkon · Zdroj: ČKA
            </span>
            <time dateTime={resource.checkedAt}>
              Data k{" "}
              {new Intl.DateTimeFormat("cs-CZ", {
                day: "numeric",
                month: "numeric",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                timeZone: "Europe/Prague",
              }).format(new Date(resource.checkedAt))}{" "}
              · Praha
            </time>
          </footer>
        </article>
      )}
    </main>
  );
}
