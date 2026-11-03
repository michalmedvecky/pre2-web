# Stage4 run shortcut

The first Stage4 step is64 native pixels high. The original ordinary jump reaches56;
the original RUN jump launchesVZ18 and clears it. Simulation/terrain/collision and
animation tables are byte-identical to ga-v0.2.4. No jump-height boost or automatic
teleport/step exception was added.

Optional web controls now expose that existing RUN state directly: P1 R, P2 F,
and touch BĚH while moving horizontally. Legacy doubletap remains unchanged.
Ctrl/Cmd/Alt+R/F retain browser shortcuts. When explicit run + direction + jump
arrive together on foot, the adapter retains the fresh jump for at most4 input
polls until the original WALK→RUN transition completes, then delivers that jump.
This also covers the one-poll landing settlement. Without this adapter, native
control checks jump before its RUN transition and the same-poll input can become
an ordinary jump. Releasing run, reversing direction or leaving eligible ground
cancels the buffer. Attacks, magic and mounted jumps retain native priority;
mounts receive RUN but do not use the on-foot jump buffer. Native RUN remains
latched until direction release/change as in the original.

Seven focused tests pass, including source-physics negative control, same-poll
shortcut, all3 original heroes, source magic bindings and clean buffer cancel.
Actual Chrome keyboard+RAF at the screenshot's right-against-face x231/y370/lvl1:
normal jump remainslvl1; original doubletap and new shortcut clearlvl2 andlvl3.
All3heroes and P2 F+D+Tab pass bothsteps with HP unchanged. Actual simultaneous
3-touch BĚH/right/SKOK passes bothsteps in portrait390×844 and landscape844×390.
All eight direction/action controls are inside the viewport in both orientations.
Zero gameplay page errors, muted audio explicitly disposed and all browsers closed.
CtrlR/CmdR/CtrlF key handlers are confirmed neither intercepted nor captured.

Research evidence: golden-axe-research/evidence/stage4-shortcut-20261103/final/.
Screenshots personally viewed: dwarf lowerdeck, Amazon upperdeck, landscape
lowerdeck including all controls. This is conditional geometry/input QA, not a
full native DOS playthrough. Earlier exploratory touch harness ended the wrong
contact points and a programmatic-launch cleanup exposed a pending AudioContext
resume rejection; final harness uses proper held touches and a trusted muted audio
unlock, followed by awaited pause/dispose. Final run has zero page errors.
