"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronRight, MapPin, Search } from "lucide-react";
import type { Competition } from "@/domain/models";
import {
  competitionLevel,
  discoverCompetitions,
  levels,
} from "@/domain/competition-discovery";

const storageKey = "kuzelkator:competition-area:v1";
export function CompetitionPicker({
  items,
  selected,
  onChoose,
  loading,
  failed,
}: {
  items: Competition[];
  selected: string;
  onChoose: (id: string) => void;
  loading: boolean;
  failed: boolean;
}) {
  const [area, setArea] = useState("");
  const [level, setLevel] = useState("all");
  const [query, setQuery] = useState("");
  const [warning, setWarning] = useState("");
  const panel = useRef<HTMLDetailsElement>(null);
  const trigger = useRef<HTMLElement>(null);
  useEffect(() => {
    try {
      setArea(localStorage.getItem(storageKey) ?? "");
    } catch {
      /* Browsing works without storage. */
    }
  }, []);
  const regions = [
    ...new Map(
      items
        .flatMap((item) => item.regions ?? [])
        .map((region) => [String(region.id), region]),
    ).values(),
  ].sort((a, b) => a.name.localeCompare(b.name, "cs"));
  const areaName = regions.find((region) => String(region.id) === area)?.name;
  const results = discoverCompetitions(items, area, level, query);
  const current = items.find((item) => String(item.id) === selected);
  function changeArea(value: string) {
    setArea(value);
    setLevel("all");
    setQuery("");
    try {
      localStorage.setItem(storageKey, value);
      setWarning("");
    } catch {
      setWarning("Oblast zůstane vybraná jen do zavření stránky.");
    }
  }
  function choose(id: string) {
    onChoose(id);
    if (panel.current) panel.current.open = false;
    trigger.current?.focus();
  }
  return (
    <section
      id="competitions"
      className="league-picker"
      aria-label="Výběr soutěže"
    >
      <details ref={panel}>
        <summary ref={trigger}>
          <MapPin size={22} />
          <span>
            <small>
              {areaName
                ? `Vaše oblast · ${areaName}`
                : "OD OKRESU PO PRVNÍ LIGU"}
            </small>
            <strong>
              {current?.name ??
                (selected ? "Vybraná soutěž" : "Najděte svou soutěž")}
            </strong>
          </span>
          <ChevronRight className="picker-chevron" size={20} />
        </summary>
        <div className="league-picker-body">
          <p>Vyberte kraj a pak soutěž. Oblast si zapamatujeme pro příště.</p>
          <label className="area-select">
            Kde sledujete kuželky?
            <select
              aria-label="Oblast soutěží"
              value={area}
              onChange={(event) => changeArea(event.target.value)}
            >
              <option value="">Celé Česko · všechny soutěže</option>
              {area && !areaName && (
                <option value={area}>
                  Uložená oblast · v této sezóně bez soutěží
                </option>
              )}
              {regions.map((region) => (
                <option key={region.id} value={region.id}>
                  {region.name === "Celá ČR" ? "Celostátní ligy" : region.name}
                </option>
              ))}
            </select>
          </label>
          <div className="league-levels" aria-label="Úroveň soutěže">
            {levels.map(([id, label]) => (
              <button
                key={id}
                aria-pressed={level === id}
                onClick={() => setLevel(id)}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="search-box">
            <Search size={18} />
            <input
              aria-label="Hledat soutěž nebo okres"
              placeholder="Např. Tábor, přebor nebo divize…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          {warning && <p role="status">{warning}</p>}
          <div className="league-result-heading">
            <span role="status">
              {loading
                ? "Načítání soutěží…"
                : failed
                  ? "Soutěže se nepodařilo načíst."
                  : `${results.length} soutěží`}
            </span>
            <button onClick={() => choose("")}>Zobrazit všechny zápasy</button>
          </div>
          {!loading && !failed && !results.length && (
            <div className="league-empty">
              <strong>Žádná soutěž pro tento výběr.</strong>
              <p>Zkuste jiný název nebo rozšiřte oblast.</p>
              <button className="button" onClick={() => changeArea("")}>
                Prohledat celé Česko
              </button>
            </div>
          )}
          <div className="league-results">
            {results.map((item) => (
              <button
                key={item.id}
                aria-pressed={selected === String(item.id)}
                onClick={() => choose(String(item.id))}
              >
                <span>
                  <strong>{item.name}</strong>
                  <small>
                    {levels.find(
                      ([id]) => id === competitionLevel(item),
                    )?.[1] ?? "Soutěž"}{" "}
                    ·{" "}
                    {item.regions?.map((region) => region.name).join(" / ") ||
                      "Oblast neuvedena"}
                  </small>
                </span>
                <ChevronRight size={18} />
              </button>
            ))}
          </div>
          <p className="league-footnote">
            Oblast vybírá seznam soutěží. Zápasy se změní po zvolení konkrétní
            soutěže.
          </p>
        </div>
      </details>
    </section>
  );
}
