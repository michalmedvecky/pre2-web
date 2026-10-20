# Level-one cave semantics and complete floating islands

Reported regressions: the first cave contained huge fragmented rock patches, cave openings became rectangular/vanished, and floating islands retained tile cuts and gray stone behind roots. The painter treated opaque dark palette index6 as generic rock material. In the original data this color also owns cave backdrop and opening silhouettes; the small muted non6 fragments in those cells are background stones, not full-cell foreground boulders. Individual v7 island cells additionally embedded incompatible opaque backing colors.

## Cave repair

`terrain-semantics.js` distinguishes flat index6 cells and sparse dim clusters using actual native pixels. Sparse cells receive the cave role only when connected to a genuine flat-dark seed; applying it globally was rejected because it polluted outdoor rock fragments. Nearby rock walls retain a cave-void mask. Grass/roots, literal objects and separately drawn decoration are excluded from that neighbor mask.

The connected dark field is regularized with a5-native-pixel disk opening. This removes narrow old inter-stone cracks which otherwise cut unrelated fragments into the painted boulders and rounds rectangular opening corners. The operation runs on connected native samples with a16-pixel halo; tests verify cache-region independence. It is a presentation approximation, not an original DOS algorithm. Native collision/gate data remain unchanged. Small backdrop stones retain their original muted colors and scale using the existing sharp connected resampler; they are intentionally still present, as in the Original screenshots. They are not newly invented enemies or objects.

## Floating islands

The raw first-level map contains23 complete islands in32/48/64×32 footprints, assembled from local7–10 and18–21. The HD renderer removes those cells from its terrain layer and draws ONE continuous transparent object per footprint. The three drawings were generated with built-in `image_gen` using references assembled from those exact native tiles; the hero sheet supplies style only. [Reference](references/islands.png), [exact prompt](prompts.json), [unchanged raw result](raw/islands.png), [source hashes and component packing bounds](packing.json). Packing follows complete connected components rather than mathematical sheet cuts and uses premultiplied alpha.

The immutable authored map also supplies anchors for partly revealed islands. Only currently revealed matching cells are drawn: a pixel test confirms that an unrevealed cell is identical to the fully hidden background. This avoids leaking secret terrain while keeping the same coherent artwork during discovery. Fully hidden islands stay hidden. Gameplay, hitboxes and reveal rules are untouched.

Reproduce references with `node scripts/prepare-hd-v11.mjs`, then pack retained raw art with `node scripts/build-hd-v11.mjs` after the preceding pack builders. No original DOS binary is executed or modified.

## Verification

**252 tests pass**, including seed-scoped cave classification, root protection, rounded narrow openings, chunk invariance, muted pebble colors, island patterns and partial revelation. Browser checks compare both sides of all eight active level-one gate records (16 scenes) in HD and Original, asserting identical native raster and state. Full16-stage HD/sprite/foreground/cache checks also pass. Original files:54/54 hash unchanged.

- [Cave before](review/gate-15-trigger-hd-before.png), [cave after](review/gate-15-trigger-hd-after.png), [Original reference](review/gate-15-trigger-original.png)
- [Islands before](review/gate-13-trigger-hd-before.png), [islands after](review/gate-13-trigger-hd-after.png)
- [Opening after](review/gate-16-trigger-hd-after.png), [Original opening](review/gate-16-trigger-original.png)
- [Scene/raster evidence](review/gates-after.json), [partial-island pixel test](review/partial-island.json), [all-stage checks](review/all-stages.json), [fullscreen checks](review/fullscreen.json)

The opening gameplay view remains pixel-identical to v10 (HD hash452581492). Cached fullscreen render p50 approximately0.5ms/p953.2ms in the recorded run; timings vary and are not FPS guarantees. The scene captures were manually inspected, not accepted on test results alone. Archived before images were captured prior to the repair; rerunning the inspector defaults to after images.

Limits: this fixes first-level layer interpretation and island assembly. It does not completely remaster other stages or globally rebuild every native exterior rock contour. Original backdrop pebbles are reconstructed from their indexed source rather than independently AI-redrawn. The generated islands preserve source footprint, colors and motifs but are artistic reconstructions, not pixel-exact native art. No new gameplay content is introduced.

- [x] Reproduce user-reported cave/island errors against Original data.
- [x] Separate backdrop masks and small stones from solid wall painting.
- [x] Replace tiled island art with complete transparent source-based objects.
- [x] Check partial discovery, all gate views, initial-view parity and all-stage regressions.
- [ ] Publish verified amd64/arm64 image and update Kubernetes pin.
