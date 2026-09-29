/** Only the public ČKA club image directory is eligible for image optimization. */
export function clubLogoUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (
      url.origin !== "https://evidence.kuzelky.cz" ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      !url.pathname.startsWith("/assets/clubs/") ||
      !/\.(png|jpe?g|webp|gif|avif)$/i.test(url.pathname)
    )
      return null;
    return url.href;
  } catch {
    return null;
  }
}
