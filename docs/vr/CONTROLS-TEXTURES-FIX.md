# Intentional Quest movement and first-level surfaces — 2026-10-21

Fixed the reported rapid automatic travel immediately after entering VR. The game now stays at its initial position with neutral controls, walks only through the left thumbstick (or physical room-scale movement), stops when that stick is released and jumps on right A. The physical swing recognizer, club attachment and damage rules remain unchanged.

## Cause and correction

`headOffset()` called `renderer.xr.getCamera().getWorldPosition()` and subtracted the player's world rig position. Three's renderer-owned, unparented `ArrayCamera` holds a tracking-space `matrix` and a renderer-composed `matrixWorld`. The `Object3D.getWorldPosition()` call updates that world matrix from its local matrix, losing the locomotion parent. At tracking origin X=0, subtracting the player's X made collision queries see the player at X=0 every frame. The left boundary then repeatedly displaced the player by the .23m collision radius. Head-direction and audio reads touched the same renderer-owned camera state. This could move a stationary player rapidly across the short pilot.

The fix reads the current `XRViewerPose.transform` directly. `TrackingSpace` captures a tracking origin, rotates physical horizontal offsets into world coordinates and places the rig at `player - rotatedOrigin`. Rendering, physical collision position, heading and audio now agree without reading or mutating the renderer's internal camera transforms. Recentring preserves the previous physical world position, then anchors the new reference space. Tracking loss pauses simulation and resets input/swing history.

`XRControls` uses standard tracked-controller thumbstick axes 2/3 and right A button 4. Small stick drift is filtered with a radial .22 deadzone. Controllers must first be released to neutral after entry, reconnect or tracking interruption. Held A at entry cannot cause an automatic jump; it must be released once. Trigger and button touch do not become jump inputs. Desktop key state is not fed into immersive controls. See the [WebXR standard mapping](https://immersive-web.github.io/webxr-gamepads-module/).

## Textures

Five authored seamless 256×256 PNG surfaces cover grass, earth, stone, bark and foliage, using the recovered first-level palette as color reference. These are newly authored procedural details, not recovered hidden native art. `scripts/build-vr-textures.mjs` reproduces them without external packages. The manifest records hashes. All files live under `/vr/textures/`, preserving isolation from the separately deployed 2D game.

`surfaces.js` applies world-space triplanar mapping with fixed metre-scale repeats. Adjacent half-metre native terrain boxes sample the same surface coordinates; rock and tree scale no longer stretches each surface to fit an entire object. Small mipmapped textures and anisotropy capped at four limit memory and filtering cost. Geometry, physics and club presentation remain independent of material choice.

## Verification

- **232 unit/integration tests passed**, including a full minute of stationary simulation at a nonzero tracking origin, deliberate thumbstick movement/release, A-button mapping, neutral arming, snap-turn pivot math and seamless PNG boundary checks.
- The existing browser course passed: animated club defeat, rock jump, checkpoint, deliberate pit fall/rescue, gap jump, finish, pause and restart.
- A new test-only WebXR facade exercises the actual Three.js stereo/controller path: 140 idle frames at tracking origin zero, move/stop on the left stick, jump on A, frozen movement during tracking loss, neutral rearming, a reference-space reset and a real moving grip/club defeating the bear. It checks the haptic request, not physical motor output. The facade advances a deterministic 72Hz device clock and assertions wait for frames, so software-GPU rendering speed does not become simulated hand speed or a false input delay.
- This XR browser regression is now a required CI step before publishing a VR image. Its screenshots/report are saved as `quest-vr-xr-test` Actions artifacts; the container smoke test also fetches the new modules/textures.
- Original 54 file SHA256 hashes unchanged; the web worktree was not edited.

[Recorded validation](controls-textures-validation.json). Physical headset comfort and the corrected behavior still require confirmation on the user's Quest. No live Kubernetes rollout was performed by this code change.
