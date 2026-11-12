# Remastered repository and URL-prefix migration — 2026-11-12

Golden Axe and Flappy now support the unified static layout at `/ga/` and `/flappy/` on `remastered.500miles.cz`. Active source/build metadata defaults use `https://github.com/michalmedvecky/remastered`. Historical release receipts, asset provenance and old image references were preserved.

The original GA iframe URL `/hd-pilot.html` escaped the game's prefix. It now resolves relative to its module, working both at `/ga/hd-pilot.html` and in the retained standalone layout. Actual browser validation then exposed an older independent packaging defect: that historical page imported the removed `HdPilotAssets` export from the current live HD bank. The historical helper was restored from retained research as `js/hd-pilot-assets.js`, and only the historical page imports it. Live renderer, simulation, audio and game assets were unchanged. The historical rejected pilot remains explicitly labeled and isolated from live gameplay.

Updated per-game CI tests require the single `publish-remastered-image.yml`, root verification/test/smoke commands, all three static Docker prefixes, and the root smoke identity contract. Standalone Docker/build helpers remain available with the renamed repository identity; deployment documentation marks their old per-game image/host configuration as historical compatibility. New unified infrastructure is owned at repository root.

## Validation

- GA prefix/build-identity/unified-CI tests:8/8 PASS; package verifier PASS.
- Flappy release/unified-CI tests:4/4 PASS; package verifier PASS.
- Static HTML/JS/CSS root-absolute asset-reference scan: none remain in either game's active code.
- Actual headless Chrome against the **root unified server** on `http://127.0.0.1:6002/`: PASS,208 successful recorded local responses, zero page errors or failed responses.
- GA launched through its real UI, advanced gameplay, rendered HD with zero original fallback in the sampled frame, initialized the real original OPL AudioWorklet/WASM backend, selected remastered music and loaded all15 restored effects. The corrected historical HD iframe loaded its images and posted its ready signal under `/ga/`. The live GitHub link points to `michalmedvecky/remastered`.
- AudioWorklet internal fetching is not reliably emitted as a Playwright **page** response event. Actual OPL backend initialization proves processor creation; an additional explicit HTTP/MIME/source probe confirms `/ga/js/opl-sequence-worklet.js`. That distinction is retained in the QA script rather than treating a missing page observer event as a game failure.
- Flappy loaded all200 rooms and sprites under `/flappy/`; a trusted arrow key started stage1, moves became001 and timer decreased1500→1497.

This is a bounded prefix/integration smoke, not a new full-game playthrough, complete audio listening test or native fidelity comparison. Source-root import checks additionally cover the standalone historical iframe path. The initial Chrome attempt on reserved port6000 and the failed historical import/observer attempts were retained as explicitly unsuccessful diagnostics; they are not counted as successful runs.

Final per-game runtime snapshots:

| Game | SHA256 | Files excluding build.json |
| --- | --- | ---: |
| GA |`bca08f6c274564a4968b69ea8afc56beb5b7fb9e366fe26c628e7af4c60843a0`|636|
| Flappy |`e0025117de4796c0992350a1f8156e6e7b7cfadbd9fc9509032d91066dc6d016`|7|

Flappy's runtime bytes remain identical; only excluded local build metadata and source/deployment/test documentation changed. GA's new snapshot reflects the isolated historical preview correction/helper. Both package manifests and honest local metadata were refreshed.

Requested portal images are actual canvas captures: `portal/dist/assets/ga.png` (HD stage1,1280×800) and `flappy.png` (started gameplay,1024×640). Both final images were visually inspected; Flappy's card capture precedes pause so it has no pause overlay. No game asset was generated or altered for those cards.

Evidence: `golden-axe-research/evidence/remastered-migration/{prefix-browser.mjs,prefix-checks.json,ga-prefix.png,flappy-prefix.png}` and explicitly named unsuccessful diagnostic reports. Owned Chrome instances closed; GA audio was disposed and browser closure stopped remaining audio. No owned server was started. The root coordinator's unified6002 server was left intact. No Git/network repository operation, release or deployment was performed by this subtask.
