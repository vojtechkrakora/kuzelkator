type BuildEnvironment = {
  [key: string]: string | undefined;
  RENDER_GIT_COMMIT?: string;
  npm_package_version?: string;
};

export function getBuildInfo(
  environment: BuildEnvironment = process.env,
  builtAt = new Date(),
) {
  const appVersion = environment.npm_package_version?.trim() || "dev";
  const commit = environment.RENDER_GIT_COMMIT?.trim().slice(0, 7);

  return {
    version: commit ? `${appVersion} · ${commit}` : appVersion,
    builtAt: builtAt.toISOString(),
    builtLabel: new Intl.DateTimeFormat("cs-CZ", {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: "Europe/Prague",
    }).format(builtAt),
  };
}
