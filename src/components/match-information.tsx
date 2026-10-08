import { MapPin, Navigation, Play } from "lucide-react";
import type { Match } from "@/domain/models";
import { venueLinks, videoHref } from "../lib/match-links";

export function MatchInformation({ match }: { match: Match }) {
  const video = videoHref(match.videoUrl);
  const { address, directions } = venueLinks(match.venue);
  const lanes = Number(match.venue?.alleys);
  const referee = match.refereeName?.trim();
  return (
    <div className="match-information">
      {match.venue && (
        <div className="match-venue">
          <p>
            <MapPin size={16} aria-hidden="true" />
            <strong>{match.venue.name}</strong>
          </p>
          {address && <p className="match-venue-address">{address}</p>}
        </div>
      )}
      {(referee || (Number.isInteger(lanes) && lanes > 0)) && (
        <p className="match-venue-extra">
          {[
            Number.isInteger(lanes) && lanes > 0
              ? `Počet drah: ${lanes}`
              : null,
            referee ? `Rozhodčí: ${referee}` : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      )}
      {(video || directions) && (
        <div className="match-actions">
          {video && (
            <a href={video} target="_blank" rel="noopener noreferrer">
              <Play size={18} aria-hidden="true" />
              Video zápasu
              <span className="sr-only"> (otevře se v nové kartě)</span>
            </a>
          )}
          {directions && (
            <a href={directions} target="_blank" rel="noopener noreferrer">
              <Navigation size={18} aria-hidden="true" />
              Navigovat
              <span className="sr-only">
                {" "}
                na kuželnu v Google Mapách (otevře se v nové kartě)
              </span>
            </a>
          )}
        </div>
      )}
    </div>
  );
}
