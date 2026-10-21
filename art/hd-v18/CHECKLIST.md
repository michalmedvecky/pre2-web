# Repair checklist

- [x] Reproduce the supplied scene and identify native spike tiles and source mattes.
- [x] Inspect native and HD tree-arena scenes in the browser.
- [x] Preserve raw ImageGen output, prompt, native reference and packed hashes.
- [x] Move generic terrain computation to a worker, warm initial animation phases and bound the LRU cache.
- [x] Verify Chromium/WebKit worker/synchronous image parity, preparation/graphics cancellation, all16 stage starts and no-worker fallback.
- [x] Finish full-route frame pacing and reverse-scroll measurements.
- [x] Run unit, fractional-scroll, materials and mobile regressions.
- [x] Verify original54 hashes.
- [ ] Publish successful amd64/arm64 build and pin its verified digest for Kubernetes.
