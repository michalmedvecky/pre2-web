# Full 360° Quest conversion: source contract and roadmap

The intended future result is an explorable, stereoscopic 3D world around the player, with head tracking and spatial interaction. A flat game canvas on a virtual screen, panoramic video, or camera-facing character billboards alone do **not** meet that goal. This release adds HD 2D character art and prepares source contracts; it does not ship VR or claim headset testing.

## Sources prepared now

- Keep `engine.js`, native rules, maps and replay fixtures as the deterministic behavioral reference. Simulation owns time, collision, damage, progression and discovery. Presentation owns cameras, resolution and art choice.
- `dist/js/presentation.js` interpolates between simulation ticks. Both a future stereo renderer and the current HD renderer can consume presentation samples. Do not increase the original simulation rate just to match headset display rate.
- `dist/js/scene.js` exports renderer-neutral entity records with stable per-object IDs, semantic roles, native sprite IDs, action/variant state, facing, attachment offsets, layered visibility and world positions. It has no DOM or WebXR dependency and never writes to the world. In `?qa`, use `prehistorik.scene()` / `prehistorik.levelScene()` to inspect/export it. Map export preserves current secrets/discovery, not guessed depth geometry.
- `art/hd-v1/inventory.json` maps 92 original frame IDs to body, partial-body, glider/equipment, weapon and bear assets. It preserves native pivots and player animation streams. `references/`, `raw/`, `prompts.json`, and `packing.json` retain source pixels, unmodified AI outputs, prompts and deterministic packing transforms. The runtime manifest retains original sprite IDs; no gameplay object references a PNG filename.
- `art/vr/asset-catalog.json` records model/rig requirements and missing 3D deliverables. The side views constrain colors and silhouettes; they are not evidence for unseen back/top/side surfaces. Never turn missing mesh paths into silent billboard substitutes and call the result full VR.

## Coordinate and renderer contract

The default authoring scale is 32 native pixels per metre: one 16px tile is 0.5m. This is provisional and configurable, not a claim about the original world's real dimensions. Native +X maps to world +X; native downward +Y maps to world -Y; depth is a new Z dimension. Scene coordinates are right-handed, +Y up, forward -Z. `worldToMetres` supports explicit origins/depth so level coordinates can stay near the tracking origin. Preserve native anchors; weapon offsets attach to the actor root/hand rig, and body/glider fragments become animation references for **one** continuous skinned character rather than severed meshes.

An XR renderer owns the viewer/head pose independently of the original scrolling camera. Use a proper stereo camera and 6DoF tracking. Never scroll, tilt or shake the player's tracked head from the DOS camera. Put HUD/status in spatial UI and provide seated/standing calibration and recentering. The proposed input adapter emits the existing logical actions (left/right/jump/attack/down/look) for a parity slice, then a separately specified 3D input contract for free depth movement. Head motion and tracking are never fed into combat as an unbounded camera displacement.

A visually complete 3D version can first keep campaign interactions on the original route while building real environment geometry around it. **Free movement and combat along Z require new collision, traversal, AI, camera and reach rules**, because the source game contains none. Treat those rules as a new mode with its own tests; do not claim original input replays establish its 3D equivalence.

## 3D art production

1. Create consistent front/back/left/right/top orthographic character sheets from the approved HD design; explicitly design previously unseen surfaces.
2. Author real hero and bear meshes with UVs, materials, skeletons, LODs and capsule/box collision proxies. Start with glTF 2.0 / GLB masters. Keep editable mesh/rig/texture source files alongside exports when available. Separate collision dimensions from rendered poses.
3. Retarget native poses into continuous skeletal clips: idle variants, walk/run, crouch, takeoff/rise/fall/land, attacks per weapon, damage/death, gliding, bear walk/emergence/retreat/defeat. Preserve event timing from native ticks and retain hand/grip/foot anchors. Model club/hammer/tomahawk/axe and glider as attachable geometry.
4. Build depth-aware terrain, cave interiors and transitions, secret walls/steps, roofs/back faces, scenery, lighting and spatial audio sources. Existing tile maps only describe a cross-section. Decide how each route maps into 3D, rather than extruding every tile into an opaque wall.
5. Validate readable silhouettes from all azimuths, animation loops, depth occlusion and melee contact/reach in-headset. PNG sprites remain a desktop fallback and concept reference.

## Browser/XR and deployment

Proposed runtime: an isolated WebXR/WebGL2 renderer with a scene/asset adapter and a logical input adapter; select a maintained 3D engine when implementation begins. Keep desktop original and HD modes operational. Avoid adding an untested engine dependency or an “Enter VR” button before a working stereo scene exists.

Use HTTPS and runtime feature detection (`navigator.xr` / `isSessionSupported('immersive-vr')`); request an immersive session from a user gesture. Drive stereo presentation with the XR session's animation loop and query supported refresh rates rather than hard-coding a model-specific rate. The existing HTTPS Kubernetes ingress can serve a future WebXR build; a server-side GPU is not required for client rendering. Determine any cross-origin isolation/asset-hosting needs from actual chosen features before adding restrictive headers.

References checked 2026-10-19: [MDN requestSession](https://developer.mozilla.org/en-US/docs/Web/API/XRSystem/requestSession), [WebXR security](https://developer.mozilla.org/en-US/docs/Web/API/WebXR_Device_API/Permissions_and_security), [Meta browser feature detection](https://developers.meta.com/vr/documentation/web/browser-specs/), [Meta frame-rate control](https://developers.meta.com/vr/documentation/web/webxr-frames/), [Meta performance best practices](https://developers.meta.com/vr/documentation/web/webxr-perf-bp/), [glTF 2.0 specification](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html).

## Milestones and acceptance

1. **Current:** complete opt-in HD 2D atlas coverage, original fallback, reproducible source manifests, coordinate/scene export, unchanged gameplay replay hashes.
2. **3D art pilot:** rigged hero/bear + first cave/terrain section; inspect from front/back/above and arbitrary 360° views, no billboard stand-ins for core actors/environment.
3. **Quest vertical slice:** room-scale stereo scene, controller actions, spatial sound and UI, comfort/recenter/pause behavior, first-level traversal and combat. Profile a real target headset before expanding.
4. **3D campaign:** author all stage interiors, bosses, pickups and secret paths; decide on lateral-route or free-depth rules explicitly. Add route, save, combat and transition acceptance tests for that mode.
5. **Hardware release:** test the actual target Quest models and supported frame rates; measure CPU/GPU frame time, dropped frames, texture memory, thermal stability and load time over long sessions. Budget against the negotiated display rate (e.g. 72Hz allows about 13.9ms total frame time, 90Hz about 11.1ms), with room for tracking and compositor work. Verify stereoscopy, controller handedness, lost tracking, interrupted sessions and HTTPS asset loads.

Open decisions: target Quest model(s), seated/standing/third-person vs first-person, free-depth traversal, comfort locomotion, how physical club swings map to native attack events, art/mesh pipeline, and 3D environment interpretation. These affect a future VR build; they do not block the present HD desktop feature.
