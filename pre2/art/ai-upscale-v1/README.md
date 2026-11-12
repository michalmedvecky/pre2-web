# AI sprite remaster experiment v1

Two independent **single-pose style studies**, made with the built-in `image_gen` edit tool. These are illustrative remasters, not deterministic super-resolution or production animation atlases. Original runtime assets are unchanged; the game does not load these files.

Open [the comparison gallery](index.html) locally to compare each result with the original exported pixels on a neutral checkerboard.

| Character | Original source | AI output |
| --- | --- | --- |
| Prehistorik with club | Body sprite 34, weapon sprite 58 with the native weapon-table offset | [prehistorik-ai-v1.png](prehistorik-ai-v1.png) |
| Walking bear | Sprite 313 | [bear-ai-v1.png](bear-ai-v1.png) |

`sources.json` records source IDs, anchors, palette and original asset hashes. `export-originals.py` exports unmodified source pixels to 64×64 transparent cells, plus 8× nearest-neighbor references. Run it with Python 3 from any directory. It requires no third-party packages. The nearest-neighbor references are inputs, not AI results.

`prompts.json` contains the complete prompts used for the built-in tool. `validation.json` records actual output dimensions, SHA-256 hashes, alpha ranges and visible bounds. Generated output dimensions and silhouettes are not guaranteed to match the requested geometry; preserve these raw results and align separate derived assets before any runtime integration.

## Visual review and next steps

- The hero retains the right-facing raised-club pose, black hair/beard and yellow spotted loincloth. AI embellishes musculature, hair and club details; it is not pixel-exact.
- The bear retains the upright right-facing step and broad brown/tan color layout. AI adds fur tufts, a more explicit muzzle, teeth and claws, so face details and extremities need review against the original.
- For animation, generate and review the entire frame set with consistent identity, silhouette, palette, fixed cells and foot/weapon anchors. Check loops at native timing for flicker and shape drift.
- Keep the club as an independent layer in production so other weapons and authored attachment offsets continue to work. The composite here is for visual review.
- The current indexed renderer has a 320×200 output buffer. Merely loading larger sprites there discards the added detail. A production HD mode needs a larger presentation canvas and separate original/HD sprite rendering, while keeping world coordinates, physics, hitboxes and timing unchanged.
- Check mirrored poses, white hit flashes, transparency, foreground occlusion, HUD clipping, camera interpolation and integer display scaling. Keep an original-art fallback and validate all existing replay tests.

These samples do not justify replacing the full sprite bank yet. No Kubernetes image pin is changed for an art-only experiment outside `dist/`.
