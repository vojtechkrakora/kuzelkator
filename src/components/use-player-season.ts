"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getData } from "../lib/client-api";
import type { Season } from "../domain/models";

const storageKey = "kuzelkator:player-season:v1";
function validId(value: string | null) {
  return value &&
    /^\d+$/.test(value) &&
    Number.isSafeInteger(Number(value)) &&
    Number(value) > 0
    ? String(Number(value))
    : "";
}

export function usePlayerSeason(initialSeason = "") {
  const [selection, setSelection] = useState({
    value: initialSeason,
    ready: false,
  });
  const seasons = useQuery({
    queryKey: ["seasons"],
    queryFn: ({ signal }) =>
      getData<{ items: Season[]; total: number }>({ kind: "seasons" }, signal),
  });
  useEffect(() => {
    function restore() {
      const params = new URLSearchParams(window.location.search);
      let value = "";
      // Even an invalid explicit value must not inherit someone else's saved selection.
      if (params.has("season")) value = validId(params.get("season"));
      else {
        try {
          value = validId(sessionStorage.getItem(storageKey));
        } catch {
          /* Optional storage. */
        }
      }
      setSelection({ value, ready: true });
    }
    restore();
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, [initialSeason]);

  const available = seasons.data?.data.items;
  const id =
    !selection.ready || !available
      ? ""
      : String(
          available.find((season) => String(season.id) === selection.value)
            ?.id ??
            available.find((season) => season.active)?.id ??
            available[0]?.id ??
            "",
        );
  useEffect(() => {
    if (!id) return;
    try {
      sessionStorage.setItem(storageKey, id);
    } catch {
      /* Optional storage. */
    }
    const url = new URL(window.location.href);
    if (url.searchParams.get("season") !== id) {
      url.searchParams.set("season", id);
      window.history.replaceState(window.history.state, "", url);
    }
  }, [id]);
  return {
    seasons,
    id,
    setSelected: (value: string) => setSelection({ value, ready: true }),
  };
}
