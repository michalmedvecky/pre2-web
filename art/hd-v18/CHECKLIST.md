# Repair checklist

- [x] Reproduce the supplied scene and identify native spike tiles and source mattes.
- [x] Inspect native and HD tree-arena scenes in the browser.
- [x] Preserve raw ImageGen output, prompt, native reference and packed hashes.
- [x] Move generic terrain computation to a worker, warm initial animation phases and bound the LRU cache.
- [x] Verify Chromium/WebKit worker/synchronous image parity, preparation/graphics cancellation, all16 stage starts and no-worker fallback.
- [x] Finish full-route frame pacing and reverse-scroll measurements.
- [x] Run unit, fractional-scroll, materials and mobile regressions.
- [x] Verify original54 hashes.
- [x] Publish successful amd64/arm64 build and pin its verified digest for Kubernetes.

Verified game code `001ad8b34cc4ec0402ff6171d8b57712639d059e`, [successful build 39544572295](https://github.com/michalmedvecky/pre2-web/actions/runs/39544572295), digest `sha256:6d8f5fff105c0bc187c426ac9688e42c0e67560a108dd9a3d446c139b2152bb8`. Both architecture revision labels verified. Kubernetes references this exact image; no cluster rollout was performed by this task.
