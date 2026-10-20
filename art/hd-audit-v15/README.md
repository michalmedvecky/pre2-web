# Remaining HD gaps — all16 stages

The user's impression is confirmed. HD actors/HUD and a painted background do not establish an HD level. The renderer's continuous terrain path is enabled only for stage1 and B/C/D. Other levels fall back to original16×16 map tiles, including large objects assembled from them. This audit locates those gaps; it does not claim to have repainted the remaining terrain.

[Machine-readable physical tile inventory](coverage.json) scans every stored map cell, all three tile animation phases, concealed/revealed block states and foreground overlays. Each record includes bank/index, route, cell count, states, animation phases and example native world coordinates. [Contact sheets](tiles/) follow record order in each stage's inventory; red underlines indicate native/source reconstruction and green authored/mixed paths. Counts are distinct per-stage physical records, not unique files across the game or pixel-area percentages.

| Stage | Native tile records, including front overlays | Visually confirmed remaining artwork |
| --- | ---: | --- |
|2|247 (14 front)|Stone walls/terrain; included as a baseline despite3+ request|
|3|268 (37 front)|Green stone walls, roots/grass, cave surfaces, LEVEL3 stone, foreground edges|
|4|225 (14 front)|Brown soil, blue rock, platform rims, spikes and foreground|
|5|204|Large foreground trunks, red leaf canopy, branches, tree-house entrances|
|6|185|Tree interiors, bark, platforms/spikes and large carved tree face|
|7|246|Snowfields, ice faces, rocky undersides and cave edges|
|8|245|Crystal pillars, ice/crystal platforms, stone/ceiling edges|
|9|257 (28 front)|Engraved masonry, dark wall, columns/doors, spikes and foreground|
|A|221|Boss arena and the giant stone beast's tile-composed poses/body|
|E|208 (26 front)|Palms, ferns, stone walls, huts, huge skeletal arches and front masks|
|F|87|Vertical secret/end tower, columns, stonework and embedded lettering|
|G|212|Snow/ice/rock terrain, reused in a different authored stage|

B/C/D are **mixed**, not complete: bread has painted material and B has whole HD cherries, but static glasses, striped straws, brackets and some leaf/fruit pieces use source reconstruction. Their31/29/14 distinct bread records are distinguished from44/24/31 source-reconstructed records. Whole-object cherries can cover part of the latter, so those counts are not exact visible gap counts. Actor/item sprites are a separate path:385 painted IDs plus75 vector feedback IDs leave no missing native sprite ID, without proving uniform artistic quality of every pose. Authored moving-platform sprite IDs are checked separately in the inventory. Stage1 also remains explicitly mixed, including source-reconstructed signs and cave detail.

MENU has authored HD artwork. TITUS, CASTLE, THEEND and PRESENT remain native, and the640×200 world-map bitmap is still native. Availability is distinct from actual current UI reachability.

## Actual rendering evidence and one repaired omission

[96 rendered diagnostic views](review/browser.json) cover six camera/pose samples per stage. [Stage3](review/stage-3.png), [forest5](review/stage-5.png), [ice7](review/stage-7.png), [crystals8](review/stage-8.png), [masonry9](review/stage-9.png), [bossA poses](review/stage-A.png), [skeletalE](review/stage-E.png), and [verticalF](review/stage-F.png) show the native world against painted items/backgrounds. The browser instrumented actual16×16 fallback blits; e.g. stage3 samples recorded826 union,262 local and154 foreground fallback calls. These are draw calls, not unique assets. Original indexed raster and simulation hashes match when toggling HD at every diagnostic view.

StageD's whole cherries were missed by the B-only exact30-cell signature: its right fruit repeats shared546/547/548/549, while B uses local0/1/3/4. The exactD variant now reuses the existing approved HD cherry drawing. No wildcard replacement, universal bread paint or collision change was introduced. Tests match every authored B/D ornament and reject a damaged signature. Compare [D before](review-before/stage-D.png) with [D corrected](review/stage-D.png).

These are diagnostic camera samples plus exhaustive data references, **not a new human/input-driven playthrough**. Stored maps include offscreen staging/unused cells; record counts do not prove every cell is reachable. A uses a locked arena, so six boss poses are shown instead of irrelevant horizontal cameras. F uses vertical occupied-map samples.

## Remaster order

1. Stage3 plus shared stone/roots, with its actual palette, front masks and full multi-cell objects. Do not blindly reuse stage1's colors/material for every physical ID.
2.4–6: soil/rock, then complete tree trunks/canopies, tree face and doorways; preserve three-frame animation and genuine dark interiors.
3.7/G and8: continuous snow/ice/crystals and matching edge families; preserve moving geometry and spikes.
4.9/A: connected masonry/engraved blocks, doors/columns and complete boss pose drawings. Boss art is not covered merely by the sprite manifest.
5.E/F: palms, huts, skeleton arches and vertical tower/signs. Finish B–D glasses/straws/brackets and remaining UI.

For every batch: preserve original silhouettes and collision tables, reconstruct whole semantic objects, use real alpha for exterior holes, retain intentional black interiors, check concealed/revealed/animated/front layers, test fractional scrolling against a joined surface and compare native raster/state hashes. Do not label generic interpolation/edge smoothing or a high-resolution atlas slot as a finished AI remaster.

Reproduce with `node scripts/audit-hd-coverage.mjs` (optional `PRE2_AUDIT_OUTPUT`) and `node scripts/inspect-hd-gaps-browser.mjs` against server5776 with Playwright (`PRE2_QA_URL`, `PRE2_PLAYWRIGHT_MODULE`; optional comma-separated `PRE2_AUDIT_LEVELS`). Historical hd-v10 audits are preserved. The audit implementation has tests for animated/hidden/front coverage and the earlier false blanket B/C/D claim.
