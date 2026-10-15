/** Allow only public context; personal favourites and unrelated query data never leave the page. */
export function shareUrl(input: string) {
  const source = new URL(input);
  const target = new URL(source.pathname, source.origin);
  const player = /^\/players\/\d+$/.test(source.pathname);
  const keys =
    source.pathname === "/"
      ? ["date", "competition", "team", "season"]
      : player
        ? ["season", "competition", "team"]
        : [];
  for (const key of keys) {
    const value = source.searchParams.get(key);
    if (!value) continue;
    if (key === "date") {
      const parsed = new Date(`${value}T12:00:00Z`);
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
        Number.isNaN(parsed.getTime()) ||
        parsed.toISOString().slice(0, 10) !== value
      )
        continue;
    } else if (
      !/^\d+$/.test(value) ||
      !Number.isSafeInteger(Number(value)) ||
      Number(value) <= 0
    )
      continue;
    target.searchParams.set(key, value);
  }
  return target.href;
}
