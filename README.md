# Prehistorik 2 — web game

Playable native JavaScript reconstruction using the recovered original graphics, levels, music and sound effects. Original graphics render at 320×200; optional HD graphics use a 1280×800 presentation canvas. Gameplay and audio run entirely in the browser. The repository contains the web game and deployment configuration. Original DOS executables, decompiled code and reverse-engineering reports are managed separately.

There is **no server-side application, database, PVC, account service or dependency on Sites hosting**. nginx serves `dist/`. Browser localStorage stores checkpoint progress per browser and origin. Multiple replicas require no session affinity.

All 16 recovered stages are available. Core player animations, jump impulses, weapon timing and glider controls follow recovered routines and data. The 13 generic enemy families, head bounces, combat and connected hidden-platform reveals follow recovered callbacks and tables. Boss state machines, multipart weak points, scripted attacks and fractional energy damage follow recovered routines. Input-only IDDQD replays verify completion of all 16 stages, bosses and selected secret branches. Original-game equivalence, every collection route and some terrain/platform presentation edges remain unverified.

Use the toolbar **Original / HD** button or **H** to switch graphics instantly. HD covers all 53 hero body/form frames, nine glider attachments, 22 weapon frames and eight bear walk/emergence/retreat/defeat frames. The choice is saved separately from game progress. HD art loads only when requested; a failed load keeps original graphics available. HD also adds 51 collectible frames plus the first stage’s rock/root/foliage tiles and mountain background; A resolution-independent HD HUD includes the lives portrait, digits, full/empty hearts and animated BONUS indicators in every stage. Level-one terrain uses connected contours, continuous color reconstruction and joined fine detail from the existing HD art, avoiding coarse palette blocks and tile outlines. This presentation is identical in a window and fullscreen; see [fullscreen/terrain checks](art/hd-v4/README.md). Other stages’ terrain and other monsters retain original art. Physics, hitboxes, animation timing and saves are identical in both modes. The original three-frame bush/scenery animations now run in both modes. Enemy-head rebounds preserve the native fall/jump counters, and foreground drawing follows the original priority flag. See [level-one fidelity fixes and verification](art/level-one-fidelity/README.md). See [character HD sources](art/hd-v1/README.md) and [environment/collectible sources](art/hd-v2/README.md) and [connected terrain / HD HUD verification](art/hd-v3/README.md); inspect every frame at [hd-preview.html](dist/hd-preview.html) (served locally as `/hd-preview.html`).

Environment checks cover all 16 stages: 32 animated tile triplets, 60 authored platforms and 124 foreground masks. Seven rising map regions in stages 9 and E now move with their original triggers and cadence, updating both scenery and collisions; empty platforms use the original contact-dependent display offset. Bonus stage G includes its recovered rain intensity schedule. Rain now uses the native shared RNG, duplicated-byte initialization and VGA OR masks, with the original direction and intensity schedule. Screen shake follows the native alternating offsets, fixed HUD, black top strip and player lift rules. Fresh starts use the initialized DOS seed; an exact menu-dependent random history still depends on the preceding session. Run `node scripts/verify-environment-browser.mjs` with an installed Playwright and the local server for optional Original/HD and secret-route integration checks. `node scripts/verify-shake-rain-browser.mjs` additionally checks actual keyboard holds, weather and shake.

The [360° Quest preparation and roadmap](docs/VR-ROADMAP.md) documents the renderer-neutral scene adapter, asset/rig requirements and future full-3D milestones. This release does not implement VR or contain 3D models.

## Local development

Use Node.js 20 or newer. No dependency installation or build step is required:

```sh
git clone https://github.com/michalmedvecky/pre2-web.git
cd pre2-web
npm test
npm start
```

Open http://127.0.0.1:5775. On macOS, `Play.command` also serves the game using Python 3. Arrow keys/WASD move, Up/Z jumps, Space attacks, Down crouches/uses passages (release it before using the return passage), X looks ahead, P/Escape pauses, M/F3 toggles sound, H toggles original/HD graphics and F enters fullscreen. Sound starts after a gesture; click **Sound on**. Touch controls appear on touch devices.

