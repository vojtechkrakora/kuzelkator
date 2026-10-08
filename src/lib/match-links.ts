import type { Match } from "@/domain/models";

export function videoHref(value: string | null | undefined) {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value.trim());
    return ["https:", "http:"].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}

function coordinate(value: string | number | null | undefined, limit: number) {
  if (
    value == null ||
    (typeof value === "string" && !/^[+-]?\d+(?:\.\d+)?$/.test(value.trim()))
  )
    return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && Math.abs(parsed) <= limit ? parsed : null;
}

export function venueLinks(venue: Match["venue"]) {
  if (!venue) return { address: "", directions: null };
  const street = venue.street?.trim();
  const city = venue.city?.trim();
  const address = [street, [venue.zip?.trim(), city].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");
  const lat = coordinate(venue.gpsLat, 90);
  const lng = coordinate(venue.gpsLong, 180);
  // Do not direct someone to a city centre when the actual venue is unknown.
  const destination =
    lat != null && lng != null
      ? `${lat},${lng}`
      : street && city
        ? [venue.name, address].filter(Boolean).join(", ")
        : null;
  return {
    address,
    directions: destination
      ? `https://www.google.com/maps/dir/?${new URLSearchParams({ api: "1", destination })}`
      : null,
  };
}
