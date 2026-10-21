# Stage 5: readable platform faces and rounded hut doorway

Observation: the v19 material ownership assigned native wood indices to vertical bark even on the separately drawn horizontal cut faces. This preserved coverage but erased the original light end grain and made the standing surfaces merge into background trunks.

Repair: local tiles 17, 18, 93, 94 and 95 retain their existing HD end-grain painting for native indices 1, 2, 3, 7, 11 and 15. The autumn leaf pixels on those tiles still use the continuous leaf material. Background trunks keep the continuous bark. No collision classes, slopes, map cells or original assets change.

The first hut entrance at world (288, 1696) is a native solid shade-6 union tile (257), framed by hut tiles 173 and 175. Its upper eight native rows now use the surrounding wood outside an elliptical lintel. The dark central and lower doorway remain open. This is an HD presentation adjustment scoped to the framed tile pattern; ordinary dark room tiles remain unchanged.

Evidence:

- `references/scene-5.png`: original native scene.
- `references/stage5-cut-and-hut-native-HD.png`: upper row native, lower row preexisting HD; left-to-right local IDs 17, 18, 46, 93, 94, 95, 96, 105, 106, 107, 108, 116, 117, 118, 119.
- `review/5-platform-faces.png`, `review/5-hut-arch.png`: actual Chromium renders after correction.
- `review/stage5-surfaces-browser.json`: worker/synchronous pixel parity, unchanged original raster and simulation for both scenes; no browser errors.
- `tests/stage5-surfaces.test.mjs`: selective end-grain ownership and arch scope.

Limit: old HD cut-face art remains tile-based and can retain small internal painted joins. The correction restores the physical reading of the original platform surface without inventing new standing surfaces.

Reported entrance location: the active gate17 is at(288,1712), with its visible upper doorway at(288,1696). The dark root cavity nearx144–191,y1712 has no gate and no floor collision; it remains a root-shadow shape, not an added passage. Other active gates are at(3840,1968) and(3504,1440). This check distinguishes the reported square entrance from the unrelated central trunk shadow.
