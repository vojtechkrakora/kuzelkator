"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { OverlayContent, useOverlayMatch } from "./obs-overlay";
import { overlayPanels, type OverlayDensity } from "@/domain/obs-overlay";
import {
  obsSettings,
  obsPath,
  obsStorageKey,
  type ObsSettings,
} from "@/domain/obs-settings";
import { ObsFrame } from "./obs-frame";
const panels = {
  home: { name: "Domácí" },
  away: { name: "Hosté" },
  score: { name: "Skóre" },
};
function DimensionInput({
  value,
  min,
  max,
  label,
  onValue,
}: {
  value: number;
  min: number;
  max: number;
  label: string;
  onValue: (value: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  return (
    <input
      type="number"
      aria-label={label}
      min={min}
      max={max}
      value={draft}
      onChange={(event) => {
        const text = event.target.value;
        setDraft(text);
        const n = Number(text);
        if (text && Number.isInteger(n) && n >= min && n <= max) onValue(n);
      }}
      onBlur={() => {
        const n = draft.trim() ? Number(draft) : value;
        const bounded = Number.isFinite(n)
          ? Math.round(Math.max(min, Math.min(max, n)))
          : value;
        setDraft(String(bounded));
        onValue(bounded);
      }}
    />
  );
}
export function ObsSetup({ id }: { id: number }) {
  const [density, setDensity] = useState<OverlayDensity>("compact");
  const [origin, setOrigin] = useState("");
  const [message, setMessage] = useState("");
  const [settings, setSettings] = useState(() => ({
    home: obsSettings("home"),
    away: obsSettings("away"),
    score: obsSettings("score"),
  }));
  const state = useOverlayMatch(id);
  useEffect(() => {
    setOrigin(window.location.origin);
    try {
      const saved = JSON.parse(localStorage.getItem(obsStorageKey) ?? "null");
      if (saved && typeof saved === "object") {
        const next = {
          home: obsSettings("home", saved.home),
          away: obsSettings("away", saved.away),
          score: obsSettings("score", saved.score),
        };
        setSettings(next);
        setDensity(next.home.density);
      }
    } catch {
      /* Storage is optional. Links work without it. */
    }
  }, []);
  function save(next: typeof settings) {
    setSettings(next);
    try {
      localStorage.setItem(obsStorageKey, JSON.stringify(next));
    } catch {
      /* Optional storage. */
    }
  }
  function preset(value: OverlayDensity) {
    setDensity(value);
    save({
      ...settings,
      home: obsSettings("home", { density: value }),
      away: obsSettings("away", { density: value }),
    });
    setMessage("");
  }
  return (
    <main id="main" className="page obs-setup">
      <Link href={`/matches/${id}`}>← Zpět na zápas</Link>
      <h1>Výsledky do OBS</h1>
      <p>
        Tři neprůhledné zdroje, které si rozmístíš kolem obrazu kamery. Každý
        vlož v OBS jako zdroj <strong>Prohlížeč</strong> a nastav uvedenou šířku
        a výšku. Další okna prohlížeče nepotřebuješ.
      </p>
      <fieldset className="obs-density-picker">
        <legend>Velikost hráčských panelů</legend>
        <button
          className="button"
          aria-pressed={density === "compact"}
          onClick={() => {
            preset("compact");
          }}
        >
          Kompaktní · 240 × 720
        </button>
        <button
          className="button"
          aria-pressed={density === "full"}
          onClick={() => {
            preset("full");
          }}
        >
          Plný · 360 × 1320
        </button>
      </fieldset>
      <p>
        Kompaktní pohled šetří místo: iniciála jména, příjmení, součet a
        výsledky drah. Plný pohled zachovává celé jméno a všechny popisky. Každý
        zdroj nastav zvlášť níže. Nastavení si tento prohlížeč zapamatuje i pro
        další zápas.
      </p>
      <div className="obs-source-list">
        {overlayPanels.map((panel) => {
          const config = settings[panel];
          const path = obsPath(id, panel, config);
          const url = origin ? origin + path : "";
          return (
            <section className="obs-source" key={panel}>
              <h2>{panels[panel].name}</h2>
              <p>
                {config.width} × {config.height} px · rozměry zdroje Prohlížeč v
                OBS
              </p>
              <div className="obs-config-fields">
                {(
                  [
                    ["width", "Šířka", 200, 3840],
                    ["height", "Výška", 100, 2160],
                    ["scale", "Velikost obsahu (%)", 75, 150],
                    ...(panel === "score"
                      ? []
                      : [["gap", "Mezery hráčů (px)", 0, 24]]),
                  ] as [keyof ObsSettings, string, number, number][]
                ).map(([key, label, min, max]) => (
                  <label key={key}>
                    {label}
                    <DimensionInput
                      label={`${label}: ${panels[panel].name}`}
                      min={min}
                      max={max}
                      value={Number(config[key])}
                      onValue={(value) =>
                        save({
                          ...settings,
                          [panel]: obsSettings(panel, {
                            ...config,
                            [key]: value,
                          }),
                        })
                      }
                    />
                  </label>
                ))}
              </div>
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
          Šířku a výšku měň v OBS ve Vlastnostech zdroje Prohlížeč, nikoli
          tažením rohu v obraze. Po změně nastavení zkopíruj novou adresu a
          uvedené rozměry do OBS. Při nedostatku místa se obsah automaticky
          zmenší, aby žádný hráč nechyběl. Pro větší písmo může být nutné panel
          rozšířit nebo zvýšit. Pro zarovnání soupeřů použij u obou týmů stejné
          nastavení.
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
      <p>
        Náhled zachovává nastavené rozměry; větší panel lze posunout do stran.
        Celá plocha zdroje má tmavý podklad.
      </p>
      {overlayPanels.map((panel) => (
        <section key={panel} aria-label={`Náhled: ${panels[panel].name}`}>
          <h3>{panels[panel].name}</h3>
          <div className="obs-preview-scroll">
            <div
              style={{
                width: settings[panel].width,
                height: settings[panel].height,
              }}
            >
              <ObsFrame settings={settings[panel]}>
                <OverlayContent
                  panel={panel}
                  density={settings[panel].density}
                  {...state}
                />
              </ObsFrame>
            </div>
          </div>
        </section>
      ))}
    </main>
  );
}
