# Historical standalone Prehistorik2 deployment

This directory preserves the former standalone deployment and pinned image for reference. For the current remastered monorepo application, use the [root deployment documentation](../../README.md) and [unified configuration](../../deploy/). Do not apply these older manifests as the new unified application.

The historical configuration below is retained as provenance; its original image repository and build links are not current publishing instructions.

Image repository: `ghcr.io/michalmedvecky/pre2-web`. Deploy a successful build’s `sha-<full-commit-SHA>` tag or its digest from the Actions run summary. No local Docker build is required.

- `nginx.conf`: non-root static server on port 8080, `/healthz`, revalidating cache headers.
- `kubernetes.yaml`: namespace `prehistorik`, two-replica Deployment and ClusterIP Service. The image is pinned to the verified multi-platform digest from successful build [39949226172](https://github.com/michalmedvecky/pre2-web/actions/runs/39949226172); it can be deployed as-is.
- `ingress.yaml`: optional HTTPS route template. Set your existing IngressClass, hostname and TLS Secret. Preserve the requested access policy.

Mobile clients use the same image and route. Serve the public hostname over HTTPS with the existing ingress/TLS setup. `manifest.webmanifest` and the icons under `icons/` must remain accessible at that origin; nginx serves the manifest as `application/manifest+json`. The manifest uses relative URLs and no service worker. No additional backend, ports, storage or mobile-specific deployment is needed. Native fullscreen and orientation locking are optional browser features; unsupported clients use viewport-filling play. Home Screen launch is recommended on iPhone/iPad. Local progress is per browser/origin and is not guaranteed to transfer to an installed Home Screen app. See [touch controls and verification](../art/mobile-v1/README.md).
