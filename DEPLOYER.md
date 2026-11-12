# Deploy Remastered to k3s

Deploy one static application at **https://remastered.500miles.cz/**, with games at `/pre2/`, `/ga/`, and `/flappy/`. Use the new `ghcr.io/michalmedvecky/remastered` image only. This handoff prepares an independent deployer to inventory, back up and replace the previous applications; no cluster operation has been performed here.

## Release inputs

The sole active workflow is `.github/workflows/publish-remastered-image.yml`. It tests all three games and the portal, verifies their public packages, publishes linux/amd64 and linux/arm64 in one image, then checks the image and runtime. Take the full packaging commit, combined snapshot and **exact digest** from a successful workflow run. A tag or a completed build step alone is insufficient; require the architecture and smoke steps to succeed.

The workflow defaults to the previously verified official nginx base `nginx:stable-alpine@sha256:0e52bd054126cdc040b1276c0af347aeb02a41b9cfe305d6094767ac30e97949`. An existing repository variable `GA_NGINX_IMAGE` can override it only with an official nginx digest. The workflow publishes no legacy game image and holds no Kubernetes credentials. Historical standalone workflows are retained outside the active workflow directory as `.disabled` references.

Before proceeding obtain the exact kube context, target namespace, existing TLS Secret for `remastered.500miles.cz`, ingress class and controller, actual HTTPS entrypoint for Traefik, optional registry pull Secret and previous image digests. No namespace, certificate, ingress-controller setting or live legacy resource name is inferred from a repository example.

## Inventory and backup first

Run these read-only commands using the context selected by the deployer. Store outputs in a private handoff directory outside Git. Do not export Secret values into the repository or attach them to a public issue.

```sh
KUBE_CONTEXT='actual-reviewed-context'
kubectl --context "$KUBE_CONTEXT" config current-context
kubectl --context "$KUBE_CONTEXT" get namespace
kubectl --context "$KUBE_CONTEXT" get deployment,statefulset,daemonset,service,ingress,pvc -A -o wide
kubectl --context "$KUBE_CONTEXT" get ingressclass
```

Record actual kind/name/namespace, ownership labels, host rules, Service selectors, external endpoints, replicas, images/digests, PVC usage, certificate issuer/Secret references and dependencies for each old application. Back up the exact reviewed workloads, Services, Ingresses and related ConfigMaps as YAML, plus relevant DNS and controller configuration. Preserve required registry credentials and certificates through the operator's existing secure backup mechanism. Record a tested restoration plan and previous image digest before any removal.

Repository references are useful search clues, **not live-cluster evidence**:

| Application | Repository declaration | Status to verify in cluster |
|---|---|---|
| Prehistorik 2 | Deployment/Service `prehistorik`, namespace `prehistorik`; optional Ingress also `prehistorik` in `pre2/deploy/` | Actual objects, hosts and dependencies must be inventoried. The checked-in ingress host is an example. |
| Golden Axe | Deployment/Service `ga`; namespace intentionally unset in `ga/deploy/config.example.json`; historical requested host `ga.500miles.cz` | Discover actual namespace, Ingress, certificate and DNS. |
| Flappy | Deployment/Service `flappy`; example namespace `flappy` in `flappy/deploy/` | Discover actual namespace, host, Ingress, certificate and DNS. |

Prepare an explicit removal allowlist containing one **context + namespace + kind + exact name** per old object, with the backup path and reason. Review the allowlist against the inventory and dependency graph. Delete only reviewed application objects by exact identity. Never delete a namespace, all objects in a namespace, wildcard names, controller resources, shared TLS/registry Secrets, shared ConfigMaps or PVC data as a shortcut. If an old namespace becomes empty, leave its cleanup to a separate reviewed operation. Do not remove objects merely because their name resembles a game. If certificate or DNS ownership is shared, preserve it until a separate plan resolves the dependency.

The independent deployer owns the explicitly authorized legacy replacement and actual rollout. Source preparation does not authorize inventing missing identities. An empty or ambiguous removal allowlist blocks the removal step while the new deployment can still be prepared and reviewed. The requested operation is a fresh replacement: prepare and verify the source/image and backup/restoration first, remove the reviewed old application allowlist, then apply the new Remastered application and perform acceptance. Do not interpret this as permission to remove shared cluster infrastructure or data.

## Render the new application offline

```sh
cp deploy/config.example.json deploy/config.local.json
# Fill every required value and paste ghcr.io/michalmedvecky/remastered@sha256:<digest>.
node deploy/render.mjs deploy/config.local.json > deploy/remastered.rendered.json
```

