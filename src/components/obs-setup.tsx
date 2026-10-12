"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { OverlayContent, useOverlayMatch } from "./obs-overlay";
import { overlayPanels, type OverlayDensity } from "@/domain/obs-overlay";
const panels = {
  home: { name: "Domácí", size: "360 × 960" },
  away: { name: "Hosté", size: "360 × 960" },
  score: { name: "Skóre", size: "1920 × 120" },
};
export function ObsSetup({ id }: { id: number }) {
  const [density, setDensity] = useState<OverlayDensity>("compact");
  const [origin, setOrigin] = useState("");
  const [message, setMessage] = useState("");
  const state = useOverlayMatch(id);
  useEffect(() => setOrigin(window.location.origin), []);
  return (
    <main id="main" className="page obs-setup">
      <Link href={`/matches/${id}`}>← Zpět na zápas</Link>
      <h1>Výsledky do OBS</h1>
      <p>
        Tři průhledné zdroje, které si rozmístíš kolem obrazu kamery. Každý vlož
        v OBS jako zdroj <strong>Prohlížeč</strong> a nastav uvedenou šířku a
        výšku. Další okna prohlížeče nepotřebuješ.
      </p>
      <fieldset className="obs-density-picker">
        <legend>Velikost hráčských panelů</legend>
        <button
          className="button"
          aria-pressed={density === "compact"}
          onClick={() => {
            setDensity("compact");
            setMessage("");
          }}
        >
          Kompaktní · 240 × 500
        </button>
        <button
          className="button"
          aria-pressed={density === "full"}
          onClick={() => {
            setDensity("full");
            setMessage("");
          }}
        >
          Plný · 360 × 960
        </button>
      </fieldset>
      <p>
        Kompaktní pohled šetří místo: iniciála jména, příjmení, součet a čtyři
        výsledky drah. Plný pohled zachovává celé jméno a všechny popisky.
        Velikost můžeš dále poměrně upravit přímo v OBS.
      </p>
      <div className="obs-source-list">
        {overlayPanels.map((panel) => {
          const path = `/matches/${id}/overlay?panel=${panel}${panel === "score" ? "" : `&density=${density}`}`;
          const url = origin ? origin + path : "";
          return (
            <section className="obs-source" key={panel}>
              <h2>{panels[panel].name}</h2>
              <p>
                {panel !== "score" && density === "compact"
                  ? "240 × 500"
                  : panels[panel].size}{" "}
                px · pro plátno 1920 × 1080
              </p>
              <label>
                Adresa zdroje
                <input
                  aria-label={`Adresa: ${panels[panel].name}`}
                  readOnly
                  value={url}
                  onFocus={(e) => e.target.select()}
                />
              </label>
              <div className="obs-source-actions">
                <button
                  className="button"
                  disabled={!origin}
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(url);
                      setMessage(`Adresa „${panels[panel].name}“ zkopírována.`);
                    } catch {
                      setMessage(
                        "Kopírování není dostupné. Označ a zkopíruj adresu z pole.",
                      );
                    }
                  }}
                >
                  Kopírovat adresu
                </button>
                <a
                  className="button"
                  href={path}
                  target="_blank"
                  rel="noreferrer"
                >
                  Otevřít panel ↗
                </a>
              </div>
            </section>
          );
        })}
      </div>
      <p role="status">{message}</p>
      <details className="obs-instructions">
        <summary>Nastavení a aktualizace</summary>
        <p>
          Umísti zdroje nad kameru. Pro jiné rozlišení je v OBS poměrně zmenši;
          například pro 1280 × 720 na dvě třetiny. Levý a pravý panel nastav na
          stejnou velikost, aby protilehlí hráči zůstali zarovnaní.
        </p>
        <p>
          Data se automaticky kontrolují každých 15 sekund. Zdrojové API
          ověřujeme přibližně jednou za minutu; přenos neukazuje každý hod z
          počítadla. Mezi panely může být při aktualizaci krátký rozdíl. Po
          dohrání kontrolujeme opravy přibližně každých 5 minut.
        </p>
        <p>
          Při výpadku zůstane poslední skóre s označením „Neaktuální data“. Pro
          úsporu provozu lze v OBS zapnout „Vypnout zdroj, když není viditelný“;
          po návratu se výsledky načtou znovu. Pro tento náhled nemusíš nechávat
          stránku otevřenou.
        </p>
      </details>
      <h2>Živý náhled panelů</h2>
      <p>
        Zelená: výhra na dráze · červená: prohra · žlutá: remíza. Nepotvrzený
        výsledek zůstává neutrální.
      </p>
      <div className={`obs-preview-teams obs-preview-${density}`}>
        <div>
          <OverlayContent panel="home" density={density} {...state} />
        </div>
        <div>
          <OverlayContent panel="away" density={density} {...state} />
        </div>
      </div>
      <div className="obs-preview-score">
        <OverlayContent panel="score" {...state} />
      </div>
    </main>
  );
}
