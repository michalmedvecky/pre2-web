# Sharp terrain, complete item coverage and HD feedback

This update removes the Gaussian softening introduced by v4. Connected terrain now uses a sharp interpolating cubic reconstruction after the contour pass. World-region halos, native geometry and joined fine texture detail remain; no whole-scene blur is applied. The world still derives its shapes from the recovered original terrain rather than a newly illustrated panorama. Other stages retain their documented terrain/background coverage.

## Added artwork

Built-in **image_gen**, edit mode, produced six transparent atlases matching the existing hero's outlined/cel-shaded style. No CLI/API key was used. Exact [prompts and reference roles](prompts.json), [native ID/size/pivot inventory](inventory.json), [original reference sheets](references/), [unaltered generated images](raw/) and [packing evidence](packing.json) are retained.

- 69 previously missing food/treasure variants complete sprites110–117 and128–219, including the refrigerator, fries, burgers, drinks, toys, electronics, gems and cards.
- 11 equipment/special-object frames add the rotor, skulls, grenade/bomb, root fragments, ON/OFF placards, closed/open exits and bonus marker.
- Existing art remains in use. All100 scoring pickup IDs, all authored active item IDs across16 stages, bones, weapons and runtime random-food IDs now have painted or procedural HD coverage.

Native source banks remain byte-identical. All80 additions keep original width/height/origin and native ink bounds; collisions and pickup rules continue to use original metadata. Tall objects use larger atlas cells so the65-pixel fridge and70-pixel exits fit without cropping or overlapping neighbors. Connected-component extraction retains whole objects that slightly cross an AI sheet's cell boundary, without including the adjacent object's art. Generated semantic interpretations are visual remasters; the source sheet and native sprite ID remain the authority.

## Precise feedback

`dist/js/hd-feedback.js` extends the existing Canvas-based HD HUD style for77 sprite IDs: all17 score awards, ×2/×3/×4/×6/×8, heart, the UP portrait, YUCK!/EXTRA!/SUPER!/YEAH!, A–Z, punctuation, PASS: and0–F digits. Values and literal strings are code, so AI does not invent numbers. The UP portrait reuses the existing HD hero face. Two older painted number entries are superseded by precise procedural glyphs; total unique covered sprite IDs is298 (223 painted entries plus77 procedural entries with two overlaps).

Floating game text and end-stage score/percentage labels also render directly at HD resolution. Native indexed text is still computed separately for Original mode and raster parity. A duplicate browser text overlay is omitted over the HD UP portrait. Flipped/white-hit versions keep the same pivots and remain transparent. Native text/rules are unchanged.

The [HD preview](../../dist/hd-preview.html) includes the new v5 atlases and a `feedback-hd` set. Its empty reference scene now supplies the tile-animation metadata required by the renderer.

## Verification and rebuild

- 225 Node tests, including all16 campaign routes, native frame parity, exact score/multiplier strings, all-stage authored-item coverage, original pivots, atlas bounds and native ink padding.
- [Browser feedback checks](review/browser.json): all157 new painted/procedural additions, no native fallback, nonempty art, mirrored/white-hit versions, native raster/game state parity and real subpixel detail; UP preview gallery also exercised.
- [Full HD regression](review/hd-browser.json): all16 worlds, animated bushes, foregrounds, changing/restoring terrain, HUD, lazy loading, persistence, mobile and failed-load fallback.
- [Actual fullscreen](review/fullscreen/browser.json): HD/window/retoggle pixel identity and unchanged simulation. Local cached CPU render p95≈1.4ms; warming three phases≈166ms. Device performance varies.
- [Stage tally](review/stage-tally-run.json): real completion RAF, exact totals, save projection and next-level Continue, Original and HD.

No DOS program/emulator execution occurred; original54-file hashes verified unchanged.

Rebuild without new generation: `node scripts/build-hd-v5.mjs`. For a complete atlas rebuild, run `build-hd.mjs`, `build-hd-v2.mjs`, then `build-hd-v5.mjs`. Reference preparation is `prepare-hd-v5.mjs`; it reads native decoded banks and does not modify them. Asset source hashes are checked before packing.

Optional browser checks use an installed Playwright and local server:

```sh
PRE2_PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node scripts/verify-hd-feedback-browser.mjs
```

Set `PRE2_QA_OUTPUT` to save screenshots/JSON. [Sharper world](review/sharp-world-hd.png) · [Items](review/items-hd.png) · [Scores, multipliers and UP](review/feedback-hd.png) · [Tally](review/tally-hd.png).
