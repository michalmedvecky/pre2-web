# Smoother upright bears

The production `bear-model.js` now uses continuous sculpted torso and skull surfaces, a blended pale chest/cheek mask, denser smooth normals, gentle surface irregularity and a cached fur colour/bump texture. This replaces the overlapping chest/cheek ellipsoids and coarse silhouettes. Smaller eyes/brows, a rough coat, glossier nose, jointed elbows/knees and articulated paws retain the original cartoon identity while reducing the rigid toy-like motion. The muzzle, open mouth, brown/cream palette, hind-leg stance and native sprite references remain.

All depth/anatomy and continuous joint motion are authored VR interpretations; the original supplied only 2D sprites. No AI concept image is used in place of the actual model. [Rendered production model](natural-bear-preview.png), [source emergence levels rendered in 3D](natural-bear-emergence.png).

## Source behavior preserved

`bearPresentation` and the native type-9/type-10 controller are unchanged. Patrol bears stay upright and do not acquire invented burrowing. Emerging bears still use sprite379/380/381 visibility0.62/0.36/0.16; emergence and retreat derive from native actor state, at the original ground elevation. The complete model translates down by `(1 - visibility) × 0.96m` and clips every material at the source soil plane. Root scale stays1. Hidden and defeat poses remain supported.

The previous gait phase `(native age + fractional native frame) × 9` is retained. The new presentation adds opposing hind-leg strides, bent knees, ankle roll, elbow lag, subtle shoulder/head counter-motion and breathing. These cosmetic offsets do not modify actor positions, speed, collision bounds, health, bounce heights, attacks, scoring, recovery bones or spawning timers. The native gameplay engine and source-data files were not edited.

## Rendering / evidence

The finished model has30,988 triangles in nine instanced geometry/material batches. Geometry and a256×512 fur texture are shared between bears. Animation updates joint matrices, without generating vertices, textures, transparent hair layers or shell effects per frame. Body/head meshes carry smooth colour masks instead of separate protruding chest/cheek balls. Physical Quest frame time still needs device acceptance.

The existing upright-rig regression now enforces a12-batch upper budget rather than assuming the old eight identical-sphere material batches. Additional tests cover shared finite geometry, exact source emergence depths, deterministic pose replay, two hind legs/knees/paws, clean hit/defeat reset and clipping on every rendered material.

- [x] 286 game/unit tests.
- [x] Production model browser renders with no JavaScript/WebGL errors; actual native AI reaches emergence, walking and retreat states.
- [x] Source height0.96m and visibility fractions preserved, both facing directions finite.
- [x] Full seven-scenario browser regression required before publication (controller combat, level one, HD/secrets, spatial, adventure, club contact and bear presentation).
- [ ] Physical Quest: close-range appearance, joint motion and GPU frame time.

Saved browser evidence: [natural-bear-validation.json](natural-bear-validation.json). Original reference/evidence paths: [BEAR-REFERENCE.md](BEAR-REFERENCE.md). No DOS executable/emulator was executed.

Local acceptance: all286 tests and all seven browser scenarios passed, including the original tracked club defeat/500-point award and source secret/bonus-room regression. Original54 file hashes were verified unchanged. Workflow lint and whitespace checks passed.
