"use client";

import Image from "next/image";
import { CircleDot } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Team } from "@/domain/models";
import { clubLogoUrl } from "@/lib/club-logo";
import { getData } from "@/lib/client-api";

export function TeamLogo({
  team,
  size = 28,
}: {
  team?: Team | null;
  size?: number;
}) {
  // Older favourites only stored a team's ID and name. Resolve those once,
  // without rewriting preferences or fetching teams whose club has no logo.
  const detail = useQuery({
    queryKey: ["team", team?.id],
    enabled: !!team && team.club === undefined,
    queryFn: ({ signal }) =>
      getData<Team>({ kind: "team", id: team!.id }, signal),
    staleTime: 86400000,
  });
  const url = clubLogoUrl((team?.club ?? detail.data?.data.club)?.logo);
  const [optimizerFailedUrl, setOptimizerFailedUrl] = useState<string | null>(
    null,
  );
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  return (
    <span
      className="club-logo"
      aria-hidden="true"
      style={{ width: size, height: size }}
    >
      {url && failedUrl !== url ? (
        <Image
          key={`${url}:${optimizerFailedUrl === url}`}
          unoptimized={optimizerFailedUrl === url}
          src={url}
          alt=""
          width={size}
          height={size}
          sizes={`${size}px`}
          style={{ objectFit: "contain" }}
          onError={() => {
            // Some hosting networks receive a non-image response from the
            // upstream even though the visitor can load the public image.
            if (optimizerFailedUrl !== url) setOptimizerFailedUrl(url);
            else setFailedUrl(url);
          }}
        />
      ) : (
        <CircleDot size={Math.round(size * 0.65)} />
      )}
    </span>
  );
}
