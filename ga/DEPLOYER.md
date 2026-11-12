# Golden Axe — historical standalone k3s deployment handoff

Current repository: [michalmedvecky/remastered](https://github.com/michalmedvecky/remastered). The current unified container serves GA at **https://remastered.500miles.cz/ga/**. Use the root deployment handoff for that container. The standalone configuration below is retained for historical releases and compatibility; do not use it for the unified rollout.

The historical GA package used build context `ga/`, Deployment/Service name `ga`, an isolated image repository and the requested host **`ga.500miles.cz`**. Preserve the existing GA namespace, Service, Ingress, TLS and access policy. Do not change Prehistorik or Flappy.

**A GitHub release or image publication does not authorize a cluster rollout.** Apply changes only when the user explicitly instructs the deployer to deploy. This document does not claim a deployment, DNS/TLS change or successful rollout.

## Release ga-v0.4.0

Use the [ga-v0.4.0 release](https://github.com/michalmedvecky/pre2-web/releases/tag/ga-v0.4.0) as the authority for the exact packaging commit, successful GA CI run, runtime snapshot, **immutable image digest**, both platform manifests and GA-only archive checksum. This source document cannot embed its own future container digest; the release is published only after CI and the actual container smoke pass. Do not deploy an unverified SHA tag or substitute the Prehistorik image.

This release contains an English interface, all15 source-derived restored effects, remastered music/effects defaults, LEVEL input buffering, audio pause/resume ordering fixes, native thief attack/AI corrections and expired-mount escape navigation. HD remains the default. Native stage2 fireball height is retained; the mounted running-strike alternative is documented. Verified scope and limitations: [reports/release-040.md](reports/release-040.md).

Historical rollback reference, **ga-v0.3.0 only**: commit `7ebb73b3d0a2a23f71e87f9fbfd7ef581227547a`, [CI43189886066](https://github.com/michalmedvecky/pre2-web/actions/runs/43189886066), image `ghcr.io/michalmedvecky/pre2-web-ga@sha256:9a0b47934e4c6913c672a617acdf1f9d5fc71efc909163fd0e20e184b90b3dfd`. Its original-music default and old effects describe that historical version. See [release-030.md](reports/release-030.md).

For this release, retain these delivery rules:

- Hashed `assets/audio/remaster/<id>-<sha16>.flac`: `audio/flac` and long immutable cache.
- Hashed `assets/audio/remaster-effects/effect-<id>-<sha16>.wav`: `audio/wav` and long immutable cache.
- Both catalogs' `manifest.json` files remain `no-cache`. Existing hashed HD WebP delivery also remains immutable.
- Preserve HTTPS, user-gesture audio unlock, original-audio fallback and HD/original switching. The effects bank is 555,552 B; music is 100,700,490 B and loads per selected program.

The release's nginx configuration and container smoke cover these routes. Browser QA alone is not a container smoke result.

## Release preparation and isolated CI

1. Review checksums and changes; select **only `ga/`** for a normal GA release. Change root workflows only for a concrete verified need. Preserve unrelated dirty/untracked work and concurrent upstream changes. An old local GA CI-isolation test must not overwrite a newer upstream version.
2. Verify the repository **variables**, not secrets: `GA_IMAGE_REPOSITORY=ghcr.io/michalmedvecky/pre2-web-ga`, and `GA_NGINX_IMAGE` containing an official multiarch nginx digest pin such as `nginx:stable-alpine@sha256:<64hex>`. The actual digest must be verified, not copied from this placeholder. Missing values stop publication. The Prehistorik image repository `ghcr.io/michalmedvecky/pre2-web` is rejected for GA.
3. Let [Golden Axe image CI](../.github/workflows/publish-ga-image.yml) pass after the authorized main push or `workflow_dispatch`. CI checks tests and the runtime manifest, requires a clean checkout, records `SOURCE_DATE_EPOCH` from the commit, builds linux/amd64+linux/arm64 and publishes `sha-<fullSHA>` to the separate registry repository. It checks platform manifests and performs an actual read-only/UID/MIME/cache/build-identity container smoke. PRs do not publish an image; there are no Kubernetes credentials or cluster steps.
4. Take the **new** `registry/repository@sha256:<digest>`, packaging commit and runtime snapshot from the successful CI run. The digest is the deployment/rollback authority. Pinned inputs and timestamps are recorded; byte-identical repeated image builds have not been claimed.
5. Create an unused annotated `ga-v<version>` tag on that tested commit and a separate Golden Axe GitHub release. Preserve **prerelease** and **Latest=false** unless the release owner explicitly changes that policy. A tag push alone does not build an image or create a release.
6. Attach `ga-v<version>.tar.gz` from the committed `ga/` subtree and `ga-v<version>.SHA256SUMS`. Verify upload size and server-side checksums before publishing. The automatic GitHub Sourcecode ZIP includes the whole parent repository. Release notes must contain the exact commit, snapshot, CI run, image/platforms, archive checksum, verified scope and known limits, and state that no cluster rollout occurred.

The GA-only archive retains the honest local `build.json` template. Verify the actual clean build commit in the CI image. The complete test suite needs the parent repository workflow files for CI-isolation checks; the application, container context and deployment renderer do not need Prehistorik or Flappy runtime files. Standard GitHub path-filter limits still apply; workflow isolation is not a new cluster-security boundary.

## Configuration and offline validation

From the repository root:

```sh
npm --prefix ga test
node ga/scripts/verify-package.mjs
cp ga/deploy/config.example.json ga/deploy/config.local.json
```

Fill `ga/deploy/config.local.json` without guessing values:

| Key | Required value |
| --- | --- |
| `kubeContext` | Explicit target context chosen by the operator; the renderer does not contact it. |
| `namespace` | Assigned/dedicated namespace; do not infer it from the directory name. |
| `image` | Newly verified GA image pinned as `registry/repository@sha256:<64hex>`. |
| `imagePullSecret` | Optional name of an externally provisioned registry Secret in the same namespace; never its token. |
| `expose` | Explicit `false` for an internal workload, or `true` only for confirmed HTTPS exposure. |
| `host` / `tlsSecret` | With `expose:true`, the actual host/DNS and existing certificate Secret in that namespace. The requested GA host is `ga.500miles.cz`. |
| `ingressClass` | Confirm the installed class in the target cluster; `traefik` is the reference value. |
| `httpsEntrypoint` | With `expose:true`, the actual installed Traefik HTTPS entrypoint; do not assume `websecure`. |

```sh
node ga/scripts/render-deployment.mjs ga/deploy/config.local.json > /tmp/ga-release.json
```

This only renders a JSON `v1/List`; it does not deploy. It rejects missing required values, mutable images and the Prehistorik registry repository. `config.local.json` is Git-ignored. Never put credentials in Git or apply the entire templates/config directory. JSON manifests need no YAML/npm dependency. The retained offline Kustomize check in `validation/offline-kustomize.json` is not server-side schema/admission validation.

## Authorized rollout only

Set `KUBE_CONTEXT` and `NAMESPACE` to the exact values from the reviewed configuration. Check the context, node architectures, installed IngressClass, TLS and image-pull access first. Do not change the global current-context; every command explicitly targets the selected context.

For a new namespace, create that reviewed namespace first; a server dry-run cannot validate a workload in a namespace that does not yet exist:

```sh
kubectl --context "$KUBE_CONTEXT" create namespace "$NAMESPACE" --dry-run=client -o yaml | \
  kubectl --context "$KUBE_CONTEXT" apply -f -
kubectl --context "$KUBE_CONTEXT" apply --dry-run=server -f /tmp/ga-release.json
kubectl --context "$KUBE_CONTEXT" diff -f /tmp/ga-release.json
# diff exit 1 means changes; >1 means an error. Review before applying:
kubectl --context "$KUBE_CONTEXT" apply -f /tmp/ga-release.json
kubectl --context "$KUBE_CONTEXT" -n "$NAMESPACE" rollout status deployment/ga --timeout=180s
kubectl --context "$KUBE_CONTEXT" -n "$NAMESPACE" get pods,service,ingress
```

The workload uses two replicas, Service 80→8080, non-root UID/GID 10001, disabled service-account token mounting, RuntimeDefault seccomp, dropped capabilities, a read-only root filesystem and 64 Mi `/tmp`. Liveness/readiness use separate `/healthz` probes. The namespace template does not alter existing namespace labels. No ingress controller, Traefik chart, certificate manager or other cluster-wide component is installed by these manifests.

Provision any private GHCR access through the existing secret-management process; Actions `GITHUB_TOKEN` is not a durable cluster credential. Preserve access policies. A route or Secret reference does not itself provide authentication.

## Acceptance and rollback

Start with an internal Service `ga` port-forward if appropriate, then verify the dedicated HTTPS host at `/`, without a path rewrite. The Traefik template explicitly sets router TLS and the confirmed entrypoint; `tls.secretName` alone does not enable TLS. Existing cluster procedures must provide DNS/certificates.

For the version actually deployed, verify:

- `/healthz` and `/build.json`; the full CI commit and source snapshot must match its release.
- Title, character selection, LEVEL, both players and swapped Options devices; Controls dialog scrolling, pause/focus restoration and fullscreen.
- HD default, original/HD toggle, MAP, console errors/404s and a real phone separately.
- User-gesture unlock, OPL Worklet/WASM and original fallback. In ga-v0.4.0, remastered music **and effects** are the default; check both edition buttons, all Sound Test effects, combat/death/pickup/door effects and magic loop/stop.
- First audio preparation and failure fallback, level/transitional music, MUSIC, F2/F3, master mute, Pause/Resume and return from browser history. The reported historical one-off stage2 silence was not reproduced and must not be described as a proven fixed incident.

A 200 health probe is not a gameplay/full-run receipt. Warn players before an update reload that can reset the current game. Do not reload a user's active game merely while preparing a deployment.

For the preferred rollback, put the previous **verified digest** in the configuration and repeat render/server-dry-run/diff/apply. An emergency command is:

```sh
kubectl --context "$KUBE_CONTEXT" -n "$NAMESPACE" rollout undo deployment/ga
```

Verify that rollout, then correct the declared image configuration so the next apply does not undo the rollback. Preserve host/origin unless a change is required; browser storage belongs to the origin.

The deployer's actual completion record should include commit/snapshot, image digest/platforms, context/namespace/URL, rollout/TLS/runtime acceptance, limits and rollback digest. None of those cluster-success claims is implied by source publication or this handoff.

## Rights and verification limits

Original artwork, recordings, melodies and game data retain their original authorship. CC0 covers only the VSCO instrument recordings; Nuked-OPL3 LGPL sources/licence/build recipe remain bundled. See [LICENSES.md](LICENSES.md).

The port does not claim complete native DOS IRQ/RNG/wall-clock or physics equivalence. Some hit/throw ordering and original late 1P Duel palette/loader reachability remain unverified. Physical Safari/iOS/gamepad testing is not claimed. Keep that scope separate from the successful checks of a specific release. Earlier patch histories and receipts are retained in [the releases](https://github.com/michalmedvecky/pre2-web/releases) and [reports/release-030.md](reports/release-030.md), rather than repeated here.
