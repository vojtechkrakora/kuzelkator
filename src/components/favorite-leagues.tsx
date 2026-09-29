"use client";

import { Star } from "lucide-react";
import { usePreferences, type FavoriteLeague } from "./providers";

export function FollowLeagueButton({ league }: { league: FavoriteLeague }) {
  const { leagues, ready, toggleLeague } = usePreferences();
  const followed = leagues.some(
    (item) => item.id === league.id && item.seasonId === league.seasonId,
  );
  return (
    <button
      type="button"
      className={`star-button ${followed ? "saved" : ""}`}
      disabled={!ready}
      aria-pressed={followed}
      onClick={() => toggleLeague(league)}
      aria-label={`${followed ? "Přestat sledovat soutěž" : "Sledovat soutěž"} ${league.name}, ${league.seasonName}`}
    >
      <Star size={17} fill={followed ? "currentColor" : "none"} />
    </button>
  );
}

export function FavoriteLeagues({
  onChoose,
}: {
  onChoose: (league: FavoriteLeague) => void;
}) {
  const { leagues } = usePreferences();
  return (
    <section className="favorite-leagues" aria-label="Moje soutěže">
      <div className="side-heading">
        <span>MOJE SOUTĚŽE</span>
        <span className="counter">{leagues.length}</span>
      </div>
      {leagues.length ? (
        <div className="favorite-league-list">
          {leagues.map((league) => (
            <div
              className="favorite-league-row"
              key={`${league.seasonId}:${league.id}`}
            >
              <button
                className="favorite-league-choice"
                onClick={() => onChoose(league)}
              >
                <strong>{league.name}</strong>
                <small>{league.seasonName}</small>
              </button>
              <FollowLeagueButton league={league} />
            </div>
          ))}
        </div>
      ) : (
        <p className="favorite-league-empty">
          Uložte soutěž hvězdičkou ve výběru soutěží. Příště ji otevřete jedním
          klepnutím.
        </p>
      )}
    </section>
  );
}
