# Native mechanics audit after ga-v0.2.5

Two bounded discrepancies were corrected in simulation.js. Original data, input,
rendering, global hit ordering and IRQ clock policy were not changed.

## Kill ownership and score word arithmetic

The original AXE32b4 routine selects actor+46 as the credited owner for types10,
11,16,17 (chicken, dragon, fireball, flame). It adds victim+2a into that actor's
16-bit kill-point word+0b. The port previously awarded only direct player kills,
so mounted/projectile kills were lost from the player's score. The shared
awardKill method now follows the original owner pointer and wraps at16bits.
The magic-completion caller also uses that same source routine (native1ee9).
NPC bookkeeping stays on the NPC; the player-facing aggregate updates only for a
player owner. A missing/stale owner is safely ignored rather than credited to
an unrelated player.

## Combo initial-distance latch

Native30cb–3106 increments the combo byte when the same victim remains inHURT15.
It keeps the distance captured at the first hit. Only a different target or a new
hurt chain stores a fresh absolute16-bit separation (minimum31 for boss types6–8).
The port recalculated distance after every hit, changing the close/far finisher
choice when positions moved. recordComboHit now retains that original distance,
including native8-bit combo wrap. An actual hurt-hit integration check preserves
the far-chain state11 rather than incorrectly selecting the close throw16.

## Evidence and validation

The immutable unpacked supplied EXE SHA is
70117422872e0f09d6619a5e5473fce7eccb917597a700d2222ecfa5b87fe8fb.
REA independently verified its MZ source-to-load mappings. Exact analyzed reads:
-32 bytes at0x132b4, Evidence ev_d80fd1e7763d89896154260454f37bb676eb6eb37a3cb9bac1e7d9f900cff43a.
-62 bytes at0x130cb, Evidence ev_1b43e2192289b4a7302ff671a7c2280dba121c86096422a46e095315acc42adb.

The original32-byte routine was executed unchanged inside8 newly assembled DOS
COM harness cases. The original62-byte combo fragment was executed unchanged in9
cases, with a harness RET only after its source3109 boundary. All17 results match
the committed native fixtures, including owner routing, wrap, distance retention,
absolute distance and boss minimum. DOSBox-X2026.10.01, CPU386 normal50000, dummy
video/audio, nosound=true. This is actual execution of isolated original x86
instructions against declared records, not a fresh native whole-game run, full
2ee2 execution, physical-PC timing proof or native input capture.

Seven new tests pass. They additionally execute actual original attack headers
for all4 owner-routed attacker types, credit P2 only, reject duplicate/nonlethal
awards, exercise direct player kills, magic completion and a changed-distance
combo finisher. The targeted mechanics/core/physics suite passes74/74. A frozen
byte-identical0.2.5 core (SHA5213829...) fails all6 selected integration controls;
the candidate passes6/6. Default Ghidra analysis had no identified procedure at
32b4, so no decompiler-derived procedure dossier is claimed; verified raw bytes
and the retained source disassembly are the authority.

Research receipts:
`golden-axe-research/evidence/native-mechanics-026/` contains native-source-rea.json,
score-harness and combo-harness builders/COMs/raw outputs/results, and the
baseline-vs-candidate.json comparison. Portable golden native observations are
`tests/fixtures/native-score-32b4.json` and `native-combo-30cb.json`.
All owned native processes and the REA target were closed. Nothing committed,
pushed or deployed by this audit.

## Unresolved

The earlier16/24 mounted animation-phase mismatches, IRQ-inside-body scheduling,
whole-game hit-pair timing/order and throw/tether coverage remain unresolved.
The measured-d61 experimental IRQ branch is not shipped. Moving resolveHits in
the global update or choosing a default IRQ phase still needs non-stopping guest
PIT/actor traces, as documented in evidence/fidelity-20261103/README.md. These
local fixes must not be presented as full native equivalence.

## Duel enemy HUD follow-up

Actual-renderer comparison of archived Duel1P t5126 showed the shared SD/HD
enemy bar extending off canvas:122HP was drawn as31 cells. Original5b63 counts
unsigned actorHP bytes while excluding P1/P2 pointers andtypes10/11/16/17,
then computes(sum+3)/4 and explicitly clampsCX to9 at5bab–5bb0. This is an
original display limit, not a cap inferred from canvas width. It does not reduce
bossHP or change combat. Player rows5a8d use separate uncappedHPbyte/4 loops.

The exact original80-byte5b63–5bb3 counting fragment was executed unchanged in12
new COM harness cases, terminated by harnessRET only after the fragment and
before the draw loop. All12 pass, including0/1/4/32/33/36/37/122HP, player
pointer exclusions, all four type exclusions, and exact t5126 type/HP records
(P1=32,skeleton28,Death66,skeleton28) yielding9 cells. Read Evidence
ev_fbf58602b66245efd452e2b00f9dfbdaea617ed0b32963f43d7d91364af27dd4
from the same SHA-verified original EXE. Native fixtures are committed-source
`tests/fixtures/native-duel-hud-5b63.json`; root owns the actual renderer change
and browser checks. Research builders/raw outputs are in
`evidence/native-mechanics-026/duel-hud-harness/`.

This isolated original count-function execution does not establish native
reachability of the late Duel script/palette loader. That uncertainty remains
explicitly open. No nativeHP modification or late-table repair was made.
