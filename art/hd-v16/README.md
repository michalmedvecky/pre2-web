# Remaining terrain and screen redraw — v16 / release1.2.0

Built-in ImageGen edits of recovered native references. No DOS executable or emulator was run. Original files remain separate and unchanged. Gameplay, collisions, timing and audio are shared with Original mode.

## Artwork and reproducibility

-40 atlas jobs,2261 unique nonflat source RGBA fragments,2694 physical per-stage keys, covering stages2–9 andA–G. Exact duplicate source colors/masks share artwork;10 constant-color fills are rendered literally.
- Animated phases, concealed/revealed variants and foreground records were included in the inventory, not only visible start scenes. Existing stage1 continuous materials and B–D bread/whole cherries are retained.
- Whole redraws: TITUS, CASTLE, THEEND, PRESENT,640×200 world map, faithful oval LEVEL stone sign, six final-boss pose cells (including the original empty defeat cell).
- `inventory.json`: source hashes, unique tile hashes, physical aliases and job status. `references/` and `references-opaque/`: exact native input. `raw/`: unmodified generation results, including rejected attempts. `prompts/`: exact built-in prompts. `packing.json` and `scene-packing.json`: accepted raw hashes. Runtime PNGs and hashes are in `dist/assets/hd/manifest.json`.
- `node scripts/prepare-hd-v16.mjs` prepares references; do not rerun casually because it resets job statuses. `node scripts/build-hd-v16.mjs` and `node scripts/build-hd-v16-scenes.mjs` pack existing raw art. They do not generate artwork. Generation uses the built-in ImageGen tool, one edit per asset.

## Geometry and transparency

Paint supplies color, while recovered indexed data supplies smooth connected silhouettes and dark interior coverage. No global black-color key is used. Snow outputs with erased pale ice and wood with invented teeth were rejected. Final sign alpha uses its recovered oval silhouette because repeated generation retained a backdrop; the raw attempts remain preserved. The sign color crop is explicitly recorded in the scene builder.

Generic terrain uses64-pixel world chunks plus16-pixel context, joined at integer HD coordinates before fractional camera filtering. Cache signatures include physical tile values and animation phase; palette/level changes invalidate caches. B–D preserve the existing bread material and cherry objects while applying new paint to other objects. The final boss uses whole pose images instead of independently filtered body fragments.

## Validation and limits

280 Node tests pass, including all2694 aliases, original source hashes, every generated tile alpha pixel, PNG hashes, UI/map/boss records and sign transparency. `review/browser.json` holds96 views across16 stages, with equal native raster/simulation hashes in Original and HD and no native16×16 fallback calls in those samples. `review/scroll-seams.json` checks90 synthetic fractional-scroll samples against a continuous image plus50 camera positions per stage. `review/v16-browser.json` checks36 cache rebuilds across three animation phases, four screens and both halves of the world map. `mobile/` retains Chromium touch and WebKit/mobile-fullscreen checks.

This is rendering coverage, not a new full-game playthrough or proof of pixel-perfect artistic equivalence. Thin details, native repeated motifs and the existing stage1 cave reconstruction remain intentional limitations. Generated atlas cell colors can vary around joins; source silhouettes prevent altered platform geometry. MAP remains a diagnostic view using original assets. Original graphics remain available instantly. Inspect the saved per-stage sheets for visual acceptance.

Music has not been changed. The requested serious violin/piano arrangement and connection instructions are in [DRAMATIC-ARRANGEMENT.md](../music-audit-v1/DRAMATIC-ARRANGEMENT.md); generation is pending a connected music tool with verified reference-audio support.

Published code revision `2768b671bee8cb1862057b0aebea36eefaf78ef8`; [successful build39479655758](https://github.com/michalmedvecky/pre2-web/actions/runs/39479655758). Deployment image: `ghcr.io/michalmedvecky/pre2-web@sha256:24163ccca60a097e69107ff0752edebe314b3a0a46a07baf802c084e8656a7f8`; both architectures and revision labels verified.
