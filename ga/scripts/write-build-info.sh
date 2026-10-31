#!/bin/sh
set -eu
out=${1:?output file required}
repo=${BUILD_REPOSITORY:-https://github.com/michalmedvecky/pre2-web}
ref=${VCS_REF:-unknown}
origin=${BUILD_SOURCE:-unknown}
dirty=${BUILD_DIRTY:-unknown}
snapshot=${SOURCE_SNAPSHOT:-unknown}
case "$repo" in https://github.com/*) ;; *) echo 'Expected HTTPS GitHub repository' >&2; exit 2;; esac
slug=${repo#https://github.com/}
case "$slug" in *[!A-Za-z0-9_./-]*|*..*|/*|*/|*//*|'') echo 'Invalid repository' >&2; exit 2;; esac
case "$slug" in */*) owner=${slug%%/*}; name=${slug#*/};; *) echo 'Expected owner/repository' >&2; exit 2;; esac
case "$name" in */*|'') echo 'Expected exactly owner/repository' >&2; exit 2;; esac
case "$origin" in ci|local|dirty-snapshot|unknown) ;; *) echo 'Invalid BUILD_SOURCE' >&2; exit 2;; esac
case "$dirty" in true|false) dirty_json=$dirty;; unknown) dirty_json=null;; *) echo 'Invalid BUILD_DIRTY' >&2; exit 2;; esac
commit=null
if [ "$ref" != unknown ]; then case "$ref" in *[!0-9a-f]*|'') echo 'Invalid VCS_REF' >&2;exit 2;; esac; [ "${#ref}" -eq 40 ] || exit 2; fi
if [ "$origin" = ci ]; then [ "$dirty" = false ] && [ "$ref" != unknown ] || { echo 'CI metadata requires clean checkout and full commit' >&2;exit 2; };commit="\"$ref\"";fi
snapshot_json=null
if [ "$snapshot" != unknown ]; then case "$snapshot" in *[!0-9a-f]*|'') exit 2;; esac; [ "${#snapshot}" -eq 64 ] || exit 2;snapshot_json="\"$snapshot\"";fi
printf '{"repository":"%s","commit":%s,"buildSource":"%s","dirty":%s,"sourceSnapshot":%s}\n' "$repo" "$commit" "$origin" "$dirty_json" "$snapshot_json" > "$out"
