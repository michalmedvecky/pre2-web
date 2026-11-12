# Golden Axe — standalone web package

Golden Axe lives in `ga/` inside the public [michalmedvecky/remastered repository](https://github.com/michalmedvecky/remastered/tree/main/ga). The unified container serves Golden Axe at **https://remastered.500miles.cz/ga/**, alongside `/pre2/` and `/flappy/`. This is a browser port built from analysis of the DOS executable and game data; the runtime does not contain an EXE, source ZIP or DOS emulator.

**Deployment:** use the repository-root unified deployment configuration. [DEPLOYER.md](DEPLOYER.md) retains the historical standalone GA deployment/release handoff; its per-game image and host are not the unified deployment target. A source push or GitHub release does not deploy anything to a cluster.

## Golden Axe 0.4.0

Release `ga-v0.4.0` adds:

- An English game interface, controls guide, accessibility labels, overlays and runtime messages.
- A verified stage2 mount escape correction: expired animals leave using the original terrain-aware rules instead of remaining stranded. Boarding eligibility stays unchanged; see [the recovery report](reports/stage2-mount-recovery.md).
- Source-derived restorations of all **15 original sound effects**, with their IDs and exact native durations retained. The complete effect bank is about 556 KB.
- **Remastered music and sound effects by default**, alongside the existing default HD graphics. Original audio and graphics remain selectable.

The exact commit, verified container digest and GA-only archive checksums are published with [ga-v0.4.0](https://github.com/michalmedvecky/pre2-web/releases/tag/ga-v0.4.0). See [the release verification scope](reports/release-040.md). Image publication does not perform a cluster rollout.

The effects restoration cleans and reconstructs the supplied one-bit recordings; it cannot recover lost studio recording detail and is not newly recorded foley. See [the SFX report](reports/sfx-remaster.md). The approved music remaster covers all 26 original programs without adding notes or compositions; see [the music report](reports/music-remaster.md).

## Playing and controls

**Controls and combos** opens the full guide from the main menu, Options, Pause and the footer. Both player cards follow the currently selected devices. The guide pauses play safely and supports keyboard, touch, fullscreen and scrolling; Esc closes it.

| Action | Player 1, default Keypad | Player 2, default Keyboard |
| --- | --- | --- |
| Move | Numeric keypad directions; also arrow keys | QWE / A·D / ZXC |
| Attack | Num 5 or J | S |
| Jump | Insert or K | Tab |
| Magic | Right Shift or L | Left Shift |
| Easier run | R + left/right | F + A/D |

The original horizontal double-tap run remains available: tap the same direction twice, holding the second press. A running jump clears the first high step in stage 4; for default P1 use **R + right + K**. The guide also explains running attacks, simultaneous attack+jump, airborne attacks and close-range combos. Movement up/down changes depth; it is not crouching.

Keypad and Keyboard can be swapped in Options. Movement/attack/jump follow the selected device; magic and R/F remain player-specific. Arrow/J/K aliases are available for P1 keyboard devices, and single-player P1 Keypad also accepts WASD. Mouse/gamepad controls and calibration are documented in the guide. Touch controls operate P1; hold **RUN + direction**, then tap **JUMP** for a running jump.

- **Space / Esc:** pause; **F2:** effects on/off; **F3:** music on/off; **♪:** master mute.
- Bare cheats are case-insensitive. Standalone **L** waits300ms so typing **LEVEL** does not spend magic; **Right Shift** casts immediately.
- **MUSIC:** switch original/remastered music. Options and Pause also provide music and sound-effect edition buttons. Edition selection is separate from F2/F3 mute gates.
- **HD:** original/HD graphics; **IDDQD:** invulnerability; **MAP:** map and validated click/tap teleport; **LEVEL:** choose an original stage. Touch buttons are in Pause.

The stage2 fireball flies above low standing potion thieves, as in the original. Start the mount running before pressing ATTACK for its body strike. See the in-game guide and [native follow-up](reports/mounted-thief-native-followup.md).

Music loads per program. Effects preload as a small verified bank after audio unlock. During preparation or a delivery failure, original audio remains available; gameplay does not wait for the remaster download. Audio needs a user gesture, and remote OPL AudioWorklet playback requires **HTTPS**; localhost is the development exception.

## Run and verify locally

Node 24+, with no npm dependency installation:

```sh
cd ga
node scripts/serve.mjs
# http://127.0.0.1:5790/ — stop with Ctrl-C
```

In another terminal in `ga/`:

```sh
npm test
node scripts/verify-package.mjs
```

Without npm, use `node --test tests/*.test.mjs tests/mechanics-*.mjs`. The complete suite includes CI-isolation checks that read the parent repository workflows, so use a full repository checkout for that suite. The GA-only release archive is sufficient for the application, container build context and deployment renderer; it does not include the parent workflows.

Portable browser tests use `GA_TEST_URL`, `GA_QA_OUTPUT`, `GA_PLAYWRIGHT_MODULE` and `GA_CHROME_PATH`; see the corresponding `tests/*-browser.mjs` files. Their output distinguishes automated checks from screenshots actually inspected. A browser/Node preview is not evidence that a container was tested.

After a reviewed runtime change:

```sh
node scripts/refresh-manifest.mjs --local-build-info
npm test
node scripts/verify-package.mjs
```

CI deliberately does not repair checksums automatically. `provenance/runtime-manifest.json` records the runtime files and snapshot; `build.json` is excluded because each image injects its own metadata. The tracked local template truthfully uses `dirty-snapshot` and a null commit. A clean CI image exposes its full packaging commit and source snapshot through `/build.json` and the in-game GitHub links; local HEAD is never presented as a verified deployed commit.

Historical source/validation evidence is retained in `provenance/original-runtime-manifest.json`, `source-state.json`, `parent-protected-files.json`, `validation/` and the reports. Historical dirty parent state is not a GA release identity.

## Scope and known limits

HD covers the title, rotating character selection, maps and palette variants, actors, bosses, items, spells, transitions, results and MAP overview. Original graphics remain available. Artwork coverage and limits are described in [reports/hd-remaster.md](reports/hd-remaster.md).

The package preserves the original modes and mechanics. Automated world replays and actual browser presentations cover Arcade, Beginner and Duel in 1P/2P, but they are not a new complete realtime/native DOS replay. Global IRQ/RNG/wall-clock equivalence, some hit/throw ordering and the original reachability of the late 1P Duel boss palette remain unverified. Physical Safari/iOS/gamepad testing is not claimed. See [the quality audit](reports/quality-027.md) and [HANDOFF.md](HANDOFF.md) for the current verified scope.

Serve the application at the root `/` of its own host, not beneath a `/ga/` URL path. `ga/` is the repository directory. Production uses nginx on 8080; the Node server is a local preview. Do not introduce CSP/COOP/COEP changes without verifying AudioWorklet operation. The old `/hd-pilot.html` is a historical reference, not the main game.

## Rights and release packaging

Original artwork, recordings, melodies and game data retain their original authorship; this package does not grant them a new licence. Public repository visibility does not make every component share one open-source licence. Source EXE/ZIP files and secrets do not belong in the runtime or repository.

Nuked-OPL3 is LGPL-2.1-or-later, with its original C/header sources, licence, wrapper and build recipe under `dist/assets/audio/opl/source/`. VSCO 2 Community Edition samples are CC0; that applies to the instrument recordings, not Golden Axe melodies or SND effects. Details: [LICENSES.md](LICENSES.md).

Golden Axe releases use **`ga-v*`**, separate from other games' tags, and attach a GA-only `ga-v<version>.tar.gz` plus `ga-v<version>.SHA256SUMS` after successful GA CI. GitHub's automatic Sourcecode ZIP contains the entire parent repository and is not that standalone package. Published GA releases remain prereleases and do not replace the repository's Latest release for other applications. See [DEPLOYER.md](DEPLOYER.md) for the release and deployment boundary.
