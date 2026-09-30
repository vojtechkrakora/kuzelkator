export function todayPrague(now = new Date()) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Prague",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
export function shiftDay(day: string, delta: number) {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
}
export function weekRange(day: string) {
  const weekday = new Date(`${day}T12:00:00Z`).getUTCDay();
  const from = shiftDay(day, -((weekday + 6) % 7));
  return { from, to: shiftDay(from, 6) };
}
export function pragueMidnight(day: string) {
  const date = new Date(`${day}T00:00:00Z`);
  const offset = new Intl.DateTimeFormat("en", {
    timeZone: "Europe/Prague",
    timeZoneName: "shortOffset",
  })
    .formatToParts(date)
    .find((part) => part.type === "timeZoneName")!.value;
  const hours = Number(offset.replace("GMT", ""));
  return new Date(date.getTime() - hours * 3600000).toISOString();
}
export function dayLabel(day: string | null, long = false) {
  if (!day) return "Termín bude upřesněn";
  return new Intl.DateTimeFormat("cs-CZ", {
    weekday: long ? "long" : "short",
    day: "numeric",
    month: long ? "long" : "numeric",
    timeZone: "UTC",
  }).format(new Date(`${day.slice(0, 10)}T12:00:00Z`));
}

export function feedDayLabel(day: string, today: string) {
  if (!day) return "Termín bude upřesněn";
  const relative =
    day === today
      ? "Dnes"
      : day === shiftDay(today, -1)
        ? "Včera"
        : day === shiftDay(today, 1)
          ? "Zítra"
          : "";
  return `${relative ? `${relative} · ` : ""}${dayLabel(day, true)}`;
}
