# Smooth turning and full-volume first-level art

This update changes the VR branch only. Source gameplay rules, collection consequences, secret-hit counts and cave destinations stay in the recovered World. No DOS program or emulator was executed.

## Turning

The right Quest stick now drives continuous angular velocity, proportional to its horizontal deflection after the existing0.22 deadzone. Full deflection approaches90°/s. A0.12s exponential response eases acceleration and release; integration is analytic, so60/72/90/120Hz yield the same accumulated angle. Neutral arming after session entry/reconnection/menu closure prevents a held stick turning immediately.

Rotation remains around the tracked head, compensating the feet for room-scale head offset. Smooth rotation does not reset the physical club tracker every frame. Tracking loss, pause, magic-code entry and the test menu clear angular velocity. Keyboard Q/E and the isolated legacy practice regression retain30° steps; normal Quest play uses smooth turning.

Implementation: `dist/vr/js/xr-input.js` (`SmoothTurn`, smooth `XRControls`), `dist/vr/js/main.js` (`turn`, `readInput`).

## 3D object coverage

[The reproducible model catalog](../../dist/vr/models/catalog.json) inventories all407 HD object poses. The live first level uses these models for its65 authored item/marker records, generated rewards, secret pickups and source animation poses. All256 tile IDs are also prewarmed; solid terrain remains opaque3D boxes with HD surface detail.

- Pickups, letters, food, tools, jewels, bones and decorations: closed rounded meshes reconstructed from the HD silhouette. An inward distance field gives the surfaces real curvature and varying depth. Front and rear surfaces, silhouette walls, normals and UV coordinates form one closed volume. Diagonal silhouette contacts are split to avoid nonmanifold shared edges. Texture colors retain the approved web HD references or the existing connected4× enlargement.
- Spiders318–326: eight jointed-looking legs, abdomen, head, eyes and fangs, with poses derived from the native frame index.
- Frogs349–351: body, hindquarters, limbs, muzzle and eyes, with the three native pose variants.
- Birds382–385: body, wings/feathers, beak, eyes, feet and tail. Sprite386 remains the rounded, nearly buried source silhouette; emergence changes to the full bird poses through the existing source AI.
- Moving platforms232: opaque stone core, rounded rocks and vegetation, spanning the full authored3.6m walking depth.
- Bears: existing jointed upright3D model with emergence, retreat and defeat animation.
- Environment: HD tile decorations now have rounded depth; existing trunks, foliage and rocks remain3D meshes.

Items no longer billboard toward the viewer. Food/treasure rotates slowly by game time, independently of head direction; static signs retain their fixed orientation. World particles are volumes; score text and HUD remain readable2D UI.

These are authored reconstructions of depth that the original2D data cannot uniquely determine. The generic pickups are rounded silhouette reconstructions, not individually sculpted photoreal assets. Anatomy models use a palette and proportions interpreted from the reference poses. This does not claim recovery of original3D models, completed later levels or production GLB character rigs.

Implementation: `volume-art.js`, `creature-models.js`, `hd-art.js`, `level-one-view.js`. Rebuild coverage with `node scripts/build-vr-model-catalog.mjs`.

## Occlusion

Solid geometry and volumetric object surfaces write depth and are opaque. Alpha silhouettes are expressed by geometry, avoiding accidental holes from alpha-tested surface fragments. Score labels now test scene depth. Cave walls, roof and both level ends form an opaque shell; the mountain sphere and outdoor forest are hidden inside caves. Source solid terrain continues to occlude items/enemies normally.

Room-scale leaning can put the tracked head inside a ceiling even when the virtual body's collision is blocked. Within10cm of source solids, or the cave shell, a black near-camera sphere fades out the forbidden view. It reaches full black inside the solid; moving the real head away restores the view. Rescue/portal fades combine with this effect using the greater opacity. Neither eye camera is moved artificially.

IDKFA's explicit through-wall secret markers and the test-menu HUD remain intentional exceptions. Rendering geometry alone is not a claim that every VR-specific layout question is solved; hardware walkthrough of low ceilings and cave edges remains necessary.

Implementation: `occlusion.js`, `level-one-view.js`, `main.js`.

## Mountains

[Mountain panorama](../../dist/vr/textures/mountains-360.jpg) is a generated photorealistic1774×887 equirectangular texture. It shows Himalayan/Everest-inspired peaks in one direction and a Kilimanjaro-inspired massif in another. It is an invented landscape, not an authentic photograph or geographic reconstruction. The built-in `image_gen` tool produced it; the imagegen skill was used. A requested4096×2048 refinement returned the same1774×887 resolution and was not represented as true4K.

Final selected prompt: “Seamless360-degree equirectangular outdoor forest-valley panorama for a VR prehistoric game; distant Everest-inspired snow peaks in one direction and a Kilimanjaro-inspired massif opposite; valley-floor camera, mountains near the horizon, sky in the upper half, detailed foliage/earth below, soft warm daylight, matching left/right borders; no structures, people, text or watermark; highest available resolution.”

The runtime uses a180m sphere. Its center follows90% of horizontal viewer translation, creating modest world-space parallax without rotating with the player's head. Border blending hides the texture seam. The sphere is drawn behind depth-tested world geometry and hidden in caves. No perpetual artificial sky rotation is added while standing still.

## Verification and resumable checklist

- [x] Convert/prepare407 object poses and256 tile IDs before play; preserve shared geometry caching on secret reveals.
- [x] Verify finite geometry, varying curved depth and closed edges on representative complex pickups.
- [x] Verify every active anatomical source pose and platform depth.
- [x] Verify continuous turn integration across60/72/90/120Hz, held-on-entry safety and head-pivot invariance.
- [x] Verify first-level desktop and stereo/B-gate rendering.
- [x] Verify both reported secret reveals, cave entry/return, score orientation and controller cheat chords.
- [x] Verify head-inside-wall fade, cave occlusion and outdoor panorama visibility in a browser.
- [x] Preserve original binary/data hashes unchanged (54 files, checked read-only).
- [ ] Physical Quest walkthrough: turning comfort, frame time, temperature/memory, cave ceilings, near-wall fading and object appearance from all sides.

Evidence: [browser report](spatial-validation.json), [opening](spatial-opening.png), [3D objects](spatial-objects.png). All266 unit tests pass. The earlier full-level report is retained as `spatial-level-validation.json`. These are desktop/software-WebGL and mocked-WebXR tests, not headset measurements. The opening uses about73 render calls and234k triangles in that fixture; content and visibility affect these counts.

Automated publishing runs the complete game tests plus the spatial browser regression before promoting the GHCR VR alias. It smoke-tests the model catalog, reconstruction modules and panorama in the image. Kubernetes rollout remains an explicit deployment-agent action.
