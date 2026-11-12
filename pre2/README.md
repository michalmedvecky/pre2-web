# Prehistorik 2 — web game

Playable native JavaScript reconstruction using the recovered original graphics, levels, music and sound effects. Original graphics render at 320×200; optional HD graphics use a 1280×800 presentation canvas. Gameplay and audio run entirely in the browser. The repository contains the web game and deployment configuration. Original DOS executables, decompiled code and reverse-engineering reports are managed separately.

There is **no server-side application, database, PVC, account service or dependency on Sites hosting**. nginx serves `dist/`. Browser localStorage stores checkpoint progress per browser and origin. Multiple replicas require no session affinity.

All 16 recovered stages are available. Core player animations, jump impulses, weapon timing and glider controls follow recovered routines and data. The 13 generic enemy families, head bounces, combat and connected hidden-platform reveals follow recovered callbacks and tables. Boss state machines, multipart weak points, scripted attacks and fractional energy damage follow recovered routines. Input-only IDDQD replays verify completion of all 16 stages, bosses and selected secret branches. Original-game equivalence, every collection route and some terrain/platform presentation edges remain unverified.

Type **MAP** during play, or use the toolbar **Map** button, to pause and fit the entire current level on one screen. Concealed blocks are shown with their revealed terrain and pink outlines, items/enemies appear beyond the current camera, cyan diamonds mark passages, and the player/camera are highlighted. Tap/click a location on the map to teleport there. Any key or the Back button closes the map and returns to the previous position; the closing key cannot move, attack or toggle another feature. Separate bonus stages have their own maps. Map details use original assets in both graphics modes.

Use the toolbar **Original / HD** button or **H** to switch graphics instantly. HD uses a 1280×800 canvas and covers all 460 native sprite IDs through painted frames or precise vector feedback, including player forms/weapons, enemies, bosses and collectibles. Art loads only when requested; failed loading leaves Original available. See [sprite sources](art/hd-v6/README.md), [item sources](art/hd-v5/README.md), and the locally served `/hd-preview.html` to inspect animation frames.

All 16 gameplay scenes now have painted HD background variants, including the roast-pig banquet in B–D. Cherries have a refreshed transparent drawing. Level one uses continuous wall/roots with whole transparent plants, columns and stakes; B–D use a continuous sandwich surface following native platform silhouettes. Release 1.2.0 adds40 painted terrain atlases covering2261 unique fragments /2694 per-stage references across2–9 andA–G, including animated and foreground variants. TITUS, CASTLE, THEEND and PRESENT screens, the world map, the oval LEVEL sign and whole final-boss poses also have HD artwork. Constant-color fills remain literal fills. See [redraw sources, checks and limits](art/hd-v16/README.md). The [asset inventory, sources and remaining native terrain](art/hd-v10/README.md) distinguish these layers explicitly. Level-one cave backdrops retain their small native stones and opening masks; floating islands use complete transparent drawings with partial-discovery clipping. See [cave/island repair and comparisons](art/hd-v11/README.md). Release1.2.1 replaces the remaining atlas joins in the wood of5/6 and castle9/A/F with world-coordinate materials, draws the tree boss and complete final-boss poses coherently, fixes crystal-cave transparency and removes old background patches around the tower lettering. See [browser comparisons and repair evidence](art/hd-v17/README.md). The HD HUD covers lives, score, hearts and BONUS. HD camera motion retains fractional positions, and display-only slope interpolation smooths native height quantization. Physics, hitboxes, animation timing, RNG and saves remain shared across modes.

Release 1.2.2 fixes the stage6 spike mattes and uses a connected drawing for the tree-boss approach. HD terrain prepares ahead of camera movement in a background worker, with a brief preparation screen before play and shared cache entries for static animation phases. This removes the repeated terrain computations that interrupted level introductions and the F credits scroll. Original mode and game rules are unchanged. See [sources, performance measurements and browser checks](art/hd-v18/README.md).

Release 1.2.3 replaces remaining cell-local rock/bark in stages 2–5 with continuous world-coordinate materials, including foreground masks, and keeps wood/leaves separate inside mixed tiles. Stage G now recovers authored ice support when returning uphill or landing across a tile-row boundary. Its replacement input-only completion route rejects checkpoint rescues. Stage5 restores bright platform cut faces and a rounded hut entrance. Stage6 repairs spike/arena compositing and preserves jumping during repeated tree-boss slams. See [sources, browser captures and scope](art/hd-v19/README.md).

