# LEVEL input and music recovery — 12 November 2026

## Changes

Bare cheats now pass through a shared prefix buffer before combat keys enter either player's queue. The user chose a short delay for L: a standalone L produces one magic press after 300 ms; completing LEVEL at ordinary typing speed opens the level dialog without spending magic. Each valid prefix character renews the deadline. Right Shift remains immediate and cancels a pending L. Commands are case-insensitive and require no Shift. Existing movement outside a valid prefix is unchanged.

The buffer is cancelled by pause, loss of focus, overlays, text fields, and interactive UI focus. Deferred magic additionally checks the original simulation, player, life, grounded eligibility and current game context. No previous ticks, health or potions are rolled back. The controls guide documents this behavior and the original finite-stock thief rule.

AudioContext pause/resume requests now share one coalescing transition. An older pending suspend can no longer finish after a newer resume and leave the context silent while the application reports resumed; the reverse ordering is handled too. The first resume call still starts synchronously in the trusted gesture. Terminal disposal and cached-page held pause remain in force. This fixes a reproducible asynchronous ordering defect; it does not prove that every past report of silence had that cause.

## Verification

- 45 targeted Node tests passed: typed cheats, asynchronous audio ordering, audio lifecycle, remastered effects and music.
- Both ordering regression cases fail against the previous uncoordinated implementation and pass after this change. Retained evidence: `golden-axe-research/evidence/level-cheat-music-20261112/audio-order-before.log`.
- Actual Chrome, host audio muted, application unmuted: 12 LEVEL/input checks passed across original and HD graphics. Trusted lowercase LEVEL at 200 ms between keys spends no potion, starts no magic, and leaks no E/V movement to player two. Stage 1 → 2 → 3 → 1 and paused dialog cancellation/Resume each produced advancing audio time and real post-master PCM: eight windows, peaks 0.043–0.129, clock advancement 0.821–0.827 seconds. Standalone L, pending-L pause cancellation and immediate Right Shift also passed.
- Frozen previous Input module negative control confirms the original initial L immediately starts magic. This isolates Input, not an entire old deployed build.
- Existing cached lifecycle browser suite: 9 checks passed, including real PCM after trusted restore, preserved input and terminal disposal.
- Existing audio interruption browser suite: 4 checks passed for original and remastered music. No page errors in the passing suites.

Browser results are retained under `golden-axe-research/evidence/level-cheat-music-20261112/{browser,lifecycle,interruption}`. The new browser runner is `ga/tests/level-cheat-browser.mjs`. Its declared isolation fixture disables stage script execution and removes non-player actors; it does not change health, positions or RNG and is not a full combat/native DOS comparison. Original exploratory fixtures that retained initial scripted walking or accidentally completed an empty script were invalid for combat input and are not counted as passing evidence. A browser-only illegal native timer receiver discovered during development was fixed using wrapper default timers before the passing run.

No physical Safari/mobile listening or browser-generated BFCache claim. No release, deployment or user-preview reload was performed. Test browsers close and dispose audio in their cleanup paths; the isolated port 5963 server is shut down after verification.
