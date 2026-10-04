"use client";

import regions from "../data/czech-regions.json";

export function RegionMap({
  selected,
  onChoose,
}: {
  selected: string;
  onChoose: (id: string) => void;
}) {
  return (
    <div className="region-map">
      <svg
        viewBox="0 0 640 380"
        role="group"
        aria-label="Mapa krajů České republiky"
      >
        {regions.map((region) => (
          <g
            key={region.id}
            role="button"
            tabIndex={0}
            aria-label={region.name}
            aria-pressed={selected === String(region.id)}
            onClick={() => onChoose(String(region.id))}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onChoose(String(region.id));
              }
            }}
          >
            <title>{region.name}</title>
            <path d={region.path} fillRule="evenodd" />
            <text x={region.x} y={region.y} aria-hidden="true">
              {region.label}
            </text>
          </g>
        ))}
      </svg>
      <small className="map-attribution">
        Hranice:{" "}
        <a
          href="https://www.geoboundaries.org/"
          target="_blank"
          rel="noreferrer"
        >
          geoBoundaries / ČÚZK
        </a>{" "}
        ·{" "}
        <a
          href="https://creativecommons.org/licenses/by/4.0/"
          target="_blank"
          rel="noreferrer"
        >
          CC BY 4.0
        </a>
      </small>
    </div>
  );
}