Release1.2.4 repairs palette-based surface mixing in2/3, separates rooted ground and horizontal beams from background trunks in4, preserves carved masonry around the gate in9, and introduces a smooth, detailed continuous flowstone redraw forE. See [source drawings, comparisons and limits](art/hd-v20/README.md).

Release1.2.5 fixes OFF/ON lighting across the HD scene, removes unrelated fragments from animated stage2/3 vegetation, distinguishes drop-through planks beside the stage2 cave, and carries native support context into stage4 foreground painting. Stage9 statues use a complete instanced redraw; detached grape pixels are removed. E flowstone is restricted to actual cave families. The browser audit covers recorded completion routes in all16 stages,556 camera samples and targeted Chromium/WebKit checks. See [findings, before/after captures and remaining limits](art/hd-v21/README.md).

Release1.2.6 joins the kite and caveman into16 complete HD poses and adds flight guidance plus voluntary release with **G** or **Put down kite** on touch screens. Run left/right for about a second, then keep moving and hold jump to take off; hold up to climb, down to dive and recharge. Browser-edition credits appear in the final ending panel after the original credits. The page footer links to GitHub and to the source commit baked into the deployed image. See [art provenance and browser checks](art/hd-v22/README.md).

Release1.3.0 adds **H — Jantarové království**, an original amber-hive adventure with painted HD scenery, bees, a queen, checkpoint lanterns and an optional kite route. Open it from the title screen, stage picker or original ending. **J** performs a stronger ground jump using the held-jump enemy-bounce impulse. Type **IDCLUB**, **IDHAMMER**, **IDTOMAHAWK** or **IDAXE** during play to equip the club, hammer, tomahawk or double axe. See [level design, art sources and verification](art/amber-v1/README.md).

