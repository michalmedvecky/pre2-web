# Golden Axe 0.4.0 — release verification scope

This release restores all15 supplied sound effects, selects remastered music and effects by default, and makes the shipped interface and primary documentation English. Original audio/graphics remain selectable; HD stays the default. No new levels, characters, compositions or gameplay modes were added.

The15 effects retain source IDs, native durations and loop markers. Their complete content-addressed48kHz PCM16 bank is555552B. Restoration is derived from the supplied one-bit recordings; it does not recover lost studio detail or introduce new foley. The previously approved26-program music remaster remains unchanged. See sfx-remaster.md and remastered-audio-qa.md.

## Gameplay and input corrections

- LEVEL is captured before combat input: standalone L waits300ms, by the user's choice. Matching command letters do not leak into either player's actions; Right Shift casts immediately. Pause/blur/UI/context changes cancel deferred magic.
- Coalesced AudioContext pause/resume requests prevent an older asynchronous transition from overriding a newer intent. The ordering defect has before/after negative controls; this does not establish the cause of every historical silence report.
- Restored native nearby-thief contextual attack selection and exact AI branch/counter/cached-projection ordering. Finite inventory and legitimate misses remain; accepted stocked hits emit one item. No widened hitboxes or arbitrary slowdown.
- Expired free mounts clear inherited backward motion and use original terrain-aware escape/navigation and lifecycle cleanup. Original countdown/boarding rules remain.
- Stage2 fireballs legitimately pass above low standing thieves. The existing mounted running body strike hits them; the guide now explains this, along with native dismount rules. No gameplay change was made to turn the original high-shot miss into a hit.

## Frozen source and checks

Runtime snapshot: `961086660f77158f3d3e9b7980e6c40319147637efa3ed95b444dda5eff464ec`,635 files excluding injected build.json. Simulation SHA256: `4e856a7b7d9c8994a25f8f88ee51f4553b63c809089014f589033c2f901f215b`.

-267 Node tests and runtime/dependency/hash verification pass. All6 strict legal world replay fixtures reach their source ending states:58835 semantic input ticks, exact boundaries and final archived entities. Fresh Arcade/Beginner routes replaced obsolete inputs after actual native combat corrections; Duel inputs stayed unchanged.
- All6 actual-app browser runs return to menu:116 HDworld checkpoints,83 presentation phase snapshots, no page errors or sampled warmed SD fallback. These ran on preceding d11308 snapshot, whose gameplay core and all runtime files except controls-help.js are identical to this release. Eight selected screenshots were actually inspected; the remaining checks are automated. Fullrun paused-world audio probes are inconclusive, not a continuous-audio proof.
- Final LEVEL/audio checks:12 trusted input cases in original/HD,8 real post-master PCM windows across stage1→2→3→1,9 cached-lifecycle and4 interruption checks. Negative controls reproduce the old L and asynchronous-order defects.
- Mounted-thief final checks:12 actual-app cases, all3heroes in SD/HD, source Stage2 scene with default-cadence ordinary-input prefix and trusted J. Standing fireball misses; established running body strike hits/drops exactly one item. Desktop/mobile help actually inspected. Three new mechanics tests include9 ordinary/conditional variant cases and6 running paths across controlled/default cadence. Frozen-before/current encounter traces match; no simulation edit in this follow-up.
- Earlier sound checks retain their recorded scope:39 targeted Node,12 actual-browser SFX/default/fallback,30 OfflineAudioContext48/44.1kHz,10 MUSIC checks; English UI9 and help11. Native local nginx/Node delivery verifies restored WAV hashes/MIME/cache. CI adds the actual multiarch container validation for this release.

Detailed provenance: mounted-thief-stage2.json, thief-input-audio-fixes.json, remastered-sound-english-v1.json, sfx-remaster-v1.json. Reports distinguish retained native instructions/captures, conditional port scenes, semantic replays and visual inspections.

## Publication and limits

The exact packaging commit, GA CI run, amd64/arm64 image digest and archive checksum are in [ga-v0.4.0](https://github.com/michalmedvecky/pre2-web/releases/tag/ga-v0.4.0). Release publication waits for successful CI and actual read-only/UID10001 container smoke. The GA-only archive retains an honest local build.json template; the CI image injects its full actual commit.

No new complete native DOS execution or continuous realtime keyboard playthrough is claimed. Global native IRQ/RNG/wall-clock/hit-order parity, lateDuel palette reachability and physical Safari/iOS/gamepad remain unverified. The user's exact mounted incident was not captured as RAM/input history. Source assets and unrelated local work remain unchanged. No Kubernetes/DNS/TLS/access-policy change or rollout is performed by release publication.
