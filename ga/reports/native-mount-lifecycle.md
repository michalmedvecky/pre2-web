# Native mount lifecycle and expired-mount escape

This review checks the original AXE instructions relevant to a dragon that
appears free but cannot be boarded. It uses retained native disassembly and
decompilation plus read-only verification of selected bytes/tables in the
unpacked module. It does **not** reconstruct the user's RAM from the screenshot
or claim a new complete native DOS playthrough.

## Source identity and method

- `golden-axe-research/derived/executables/axe.unpacked.module.bin`:
  SHA256 `5f607b28bb4cb2580ecaa627665d17d20775d02f28f75c146d89aad27386ea90`.
- Retained `evidence/mechanics/static/all-instructions.txt`:
  SHA256 `8a5ca648d5c52b43c4461fa77c9f2c1a3d426b66fb6eadde9adbe8e82a2b4993`.
- `evidence/lifecycle-mount/authority-instructions.txt` provides an additional
  focused retained copy. Decompilations `1000_539d.c`, `1000_28d7.c`,
  `1000_3e8e.c`, `1000_4051.c`, `1000_5ca9.c` and `1000_6565.c` are secondary
  aids; the exact instructions disambiguate carry flags and coordinates.
- DS-relative table base is module offset `0xe320`, consistent with the retained
  `export_logic.py`. Read-only table extraction verifies both type10 and type11
  dispatch entries at DS:255f point to AXE539d. Direction flags1 map to direction4.
  Bytes at53ae are `c6 45 06 00` (clear actor+6); bytes at368c encode wait540.
- No original file was modified, no target was newly executed, and no REA
  configuration or analysis engine was installed. The REA skill guided the
  distinction between retained static evidence and runtime evidence.

## Boarding is automatic and time-limited

AXE2802–2868 selects rider types0/1/2/4/5/9 in state0 or1. It calls2869 only
for a type10/11 mount with nonzero word+3f (the waiting countdown). AXE2869–28d6
requires an empty mount rider pointer+46, equal floor layer and inclusive
absolute X/Y distances at most16. It sets reciprocal links and rider state20;
the existing animation transition later reaches mounted state19.

Jumping state3 is not the boarding action. Walking close enough during the
available period is the original rule. In particular, wait0 is intentionally
not boardable; a repair must not simply allow every expired dragon to be ridden.

## Waiting also expires while occupied

AXE744c's timer loop decrements each nonzero actor+3f at7480–7486 with no rider
exception (subject to the original global pause guards). Main update5c59 calls
3e8e, whose non-player type dispatch reaches539d for both mount types. AXE539d
decrements positive+3f **before** checking occupancy at53a7. Occupied mounts thus
do not keep an unlimited waiting countdown merely because a rider remains on them.

Normal hit handling3153–316c detects rider state19/20, clears the mount's+46 and
the victim rider's+48, then jumps into knockback31d8. It does not reset or add
to the freed mount's countdown. The earlier3113 write clears the **victim's**
countdown, not the mount's. The downstream hit path through328c adds no mount
waiting time. A long-ridden mount can therefore be free and already expired
after its rider is knocked off.

This differs from voluntarily casting magic while mounted:4097–409c explicitly
clears the mount rider pointer and adds72 to **mount+3f**. Magic damage1e41–1e49
clears reciprocal links without that addition. Cleanup2d1f clears links to a
removed actor; it is not a general renewal of mount eligibility.

## Required expired-mount escape behavior

AXE539d–5455 performs the following once waiting has expired and the mount is free:

1. Clear actor+6, the backward-motion flag (53ae). Keeping a former rider's
   backward flag reverses the escape motion; choosing the nearer side can then
   oscillate around screen centre rather than leave. Native294f–2952 explicitly
   copies this byte from a mounted rider to its mount during rider updates,
   providing a normal source for the inherited flag.
2. Choose left when cached screenX+4b is below160, otherwise right.
3. Probe12 pixels horizontally (562e/563a). If that probe is blocked, probe
   **down**, worldY+12, via5616. This is not an upward probe:5618 loads BX=12,
   and5645 adds the actor's worldY. A successful vertical fallback writes flags1,
   which the original direction table maps to direction4/down.
