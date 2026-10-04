"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { playerName, type Match } from "../domain/models";

type Result = NonNullable<Match["results"]>[number];
type Player = NonNullable<Result["playerResults"]>[number];
type Lane = NonNullable<Player["laneResults"]>[number];

export function LaneScore({ lane }: { lane?: Lane }) {
  const points = lane?.setPoints;
  const value = lane?.total ?? "—";
  return (
    <span
      className={
        points != null && points > 0
          ? "lane-score lane-score-earned"
          : "lane-score"
      }
    >
      {points != null && points > 0 ? <strong>{value}</strong> : value}
      {points != null && points > 0 && (
        <small>{points === 0.5 ? "½ bodu" : `${points} bod`}</small>
      )}
    </span>
  );
}

export function PlayerDetail({
  result,
  opponents = [],
  substitutions = [],
}: {
  result: Player;
  opponents?: Player[];
  substitutions?: Result["substitutions"];
}) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open) wasOpen.current = true;
    else if (wasOpen.current) {
      trigger.current?.focus();
      wasOpen.current = false;
    }
  }, [open]);
  return (
    <>
      <button
        ref={trigger}
        type="button"
        className="player-detail-trigger"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
      >
        {playerName(result.player)}
      </button>
      {open &&
        createPortal(
          <PlayerDialog
            result={result}
            opponents={opponents}
            substitutions={substitutions}
            onClose={() => setOpen(false)}
          />,
          document.body,
        )}
    </>
  );
}

function PlayerDialog({
  result,
  opponents,
  substitutions,
  onClose,
}: {
  result: Player;
  opponents: Player[];
  substitutions: Result["substitutions"];
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useId();
  const opponent = opponents.find(
    (player) => player.position === result.position && !player.isEmpty,
  );
  const lanes = [
    ...new Set(
      [...(result.laneResults ?? []), ...(opponent?.laneResults ?? [])].map(
        (lane) => lane.laneNumber,
      ),
    ),
  ].sort((a, b) => a - b);
  const changes =
    substitutions?.filter(
      (change) =>
        change.playerOut?.id === result.player?.id && result.player != null,
    ) ?? [];
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.showModal();
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className="player-detail-dialog"
      aria-labelledby={title}
      onCancel={onClose}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          const bounds = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < bounds.left ||
            event.clientX > bounds.right ||
            event.clientY < bounds.top ||
            event.clientY > bounds.bottom
          )
            onClose();
        }
      }}
    >
      <header className="player-detail-header">
        <div>
          <span className="section-kicker">VÝSLEDKY PO DRAHÁCH</span>
          <h2 id={title}>{playerName(result.player)}</h2>
        </div>
        <button
          type="button"
          className="player-detail-close"
          aria-label="Zavřít detail hráče"
          onClick={onClose}
          autoFocus
        >
          <X size={22} />
        </button>
      </header>
      <p className="lane-detail-note">
        {opponent
          ? `${result.position}. dvojice`
          : "Výsledek soupeře na této pozici zatím není k dispozici."}
      </p>
      <div className="lane-comparison-names">
        <strong>{playerName(result.player)}</strong>
        {opponent && <strong>{playerName(opponent.player)}</strong>}
      </div>
      {lanes.length ? (
        <ol className="lane-comparisons">
          {lanes.map((number) => {
            const own = result.laneResults?.find(
              (lane) => lane.laneNumber === number,
            );
            const other = opponent?.laneResults?.find(
              (lane) => lane.laneNumber === number,
            );
            return (
              <li key={number}>
                <details className="lane-breakdown">
                  <summary>
                    <LaneScore lane={own} />
                    <span>
                      Dráha {number}
                      <small>Podrobnosti ▾</small>
                    </span>
                    {opponent && <LaneScore lane={other} />}
                  </summary>
                  <dl>
                    {(
                      [
                        ["Plné", "full"],
                        ["Dorážka", "spare"],
                        ["Chyby", "errors"],
                        ["Body na dráze", "setPoints"],
                      ] as const
                    ).map(([label, key]) => (
                      <div key={key}>
                        <dd>{own?.[key] ?? "—"}</dd>
                        <dt>{label}</dt>
                        {opponent && <dd>{other?.[key] ?? "—"}</dd>}
                      </div>
                    ))}
                  </dl>
                </details>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="empty-copy">
          Výsledky po drahách zatím nejsou zveřejněné.
        </p>
      )}
      <div className="lane-comparison-total">
        <strong>{result.totalPerformance ?? "—"}</strong>
        <span>Celkem kuželek</span>
        {opponent && <strong>{opponent.totalPerformance ?? "—"}</strong>}
      </div>
      {opponent &&
        (!result.laneResults?.length || !opponent.laneResults?.length) &&
        lanes.length > 0 && (
          <p className="lane-detail-note">
            U jednoho hráče výsledky po drahách zatím nejsou zveřejněné.
          </p>
        )}
      <p className="lane-detail-note">
        Tučně jsou označené výkony, za které hráč získal body na dráze.
      </p>
      {(changes.length > 0 || result.substitute) && (
        <section className="player-detail-substitutions">
          <h3>Střídání</h3>
          {changes.length ? (
            changes.map((change) => (
              <p key={change.id}>
                {playerName(change.playerOut)} → {playerName(change.playerIn)}
                {change.throwNumber != null
                  ? ` · od ${change.throwNumber}. hodu`
                  : ""}
              </p>
            ))
          ) : (
            <p>
              {playerName(result.player)} → {playerName(result.substitute)}
              {result.substituteAtThrow != null
                ? ` · od ${result.substituteAtThrow}. hodu`
                : ""}
            </p>
          )}
        </section>
      )}
    </dialog>
  );
}
