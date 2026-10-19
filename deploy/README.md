# Deployment configuration

Follow the complete [Kubernetes agent runbook in the root README](../README.md#kubernetes-deployment--agent-runbook). It covers registry/context selection, container checks, image publishing, workload rollout, HTTPS ingress, acceptance, diagnostics and rollback.

- `nginx.conf`: non-root static server on port 8080, `/healthz`, revalidating cache headers.
- `kubernetes.yaml`: namespace `prehistorik`, two-replica Deployment and ClusterIP Service. Replace the example image before deployment.
- `ingress.yaml`: optional HTTPS route template. Set your existing IngressClass, hostname and TLS Secret. Preserve the requested access policy.