Release 1.6.1 adds a short spatial dog bark on genuine enemy/boss defeat in ORAVA, and fixes directional bell attacks: **down + attack** shoots beneath the feet to uncover bonuses under traffic lights; **up + attack** shoots overhead. The bark respects mute and stops with ORAVA. [Details and browser checks](art/orava-game-v1/README.md#patch-161).

Release 1.6.0 turns **ORAVA** into a complete optional adventure skin: shepherd hero, following dog, ringing spatial bells that shoot stars, and halušky/pirohy/bacon replacements. Use the cheat during play or **Orava adventure** in the pause menu on a phone. Repeating ORAVA restores the original character and stored weapon; MUSIC selects the existing orchestral mode. Original remains the default after reload. [Gameplay, artwork, audio and verification](art/orava-game-v1/README.md).

Release 1.5.0 adds **17 original Slovak vocal folk songs inspired by Orava**, one per stage including H. Type **ORAVA** during play to enable them, and again to restore the original. The songs have newly composed melodies and stage-specific lyrics. They load on demand, retain original sound effects and fall back to original music on failure. Selection lasts for the session; every page load starts with original music. [Lyrics, sources and verification](art/music-orava-v1/README.md).

Release1.4.0 adds optional **violin, piano and string-orchestra arrangements of all12 original music modules**, with piccolo replacing bird cues. Type **MUSIC** during play to switch; type it again to return. Every page load defaults to original music. Sound on/off is separate. New tracks load only on demand, retain intro/loop boundaries, and fall back to the original on failure; original effects continue. See [sources, fidelity limits and browser verification](art/music-remaster-v1/README.md).

Environment checks cover all 16 stages: 32 animated tile triplets, 60 authored platforms and 124 foreground masks. Seven rising map regions in stages 9 and E now move with their original triggers and cadence, updating both scenery and collisions; empty platforms use the original contact-dependent display offset. Bonus stage G includes its recovered rain intensity schedule. Rain now uses the native shared RNG, duplicated-byte initialization and VGA OR masks, with the original direction and intensity schedule. Screen shake follows the native alternating offsets, fixed HUD, black top strip and player lift rules. Fresh starts use the initialized DOS seed; an exact menu-dependent random history still depends on the preceding session. Run `node scripts/verify-environment-browser.mjs` with an installed Playwright and the local server for optional Original/HD and secret-route integration checks. `node scripts/verify-shake-rain-browser.mjs` additionally checks actual keyboard holds, weather and shake.

The [360° Quest preparation and roadmap](docs/VR-ROADMAP.md) documents the renderer-neutral scene adapter, asset/rig requirements and future full-3D milestones. This release does not implement VR or contain 3D models.

## Mobile browser release 1.1.1

Play in landscape for the largest clear view. Start/Continue expands the game automatically on touch devices; the fullscreen button also enters or leaves it. Landscape fullscreen fills the entire display with translucent controls over the scene, retaining the full game/HUD while stretching to the phone aspect ratio. Portrait keeps a fitted playfield and controls below it. Fresh browsers start in HD; an explicit saved Original preference remains respected.

- Hold the left/right thumb pad to move; slide across its center to reverse without lifting.
- Tap elsewhere in the game to attack; hold to repeat attacks.
- Swipe up to jump, down to crouch or enter a passage. Keep that finger down to sustain the action while the other thumb moves.
- **Ten quick taps in the right half** toggle **IDKFA** secret hints; **ten in the left half** toggle **IDDQD** invulnerability. Each tap must be short, with at most 650ms between taps. Changing sides, dragging, pausing or touching utility controls breaks the sequence. The final tap shows ON/OFF feedback. Ordinary taps retain their attack/movement action.
- The fullscreen controls include Pause, MAP (tap to teleport), and Original/HD. Leaving fullscreen or switching apps pauses and releases held inputs.

If native fullscreen is unavailable, the game fills the browser viewport. On iPhone/iPad, use Safari's Share → Add to Home Screen and launch the icon for an app view. Browser/OS bars remain platform-controlled. Serve over HTTPS for Home Screen and optional screen-wake/orientation features. This is an online game; the manifest does not provide offline asset caching. See [mobile implementation, checks and limits](art/mobile-v1/README.md) and [full-width/default-HD update](art/mobile-v1.1.1/README.md).

The [current all-stage HD audit](art/hd-audit-v15/README.md) lists remaining native terrain and foreground objects with physical tile IDs and diagnostic images. Stage D now recognizes its shared-tile cherry ornament and uses the existing whole HD drawing. [Music remaster preparation](art/music-audit-v1/README.md) inventories the12 MODs; no AI music job has been run and playback remains original.

## Local development

Use Node.js 20 or newer. No dependency installation or build step is required:

```sh
git clone https://github.com/michalmedvecky/remastered.git
cd remastered/pre2
npm test
npm start
```

Open http://127.0.0.1:5775. On macOS, `Play.command` also serves the game using Python 3. Arrow keys/WASD move, Up/Z jumps, J performs a high bounce jump, Space attacks, Down crouches/uses passages (release it before using the return passage), X looks ahead, P/Escape pauses, M/F3 toggles sound, H toggles original/HD graphics and F enters fullscreen. Sound starts after a gesture; click **Sound on**. Touch controls appear on touch devices.

Land on enemies while holding jump for a higher bounce. Repeated club hits reveal connected hidden platforms; the first hit may leave them concealed. Type **IDDQD** during gameplay to toggle invulnerability. This browser-only cheat blocks enemy/boss damage and harmful pickups; spikes cannot hurt you, and falling out of the map returns you to your checkpoint without losing health or lives. In a fixed cave view, rescue also activates when the fallen character disappears below the playfield, even if there is still more map or a lower floor underneath. Rescue also unlocks cave cameras and clears falling, platform, glider and attack state so movement and jumping remain usable. It remains active across stages/restarts in the current run, but is not saved and resets for a new adventure or page reload. The status line shows when it is active. Type **IDKFA** to toggle secret hints: pulsing outlines on concealed blocks, Down markers at passages, bonus-exit markers, and up to three arrows toward nearby offscreen targets. Hints follow live discovery state and do not reveal walls, collect items, unlock exits or grant weapons. Some secrets require an enemy bounce or the glider. Both cheats reset for a new adventure or reload. Completing the original three-item bonus grants temporary enemy-contact power, which is separate from cheats.

Stage completion now includes the recovered circular closing effect and animated score tally: the caveman approaches the machine, collected food and treasure fall into it one by one, and each landing adds its individual bonus with the original sound and BRAVO music. Original and HD modes share the same timing and arithmetic. Bonus entrances carry their food ledger forward until the appropriate return rather than awarding it prematurely. The browser's Continue/world-map choices appear after the animation. Run `node scripts/verify-stage-tally-browser.mjs` with an installed Playwright and the local server for optional presentation/controller checks.

Pickups follow the original tables: six bones restore one heart; ordinary enemies drop six bones after harmful contact has cleared their native death flag, rather than on every defeat; food and treasure award their individual points, and the collected-food ledger is scored again at stage completion. A spare life is awarded per 250,000 displayed points, up to 99. Some pickups spill energy into recoverable bones. Other pickups defeat enemies, turn them into food, repel following particles, or switch the palette. Weapon pickups do not spend health or score.

Recorded input-only completion routes cover all 16 worlds, all four boss encounters and selected secret-room/bonus branches. See [playthrough coverage](PLAYTHROUGH.md) for reproducible checks and their limits.

Scrolling and moving sprites are interpolated on browser animation frames, with a 65ms camera filter to smooth the original 16px camera steps. Simulation, collisions and authored animation frames retain the original approximately 24.3Hz tick. Presentation adds up to one tick of motion latency; passages, respawns and checkpoint rescues cut immediately. Pixel art remains on the 320×200 pixel grid.

Assets are already generated and committed. Building or deploying does not require the original game or analysis workspace. `dist/rules.json` and the data tables in `dist/assets/` are runtime inputs. Do not remove them or regenerate them from guessed formats.

## Monorepo hosting and deployment

Prehistorik2 lives in `pre2/` in [remastered](https://github.com/michalmedvecky/remastered). The unified site serves it at `/pre2/`; the root launcher also links to Golden Axe and Flappy. From the repository root, use the root development server for all three games. Running `npm start` inside this directory remains a standalone Prehistorik2 preview at http://127.0.0.1:5775/.

Use the [root deployment documentation](../README.md) and [unified deployment configuration](../deploy/) for the remastered image and k3s application. The files retained in `pre2/deploy/` and `pre2/Dockerfile` are the previous standalone Prehistorik2 packaging, kept as historical configuration; they are not the unified deployment target. No existing cluster application is modified by this directory migration.

Runtime module imports, asset fetches, icons and the web manifest use relative URLs. The manifest start URL and scope remain inside `/pre2/` when hosted by the unified site. There is no service worker. Browser progress remains origin-scoped; moving to another hostname does not automatically transfer saves.

## Repository layout

- `dist/`: deployable game, runtime rules, decoded assets, original music and samples
- `dist/js/`: native simulation, rendering, input/UI and audio mixer
- `tests/`: asset/render/audio/simulation tests
- `scripts/serve.mjs`: local HTTP server
- `../.github/workflows/publish-remastered-image.yml`: unified tests, image publishing and container smoke checks
- `../Dockerfile`, `../.dockerignore`: unified container packaging; local copies retain the former standalone configuration
- `../deploy/`: unified deployment; local `deploy/` retains former standalone templates

Original assets retain their original authorship; this repository does not grant a new license to the 1993 TITUS artwork or music.

References: [Kubernetes Ingress](https://kubernetes.io/docs/concepts/services-networking/ingress/), [official nginx image](https://hub.docker.com/_/nginx), [GitHub container registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry), [Docker multi-platform Actions](https://docs.docker.com/build/ci/github-actions/multi-platform/).

HD scrolling seams are fixed by assembling terrain before subpixel camera filtering. See [v12 compositor evidence and regression checks](art/hd-v12/README.md).

Bonus-stage bread paint is restricted to actual bread; map cherries/glasses/ramps retain their original identities. The stone LEVEL sign is restored from its native source. See [v13 correction evidence](art/hd-v13/README.md).

HD title and complete bonus-stage cherry ornaments, connected bread material fixes, source-aligned bonus contact and MAP click teleport are documented in [v14 evidence and limits](art/hd-v14/README.md). Type MAP and click to place the player’s feet; any key dismisses without moving.