Land on enemies while holding jump for a higher bounce. Repeated club hits reveal connected hidden platforms; the first hit may leave them concealed. Type **IDDQD** during gameplay to toggle invulnerability. This browser-only cheat blocks enemy/boss damage and harmful pickups; spikes cannot hurt you, and falling out of the map returns you to your checkpoint without losing health or lives. In a fixed cave view, rescue also activates when the fallen character disappears below the playfield, even if there is still more map or a lower floor underneath. Rescue also unlocks cave cameras and clears falling, platform, glider and attack state so movement and jumping remain usable. It remains active across stages/restarts in the current run, but is not saved and resets for a new adventure or page reload. The status line shows when it is active. Type **IDKFA** to toggle secret hints: pulsing outlines on concealed blocks, Down markers at passages, bonus-exit markers, and up to three arrows toward nearby offscreen targets. Hints follow live discovery state and do not reveal walls, collect items, unlock exits or grant weapons. Some secrets require an enemy bounce or the glider. Both cheats reset for a new adventure or reload. Completing the original three-item bonus grants temporary enemy-contact power, which is separate from cheats.

Stage completion now includes the recovered circular closing effect and animated score tally: the caveman approaches the machine, collected food and treasure fall into it one by one, and each landing adds its individual bonus with the original sound and BRAVO music. Original and HD modes share the same timing and arithmetic. Bonus entrances carry their food ledger forward until the appropriate return rather than awarding it prematurely. The browser's Continue/world-map choices appear after the animation. Run `node scripts/verify-stage-tally-browser.mjs` with an installed Playwright and the local server for optional presentation/controller checks.

Pickups follow the original tables: six bones restore one heart; ordinary enemies drop six bones after harmful contact has cleared their native death flag, rather than on every defeat; food and treasure award their individual points, and the collected-food ledger is scored again at stage completion. A spare life is awarded per 250,000 displayed points, up to 99. Some pickups spill energy into recoverable bones. Other pickups defeat enemies, turn them into food, repel following particles, or switch the palette. Weapon pickups do not spend health or score.

Recorded input-only completion routes cover all 16 worlds, all four boss encounters and selected secret-room/bonus branches. See [playthrough coverage](PLAYTHROUGH.md) for reproducible checks and their limits.

Scrolling and moving sprites are interpolated on browser animation frames, with a 65ms camera filter to smooth the original 16px camera steps. Simulation, collisions and authored animation frames retain the original approximately 24.3Hz tick. Presentation adds up to one tick of motion latency; passages, respawns and checkpoint rescues cut immediately. Pixel art remains on the 320×200 pixel grid.

Assets are already generated and committed. Building or deploying does not require the original game or analysis workspace. `dist/rules.json` and the data tables in `dist/assets/` are runtime inputs. Do not remove them or regenerate them from guessed formats.

## Kubernetes deployment — agent runbook

An agent with authorized access to a cluster and registry can follow this section from a fresh checkout. Commands assume a POSIX shell, kubectl and curl. GitHub Actions builds the container; Docker/buildx is only needed for optional local container checks. Node is only needed for local tests, not serving the container.

### 1. Resolve the deployment inputs

Use the operator's existing project configuration and deployment authorization. Establish these values before changing cluster resources:

| Input | How to obtain it |
| --- | --- |
| Kubernetes context | Intended context from the operator; inspect `kubectl config get-contexts` |
| Image | Successful workflow image at `ghcr.io/michalmedvecky/pre2-web`; choose a commit tag or digest |
| Node architectures | `kubectl --context "$KUBE_CONTEXT" get nodes -L kubernetes.io/arch` |
| Namespace | Manifests default to dedicated namespace `prehistorik` |
| Public/private access | Preserve the operator's requested access and existing authentication |
| Hostname and HTTPS route | Existing ingress/Gateway configuration, DNS and certificate workflow |
| Registry pull credentials | Existing Secret or the operator's normal registry workflow |

