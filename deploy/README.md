# Deployment configuration

Follow the complete [Kubernetes agent runbook in the root README](../README.md#kubernetes-deployment--agent-runbook). It covers context selection, consuming the multi-platform GHCR image published on each push to main, private-package pull access, workload rollout, HTTPS ingress, acceptance, diagnostics and rollback.

Image repository: `ghcr.io/michalmedvecky/pre2-web`. Deploy a successful build’s `sha-<full-commit-SHA>` tag or its digest from the Actions run summary. No local Docker build is required.

- `nginx.conf`: non-root static server on port 8080, `/healthz`, revalidating cache headers.
- `kubernetes.yaml`: namespace `prehistorik`, two-replica Deployment and ClusterIP Service. The image is pinned to the verified multi-platform digest from successful build [39246910889](https://github.com/michalmedvecky/pre2-web/actions/runs/39246910889); it can be deployed as-is.
- `ingress.yaml`: optional HTTPS route template. Set your existing IngressClass, hostname and TLS Secret. Preserve the requested access policy.
