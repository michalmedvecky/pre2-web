Tree-boss jump regression

Observation (web runtime): sustained native hand-attack cycles lifted the player3px after collision. On the following frame the port's flat-floor lookup saw empty space, applied gravity and set jumpLock=6. Repeated slams renewed the lock. Regression test disables only the repair and reproduces this.

Static source evidence: retained REA/Ghidra assembly `analysis/assembly/game/0x14e24.asm`, specifically0x14e36–0x14e49, subtracts3 from playerY on odd shake ticks, exempting crouch5/form idle32. `0x165bc.asm`0x165dd–0x165e4 sets jump lock6 only while falling; `game-supplemental/0x16626.asm` handles authored support. These are static observations, not DOS runtime traces. Original DOS program was not executed.

Repair (port integration): only while the stage6 multipart tree boss is active, before the next player update, reconcile a known shake lift only when the prior player was grounded, vertical speed is nonnegative, and an authored nonlethal floor remains within those3px. Keep rendered shake offset and original lift timing. Real jumps, voids, moving-platform grip and lethal floors are excluded. This is a web collision correction, not a claim of instruction-identical original collision recovery.

Verification: tests/engine.test.mjs covers32 attack phases with/without IDDQD; ordinary health stays3. Separate cases reject invented support and airborne jump unlock. Native slate floor atx760,y1984 uses actual level6 data and actual boss controller. All prior shake timing tests remain applicable.

The existing stage6 input-only route still defeats all three boss phases and exits through gate19; it now completes at tick1636 rather than1637. Its final redundant input tick was removed, with the prior route retained as6-legacy-route.json. Other stage replays retain their original expectations.
