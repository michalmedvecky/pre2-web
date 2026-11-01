# HD runtime integration

HD is the first-visit default; the toolbar, pause button and typed `HD` switch to the original renderer. The preference persists locally. The switch changes canvas backing/rendering only; simulation, timing, collision data, pause and audio state remain unchanged.

The logical viewport stays 320×200 (312-pixel playfield). HD uses a real 1280×800 backing canvas and native-coordinate transforms. Painted sprite atlas pixels are sampled directly with exact bank/slot/frame identity, original pivot, uniform placement, mirror and live palette matching. Missing animation frames or palette variants draw their original frame; no neighbouring pose is substituted.

`dist/js/hd-assets.js` owns manifest v1 validation and loading. `frames[].translationNative` maps the local `rectPixels` origin into the original unmirrored native frame coordinates. `nativePivot` must match the native header. Palette variants list only source-used indices and their actual RGB values. Map regions pair `rectPixels` with uniformly scaled world `nativeRect`; aliases resolve to original source map identity. Painted font glyphs, if supplied, use a separate entry kind. The current 72-glyph vector font preserves original block geometry and is explicitly classified as preserved vector typography, not painted HD artwork.

HD map regions are loaded only around the viewport and drawn above the original map. Original map caches remain native resolution. A global four-decode queue and LRU (eight atlases / 64 MiB, allowing one oversized atlas) bound image memory. Sprites reuse atlas images directly rather than allocating one HD canvas per frame. Presentation warmups request only their own map/actor/font dependencies.

For dynamic door/map changes, the renderer compares graphic tile words against the canonical source map. It repaints changed native tiles above the painted base, then a matching HD tile patch if available. Collision flags and immutable source cells are untouched. Missing HD door patches remain visibly original rather than displaying a stale closed/open door. Diagnostics count those cells separately. Presentation-derived map copies follow the same path.

Coverage reports unique approved source frames, frame variants, map regions, glyph categories, loaded memory and current fallback reasons. `hdBaseNativeArea` / `originalBaseNativeArea` measure the union of loaded painted map rectangles within the viewport, without double-counting overlap; native dynamic patches are reported separately. Manifest completeness remains false until the artwork owner has actually supplied the complete inventory. Runtime infrastructure passing does not certify pose registration or artistic coverage.

Map chunk publishing is owned by the asset agent: immutable painted RAW overlaps are uniformly registered, normalized linear-feathered offline, and split into opaque midpoint ownership regions. The runtime does not layer two half-transparent neighbours over the original map. Published derived chunks retain RAW/transform provenance; panorama/seam review is an artwork ingestion gate.

## Validation

- `npm test`: 102/102 pass, including original mechanics tests and 12 HD loader/presentation/font tests. No simulation, magic or logic-data file changed in this integration.
- `validation/hd-renderer/checks.json`: actual browser HD backing, exact atlas/pivot/mirror lookup, palette fallback, dynamic map/alias fallback, presentation paths, keyboard toggle, mobile layout; zero browser errors. Synthetic colour fixtures test sampling only and are not production artwork.
- `validation/hd-runtime-smoke/checks.json`: actual OPL, LEVEL test setup and paused HD/original round trip preserve the complete simulation state; zero HTTP/page errors, browser closed and audio disposed. This is a targeted smoke, not a normal full-game run.
- Original 1P/2P character selection browser test explicitly chooses original mode before its native-resolution comparison. HD selection coverage is evaluated separately as its artwork arrives.
- Independent presentation review is retained under research `hd-remaster/qa/presentation/`: actual HD title and native title pixels, opening vector typography; it does not certify missing opening artwork.

No publish, deployment, release/tag or parent-game edits were performed. The previous released runtime and original source files remain reference authorities. Full HD artwork ingestion and whole-game browser review remain in progress under the coordinating agent; do not present older normal full-game runs as proof of this new rendering pipeline.
