#!/bin/bash
cd "$(dirname "$0")"
PORT=5775
printf '\nPrehistorik 2 browser reconstruction\nOpen http://127.0.0.1:%s in your browser.\nPress Control-C to stop.\n\n' "$PORT"
python3 -m http.server "$PORT" --bind 127.0.0.1 --directory dist