4. If the down probe is also blocked, retain the chosen horizontal direction
   and add the jump flag0x10. Horizontal directions2/6 request running.
   A nonhorizontal fallback clears the run request and explicitly switches to
   walking state1 if necessary (5411–5434).
5. Mark lifecycleFD outside the original signed cached bounds: screenX must be
  9..311 and screenY9..191 (5437–5451). AXE6565 defines cached screenY as
   `worldY - cameraY - Z`; checking groundY alone misses the original height term.

The probe predicate at5642–566c is exactly:

```text
tile.floor && (!tile.wall || tile.level == actor.level)
```

`5ca9` derives wall from high-byte bit0x40, floor from0x80 and level from
`(highByte & 0x38) >> 3`. Out-of-map probes clear both floor/wall flags and fail.

## Implication for this repair

The reviewed pre-fix web handler only requested horizontal running and checked
ground-based screen bounds. It omitted backward clearing, the blocked-route
down/jump alternatives and the explicit walking transition. Those omissions
can strand an expired, intentionally unboardable mount onscreen. They justify
repairing escape behavior; they do not justify extending the original boarding
window or adding a hit-detach countdown reset.

The companion `stage2-mount-recovery.md` owns the actual conditional before/after
reproduction and browser checks. Those checks must remain distinguished from
this static native-code authority and from the unknown exact state in the user's
screenshot. This review did not edit the runtime or run a test browser/audio.

## Review of the integrated branch

The independently reviewed replacement preserves the native order: waiting
countdown, occupied return, backward clearing, cached-side selection, probes,
direct actor direction assignment, run/forced-walk handling and lifecycleFD.
The direct direction write540e must occur **before** a forced-walk refresh or
the normal control routine; merely returning a desired direction is insufficient.

AXE64a7/6531 refresh animation metadata without recomputing screen coordinates,
so retaining the sampled cached X/Y across the forced-walk refresh matches this
branch. AXE5437–5451 marksFD rather than immediately removing the actor; the
normal main update can still control/animate/move it before cleanup. The port's
deferred lifecycle253 marking preserves that ordering. No additional mismatch
was found in this bounded branch review for ordinary valid stage coordinates.
This is not a new global IRQ/update-order equivalence claim.

## Stage2 and Stage3 timer follow-up (2026-11-12)

The retained AXE write inventory contains initialization at368c (540), the
main-handler decrement at53a3, the IRQ decrement at7486, and the mounted-magic
addition at409c (+72). Boarding and ordinary rider knockback do not replenish
this timer. AXE744c's global pause guards refer to DS:82/DS:d0c; retained writes
place these around startup/menu/pause rather than each occupied combat update.
The fast PIT path at74fd accumulates340 into a16-bit counter, matching the
1193182/32768 Hz effective countdown rate. No constant mismatch was established.

A reproducible conditional scene using each original Stage2/Stage3 map and both
mount types, with scripts/enemies removed initially, steps the actual default
Simulation cadence. All four cases reach wait0 after265 world updates:275 modeled
IRQ decrements plus265 main-handler decrements. That is7.571 seconds at the
port's nominal35 updates/s. The mount remains occupied at expiry; after ordinary
detachment it cannot be boarded again. The proof does not manipulate the wait
counter or use the test's explicit timer override. See research script
`scripts/mount-timing-proof.mjs` and evidence `mount-timing-20261112/proof.json`.

This verifies the port's timer accounting and retained instruction semantics,
not an uninstrumented native wall-clock run. The earlier debugger cadence
sample (cadence-50000.md) is consistent with approximately35 guest updates/s
under that configuration, but debugger stops and historical CPU differences
prevent claiming universal hardware timing. A long-ridden dragon fleeing after
its rider is knocked off is consequently not sufficient evidence of a remaining
bug. The earlier backward-escape repair applies to both stages; no speculative
lifetime extension or expired-mount boarding was introduced.
