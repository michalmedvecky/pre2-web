# Licences and source provenance

Original Golden Axe game assets, artwork, animation, maps and melodies retain their original authorship. This repository/package does not grant a new licence to those game assets. They were supplied for this reconstruction; no original executable/archive is included in the package/image.

Nuked-OPL3 revision `765ec962e473aeb767e4cba74ffdc8f588ffbfe8` is LGPL-2.1-or-later. Retained and delivered in the runtime/image:

- `dist/assets/audio/opl/LICENSE`
- `dist/assets/audio/opl/source/opl3.c`, `opl3.h` (unmodified vendor)
- `dist/assets/audio/opl/source/opl_wasm.c` (custom wrapper)
- `source/BUILD.md`, `source/build-wasm.sh`, `source/wasm-provenance.json`

The standalone WASM may be rebuilt/replaced from these sources; ordinary game/image builds need no SDK install or EXE. `provenance/opl-vendor.json` preserves exact vendor hashes and source URL. Build toolchain notices are retained in `third-party/wasi-sdk/`; the SDK/toolchain binary itself is not redistributed here.

Native test fixtures are data-only values/snapshots retained with source SHA/provenance; no executable module is copied into tests or dist. Published HD artwork follows the approved visual style; discarded research candidates are outside the runtime.

The optional sampled music remaster uses VSCO 2 Community Edition recordings,
released under CC0-1.0 by their contributors. The original Golden Axe melodies
retain their original authorship; CC0 applies to the instrument recordings.
The retained sample licence and pinned source notice are in
`third-party/vsco2-ce/`. Rendering changes the instrumentation of the original
score and introduces no newly composed melody or accompaniment.
