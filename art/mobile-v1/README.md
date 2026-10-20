# Mobile browser release 1.1.0

Touch input produces the existing left/right/up/down/attack commands at the original simulation tick. Physics, collision data, combat rules, assets and recorded campaign routes are unchanged. Both Original and HD renderers use the same input.

## Controls

Hold the left/right thumb pad; slide through its center to reverse. The center has a7CSSpx dead zone. Outside the pad, tap to attack or hold stationary for repeated attacks after220ms. A vertical swipe of18–28CSSpx selects jump or crouch/passage; continuing to hold sustains it. Quick swipes retain up for300ms or down for200ms from recognition, and always deliver at least one simulation tick. Movement and action fingers are independent. A cancelled pointer never generates an attack.

Ten short taps (at most220ms each, no more than650ms between releases) in the **right half** of the game wrapper toggle **IDKFA** hints. Ten in the **left half** toggle **IDDQD** invulnerability. These call the existing World toggles and display their existing ON/OFF toast/status. The movement pad can also receive the left sequence. Side changes, dragging, cancelled/long gestures, utility buttons, focus loss and play-state resets clear the count. Each completed sequence starts a fresh count; taps retain normal attack/movement effects. Keyboard cheats remain available.

Pause, MAP, graphics and fullscreen controls live inside the fullscreen wrapper and accept secondary touch pointers while the movement thumb remains down. A consumed compatibility click prevents a MAP-opening pointerup from immediately teleporting or closing the map. MAP itself supports tap teleport and Back. Leaving fullscreen, hiding the page or switching apps pauses and clears input. Resize releases touch state; resuming requires a fresh touch. Held movement is not restored automatically.

Landscape reserves side gutters for controls, keeping the playfield and health HUD unobscured. Portrait fits the full playfield with controls below it. Safe-area insets and dynamic viewport units account for browser chrome/notches when supplied by the browser. Touch targets are at least44CSSpx. Native Fullscreen API is attempted directly from a user gesture; unsupported/rejected requests keep viewport-filling play. Orientation lock and Screen Wake Lock are optional, caught features. Home Screen standalone mode expands automatically. The manifest/icons require no backend or service worker; this release does not promise offline play or browser/OS chrome removal on unsupported platforms. Serve over HTTPS. iPhone/iPad users can use Share → Add to Home Screen. Progress storage can differ between browser and installed app contexts.

## Evidence and reproduction

Run `npm test`. With a local server on5776 and Playwright Chromium/WebKit installed, run `node scripts/verify-mobile-browser.mjs`; `PRE2_QA_URL` and `PRE2_PLAYWRIGHT_MODULE` can override the server and Playwright module. Browser tooling is optional and is not a game runtime dependency.

- [Mobile browser results](review/browser.json): native Chromium fullscreen, simultaneous walking/jumping, reversal without lifting, tap/hold attacks, crouching, cancellation, secondary-finger pause, map compatibility-click regression, ten-tap cheat activation/deactivation, portrait/landscape and manifest/icon serving.
- WebKit: explicitly disabled native fullscreen to exercise viewport fallback, MAP, attack, HD, fullscreen exit/pause/resume and standalone initialization. Layout checks cover320×568,568×320,768×1024 and1024×768 as well as phone landscape/portrait.
- [Desktop fullscreen/state/raster results](review/desktop-fullscreen/browser.json), [all16-stage render checks](review/all-stages.json), [desktop MAP checks](review/map/browser.json).
- Screenshots: [landscape Original](review/chromium-landscape-original.png), [landscape HD](review/chromium-landscape-hd.png), [portrait HD](review/chromium-portrait-hd.png), [WebKit fallback](review/webkit-fallback-landscape-hd.png).

273 Node tests pass, including11 touch-model tests and existing input-only completion replays for all16 stages/bosses and selected secret branches. Original54 DOS files hash unchanged. No original game/emulator was executed. Full logs and original hash check are retained separately in `analysis/evidence/mobile-release-20261020/`.

**Limits:** these browser checks use desktop engine mobile emulation, not physical Android/iPhone hardware. Device safe areas, actual OS orientation/wake permissions, installed app launch, audio interruptions and touch latency still need a physical-device check. The native multi-touch browser test ends contacts as a batch; independent finger release is additionally verified by the input-model tests. No claim of a fresh full-campaign human touch playthrough is made. Rendering timings are variable and do not establish mobile FPS.

## Release checklist

- [x] Gesture controls, multi-pointer movement and safe fullscreen/viewport fallback.
- [x] Ten-tap right IDKFA / left IDDQD toggles with cancellation and feedback.
- [x] Manifest, icons, HTTPS deployment notes and image smoke paths.
- [x] Node, desktop and mobile browser regression checks; original hashes preserved.
- [ ] Publish and independently verify linux/amd64 + linux/arm64 GHCR image.
- [ ] Pin verified image digest in Kubernetes and deployment documentation.
- [ ] Physical-device acceptance (Android Chrome / iOS Safari and Home Screen).
