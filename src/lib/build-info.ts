type BuildEnvironment = {
  [key: string]: string | undefined;
  KUZELKATOR_VERSION?: string;
  KUZELKATOR_COMMIT?: string;
  KUZELKATOR_BUILT_AT?: string;
};

export function getBuildInfo(environment: BuildEnvironment) {
  const appVersion = environment.KUZELKATOR_VERSION?.trim() || "dev";
  const commit = environment.KUZELKATOR_COMMIT?.trim();
  const parsedBuiltAt = new Date(environment.KUZELKATOR_BUILT_AT ?? "");
  const hasBuildTime = !Number.isNaN(parsedBuiltAt.getTime());

  return {
    version: commit ? `${appVersion} · ${commit}` : appVersion,
    builtAt: hasBuildTime ? parsedBuiltAt.toISOString() : undefined,
    builtLabel: hasBuildTime
      ? new Intl.DateTimeFormat("cs-CZ", {
          dateStyle: "short",
          timeStyle: "short",
          timeZone: "Europe/Prague",
        }).format(parsedBuiltAt)
      : "čas sestavení není dostupný",
  };
}
