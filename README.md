# Prehistorik 2 — web game

Playable native JavaScript reconstruction using the recovered original graphics, levels, music and sound effects. Canvas renders at 320×200; gameplay and audio run entirely in the browser. The repository contains the web game and deployment configuration. Original DOS executables, decompiled code and reverse-engineering reports are managed separately.

There is **no server-side application, database, PVC, account service or dependency on Sites hosting**. nginx serves `dist/`. Browser localStorage stores checkpoint progress per browser and origin. Multiple replicas require no session affinity.

All 16 recovered stages are available. Enemy/boss controllers and some special blocks/forms remain approximate; a full campaign playthrough and exact original-game behavioral equivalence have not been verified.

## Local development

Use Node.js 20 or newer. No dependency installation or build step is required:

```sh
git clone https://github.com/michalmedvecky/pre2-web.git
cd pre2-web
npm test
npm start
```

Open http://127.0.0.1:5775. On macOS, `Play.command` also serves the game using Python 3. Arrow keys/WASD move, Up/Z jumps, Space attacks, Down crouches/uses passages, X looks ahead, P/Escape pauses, M/F3 toggles sound and F enters fullscreen. Sound starts after a gesture; click **Sound on**. Touch controls appear on touch devices.

Assets are already generated and committed. Building or deploying does not require the original game or analysis workspace. `dist/rules.json` and the data tables in `dist/assets/` are runtime inputs. Do not remove them or regenerate them from guessed formats.

## Kubernetes deployment — agent runbook

An agent with authorized access to a cluster and registry can follow this section from a fresh checkout. Commands assume a POSIX shell, Docker/buildx, kubectl and curl. Node is only needed for tests, not serving the container.

### 1. Resolve the deployment inputs

Use the operator's existing project configuration and deployment authorization. Establish these values before changing cluster resources:

| Input | How to obtain it |
| --- | --- |
| Kubernetes context | Intended context from the operator; inspect `kubectl config get-contexts` |
| Image registry/repository | A registry the operator controls and the cluster can pull from |
| Node architectures | `kubectl --context "$KUBE_CONTEXT" get nodes -L kubernetes.io/arch` |
| Namespace | Manifests default to dedicated namespace `prehistorik` |
| Public/private access | Preserve the operator's requested access and existing authentication |
| Hostname and HTTPS route | Existing ingress/Gateway configuration, DNS and certificate workflow |
| Registry pull credentials | Existing Secret or the operator's normal registry workflow |

If context, registry or exposure is ambiguous, ask for the missing value. Do not choose an unrelated context, print credentials, disable TLS checks, install a new controller, replace shared routes, or widen access as an incidental deployment step. Registry login is performed with the operator's existing credential mechanism.

Set values for this deployment (replace every example):

```sh
export KUBE_CONTEXT='your-cluster-context'
export IMAGE_REPOSITORY='registry.example.com/games/prehistorik'
export RELEASE="$(git rev-parse --short=12 HEAD)"
export IMAGE="$IMAGE_REPOSITORY:$RELEASE"
kubectl --context "$KUBE_CONTEXT" cluster-info
kubectl --context "$KUBE_CONTEXT" get nodes -L kubernetes.io/arch
npm test
```

If using a different namespace, update **every** namespace reference in both manifests and subsequent commands. Do not deploy placeholder values.

### 2. Build, smoke-test and push the image

First validate the local container in one terminal:

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

Open http://localhost:8080 and verify the title, new game, movement, attack, pause, stage selector and sound toggle. Stop the container with Control-C. Then publish the versioned image:

```sh
# Authenticate to your selected registry using its normal login workflow.
docker buildx build --platform linux/amd64,linux/arm64 -t "$IMAGE" --push .
```

Select only `linux/amd64` or `linux/arm64` for a single-architecture cluster if needed. A Mac build must target Linux, not macOS. The buildx builder must support the selected target platforms. The image contains nginx and the web assets; it excludes analysis files and Sites metadata. For repeatable releases, pin the nginx base image and deployed image by digest using your registry's workflow.

### 3. Render and apply the workload

The tracked manifest is a template with a deliberately invalid example image. Render a temporary deployment without editing it:

```sh
kubectl --context "$KUBE_CONTEXT" create namespace prehistorik --dry-run=client -o yaml | \
  kubectl --context "$KUBE_CONTEXT" apply -f -
MANIFEST="$(mktemp)"
sed "s|registry.example.com/games/prehistorik:1.0.0|$IMAGE|g" \
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

For updates, build a new commit-tagged image and repeat the render/diff/apply procedure. Retain the same HTTPS origin to preserve browser saves. `Cache-Control: no-cache` revalidates files; players should refresh after a rollout. No service worker is installed. Reapply the previous image version for a declarative rollback, or use:

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
- `Dockerfile`, `.dockerignore`: static container packaging
- `deploy/`: nginx configuration and Kubernetes workload/Ingress templates

Original assets retain their original authorship; this repository does not grant a new license to the 1993 TITUS artwork or music.

References: [Kubernetes Ingress](https://kubernetes.io/docs/concepts/services-networking/ingress/), [official nginx image](https://hub.docker.com/_/nginx).
