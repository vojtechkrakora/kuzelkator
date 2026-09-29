"use client";

import { useEffect, useRef } from "react";
import { CalendarDays, Star, Trophy, X } from "lucide-react";
import { usePreferences } from "./providers";
import { FavoriteLeagues } from "./favorite-leagues";
import type { FavoriteLeague } from "./providers";
import { FollowButton } from "./common";

export function MobileNavigation({
  onChooseTeam,
  onChooseLeague,
}: {
  onChooseTeam: (id: string) => void;
  onChooseLeague: (league: FavoriteLeague) => void;
}) {
  const { teams, leagues, warning } = usePreferences();
  const dialog = useRef<HTMLDialogElement>(null);
  const previousOverflow = useRef("");
  function close() {
    dialog.current?.close();
  }
  function releaseScroll() {
    document.body.style.overflow = previousOverflow.current;
  }
  function open() {
    previousOverflow.current = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.showModal();
  }
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 741px)");
    const onResize = () => {
      if (desktop.matches && dialog.current?.open) close();
    };
    desktop.addEventListener("change", onResize);
    return () => {
      desktop.removeEventListener("change", onResize);
      document.body.style.overflow = previousOverflow.current;
    };
  }, []);
  return (
    <>
      <nav className="mobile-navigation" aria-label="Rychlá navigace">
        <a href="#match-feed">
          <CalendarDays size={21} />
          <span>Zápasy</span>
        </a>
        <button onClick={open} aria-haspopup="dialog">
          <Star size={21} />
          <span>
            Oblíbené
            {teams.length + leagues.length > 0 && (
              <b className="nav-count">{teams.length + leagues.length}</b>
            )}
          </span>
        </button>
        <a
          href="#competitions"
          onClick={() => {
            const picker = document.querySelector<HTMLDetailsElement>(
              "#competitions details",
            );
            if (picker) picker.open = true;
          }}
        >
          <Trophy size={21} />
          <span>Soutěže</span>
        </a>
      </nav>
      <dialog
        ref={dialog}
        className="favorites-sheet"
        aria-labelledby="favorites-title"
        onClose={releaseScroll}
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
      >
        <div className="sheet-content">
          <div className="sheet-handle" aria-hidden="true" />
          <div className="sheet-heading">
            <div>
              <span className="section-kicker">VAŠE KUŽELKY</span>
              <h2 id="favorites-title">Oblíbené</h2>
            </div>
            <button
              autoFocus
              className="icon-button"
              aria-label="Zavřít oblíbené"
              onClick={close}
            >
              <X size={22} />
            </button>
          </div>
          <p className="sheet-description">
            Vaše týmy a soutěže na jednom místě.
          </p>
          {warning && (
            <p role="status" className="notice">
              {warning}
            </p>
          )}
          <FavoriteLeagues
            onChoose={(league) => {
              onChooseLeague(league);
              close();
              document.getElementById("match-feed")?.scrollIntoView();
            }}
          />
          <div className="side-heading">
            <span>MOJE TÝMY</span>
            <span className="counter">{teams.length}</span>
          </div>
          {teams.length ? (
            <div className="sheet-teams">
              {teams.map((team) => (
                <div className="sheet-team" key={team.id}>
                  <button
                    onClick={() => {
                      onChooseTeam(String(team.id));
                      close();
                      document.getElementById("match-feed")?.scrollIntoView();
                    }}
                  >
                    <span className="team-dot" />
                    {team.name}
                  </button>
                  <FollowButton team={team} />
                </div>
              ))}
            </div>
          ) : (
            <div className="sheet-empty">
              <Star size={34} />
              <h3>Komu držíte palce?</h3>
              <p>
                Uložte si tým hvězdičkou u zápasu. Tady ho pak najdete jediným
                klepnutím.
              </p>
              <button
                className="button"
                onClick={() => {
                  close();
                  document.getElementById("match-feed")?.scrollIntoView();
                }}
              >
                Prohlédnout zápasy
              </button>
            </div>
          )}
          <p className="sheet-footnote">
            Uloženo v tomto prohlížeči. Bez registrace.
          </p>
        </div>
      </dialog>
    </>
  );
}
