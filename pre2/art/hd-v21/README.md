# HD21 / release1.2.5 — scene and animation audit

The reports exposed a shared renderer issue: new RGB art did not follow the native palette fade, and object identities were inferred too broadly from palette colors or individual16px tiles. This repair changes presentation; original maps, collision properties, simulation and native animation timing remain unchanged.

- OFF/ON now grades both the background/terrain and foreground masks. The grade derives channel energy from the original16-color terrain palette and follows each fade tick. Actors, pickups and the HD HUD stay independently readable. This is an artistic HD approximation, not exact indexed-color equivalence. The base terrain cache remains stable during the fade.
- Animated vegetation in2/3 no longer swaps independently generated, unrelated RGB fragments. It uses the original connected animated ink while continuous HD stone/ground remains below it. These small plants retain original detail; this does not claim every leaf has a new AI drawing.
- Stage2 cave19 is next to two class5 drop-through tiles, rather than being a falling trap itself. Those two tiles now use lit horizontal wood. The entrance shadow gets rounded top corners; native entrance/Down rules and collisions are untouched. Decorative wall roots no longer inherit unrelated atlas fragments.
- Stage4 foreground painting uses the physical tile and support above it. Rooted foreground stays separate from darker background trunks; turf is not restarted at each stacked foreground row. Authored beams keep horizontal grain.
- Stage9 uses one continuous80×64-native stone boar-mask hunter drawing, recognized as a5×4 pattern at11 locations. The first64×64 generation was rejected because its source crop omitted the left frame. Full-width source, second raw output and exact prompts are retained. Existing ledge111 and omitted lower-left-frame variants are preserved instead of erased. The packed drawing is320×256; its appearance is an artistic redraw.
- Grapes113/137 lose detached alpha components while keeping the largest drawing byte-for-byte, native dimensions and pivots. No model call was needed for this packing repair.
- E flowstone now applies only to actual cave families; palms, rib bones, vines and rooted soil retain their own artwork rather than being smeared with brown stalactite material.

## Evidence and scope

`review/before/` contains an exploratory baseline. `review/after/` contains a controlled-clock Chromium replay of all16 recorded input routes, with IDDQD, and556 sampled camera views. Each pair is HD on the left and the identical native raster on the right. All routes reach completion, including the F ending. Stage9 was rerun after adding all authored statue variants: use `review/after-statues/` for its final sheet and readable page crops. Critical fixed-camera views also exercise all three authored animation phases. Those diagnostic poses are separate from the recorded-input route evidence.

| Stage | Camera views | Review finding |
|---|---:|---|
|1|5|Existing ground/signs retained|
|2|47|OFF now darkens scenery; no unrelated animated atlas fragments; gate/plank checked separately|
|3|26|Animated-plant repair also applies here; native cyan theme retained|
|4|61|Foreground ground is distinct from background timber; stacked material context repaired|
|5|63|Existing cut faces/doorway retained; dense autumn foliage is still a stylistic limit|
|6|29|Spike/arena composition retained; no new physics change|
|7|41|Native dense ice motif retained; still visually busy|
|8|62|Crystal/cave openings retained|
|9|91|All11 complete statue patterns recognized; native masonry and ledges retained|
|A|1|Complete final-boss scene retained|
|B|25|Banquet/cherry/straw composition retained|
|C|10|Banquet scene retained|
|D|36|Banquet scene retained; cleaned grapes used|
|E|8|Cave texture no longer repaints bones/palms/vines; OFF applies here too|
|F|22|Credits route reaches ending; native lettering retained|
|G|29|Recorded route completes; existing ice motif remains busy|

This is browser route inspection and targeted rendering verification, not a claim that every secret branch was manually played or every tile independently redrawn. Contact-sheet overviews were visually reviewed, with enlarged critical scenes and stage9 pages. Some native decorative/animated contours remain deliberately visible. Authored rectangular architecture is not erased.

`review/regression/browser.json` checks13 diagnostic views per engine in Chromium/WebKit: exact worker/synchronous pixel parity, unchanged native raster and simulation state. `review/lighting.json` covers real OFF/ON pickups, intermediate fade, restored brightness and stable cache palette in both engines. `review/objects/browser.json` covers actual Down entry without repeated passage on held input, native class5 plank properties, unchanged authored map, animation texture ownership and clean grape/statue captures. `review/scroll/` and `review/mobile/` retain scroll and touch/fullscreen regression evidence. `review/streaming/streaming-browser.json` verifies all16 starts in both engines, preparation cancellation/graphics changes, credits worker/native parity and fallback without workers. `review/tests.log` records328 passing tests; `review/originals.log` confirms all54 source files unchanged.

## Reproduction and provenance

Built-in ImageGen produced the statue redraw. `references/statue-complete.png` is the decoded80×64 reference; unmodified generations are in `raw/`; exact prompts are in `prompts/`. `scripts/build-hd-v21.mjs` deterministically packs the statue and removes isolated grape components without a model call. `packing.json` records raw/crop and consumed SHA256 hashes and bounds. Earlier root, bark and flowstone plates are reused. No DOS executable or emulator was run.

Run the Node test suite and the browser scripts `audit-full-game-browser.mjs`, `inspect-reported-scenes.mjs`, `verify-hd-v21-browser.mjs`, `verify-off-browser.mjs` and `verify-reported-objects-browser.mjs` against port5776 with an installed Playwright module. `PRE2_PLAYWRIGHT_MODULE` selects that module; `PRE2_QA_OUTPUT` selects audit output. Browser captures are evidence, not runtime assets.

Publication evidence is recorded in `release.json` after the image build succeeds. No cluster rollout is performed by this change.

## Published release1.2.5

Game commit`994259db9f68717868e53715bc30e453eed76a95`; successful[build39585872848](https://github.com/michalmedvecky/pre2-web/actions/runs/39585872848). Verified linux/amd64 and linux/arm64 OCI revision labels. Image index digest`sha256:d70a29e5041f385cad59361173c59545c4f6f73ab4b952ce43ff7ea71c7e9ddf`. The release metadata/tag commit carries this verified Kubernetes pin. No cluster rollout was performed.
