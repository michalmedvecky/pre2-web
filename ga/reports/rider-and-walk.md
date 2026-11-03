# Rider anatomy and walk facing correction

Changes after ga-v0.2.3, prepared for ga-v0.2.4. Publication/CI/image authority
is the GitHub release; this QA receipt precedes publication. No cluster deployment.

The front mounted dwarf20/0 had two long extended legs and a68.1 native-pixel-wide
painted silhouette compared with the original48px. A new painted seated pose has
one compact bent near leg and the far leg occluded. It uses the unchanged native
50×50 frame, pivot29,39, duration50, header/indexed identity and mount tables.
The new raw alpha>=128 bounds are uniformly fitted into the native48×48 opaque
bounds; generated alpha is retained. No physics or collision adjustment hides the
old anatomy. Both chicken and dragon use this same corrected frame. Rear20/1 is
unchanged.

All four approved dwarf walking frames had the head facing opposite the native
walking direction. A built-in image_gen edit turns the head toward the axe and
native LEFT orientation; runtime mirroring then faces RIGHT correctly. Four cell
rectangles, source identities, scales/translations and durations are unchanged.
Original PNGs remain in the package. New PNG and lossless WebP files are siblings.
Decoded WebP RGBA matches each new PNG including alpha/hiddenRGB.

Actual Chrome Renderer QA:42 mounted fixtures (both animals/facings, idle, gait,
attack and jump, rider0/1),8 walking frame/direction fixtures and3 fullmap render
fixtures (pink chicken, red dragon and blue dragon). All unchanged world state,
zero settled sprite/map fallback, no page errors; browsers closed. The42-pair
contact, all8 walk pairs, and fullmap pink/red scene captures were visually viewed.
This is targeted renderer QA, not a new continuous/native fullgame run.
Evidence: golden-axe-research/hd-remaster/mounted-fix-20261103/{qa-after,prompts.md,registration.json}.

Stage4: current actual browser keyboard3/3 run-jump routes pass both steps; normal
standing-jump control fails as intended. First step64px, ordinary jumpmax56px.
Native archived29-state comparison matches29/29. Correct controls: doubletapRIGHT,
hold second press, thenK (after run activation). Help now explains this. Physics
unchanged. Research: evidence/stage4-current-20261103/README.md.
