"use client";

import { useEffect, useState } from "react";
import { z } from "zod";
import {
  matchSchema,
  resultFor,
  statusLabel,
  type Resource,
  type Match,
} from "@/domain/models";
import {
  laneOutcome,
  overlayLanes,
  overlayPlayerName,
  overlayPositions,
  overlayPollDelay,
  type OverlayPanel,
  type OverlayDensity,
} from "@/domain/obs-overlay";

const responseSchema = z.object({
  data: matchSchema,
  checkedAt: z.string().datetime(),
  stale: z.boolean(),
});
const number = (value: number | null | undefined) =>
  value == null ? "—" : String(value).replace(".", ",");
export function useOverlayMatch(id: number) {
  const [resource, setResource] = useState<Resource<Match>>();
  const [error, setError] = useState(false);
  const [now, setNow] = useState(0);
  useEffect(() => {
    let stopped = false,
      failures = 0,
      finished = false;
    let timer: ReturnType<typeof setTimeout>;
    let controller: AbortController | undefined;
    setResource(undefined);
    setError(false);
    const clock = setInterval(() => setNow(Date.now()), 1000);
    async function refresh() {
      controller = new AbortController();
      const timeout = setTimeout(() => controller?.abort(), 15000);
      let retryAfter = 0;
      try {
        const response = await fetch(`/api/data?kind=match&id=${id}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) {
          const retry = response.headers.get("Retry-After");
          if (retry)
            retryAfter = /^\d+$/.test(retry)
              ? Number(retry) * 1000
              : Math.max(0, Date.parse(retry) - Date.now());
          if (!Number.isFinite(retryAfter)) retryAfter = 0;
          throw new Error("Match unavailable");
        }
        const data = responseSchema.parse(await response.json());
        if (data.data.id !== id) throw new Error("Unexpected match");
        if (!stopped) {
          setResource(data);
          setError(data.stale);
          failures = data.stale ? failures + 1 : 0;
          finished = ["FINISHED", "FORFEIT"].includes(data.data.status);
        }
      } catch {
        if (!stopped) {
          setError(true);
          failures++;
        }
      } finally {
        clearTimeout(timeout);
        if (!stopped) {
          setNow(Date.now());
          timer = setTimeout(
            refresh,
            overlayPollDelay(Date.now(), failures, finished, retryAfter),
          );
        }
      }
    }
    void refresh();
    return () => {
      stopped = true;
      clearInterval(clock);
      clearTimeout(timer);
      controller?.abort();
    };
  }, [id]);
  const stale =
    error ||
    !!resource?.stale ||
    (!!resource &&
      now - Date.parse(resource.checkedAt) >
        (["FINISHED", "FORFEIT"].includes(resource.data.status)
          ? 360000
          : 90000));
  return { resource, stale, error };
}

export function OverlayContent({
  panel,
  density = "full",
  resource,
  stale,
  error,
}: {
  panel: OverlayPanel;
  density?: OverlayDensity;
  resource?: Resource<Match>;
  stale: boolean;
  error: boolean;
}) {
  if (!resource)
    return (
      <section className="obs-panel obs-loading" role="status">
        {error
          ? "Výsledky nejsou dostupné. Zkoušíme znovu…"
          : "Načítání výsledků…"}
      </section>
    );
  const match = resource.data;
  const home = resultFor(match, true),
    away = resultFor(match, false);
  const freshness = (
    <div className={`obs-freshness ${stale ? "obs-stale" : ""}`} role="status">
      {stale ? "⚠ Neaktuální data · " : ""}
      {statusLabel(match.status)} · Ověřeno{" "}
      {new Date(resource.checkedAt).toLocaleTimeString("cs-CZ", {
        timeZone: "Europe/Prague",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })}
    </div>
  );
  if (panel === "score")
    return (
      <section className="obs-panel obs-score" aria-label="Skóre zápasu">
        <div className="obs-score-main">
          <strong className="obs-team-name">
            {match.homeTeam?.name ?? "Domácí"}
          </strong>
          <div className="obs-score-numbers">
            <small>BODY</small>
            <strong>
              {number(home?.teamPoints)} : {number(away?.teamPoints)}
            </strong>
          </div>
          <strong className="obs-team-name">
            {match.awayTeam?.name ?? "Hosté"}
          </strong>
          <div className="obs-score-pins">
            <small>KUŽELKY</small>
            <strong>
              {number(home?.totalPerformance)} :{" "}
              {number(away?.totalPerformance)}
            </strong>
          </div>
        </div>
        {freshness}
      </section>
    );
  const isHome = panel === "home";
  const team = isHome ? match.homeTeam : match.awayTeam;
  const result = isHome ? home : away,
    opponent = isHome ? away : home;
  const positions = overlayPositions(match);
  return (
    <section
      className={`obs-panel obs-team obs-${panel} obs-density-${density}`}
      aria-label={isHome ? "Domácí hráči" : "Hostující hráči"}
    >
      <header className="obs-team-heading">
        <span>{isHome ? "DOMÁCÍ" : "HOSTÉ"}</span>
        <h1>{team?.name ?? (isHome ? "Domácí" : "Hosté")}</h1>
      </header>
      {!positions.length && (
        <p className="obs-loading">Čekáme na zveřejnění nominace.</p>
      )}
      <ol className="obs-players">
        {positions.map((position) => {
          const player = result?.playerResults?.find(
            (p) => p.position === position,
          );
          const rival = opponent?.playerResults?.find(
            (p) => p.position === position,
          );
          const lanes = overlayLanes(match, player, rival);
          const displayName = overlayPlayerName(
            match,
            isHome,
            player,
            density === "compact",
          );
          return (
            <li className="obs-player" key={position}>
              <div className="obs-player-name">
                <span>{position}.</span>
                <strong
                  className="obs-name-text"
                  style={
                    density === "compact" && displayName.length > 40
                      ? { fontSize: displayName.length > 64 ? 9 : 10 }
                      : undefined
                  }
                  title={overlayPlayerName(match, isHome, player)}
                  aria-label={overlayPlayerName(match, isHome, player)}
                >
                  {displayName}
                </strong>
                {density === "compact" && (
                  <b
                    className="obs-compact-total"
                    aria-label={`Kuželky ${number(player?.isEmpty ? null : player?.totalPerformance)}`}
                  >
                    {number(player?.isEmpty ? null : player?.totalPerformance)}
                  </b>
                )}
              </div>
              <div className="obs-lanes">
                {lanes.map((n) => {
                  const lane = !player?.isEmpty
                    ? player?.laneResults?.find((l) => l.laneNumber === n)
                    : undefined;
                  const other = !rival?.isEmpty
                    ? rival?.laneResults?.find((l) => l.laneNumber === n)
                    : undefined;
                  const outcome = laneOutcome(lane, other);
                  return (
                    <div className={`obs-lane obs-lane-${outcome}`} key={n}>
                      <small className="obs-lane-label">{n}. dráha</small>
                      <strong>{number(lane?.total)}</strong>
                      <span>
                        {outcome === "pending"
                          ? "—"
                          : density === "compact"
                            ? lane?.setPoints === 0.5
                              ? "½"
                              : number(lane?.setPoints)
                            : `${number(lane?.setPoints)} b.`}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="obs-player-total">
                <span>
                  Kuželky{" "}
                  <strong>
                    {number(player?.isEmpty ? null : player?.totalPerformance)}
                  </strong>
                </span>
                <span>
                  Dílčí body{" "}
                  <strong>
                    {number(player?.isEmpty ? null : player?.setPoints)}
                  </strong>
                </span>
              </div>
            </li>
          );
        })}
      </ol>
      {freshness}
    </section>
  );
}

export function ObsOverlay({
  id,
  panel,
  density = "compact",
}: {
  id: number;
  panel: OverlayPanel;
  density?: OverlayDensity;
}) {
  const state = useOverlayMatch(id);
  return (
    <main id="main" data-obs-overlay className={`obs-root obs-root-${panel}`}>
      <OverlayContent panel={panel} density={density} {...state} />
    </main>
  );
}
