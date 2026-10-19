"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Trophy } from "lucide-react";
import { playerName, resultFor, type Match } from "@/domain/models";
import { overlayPositions, type PlayerResult } from "@/domain/obs-overlay";
import { highestSocialPerformance, socialPlayer } from "@/domain/social-match";
import { MatchDuelPlayer } from "./match-duel-player";
import { LaneScore } from "./player-detail";
import { MatchSubstitutions } from "./match-substitutions";
import "./match-duels.css";

type Result = NonNullable<Match["results"]>[number];
const number = (value: number | null | undefined) =>
  value == null ? "—" : String(value).replace(".", ",");

function PlayerLinks({
  player,
  result,
  seasonId,
}: {
  player?: PlayerResult;
  result?: Result;
  seasonId?: number;
}) {
  if (!player || !result || player.isEmpty)
    return <span>Hráč není k dispozici</span>;
  const identity = socialPlayer(player, result);
  return (
    <div>
      {identity.people.map((person) => (
        <Link
          key={person.id}
          href={`/players/${person.id}${seasonId ? `?season=${seasonId}` : ""}`}
          prefetch={false}
        >
          {playerName(person)} →
        </Link>
      ))}
    </div>
  );
}

export function MatchDuelDetails({
  left,
  right,
  home,
  away,
  seasonId,
}: {
  left?: PlayerResult;
  right?: PlayerResult;
  home?: Result;
  away?: Result;
  seasonId?: number;
}) {
  const lanes = [
    ...new Set(
      [...(left?.laneResults ?? []), ...(right?.laneResults ?? [])].map(
        (l) => l.laneNumber,
      ),
    ),
  ].sort((a, b) => a - b);
  return (
    <div className="match-duel-details">
      <div className="duel-profile-links">
        <PlayerLinks player={left} result={home} seasonId={seasonId} />
        <PlayerLinks player={right} result={away} seasonId={seasonId} />
      </div>
      <h3>Celkem</h3>
      <dl className="duel-statistics">
        {(
          [
            ["Plné", "totalFull"],
            ["Dorážka", "totalSpare"],
            ["Chyby", "totalErrors"],
            ["Kuželky", "totalPerformance"],
            ["Dílčí body", "setPoints"],
            ["Body", "teamPoints"],
          ] as const
        ).map(([label, key]) => (
          <div key={key}>
            <dd>{number(left?.[key])}</dd>
            <dt>{label}</dt>
            <dd>{number(right?.[key])}</dd>
          </div>
        ))}
      </dl>
      <h3>Výsledky po drahách</h3>
      {lanes.length ? (
        lanes.map((lane) => {
          const a = left?.laneResults?.find((l) => l.laneNumber === lane),
            b = right?.laneResults?.find((l) => l.laneNumber === lane);
          return (
            <section
              key={lane}
              className="duel-lane"
              aria-label={`Dráha ${lane}`}
            >
              <div className="duel-lane-heading">
                <LaneScore lane={a} />
                <h4>Dráha {lane}</h4>
                <LaneScore lane={b} />
              </div>
              <dl className="duel-statistics">
                {(
                  [
                    ["Plné", "full"],
                    ["Dorážka", "spare"],
                    ["Chyby", "errors"],
                  ] as const
                ).map(([label, key]) => (
                  <div key={key}>
                    <dd>{number(a?.[key])}</dd>
                    <dt>{label}</dt>
                    <dd>{number(b?.[key])}</dd>
                  </div>
                ))}
              </dl>
            </section>
          );
        })
      ) : (
        <p>Výsledky po drahách zatím nejsou zveřejněné.</p>
      )}
      <p className="duel-note">
        Tučně jsou označené výkony s body na dráze. Pomlčka znamená nezveřejněný
        údaj.
      </p>
      {[
        { player: left, result: home, label: "Domácí" },
        { player: right, result: away, label: "Hosté" },
      ].map(({ player, result, label }) => {
        if (!player || !result) return null;
        const identity = socialPlayer(player, result);
        if (!identity.substituted) return null;
        return (
          <section className="duel-substitutions" key={label}>
            <h3>Střídání · {label}</h3>
            {identity.changes.length ? (
              identity.changes.map((change) => (
                <p key={change.id}>
                  {playerName(change.playerOut)} → {playerName(change.playerIn)}
                  {change.throwNumber != null
                    ? ` · od ${change.throwNumber}. hodu`
                    : " · hod neuveden"}
                </p>
              ))
            ) : (
              <p>
                {identity.name}
                {player.substituteAtThrow != null
                  ? ` · od ${player.substituteAtThrow}. hodu`
                  : ""}
              </p>
            )}
            <p className="duel-note">
              Zobrazený výkon je společný pro tuto pozici.
            </p>
          </section>
        );
      })}
    </div>
  );
}

