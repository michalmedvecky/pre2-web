#!/bin/sh
set -eu
: "${WASI_CC:?Set WASI_CC to your existing WASI SDK clang path; no automatic install}"
out=${1:?Choose output .wasm path explicitly}
here=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
"$WASI_CC" -O2 -fno-builtin -nostdlib -I"$here" -Wl,--no-entry \
  -Wl,--export=opl_reset -Wl,--export=opl_write -Wl,--export=opl_render \
  -Wl,--export=opl_buffer -Wl,--export=opl_chip_size -Wl,--export-memory \
  -Wl,--initial-memory=262144 -Wl,--max-memory=262144 -Wl,--strip-all \
  "$here/opl_wasm.c" "$here/opl3.c" -o "$out"
printf 'Built %s\n' "$out"
