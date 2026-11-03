# HD interface completion and visual audit — 2026-11-03

The remaining low-resolution appearance was mostly intentional source-shaped
artwork, not missing HD loading hooks. The 72 original 8×8 font glyphs had merely
been drawn as rectangles at larger resolution. Several painted score/title
atlases also retained the exact pixel contour. Coverage counters alone did not
prove the requested smooth visual style.

The app now SHA-256 qualifies 82 native source frame identities (raw header and
indexed pixel bytes) plus the complete source font. Matching text and simple HUD
frames use `hd-interface.js` rather than loading a bitmap: smooth Roman body
letters, source-sized health/magic bars, small potion indicators, score numbers,
class panel and game-over text. The iconic GOLDEN AXE letters use manually fitted
heavy chamfered paths, not a substituted serif font. SEGA uses source-derived
linked-letter double-outline contours, not generic text or generated branding.
The blood splash and scoring sword pointer remain raster artwork, owned by the
separate refinement work. Authenticated source/header changes reject the exact
override; unavailable SHA qualification fails closed to the existing renderer.

A separately qualified SELECT PLAYER overlay removes only the isolated black
heading strip of the existing HD selection background. Original map-grid/tile
SHA and the reviewed HD atlas SHA must match. Its smooth heading retains the
existing HD painted text bounds, not a relocated skeleton: all changed pixels
are inside native ROI [60,4,192,25], zero outside it. The source native heading
bounds [56,8,200,24] are documented separately; the painted skull already begins
at y29.84, so the smoother heading uses the existing HD bounds [62,6.25,188,20.75].
Original-mode 1P and 2P rotation PNGs remain byte-identical.

The sprite mapping keeps original content, fixed cell advances, native ink rectangles,
pivots, mirror/reveal transforms and live palette colors. It changes HD visual
outlines only. The Georgia/Times serif fallback used by body and ordinary label
text can differ slightly across platforms; Linux/mobile font appearance has not
been personally checked. No claim that these vector graphics are AI paintings.
Original-mode drawing does not execute these HD overrides.

`Renderer.hasHDVectorFrame(sprite, slot, frame)` exposes the same qualified
canonical identity decision to the preload layer. Shared atlases must still load
when another requested frame remains raster (notably the GO! sword and scoring
pointer). New counters distinguish smooth interface sprites from painted HD.

## Verification and boundary

- Nine targeted Node24 tests passed: exact source identities, pixel/header/font
  mutation rejection, canonical preload predicate, smooth glyph/border behavior,
  retained original-cell inventory/preserved-sprite behavior, and source-map/HD
  background mutation rejection for the selection heading.
- Actual current source presenters: 72 paired original/HD synthetic checkpoints,
  no SD sprite/map/dynamic-cell/glyph fallback, no page errors; every original PNG
  was byte-identical to the pre-change original-mode capture. These are source
  renderer fixtures, not native DOS recordings or gameplay-equivalence proof.
- 21 exact previously recorded normal-input world states re-rendered in current
  Chrome: all had zero original sprite/base-map area, no fallback reasons and
  unchanged world JSON. All four contact boards were personally inspected,
  including mounted dragon/fire, skeletons, late Knight and Death, 1P/2P and
  bonus palettes. No simulation stepping was performed by this visual audit.
- Presentation contact boards 0/2/4/6/8 were personally inspected before UI
  refinement; boards 1/3/5/7 after refinement, plus full-size title, opening and
  results pilots. Last rounded-corner alpha polish was checked in a fresh opening
  pilot only, without unnecessarily repeating all 72 states.
- Browsers muted and closed. Own preview server on 5797 was stopped after QA.

Research evidence is outside the distributable package at
`golden-axe-research/evidence/hd-visual-20261103/`: source contacts,
`presentation/`, `presentation-final/`, `smooth-pilot/`, `world/`,
`native-mode-equivalence.json`, `unit.log` and reproducible audit scripts.

Remaining coarse artwork observed: yellow dragon fireball `fireball/0/1` in the
normal 2P tick5575 snapshot has a visibly stepped source silhouette despite
being classified painted HD. Parent refinement work was notified. The static red
SELECT PLAYER heading was also refined with the qualified overlay described
above. Authentic map sign/rune details were not mistaken for new text prompts. No statement that
every late animation, physical iOS device or native EXE behavior has been viewed.

## Final frozen runtime follow-up

Freeze `ca1bd6c7401ef188f61eef5083c724457d7a864c49528f4dcd916d3ddb4aed1c`
passed seven final presenter cases, the actual mounted2P tick5575 source-state
render and all11 refined fire/fireball/flame source registrations. All seven
original-mode presenter PNGs remained byte-identical. Four actual-RAF diagnostic
fire loops were captured through browser Canvas MediaRecorder; no ffmpeg or
additional service was needed. Native pivots, header/indexedSHA and frame
durations were checked for all11 records. No visible bleeding or clipping was
observed in checker/anchor contacts or the mounted stone-floor scene. Residual
alpha outside crops is at most1/255; crop edges at most4/255, so strict zero-alpha
gutters are explicitly not claimed.

Final evidence: `golden-axe-research/evidence/remaster-final-20261103/visual/summary.json`
and its `presentation/`, `world/`, `fire/` subdirectories. Actual code stayed
frozen; reports and QA data only were added after freeze. The previously coarse
yellow fireball and score pointer are now handled by the parent's new painted
refinements, and the static SELECT PLAYER heading uses the source-qualified
vector overlay described above.
