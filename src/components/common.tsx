"use client";

import { Star, CircleAlert, RefreshCw } from "lucide-react";
import { usePreferences } from "./providers";
import type { Team } from "@/domain/models";

export function FollowButton({ team }: { team: Team }) {
  const { teams, ready, toggle } = usePreferences();
  const followed = teams.some((item) => item.id === team.id);
  return (
    <button
      type="button"
      className={`star-button ${followed ? "saved" : ""}`}
      disabled={!ready}
      onClick={() => toggle(team)}
      aria-pressed={followed}
      aria-label={`${followed ? "Přestat sledovat" : "Sledovat"} ${team.name}`}
      title={followed ? "Přestat sledovat" : "Sledovat tým"}
    >
      <Star size={17} fill={followed ? "currentColor" : "none"} />
    </button>
  );
}
export function ErrorNotice({
  retry,
  message,
}: {
  retry: () => void;
  message?: string;
}) {
  return (
    <div className="notice error" role="alert">
      <CircleAlert size={21} />
      <div>
        <strong>Výsledky se nepodařilo načíst</strong>
        <p>
          {message ??
            "ČKA teď neodpovídá. Vaše oblíbené týmy zůstávají uložené."}
        </p>
      </div>
      <button className="button" onClick={retry}>
        <RefreshCw size={15} /> Zkusit znovu
      </button>
    </div>
  );
}
export function Freshness({
  checkedAt,
  stale,
}: {
  checkedAt: string;
  stale: boolean;
}) {
  return (
    <span className={stale ? "freshness stale" : "freshness"}>
      {stale ? "Uložená data · poslední ověření " : "Ověřeno "}
      {new Intl.DateTimeFormat("cs-CZ", {
        day: "numeric",
        month: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/Prague",
      }).format(new Date(checkedAt))}
    </span>
  );
}
