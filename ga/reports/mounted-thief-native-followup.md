# Mounted attacks against potion thieves — native follow-up, 2026-11-12

## Finding

The original stage2 dragons fire a high projectile which can legitimately pass over a low standing thief. This is different from a blanket inability to hit thieves while mounted. Native running mount attacks can hit thieves and drop their inventory. No runtime change is justified by the stationary-fireball miss alone.

This is a read-only audit using the reverse-engineer-anything workflow, retained native execution captures, retained disassembly, and newly reread selected original binary bytes. **No new native execution, gameplay simulation, browser run or runtime edit was performed in this follow-up.** HANDOFF was read first. The previous final build remains unchanged.

## Original variant identification

The unpacked module SHA256 is `5f607b28bb4cb2580ecaa627665d17d20775d02f28f75c146d89aad27386ea90`. Its code segment1000 corresponds directly to module file offsets; data segment1e32 corresponds to file base`0xe320`.

Actual original script bytes reread:

| Stage/script address | File offset | Bytes including spawn opcode | Meaning |
| --- | --- | --- | --- |
| Stage2 DS3931 |11c51|`010b00b8021001040403020000`|type11, x696/y272, flag4 |
| Stage2 DS3a1b |11d3b|`010b0070032001040403020000`|type11, x880/y288, flag4 |
| Stage3 DS3a47 |11d67|`010b001800d800050403020000`|type11, x24/y216, flag5 |

Spawn`3657–3666` maps flag4→actor byte`+4a=FF`, flag5→`+4a=00`. Mounted stationary/walking attack`410c–4120` selects type11's `269d` fireball(type16) when`+4a=FF`; otherwise `2666` flame(type17). Color descriptions in older reports were previously corrected; raw type/flag is authoritative.

`269d` creates fireball in state9 at mount Z+44. Shared spawn helper gives VZ0, and`605a–6065` explicitly skips gravity for type16. Thus the projectile remains high. Flame17 also starts at Z+44 but has its own animation/attack rectangle and is not subject to the type16 gravity exemption. Visual similarity is not evidence of identical attack geometry.

## Hit and loot rules

- `2e66–2eb5`: depth compares Y plus floor-height adjustment. Mounts10/11 and projectiles16/17 receive14 units of depth tolerance; ordinary attackers receive7.
- `2ee2–2f35`: the attacking mount/projectile must be owned by a player (or one participant must itself be a player); victims already in knockback13/thrown17/down14 are rejected in this path.
- `2f38–2f56`: mounts10/11 attack only in state5 or9, and cannot attack their own rider.
- `2f59–2f69`: thief12/13 is rejected when its native wait is0. There is no mounted/thief type prohibition.
- `2f6c–3048`: original current-frame attack and hurt rectangles, mirrored by direction, must overlap in X and projected Y−Z. A high shot can pass above the thief despite satisfying depth tolerance.
- `31d8–31f4`: every accepted type12/13 hit calls potion/food drop`26d4/271f` and selects SFX8. Drop requires remaining inventory`actor+9>0`; each call decrements once. Health is a separate byte. Exhausted thieves are not infinite dispensers.
- `3132–3152`: projectile16/17 uses its owner/rider X when choosing the victim's facing and eventual item direction.

## Retained actual native execution

`golden-axe-research/evidence/death-magic-audio/blue/native-blue-thief.json` (SHA256 `d12c92c46d216521857921b7b01777e5fd56d3d30eeaa28673354157562f252a`) contains51 samples from a conditional original-native setup. It is not a complete legal playthrough.

At `stationary-shot-0`, thief12 at(129,208), Z0, has3 pots and mount11/+4a00 is at(89,208). At `stationary-shot-1`, flame17 appears at(131,207), Z44, and thief inventory falls3→2 with a new item18. Later `run-attack-5` shows mount11 in state9 at(118,208), Z15, thief at(162,220), inventory2→1 and a second item18; no projectile is present. These are actual retained native mounted hits/drops.

`native-fireball-control.json` (SHA256 `34480c42bcc66238e9700e717535bf8b301b58fc826d8cf192a71a881a335c4b`) contains15 samples. Its explicit conditional variant sets mount11/+4aFF. Fireball16 crosses x252→348 at Y219/Z44; standing thief at(282,220), Z0, retains3 pots throughout. This is retained native evidence of the high-shot miss, rather than a claim inferred only from the web port's rectangles. The historical report describes standing thief hurt top−27 and shot bottom−34 at equal depth.

## Running strike and dismount

Mounted control`4051–4230` gives attack priority over jump. If the mount is already running(state2), `40d6–40ea` selects running strike(state9) and VZ10. This branch does **not** spawn a projectile or inspect`+4a`; the projectile selector belongs only to the stationary/walking attack branch. The retained native state9 hit above establishes the running body strike. Applicability to flag4 uses the shared type11 state9 path/animation, rather than a newly executed flag4 running fixture.

Native mounted control has no dedicated voluntary jump-dismount command: jump starts the mount jump; attack+jump chooses its attack path. Magic`406f–40cc` detaches when the original global permission checks allow it, the mount is grounded and the rider has magic inventory. It then casts magic. Accepted damage can detach at`3153–316c`; death/lifecycle also clears mount links. No new dismount key should be invented and described as original behavior.

Suggested accurate English help, for parent integration after the complementary hit audit:

> Fireball dragons shoot above low thieves. Double-tap a direction to run, then attack for the mount's running strike. Flame dragons and the bizarrian use different attacks. Casting available magic dismounts you; jumping keeps you mounted.

Exact player key bindings should follow the current help table. No controls/help file was changed here. Remaining uncertainty: the user's exact mounted position, victim animation and input sequence were not captured; this audit cannot prove every reported missed mounted hit is expected. The hit agent owns current-port dynamic reproduction and any independently proven correction.

## Selected code bytes checked against retained instructions

| Code/file offset | Hex bytes |
| --- | --- |
|40cf|`f606a72020744d837c33027511c64411ffc744330900c744240a00eb3790`|
|4114|`807c4aff7406e849e5eb0490e87ae5b8`|
|2e9a|`bb0e00833c0a7411833c0b740c833c107407833c117402d1eb3bc3771c`|
|2f59|`833d0c7405833d0d7509837d3f007503e92103`|
|31d8|`b80500833d0c7509e8f1f4b80800eb0c90833d0d7506e82ef5b80800e8fcec`|
|605a|`833d107409b80200e84e02294524`|

These bytes independently anchor the selector, running attack, depth guard, wait guard, drop dispatch and type16 gravity exemption in the supplied original module. Original files stayed unchanged; no QA process was launched or left running.