export function MatchDuels({
  match,
  stale = false,
}: {
  match: Match;
  stale?: boolean;
}) {
  const [expanded, setExpanded] = useState<number[]>([]);
  const home = resultFor(match, true),
    away = resultFor(match, false);
  const positions = overlayPositions(match);
  const allOpen =
    positions.length > 0 && positions.every((p) => expanded.includes(p));
  const highest = stale ? undefined : highestSocialPerformance(match);
  return (
    <section className="match-duels" aria-label="Duely hráčů">
      <div className="sr-only">
        <strong>{match.homeTeam?.name ?? "Domácí"}</strong>
        <strong>{match.awayTeam?.name ?? "Hosté"}</strong>
      </div>
      <div className="match-duel-list">
        {positions.map((position) => {
          const left = home?.playerResults?.find(
              (p) => p.position === position,
            ),
            right = away?.playerResults?.find((p) => p.position === position),
            open = expanded.includes(position);
          return (
            <section
              className="match-duel"
              key={position}
              aria-label={`Duel ${position}`}
            >
              <button
                type="button"
                className="social-duel match-duel-toggle"
                aria-expanded={open}
                aria-controls={`duel-${match.id}-${position}`}
                aria-label={`Duel ${position}: ${left && home ? socialPlayer(left, home).name : "Domácí"} proti ${right && away ? socialPlayer(right, away).name : "Hosté"}`}
                onClick={() =>
                  setExpanded((prev) =>
                    open
                      ? prev.filter((p) => p !== position)
                      : [...prev, position],
                  )
                }
              >
                <MatchDuelPlayer
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
                  <ChevronDown
                    className={open ? "is-open" : ""}
                    size={14}
                    aria-hidden="true"
                  />
                </div>
                <MatchDuelPlayer
                  player={right}
                  opponent={left}
                  result={away}
                  highest={highest}
                />
              </button>
              <div id={`duel-${match.id}-${position}`} hidden={!open}>
                {open && (
                  <MatchDuelDetails
                    left={left}
                    right={right}
                    home={home}
                    away={away}
                    seasonId={match.competition?.season?.id}
                  />
                )}
              </div>
            </section>
          );
        })}
      </div>
      {!positions.length && (
        <p className="empty-copy">
          Individuální výsledky zatím nejsou zveřejněné.
        </p>
      )}
      <p className="duel-legend">
        ● získané body · <Trophy size={12} aria-hidden="true" /> nejvyšší úplný
        výkon
      </p>
      <div className="match-duels-toolbar">
        <p>Klepnutím na dvojici zobrazíte dráhy a podrobnosti.</p>
        {positions.length > 0 && (
          <button
            type="button"
            onClick={() => setExpanded(allOpen ? [] : positions)}
          >
            {allOpen ? "Sbalit všechny dráhy" : "Rozbalit všechny dráhy"}
          </button>
        )}
      </div>
      <details className="duel-team-totals">
        <summary>Součty družstev a všechna střídání</summary>
        <dl className="duel-statistics">
          {(
            [
              ["Plné", "totalFull"],
              ["Dorážka", "totalSpare"],
              ["Chyby", "totalErrors"],
              ["Kuželky", "totalPerformance"],
              ["Dílčí body", "totalSetPoints"],
              ["Body", "teamPoints"],
            ] as const
          ).map(([label, key]) => (
            <div key={key}>
              <dd>{number(home?.[key])}</dd>
              <dt>{label}</dt>
              <dd>{number(away?.[key])}</dd>
            </div>
          ))}
        </dl>
        {[home, away].map((result, i) => (
          <section key={i}>
            <h3>
              {i
                ? (match.awayTeam?.name ?? "Hosté")
                : (match.homeTeam?.name ?? "Domácí")}
            </h3>
            <MatchSubstitutions result={result} />
          </section>
        ))}
      </details>
    </section>
  );
}
