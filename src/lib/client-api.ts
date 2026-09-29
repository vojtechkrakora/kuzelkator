import type { Resource } from "@/domain/models";

export async function getData<T>(
  params: Record<string, string | number>,
  signal?: AbortSignal,
): Promise<Resource<T>> {
  const query = new URLSearchParams(
    Object.entries(params).map(([key, value]) => [key, String(value)]),
  );
  const response = await fetch(`/api/data?${query}`, { signal });
  const json = await response.json();
  if (!response.ok) throw new Error(json.error ?? "Data nejsou dostupná.");
  return json;
}
