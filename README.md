# Kuželkátor

A working proof of concept for a personalised Czech nine-pin bowling results site, using real public ČKA data. No API key or ČKA account is required.

## Run with Docker

Requires a running Docker daemon and Docker Compose v2.

```sh
docker compose up --build -d
```

Open [localhost:43127](http://localhost:43127). The high host port is intentional; the container listens on port 3000 internally. The host binding is loopback-only.

Choose a different host port:

```sh
KUZELKATOR_PORT=43128 docker compose up --build -d
```

Or run a second, separate instance with a unique Compose project and port:

```sh
KUZELKATOR_PORT=43128 docker compose -p kuzelkator-preview up --build -d
```

There are no fixed container names, external networks, database ports, or persistent volumes to collide with other projects. Favourites belong to the browser origin, so a different port has a separate favourites list.

On the development machine, the default Docker context points to Colima. This POC was started with Docker Desktop explicitly, without changing that default context:

```sh
docker --context desktop-linux compose up --build -d
docker --context desktop-linux compose ps
docker --context desktop-linux compose logs -f web
docker --context desktop-linux compose down
```

Use the same context and project name for subsequent management commands. Stopping this Compose project does not stop other containers. The local health endpoint is [health](http://localhost:43127/api/health); it checks application availability without calling ČKA.

## Deploy to Render.com

The included [render.yaml](render.yaml) Blueprint runs the existing Docker image as a web service in Frankfurt. It defaults to Render's free compute plan for trying the POC. No database, persistent disk, or API credentials are required.

1. Connect the [GitHub repository](https://github.com/vojtechkrakora/kuzelkator) to Render. The repository includes the Dockerfile, render.yaml, package-lock.json, application sources, and tests; generated files and local environment files stay excluded.
2. In the [Render Dashboard](https://dashboard.render.com/), select **New → Blueprint** and connect that repository and branch.
3. Render reads render.yaml. Review the service name, Frankfurt region, and Free plan, then create/deploy the Blueprint.
4. Wait for the Docker build and health check to pass. The build runs the unit tests before creating the production application.
5. Open the HTTPS service URL shown in the dashboard. Check the match list and a match detail, then follow a team and reload to confirm browser persistence.

Render uses the Dockerfile directly, not the local Compose file. Leave the Docker start-command override empty so the image runs `node server.js`. The Blueprint sets `PORT=10000` and `HOSTNAME=0.0.0.0`; the standalone server already respects these values. The local host port 43127 and `KUZELKATOR_PORT` do not apply to Render. Do not use the local `npm start` helper as a Render command because it binds to loopback for local use.

Pushing a commit to the connected branch automatically rebuilds and deploys the service. Change `autoDeployTrigger` to `off` if you prefer manual deployments.

Free web services spin down after 15 minutes without incoming traffic and take time to wake up. Use a paid compute plan for an always-on production deployment, updating `plan` in render.yaml to match the chosen plan. The response cache is held in memory and resets on deploys/restarts; favourites stay in each visitor's browser. Localhost favourites do not automatically transfer to the new domain.

For a custom domain, add it in the Render service's Settings and follow Render's DNS instructions. Render manages HTTPS. Verify access to the ČKA API from the deployed service; the local health endpoint intentionally checks the app rather than upstream API availability.

References: [Render Docker services](https://render.com/docs/docker), [Blueprint reference](https://render.com/docs/blueprint-spec), [port binding](https://render.com/docs/web-services#port-binding), and [Free service limitations](https://render.com/docs/free).

## What works

- Czech interface with desktop and phone layouts, 44px touch targets, safe-area spacing, and bottom navigation for matches, favourites, and competitions.
- Weekly fixtures and results, with pagination and competition filters.
- Up to 20 followed teams, saved on this device; click a team in the sidebar to filter its matches.
- Shareable date, competition, season-selector, and team filter URLs.
- Match detail with team scores, totals, player names, and available substitute names alongside lineup positions.
- Phone match details use player cards with full names and all scores, plus quick links to each team's results. Desktop keeps the tabular overview. Phone standings prioritise rank, team, matches played, and points.
- Official competition standings with a selectable round, shown below the match list after choosing a competition.
- Server-side validation, a bounded memory cache, ETag revalidation, request deduplication, a four-request upstream concurrency limit, and rate-limit cooldown.
- Explicit loading, empty, error, and stale-data states. Visible match lists refresh every 60 seconds.

The default view uses the current week in Prague. For a known historical example, open [September 2026](http://localhost:43127/?date=2026-09-26) or [match 640](http://localhost:43127/matches/640).

## Local development

Use Node.js 22 LTS or Node.js 24+. The system Node 16 installation on the original development machine is too old; Node.js 23 is not supported by the test runner.

```sh
npm ci
npm run dev
```

The development server also uses port 43127. Stop the container first, or use `npm run dev -- --port 43128`.

For a local production build:

```sh
npm run build
npm start
```

`npm start` prepares the static assets beside Next's standalone server and respects `KUZELKATOR_PORT` (default 43127).

## Validation

```sh
npm run typecheck
npm test
npm run build
```

Browser tests target an already running application. They mock browser API responses, so favourites, filters, mobile layout, and failure recovery are tested without loading the public API:

```sh
npx playwright install chromium
npm run test:e2e
```

Alternatively use an installed Chrome: `PLAYWRIGHT_CHANNEL=chrome npm run test:e2e`. Override the target with `TEST_BASE_URL=http://localhost:43128` if needed. Live API integration is checked separately; the application never silently substitutes mock data.

## POC limits and next steps

- Player profiles, player favourites, charts, notifications, and account synchronisation are not implemented. Match detail requests player identities directly through nested relations (`results.playerResults.player` and `.substitute`), verified against the live public API. These deeper relations are not currently listed in the OpenAPI include enum. Missing names are explicitly labelled; names are never inferred from scores or lineup order.
- The season selector chooses the competition catalogue and moves the date window when changed. Match browsing is date-based; dates can subsequently be moved independently.
- Standings initially use the highest round in the current page of matches (or round 1 when empty). This is not a claim that it is the latest completed round. Select an earlier round if a future round has no published table.
- Competition discovery loads at most 500 competitions for a season. Text filtering searches that loaded catalogue, not a global team/player index.
- Unknown-time or undated fixtures are not discoverable in the date-filtered list. Historical availability and update speed depend on ČKA.
- The process cache is lost when the container restarts. It is intentionally not shared between instances. A future public deployment needs operational limits and a shared-cache decision.
- Matches shown on a page refresh; an open match detail is a server-rendered snapshot and requires reload to update. Official corrections can change finished results.

The Docker build uses a pinned npm lockfile, a multi-stage build, a non-root runtime, a read-only filesystem, and a local healthcheck. No external fonts, database, or image service are needed.

Architecture and future scope: [ARCHITECTURE.md](ARCHITECTURE.md). API reference: [ČKA public OpenAPI](https://kuzelky.cz/api/v1/public/openapi?variant=public).