The renderer is pure local JSON generation. It requires `kubeContext`, `namespace`, immutable `image`, and boolean `expose`. With `expose:true`, it additionally requires the confirmed hostname, actual `tlsSecret`, actual `ingressClass`, and explicit `ingressController` (`traefik` or `standard`). For Traefik, `httpsEntrypoint` is additionally required: use the controller’s actual configured HTTPS entrypoint, without assuming a name from its ingress class. The renderer adds `traefik.ingress.kubernetes.io/router.tls: "true"` and `router.entrypoints` with that exact value, as well as `spec.tls`. For another controller choose `standard`, leave `httpsEntrypoint` empty, and verify that controller’s TLS policy independently; no Traefik annotations are emitted. `imagePullSecret` names an existing Secret, never a token. `expose:false` generates only the Deployment and ClusterIP Service for an internal acceptance step. Namespace creation, Secrets, DNS and certificate issuance are external prerequisites; the renderer neither creates nor alters a Namespace.

Review the output: one Deployment and Service named `remastered`, optionally one same-named Ingress. The Ingress passes `/` with `Prefix` unchanged; **no rewrite or strip-prefix middleware** is needed. The final source includes the user-approved existing VOLBY cosmetic mode in Prehistorik2 (off by default). NGINX serves the portal at `/`, three distinct game directories, correct JS/WASM/audio types, a `/healthz` endpoint and build metadata at root and each game prefix. It returns404 for missing files rather than serving a game's HTML as a missing JS asset.

## Apply and accept

Read values from the reviewed local configuration. The examples below require the deployer's cluster access and are not run by CI.

```sh
KUBE_CONTEXT='same-reviewed-context-as-config'
NAMESPACE='same-reviewed-namespace-as-config'
MANIFEST=deploy/remastered.rendered.json
kubectl --context "$KUBE_CONTEXT" -n "$NAMESPACE" get secret 'actual-tls-secret'
kubectl --context "$KUBE_CONTEXT" apply --dry-run=server -f "$MANIFEST"
kubectl --context "$KUBE_CONTEXT" diff -f "$MANIFEST"
kubectl --context "$KUBE_CONTEXT" apply -f "$MANIFEST"
kubectl --context "$KUBE_CONTEXT" -n "$NAMESPACE" rollout status deployment/remastered --timeout=180s
kubectl --context "$KUBE_CONTEXT" -n "$NAMESPACE" get deployment/remastered service/remastered ingress/remastered -o wide
```

Use the actual TLS Secret from configuration; omit Ingress checks for an internal-only deployment. The namespace must already exist, with the operator's chosen policy. If missing, create it through the normal cluster administration workflow before server validation.

The workload has two replicas, non-root UID/GID10001, no service-account token mount, RuntimeDefault seccomp, all capabilities dropped, read-only root filesystem and64Mi writable `/tmp`. CPU requests/limits are25m/500m; memory32Mi/192Mi. Readiness and liveness use `/healthz`; Service80 maps to8080. No cluster-scoped controller, issuer, RBAC, middleware or storage is installed.

Verify trusted TLS and DNS, `/healthz`, root `/build.json`, all three prefixed build identities, portal navigation, game entry, keyboard/touch controls, audio after a gesture, representative assets and absence of mixed-root404s. Inspect actual pod image IDs and confirm they belong to the chosen multiarch digest. Recheck existing unrelated applications and shared services after the allowlisted cleanup. Do not describe deployment as complete merely because `apply` returned successfully.

For rollback, restore the prior reviewed manifests and exact image digests from backup, including any deliberately removed routes. To roll back only the new application, replace its configured image with a previous accepted Remastered digest, render, diff and apply again. Record context, namespace, commit, combined/game snapshots, exact image/platforms, acceptance results, removed-resource allowlist, backup locations, remaining limitations and rollback reference in the deployer's completion report.

## Documentation checked

The manifest fields follow current official [Kubernetes security-context documentation](https://kubernetes.io/docs/tasks/configure-pod-container/security-context/) and [Ingress TLS/Prefix configuration](https://kubernetes.io/docs/concepts/services-networking/ingress/). Static prefix serving follows the official [NGINX core module](https://nginx.org/en/docs/http/ngx_http_core_module.html). For Traefik, the [official Kubernetes Ingress router annotations](https://doc.traefik.io/traefik/reference/routing-configuration/kubernetes/ingress/) document explicit TLS and entrypoint selection. These references describe configuration; they do not establish this cluster's live state.
