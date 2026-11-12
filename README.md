# Remastered

A playable archive of classic games rebuilt for modern browsers, with original-game research, remastered presentation and documented fidelity checks.

The shared home is **https://remastered.500miles.cz/**. A responsive tile index introduces the project and opens each game:

| Game | Source | Browser route |
| --- | --- | --- |
| Prehistorik 2 | [pre2/](pre2/) | `/pre2/` |
| Golden Axe | [ga/](ga/) | `/ga/` |
| Flappy | [flappy/](flappy/) | `/flappy/` |

Each game keeps its own source, data, tests and research/provenance. The shared application serves all three directories without an ingress rewrite. Keyboard and supported touch controls, original/remastered choices and other features are documented inside each game. The collection does not claim complete bit-exact equivalence with every original hardware configuration.

## Repository layout

```text
portal/dist/        Shared tile index and game previews
pre2/               Prehistorik 2 (moved from the former repository root)
ga/                 Golden Axe
flappy/             Flappy
scripts/            Shared preview, verification and container smoke
provenance/         Combined public runtime checksums
Dockerfile          One image containing the portal and all games
.github/workflows/  One active multiarch image workflow
deploy/             NGINX and pure Kubernetes manifest renderer
DEPLOYER.md         Fresh deployment and reviewed legacy cleanup handoff
```

This repository was renamed from `michalmedvecky/pre2-web` to `michalmedvecky/remastered`. Existing history and historical game release tags are retained. Historical release documents describe the layout/image that existed at their tagged commit. Current code and build identity use the new repository. Update local remotes:

```sh
git remote set-url origin git@github.com:michalmedvecky/remastered.git
```

## Development

Node24+, no dependency installation:

```sh
git clone https://github.com/michalmedvecky/remastered.git
cd remastered
npm start
# http://127.0.0.1:6002/
npm test
npm run verify
```

Individual game suites remain available with `npm --prefix pre2 test`, `npm --prefix ga test` and `npm --prefix flappy test`. Root tests also check actual prefix routing, MIME/cache behavior and offline deployment rendering. Browser QA is separate; passing Node tests does not claim a native DOS fullrun or a physical mobile test.

For an intentionally reviewed public runtime change, run `npm run snapshot`, then tests and verification. Game-specific GA/Flappy manifests must also be refreshed with their existing scripts when those runtimes change. CI refuses mismatched checksums rather than silently rewriting them. Local build metadata has a null commit; the clean CI image injects the actual full commit and each site's source snapshot.

## Build and deploy

The sole active publisher is [publish-remastered-image.yml](.github/workflows/publish-remastered-image.yml). It tests all games, verifies the combined runtime, builds linux/amd64 and linux/arm64, publishes **ghcr.io/michalmedvecky/remastered**, and smoke-tests the actual read-only non-root container. The three former publishers are retired outside the active workflow directory.

[DEPLOYER.md](DEPLOYER.md) is the independent deployer's handoff for **remastered.500miles.cz**, explicit cluster/TLS/image inputs, backups, acceptance and removal of the old applications by a reviewed exact allowlist. This preparation does not execute a cluster rollout or delete live resources. Original source files, old releases and research data are retained.

The container serves `/healthz` and build metadata at `/build.json`, `/pre2/build.json`, `/ga/build.json` and `/flappy/build.json`. The launcher links to GitHub and the full build commit. Missing assets return404, never a game's HTML fallback. Only content-addressed assets receive immutable caching.

## Research and limitations

See each game's README, reports and provenance for source-derived behavior, new browser features, comparison methods and remaining uncertainty. Prehistorik2's historical artwork/research files live under `pre2/art/` and `pre2/docs/`; Golden Axe's current fidelity/sound reports live under `ga/reports/`; Flappy's original-source inventory is [flappy/SOURCES.md](flappy/SOURCES.md).

Classic game names identify their respective originals. Modern reconstruction and presentation work are documented separately from original authorship. The launcher uses actual gameplay captures, not invented marketing screenshots.