If context, image release or exposure is ambiguous, ask for the missing value. Do not choose an unrelated context, print credentials, disable TLS checks, install a new controller, replace shared routes, or widen access as an incidental deployment step. Registry login is performed with the operator's existing credential mechanism.

Set values for this deployment (replace every example):

```sh
export KUBE_CONTEXT='your-cluster-context'
export IMAGE_REPOSITORY='ghcr.io/michalmedvecky/pre2-web'
# Default to the verified multi-platform digest committed in the manifest.
export IMAGE="$(awk '$1 == "image:" { print $2; exit }' deploy/kubernetes.yaml)"
kubectl --context "$KUBE_CONTEXT" cluster-info
kubectl --context "$KUBE_CONTEXT" get nodes -L kubernetes.io/arch
npm test
```

If using a different namespace, update **every** namespace reference in both manifests and subsequent commands. Do not deploy placeholder values.

### 2. Use the image published by GitHub Actions

[Publish game image](https://github.com/michalmedvecky/pre2-web/actions/workflows/publish-image.yml) runs on **every push to `main`**, and can also be dispatched manually on `main`. It tests the game, uses QEMU/Buildx to build `linux/amd64` and `linux/arm64`, and pushes a single multi-platform image to GHCR. It verifies both manifest entries and smoke-tests the published image on the runner's native architecture with a read-only root filesystem.

The workflow authenticates using its automatic `GITHUB_TOKEN` with `contents: read` and `packages: write`; no custom publishing PAT is required. GitHub Actions and these permissions must be allowed by repository/organization policy. The image has a source label linking the package to this repository. For a pre-existing package not linked to this repository, grant this repository Actions access in the package settings if publishing is denied. The workflow does not deploy to Kubernetes or change package visibility.

| Reference | Purpose |
| --- | --- |
| `ghcr.io/michalmedvecky/pre2-web:sha-<full-40-character-commit-SHA>` | Versioned image for a particular successful `main` build |
| `ghcr.io/michalmedvecky/pre2-web:latest` | Convenience tag; changes on publication, avoid for repeatable rollouts |
| `ghcr.io/michalmedvecky/pre2-web@sha256:<digest>` | Exact image index; preferred deployment/rollback reference |

**Wait for the workflow for your selected commit to finish successfully before applying.** A local commit, a feature branch or an unsuccessful workflow does not guarantee its image exists. The workflow run summary prints the exact digest reference; copy it to `IMAGE` to pin the deployment:

```sh
# Replace the example with the complete reference from the successful run summary.
export IMAGE='ghcr.io/michalmedvecky/pre2-web@sha256:REPLACE_WITH_PUBLISHED_DIGEST'
```

By default, step 1 reads the verified multi-platform digest already pinned in `deploy/kubernetes.yaml`, from successful build [39384474401](https://github.com/michalmedvecky/pre2-web/actions/runs/39384474401) of commit `873d582c962f315a0eca8bebcb760d60acacf739`. Keep that value to deploy the checked-in release, or override `IMAGE` with another successful build’s digest or full-commit tag. Kubernetes selects the node's architecture from the image index. Tags are version identifiers, not enforced immutable registry policy; a digest is the authoritative immutable reference.

#### GHCR pull access

Public packages can be pulled anonymously. New GHCR packages may be private even for a public repository. Inspect package visibility and preserve the intended audience; the workflow does not make the package public. For a private package, provision a GHCR pull Secret in namespace `prehistorik` through the operator's secret-management workflow (a personal access token **classic** with `read:packages` and package access is the usual GHCR credential). Reference its name under `spec.template.spec.imagePullSecrets` in the Deployment. Do not use the short-lived Actions `GITHUB_TOKEN` as a cluster credential or commit any token/Secret manifest.

#### Optional local container verification

A local build is unnecessary for deployment. To inspect changes before pushing, use Docker:

```sh
docker build -t prehistorik:smoke .
docker run --rm --name prehistorik-smoke \
  --read-only --tmpfs /tmp:rw,noexec,nosuid,size=64m \
  -p 127.0.0.1:8080:8080 prehistorik:smoke
```

In another terminal:

```sh
curl --fail http://127.0.0.1:8080/healthz
curl --fail --output /dev/null http://127.0.0.1:8080/
curl --fail --output /dev/null http://127.0.0.1:8080/assets/game.json
curl --fail --output /dev/null http://127.0.0.1:8080/js/audio.js
```

Open http://localhost:8080 and verify the title, new game, movement, attack, pause, stage selector and sound toggle. Stop the container with Control-C. The image contains nginx and the web assets; it excludes analysis files and Sites metadata. The nginx base uses `stable-alpine`; pin it by digest if base-image reproducibility is required.

### 3. Render and apply the workload

The tracked manifest pins a verified GHCR image digest supporting both architectures. The commands below preserve that default or render the explicit `IMAGE` override selected above:

```sh
kubectl --context "$KUBE_CONTEXT" create namespace prehistorik --dry-run=client -o yaml | \
  kubectl --context "$KUBE_CONTEXT" apply -f -
MANIFEST="$(mktemp)"
sed -E "s|^([[:space:]]*image:).*|\1 $IMAGE|" \
  deploy/kubernetes.yaml > "$MANIFEST"

kubectl --context "$KUBE_CONTEXT" apply --dry-run=server -f "$MANIFEST"
kubectl --context "$KUBE_CONTEXT" diff -f "$MANIFEST"
# Review the diff. Exit status 1 means differences exist; >1 means an error.
kubectl --context "$KUBE_CONTEXT" apply -f "$MANIFEST"
rm "$MANIFEST"
kubectl --context "$KUBE_CONTEXT" -n prehistorik \
  rollout status deployment/prehistorik --timeout=180s
```

This creates a Namespace, a two-replica Deployment and a ClusterIP Service. Containers run as UID/GID 10001, without capabilities or a service-account token, with a read-only root filesystem and a writable temporary volume. Health probes use `/healthz` on container port 8080; the Service exposes port 80. No cluster-wide components are installed.

For a private registry, create/reuse a pull Secret in `prehistorik` through your secret-management workflow and reference it under `spec.template.spec.imagePullSecrets` before rendering/applying. If the namespace does not exist, create it first. Never commit registry tokens or generated secret manifests.

### 4. Verify internally before exposure

```sh
kubectl --context "$KUBE_CONTEXT" -n prehistorik get pods,service
kubectl --context "$KUBE_CONTEXT" -n prehistorik \
  port-forward service/prehistorik 8080:80
```

Keep the forward running and repeat the curl/browser checks above at http://localhost:8080. Check that both Pods become Ready. A successful readiness probe proves nginx responds, not that all gameplay behaviors are correct.

### 5. Add an HTTPS route using the cluster's existing setup

For an existing Ingress controller, adapt `deploy/ingress.yaml`:

1. Replace `prehistorik.example.com` in both the TLS and rule sections.
2. Replace `ingressClassName: traefik` with the installed class from `kubectl --context "$KUBE_CONTEXT" get ingressclass`.
3. Set `secretName` to the TLS Secret in the same namespace. Provision it through the existing certificate workflow; the manifest does not assume cert-manager. Add the operator's issuer/authentication annotations if required.
4. Point DNS at the ingress controller. Preserve any required authentication or private routing.
5. Inspect the diff and apply:

```sh
kubectl --context "$KUBE_CONTEXT" apply --dry-run=server -f deploy/ingress.yaml
kubectl --context "$KUBE_CONTEXT" diff -f deploy/ingress.yaml
kubectl --context "$KUBE_CONTEXT" apply -f deploy/ingress.yaml
kubectl --context "$KUBE_CONTEXT" -n prehistorik get ingress
```

If the cluster uses Gateway API, use its existing HTTPS Gateway and route the hostname to Service `prehistorik`, port 80, instead of applying the Ingress template. Serve from `/` on a dedicated host, preserve request paths, and avoid rewrite rules. No CORS configuration is required for same-origin game assets. Do not disable authentication to make the game reachable.

**Remote hosting must use HTTPS for AudioWorklet.** localhost HTTP is a browser exception. Click Sound on after the page loads. The Google Fonts stylesheet is optional; blocked external fonts fall back to local fonts. Gameplay, assets and audio need no external APIs.

### 6. Acceptance and handoff

Check the actual HTTPS URL: valid certificate, `/healthz`, title, level one, movement/jump/attack, pause/resume, all-stage selector and audio after a click. Reload and check Continue resumes a checkpoint. Inspect browser errors and missing assets. Testing on mobile hardware remains a separate acceptance step.

Report the repository commit, pushed image tag/digest, context, namespace, Deployment rollout status, final URL, checks performed and any limitations. Do not claim deployment succeeded from `kubectl apply` alone. This repository's initial manifests have not yet been verified against a running container or a real cluster.

## Updates, rollback and troubleshooting

For updates, push changes to `main`, wait for the GHCR workflow to succeed, select the new `sha-<full-commit>` tag or digest, and repeat the render/diff/apply procedure. Retain the same HTTPS origin to preserve browser saves. `Cache-Control: no-cache` revalidates files; players should refresh after a rollout. No service worker is installed. Reapply the previous image version for a declarative rollback, or use:

```sh
kubectl --context "$KUBE_CONTEXT" -n prehistorik rollout history deployment/prehistorik
kubectl --context "$KUBE_CONTEXT" -n prehistorik rollout undo deployment/prehistorik
kubectl --context "$KUBE_CONTEXT" -n prehistorik rollout status deployment/prehistorik
```

Then reconcile your tracked deployment/image configuration so the next apply preserves the rollback.

| Symptom | Check |
| --- | --- |
| ImagePullBackOff | Registry path/tag, pull Secret, node architecture, registry reachability; inspect Pod events |
| CrashLoopBackOff | `kubectl logs` and Pod events; writable `/tmp`, UID, nginx config |
| 404 for assets | Full `dist/` in image and no ingress path rewriting |
| Remote sound fails | HTTPS secure context, Sound on gesture, `js/audio.js` loads and blob AudioWorklet is permitted by any added CSP |
| Old game after update | Refresh/revalidate; confirm Deployment image and registry digest |
| Continue is missing | Saves are per browser/origin; changing hostname, scheme or port changes storage |

```sh
kubectl --context "$KUBE_CONTEXT" -n prehistorik get pods
kubectl --context "$KUBE_CONTEXT" -n prehistorik logs deployment/prehistorik --tail=100
kubectl --context "$KUBE_CONTEXT" -n prehistorik describe pods -l app=prehistorik
kubectl --context "$KUBE_CONTEXT" -n prehistorik get events --sort-by=.lastTimestamp
```

## Repository layout

- `dist/`: deployable game, runtime rules, decoded assets, original music and samples
- `dist/js/`: native simulation, rendering, input/UI and audio mixer
- `tests/`: asset/render/audio/simulation tests
- `scripts/serve.mjs`: local HTTP server
- `.github/workflows/publish-image.yml`: tests, multi-platform GHCR publishing and container smoke checks
- `Dockerfile`, `.dockerignore`: static container packaging
- `deploy/`: nginx configuration and Kubernetes workload/Ingress templates

Original assets retain their original authorship; this repository does not grant a new license to the 1993 TITUS artwork or music.

References: [Kubernetes Ingress](https://kubernetes.io/docs/concepts/services-networking/ingress/), [official nginx image](https://hub.docker.com/_/nginx), [GitHub container registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry), [Docker multi-platform Actions](https://docs.docker.com/build/ci/github-actions/multi-platform/).
