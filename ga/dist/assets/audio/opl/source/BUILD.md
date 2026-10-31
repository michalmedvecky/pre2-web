# Rebuilding the original OPL chip engine

Nuked-OPL3 revision `765ec962e473aeb767e4cba74ffdc8f588ffbfe8`, LGPL-2.1-or-later. The unmodified `opl3.c`/`opl3.h`, custom freestanding `opl_wasm.c`, and `../LICENSE` are retained. `wasm-provenance.json` records the original compiler, flags and exact input/output hashes. This is an audio-chip renderer, not a DOS/EXE interpreter.

With your own existing WASI SDK clang (original build: official WASI SDK34):

```sh
WASI_CC=/path/to/wasi-sdk/bin/clang sh build-wasm.sh /tmp/nuked-opl3.wasm
```

No automatic SDK install/download is performed. The command writes only the explicit output. You can replace `assets/audio/opl/nuked-opl3.wasm` in your own copy, then review and refresh the package runtime manifest before rebuilding. Different compiler versions are not promised byte-identical. No game EXE or native game harness is needed to rebuild this library.

Engine source/license: https://github.com/nukeykt/Nuked-OPL3 . Game artwork/score data retain their original authorship and do not acquire an LGPL license from this engine.
