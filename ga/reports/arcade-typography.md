# Source-era arcade typography correction

Prepared after ga-v0.2.4. The previous HD body text used Georgia/Times New Roman,
which changed Golden Axe's heavy arcade lettering into generic serif typography.
The current canvas typography uses vector contours derived from the exact original
FONT foreground143 masks (ASCII32–95). Corners have small0.18-native-pixel chamfers;
no operating-system font, measureText or fillText dependency remains in the HD
canvas font/UI text path. Fixed source cells, advance, original presenter positions,
frame identities, ink rectangles and live palette colors remain authoritative.
Counters are retained using even-odd contour filling. ©, ™ and rank-table tilde
have explicit small arcade symbol outlines; there is no system-font fallback.
The custom GOLDEN AXE block logo and source-linked SEGA logo remain separate.

HUD digits/STAGE/MAGIC, score numbers and labels, dialogues, credits, selection
heading and GAME OVER now share a consistent bold period-inspired alphabet.
This is a vector interpretation of source lettering, not new painted artwork or a
claim that every large source UI glyph is pixel-identical in HD mode. Original
mode uses its existing separate native path.

Validation:
-8 targeted interface/native-font tests PASS. All64 row masks equal actual source
 FONT ink. Tests check every source foreground cell/counter against contour area,
 rejection on source-header/font mutation, and draw with text APIs deliberately
 forbidden.
-Actual Chrome source presenters: title/credits, selection1P, opening dialogue,
 Beginner fulltext, results1P and GAME OVER, plus fullmap Stage1 HUD. Zero page errors
 or settled SD sprite/glyph fallback. All6 original-mode PNGs byte-identical to
 archived renderer captures. Browser closed; no audio instantiated.
-Personally viewed current Stage1 HUD, dialogue, results and selection captures;
 additionally title and GAME OVER checked visually. This is targeted typography QA,
 not a new fullgame/native-DOS run.

Research evidence: golden-axe-research/evidence/arcade-font-20261103/checks.json
and adjacent PNGs/check.mjs. Runtime snapshot/manifest refresh belongs to release
integration after all parallel edits have settled.
