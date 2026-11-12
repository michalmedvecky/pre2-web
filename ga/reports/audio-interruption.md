# Obnova přerušeného zvuku — 12. 11. 2026

Vedle opravy BFCache je pokryto neočekávané pozastavení sdíleného
AudioContextu při stále aktivní hře. Dosavadní příznak `audio.paused=false`
v takovém případě nesouhlasil se skutečným stavem `context.state=suspended`.
Obyčejný pohyb zvuk neobnovil, zatímco MUSIC volalo `unlockAudio()`.

Reprodukce použila skutečný Chrome a explicitní `context.suspend()` bez
změny herní pauzy. Před opravou zůstal kontext pozastavený i po skutečném
stisku šipky (timeout). Nejde o důkaz příčiny uživatelova dřívějšího výpadku.

`resumeAfterInterruption()` obnoví pouze existující kontext při důvěryhodném
vstupu. Nemění skladbu, její začátek, variantu, F3 ani buffer. Hra musí být
viditelná, bez pauzy, nápovědy a HD načítání. Zamčené či ukončené audio se
nevytváří znovu. Souběžné čekání na resume je sdílené; odmítnutí se zachytí.

Ověření:

- Tři nové Node regrese: stejný přehrávač a gate stav, explicitní pauza a
  terminal dispose, deduplikace a dispose během čekání. Celkem27 cílených
  lifecycle/remaster testů PASS.
- Čtyři browser kontroly PASS: Stage2 originál i remaster mají po skutečném
  vstupu nenulový post-master PCM a stejné objekty/časování; syntetická událost
  nepomůže, ruční pauza zůstane pauzou a dispose je terminální.
- Host zvuk Chrome byl ztlumen, aplikace měla master1 a muted=false. Není
  tvrzen fyzický poslech ani skutečný výpadek zařízení/Safari.

Přenosná regrese `tests/music-interruption-browser.mjs`. Raw výsledky v
`golden-axe-research/evidence/audio-interruption-20261112/{before,after}/checks.json`.
Vlastní browser po běhu uzavřen; izolovaný QA server bude ukončen při
finalizaci vydání. Soukromý uživatelský náhled není tímto testem ovládán.
