# Direct startup without copy-protection prompt

Prepared for ga-v0.2.5 at user request. Title now returns directly to the game-type
menu, then the original rotating character selector. The password presenter is no
longer imported, constructed, keyed or shown by app.js. The input form and its CSS
were removed. Original reverse-engineered password.js/password-data.js stay as
source evidence and are not part of normal startup. No original input files changed.

Targeted actual Chrome test: desktop1P hero selection/rotation to Amazon, desktop2P
and emulated390×844 touch2P all pass. It asserts no password form exists after the
title, and reaches actual gameplay with the selected characters. All pages closed,
audio disposed. This verifies startup/selection, not a new fullgame replay.
Evidence: golden-axe-research/evidence/ga025/character-select/checks.json.
