# Golden Axe 0.3.0 — ověřený rozsah

Vydání přidává přehled ovládání obou hráčů, schválený remaster všech26
původních hudebních programů a opravy životního cyklu zvuku. Výchozí je HD
grafika a původní hudba. Nové úrovně, příběhy ani režimy nevznikly.

Přehled je v hlavním menu, Options, pauze a patičce. Sleduje skutečně
zvolená zařízení a vysvětluje útok, skok, magii, dvojstisk pro běh, R/F,
běhový skok, útok z běhu, současný útok+skok, útoky ve vzduchu a dotyk.
Dialog zachovává pauzu, focus, fullscreen a bezpečný návrat z historie.

## Kandidát a ověření

Runtime snapshot:
`154f24aaeaac84995675c629e4d6eab0d8d53e2a821c901865055e40bb737078`,
617 souborů bez sestavením injektovaného build.json.

- **220 Node testů PASS** v izolovaném checkoutu nad aktuálním veřejným main
  `899c1e6e44150603cf24b6ad398f79a72ca70f58`. Převzaté Flappy změny a CI
  izolace zachovány; změny vydání jsou pouze v ga/. Package SHA kontrola PASS.
- Nových šest CI integračních replayů projde Arcade, Beginner a Duel v1P/2P
  do příslušných zakončení; kontroluje také koncové zdroje a stage boundary.
- Nových šest browser průchodů:65571 legálních world ticků,133 checkpointů,
  83 prezentačních fází,89 ustálených renderů. Bez page errors nebo ustáleného
  SD fallbacku, s remasterem a nenulovým post-master PCM. Celé běhy používají
  neměnný snapshot12b277…; proti finálu se liší pouze nápověda, app/audio
  lifecycle a jejich vzhled. Core, renderer a herní data jsou shodné.
- Nápověda:3 unit +11 skutečných Chrome kontrol, včetně2P device swapu,
  pohybu po zavření, zachování pauzy, fullscreen, cached návratu a dotykových
  rozměrů390×844/844×390. Root osobně prohlédl desktop a portrait screenshot.
- Finální audio:4 kontroly přerušení a9 cached lifecycle kontrol PASS,
  skutečný PCM, stejný clock a skladba. Krátké měření přirozeného tichého
  dozvuku úvodu bylo rozšířeno na další frázi při zachovaném amplitudovém
  prahu; původní negativní QA doklad je uložený, runtime se tím neměnil.
- Cíleně znovu ověřeny6 restartů,7 UI případů, oba schody stage4 a18
  jezdeckých útoků všech hrdinů se54 HD rendery.

Souhrn s konkrétními výsledky: `provenance/ga-v0.3.0-qa.json`.
Samostatné reporty: controls-help, quality-027, audio-interruption,
audio-history-recovery, music-remaster a music-stage2-check.

## Praktické meze

Úplné portové průchody jsou dávkované legální vstupy a skutečné browser
meziscény, nikoli nové souvislé realtime hraní nebo celý DOS EXE replay.
Původní volba Life Meter5 a zaznamenané odmítnutí Continue P2 jsou výslovně
popsané. Globální IRQ/RNG/wallclock, některé pořadí zásahů a pozdní Duel
paleta zůstávají neověřené. Neproběhl fyzický Safari/iOS/gamepad test.

Jednorázový uživatelský výpadek stage2 není vydáván za reprodukovaný;
samostatně doložená obnova přerušeného AudioContextu se vztahuje ke své
explicitní fixture. Hudební remaster zachovává noty a časování, má ale
akustické barvy a doznívání odlišné od FM originálu.

## Zveřejnění

Přesný packaging commit, výsledek GA CI, image digest a checksum GA-only
archivu určuje [samostatné vydání ga-v0.3.0](https://github.com/michalmedvecky/pre2-web/releases/tag/ga-v0.3.0).
Container smoke běží v CI nad skutečným image, nikoli nad místním odhadem.
Původní ZIP a nesouvisející lokální změny zůstávají zachované. Vydání
neprovádí Kubernetes rollout; deployer mění pouze image samostatné GA
aplikace podle `DEPLOYER.md`.
