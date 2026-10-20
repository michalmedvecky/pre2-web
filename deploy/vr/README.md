# Isolated Quest VR deployment

Full instructions: [Quest deployment runbook](../../docs/vr/README.md#automatic-ghcr-build-and-kubernetes-deployment).

- `kubernetes.yaml`: namespace **pre2-vr**, two-replica Deployment and Service, image alias `ghcr.io/michalmedvecky/pre2-web:vr-quest`.
- `ingress.yaml`: optional hostname, ingress class and TLS secret template; route `/` unchanged, then use `/vr/` on Quest.
- `kustomization.yaml`: offline rendering of workloads (`kubectl kustomize deploy/vr`); ingress is deliberately configured separately.

Recommended rollout/update (no local Docker build):

```sh
node scripts/deploy-vr.mjs --context YOUR_CONTEXT --host vr.your-domain.cz --ingress-class nginx --tls-secret pre2-vr-tls
```

The script resolves the tested alias to an immutable digest and deploys only `pre2-vr`. `--render-only DIRECTORY` renders without applying. `--image ghcr.io/michalmedvecky/pre2-web@sha256:...` selects an exact release or rollback. `--no-ingress` preserves your existing ingress. For private packages, pass the exact image plus `--pull-secret NAME` (an existing secret in `pre2-vr`).

CI also saves a `quest-vr-deploy` artifact with the build's digest-pinned workloads and image/commit identifiers. Neither GitHub workflow nor these manifests grant access to your cluster. The web deployment in namespace `prehistorik` remains separate.
