# HD22 / release1.2.6 — kite, ending credits and source identity

The old HD kite carrier was assembled from independently generated upper and lower bodies. Their waist silhouettes did not join. Flight itself already required a sustained run before jumping, followed by energy-dependent climb/dive controls; the page did not explain this or offer a voluntary release.

## Changes

- Built-in ImageGen redrew16 **complete connected character-and-kite poses** from the assembled native reference. Nine ground/walk leg poses and seven canopy angles are packed as whole images. The five native flight body variants share these seven angle illustrations, with bounds/pivots calculated separately from their actual native body/attachment combination. Native simulation sprites, collisions, angles and energy rules remain intact. Original mode still draws the two original indexed parts; HD skips those parts only after successfully drawing a whole replacement. The images are artistic redraws, not recovered original artwork.
- Running left/right for about a second, then continuing to move and holding jump, takes off. Holding up climbs while energy is available; holding down dives and replenishes energy. Contextual in-game guidance and the Help panel now explain this.
- **G** or the **Put down kite** button voluntarily releases it, including in mobile fullscreen. This is an explicit browser convenience. It does not cost health, teleport the player, reset pickups, change the map or alter airborne momentum. Normal movement/gravity resume; the kite is discarded rather than spawning a new collectible.
- The final ending panel includes a clearly labeled browser-edition credit for Codex/OpenAI and Misko, after the original F credits. Original1993 credits remain in the map and TITUS attribution remains explicit.
- The footer has a GitHub icon/repository link and a short commit link. CI passes its full source revision as the image build argument; Docker writes it to the served `build.json`. The UI validates the full40-character revision and links to that commit. Local builds without a revision say `Local / unknown build`. The value is baked into each image, so it is independent of mutable image tags or the current remote branch. CI smoke-testing checks that the served commit equals its source SHA.

## Art provenance

`references/reported-kite.png` is the user report. `references/glider-complete.png` assembles original decoded sprite ink using the recovered attachment table; `glider-frames.json` records source poses and bounds. `prompt.txt` is the exact built-in ImageGen prompt; `raw/glider-complete.png` is the unmodified model output. Existing `hero-gear.png` was style guidance. The generator drew whole connected bodies rather than separate torso/leg pieces. `scripts/build-hd-v22.mjs` packs the art into native-aligned records and removes detached model specks while retaining each complete character and its alpha fringe. `packing.json` records raw/consumed SHA256 and source/target bounds. Reproduction does not need another model call. All54 original source files remain unchanged; no original executable or emulator was run.

## Verification

-337 passing Node tests, including normal stage4 run/jump/climb/dive, grounded/airborne voluntary release invariants, whole-body connectivity, asset hashes and commit identity validation.
- `review/browser.json`: Chromium and WebKit, actual keyboard run then held jump, actual G release without health loss;88 body/angle/facing combinations per engine with native-raster parity and unchanged simulation state. `*-poses.png` shows all16 consumed illustrations in both directions. Test poses are diagnostic crops, separate from the actual keyboard flight capture.
- Mobile fullscreen release button works by touch and retains a44px target. The full existing touch/gesture/default-HD/fullscreen regression is also rerun in `review/mobile/`.
- Credits are exercised through the engine's ending transition and rendered in the actual final panel. The original F input-only completion route remains part of the full Node replay suite.
- Footer screenshots use an **explicit metadata fixture** to test rendering, validation and links; the fixture hash is not a claimed deployed revision. Actual image metadata is verified during CI's served-image smoke test and publication verification.
- `review/tests.log`, `review/originals.log` and browser screenshots retain evidence. `review/glider-before.png` shows the disconnected old art; `glider-after.png` shows complete poses.

Publication provenance is added in `release.json` after the build succeeds. No cluster rollout is performed by this work.
