# Restore bonus-stage object identities and the stone LEVEL sign

The previous banquet material was incorrectly sampled for every nonzero terrain pixel in B/C/D. Static cherries, cocktail glasses and leaf ramps are map artwork, separate from collectible sprite136. Covering every sprite ID did not cover these map objects. The [native tile inventory](review/B-tile-inventory.json) and [contact sheet](review/B-native-tiles.png) identify their source cells. The glass rim physical485 is specifically excluded; physical2 is bread while local1/4 are cherry pieces. Only the audited bread set now receives bread paint. Other cells use continuous4× reconstruction of their original indexed colors, preserving their identity and geometry.

The old bread material contained opaque black exterior padding and the sampler discarded its alpha. Built-in imagegen removed that backing while retaining the bread/lettuce subject. The shader now multiplies material alpha by source coverage for painted bread only. Dark internal ink is preserved; this is not a global black color key. Raw generated output, exact request and a reproducible premultiplied-alpha area packer are retained. The alpha cutout is presentation only; original collision and support rules are unchanged.

The invented rectangular LEVEL shield and typeset lettering are removed. Its48×32 source pattern `[775,776,3;777,778,779]` supplies the actual irregular stone oval and carved glyphs. Exterior backing is flood-cleared, and explicitly traced native row spans exclude unrelated wall stones stored in the same six map cells. The glyph pixels remain exactly original. The oval is reconstructed at4× without AI redesign or replacement lettering.

Verification:

- 256 tests pass, including exact original glyph pixels, physical fruit/glass/ramp exclusions, actual material transparency, alpha compositing, B/C/D source integrity and complete deterministic B traversal.
- [Seven paired Original/HD scenes](review/scenes.json) preserve native raster and simulation hashes: [bread](review/bread-hd.png), [cherries](review/cherries-hd.png), [glass](review/glass-hd.png), [leaf ramp](review/leaf-ramp-hd.png), [stone sign](review/sign-hd.png), C and D. These were visually inspected; the first pass incorrectly included the glass rim and wall stones below the sign and was corrected before release.
- [All16-stage checks](review/all-stages.json), [fractional scrolling checks](review/scroll/scroll-seams.json).54 original DOS files hash unchanged; no DOS execution.

Limits: restored map cherries, glasses, ramps and the sign use source-derived4× contour reconstruction. They are not individually AI-redrawn HD objects. Bread detail remains an artistic texture inside native footprints. This repair restores identities and transparency without claiming completion of the remaining terrain remaster.

Rebuild after previous asset packs with `node scripts/build-hd-v13.mjs`. Run `node --test tests/*.test.mjs`; with Playwright and server5775 available, run `scripts/verify-banquet-browser.mjs` and the existing HD/scroll browser checks.

- [x] Audit original food tile identities; restrict bread painting.
- [x] Preserve transparent gaps in bread artwork.
- [x] Restore actual stone oval, carved lettering and exterior silhouette.
- [x] Visually inspect paired scenes; verify rules and scrolling regressions.
- [ ] Publish verified amd64/arm64 image and update Kubernetes pin.
