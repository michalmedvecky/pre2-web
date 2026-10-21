# First-level traversal, feedback, music and crafted models

This update affects the VR branch. No DOS executable/emulator was run; original source assets remain unmodified. Evidence is reconstructed source data and deterministic JavaScript tests, not original-runtime observation.

## Side protection

Wood posts and two rope rails follow the exposed source floor surfaces at both Z edges, including caves, revealed ledges and the underground floor. Source passage mouths are left open. The existing3.6m walking strip and head-offset-aware lateral clamp prevent a side fall even during jumps. Longitudinal gaps remain part of the platform game. Rail segments are instanced and rebuilt only with their dirty terrain chunk; secret-hit revisions do not rebuild the full scene.

## Head impacts

Both actual ceiling collisions and enemy/pickup damage trigger a0.52s feedback envelope, a low thud and0.85/140ms haptics on both controllers. The already tracked head is never shaken or repositioned. Instead, a projected image jitter (at most0.003 horizontal and0.002 vertical UV units), brief desaturation/vignette and blur produce the impact cue.

The blur renders each actual eye camera to its own65% resolution render target and composites nine filtered samples back to the immersive framebuffer. This is real per-eye image filtering, not a CSS effect that would disappear in Quest VR. Only impact frames use the extra passes; targets are cached. Head pose/physics are unchanged. Blur and haptics also remain meaningful with IDDQD: ceiling contact has no invented health cost. System comfort, perceived intensity and GPU performance still need physical Quest acceptance.

Implementation: `impact.js`, `main.js`. The XR regression checks distinct nonblank left/right image buffers, both haptic pulses and unchanged player/head yaw position.

## Original level music

The track is the recovered **MINES.mod**, selected for level one by the existing web game. VR reuses `GameAudio`/`OriginalMixer` from `native/audio.js`, including the tested sample rate, period tables and original digital mixer behavior. No synthetic replacement composition was created.

Music starts after the launch user gesture. **Left X toggles music** once per press; an entry-screen checkbox provides the desktop option. Pause, test menu and XR visibility loss mute the music. The song stays loaded across cave transitions and restarts, without creating a new audio context each time. Existing short positional effects use the same audio context. The worklet kernel and MINES resource are loaded inside `/vr/` so the isolated VR ingress remains sufficient.

## Newly crafted objects

The previous silhouette reconstruction is replaced by editable coloured 3D geometry for food112/113 and128–180 (excluding the non-food156): layered burgers, buns with sesame seeds, cheese, tomato and lettuce; open red fry cartons with individual tilted fries; curved bananas, grapes/cherries, fruit, corn/pineapple, ice cream, sweets, cakes, doughnuts, drumsticks, eggs, cheese, cups, mugs and drinks. Some secondary objects share a stylized vessel recipe. Source sprite sizes/anchors, item IDs, health/score consequences and animation timing remain the authoritative gameplay data.

The green349–354 enemy now has an upright dinosaur design with tail, dorsal spikes, belly, snout, teeth, eyes, forelimbs and moving hindquarters. The earlier prototype called this silhouette a frog; that visual interpretation is superseded. The388–395 family additionally gets a long-necked, shell-backed dinosaur/turtle-like design. This is an authored reinterpretation requested for VR, not a claim that the original contained3D anatomy.

See `food-models.js`, `creature-models.js`, `volume-art.js` and the regenerated [model catalog](../../dist/vr/models/catalog.json). Food is modelled directly rather than painted on front/back cards. No new AI raster images were needed for these code-native meshes.

## Natural jump ledges

Small isolated source floor runs now appear as continuous rock shelves with a broad grass cap and a rounded, tapered, slightly irregular underside. Top height, width, gaps and collision landing positions retain their source values. Existing moving platforms retain their own stone/vegetation model. This changes the appearance rather than smoothing away the required jumps.

## Lower-right underground bonus: yes, it is reachable

The source contains a lower stash at native x3552–4096,y704–784 beneath the final plateau. It is not the upper room reached through gate14. Enter through the gap immediately before the final plateau, drop below the ledge, then steer right into the lower corridor. Collect the stash; the ledges at the far right lead back to the plateau. Obtain the key and return to the exit as usual. B is not required to enter this lower corridor.

A real fidelity bug affected the return: VR had treated every floor tile as a blocking ceiling and side wall. The reconstructed original `World.collidePlayer` separately uses `tilePropertiesX` for side walls, `tilePropertiesY` for downward support and the low nibble of `tilePropertiesMisc` for ceilings. VR now preserves that distinction. Floor-only tiles allow upward passage; solid ceiling callbacks stop ascent and emit the head-impact cue; the lethal ceiling callback returns to the checkpoint unless IDDQD is active. This permits the final jump through the support-only plateau surface, as the source rules require. These passable surfaces are excluded from the solid-head occlusion fade.

The lower room has its own side walls; outdoor forest and mountain panorama are hidden while inside. No new teleport or fabricated source gate was added.

Deterministic route proof: start on the source approach at native3530,576; step left into the adjacent gap, steer right and land on the source lower floor atY=-2.5m; traverse the stash, jump to X125/Y-1, X126.4/Y0, X127.5/Y1.5, then onto the main plateau atY3. Collect the key and complete the original exit. Only joystick movement/button jumps are used after initial fixture placement. No rescue, life loss or shortcut teleport occurs.

## Verification / resume checklist

- [x] Both side rails, native passage openings and lateral confinement.
- [x] Original ceiling/support distinction and single head-impact event.
- [x] Underground entry, reward collection, return climb, key and level completion using movement/jumps.
- [x] Distinct crafted food and dinosaur geometry, finite model coverage, rounded ledges.
- [x] Original MINES worklet initialization and left-X music control.
- [x] Desktop blur and separate stereo buffers with both controller haptics; unchanged tracked position.
- [x] Original files:54 read-only hashes verified unchanged.
- [ ] Physical Quest: rail readability, head-impact comfort, blur frame time, audible music level and an actual controller walkthrough of the stash.

All274 automated tests pass. Saved evidence: [browser report](adventure-validation.json), [models](adventure-models.png), [rails](adventure-railings.png), [underground](adventure-underground.png). All automated game tests and the new adventure browser regression run before GHCR publication. Cluster rollout remains a separate explicit deployment action.
