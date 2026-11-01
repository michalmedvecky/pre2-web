# Finální skutečné průchody a HD render QA

Všech šest **čerstvých current75 JS normálních průchodů** a jejich přehrání ve skutečné aplikaci došlo až do menu. Žádné LEVEL, HP/pozice/RNG patchování, skip script wait nebo odstranění nepřítele. Původní Options Life Meter5 je zaznamenaný; 2P kooperace používá původní odmítnutí Continue P2 po vyčerpání životů a netvrdí přežití obou. P1 je Gilius, P2 Axe Battler; nejde o všechny postavy×režimy.

| Režim | Hráči | Fresh world ticky | Terminální stage index |
|---|---:|---:|---:|
| Arcade |1|22174|7|
| Beginner |1|8306|18|
| Duel |1|6606|14|
| Arcade |2|19223|7|
| Beginner |2|7923|18|
| Duel |2|1339|1|

`normal-current-runs.json` obsahuje přesná nová RLE jména, jejich SHA, immutable importovaný core bundle `a5a6c2aaeb292434cc43/` a shodné source bytes před/po. GA simulation/logic/magic/speaker-clock se byteexact shodují s tímto research core. Nejde o přejmenování starých61/55 logů. Arcade1P vyžadoval konečný legální input suffix po zaseknutí controlleru u Death Addera; `probe-arcade.mjs` hledá jen na oddělených kopiích, jejich stav se nevrací do skutečné simulace. Plný input prefix, nový suffix i zbytek jsou v `hd-final-current-1p-arcade-suffix.json`.

## Co skutečně dokládá browser

`browser/<mode>-<players>p/replay.json`: stejné normální vstupy do skutečné Simulation, shodné terminální HP/lives/ticky, skutečný app/presenter/HD loader, původní UI textová čekání, meziscéna/záchrana/cesty/výsledky až do menu. World se přehrává dávkovaně; prezentace běží skutečným RAF. Není to kontinuální realtime keyboard fullrun ani native DOS fullrun. Po úvodní skutečné volbě postav je standardní launch synchronně znovu spuštěn a pozastaven na tick0 pro přesnou RLE hranici; opening má vlastní oddělené presentation QA. Obyčejné stage přechody probíhají skutečnou app cestou. Každý mode má `returnedMenu:true`, 0 page errors, audio dispose a zavřený browser.

Arcade1P/2P mají32/33 world checkpointů a každý33 původních prezentačních fází. Beginner1P po alias opravě16 checkpointů/8 fází; Beginner2P13/8; Duel1P31/1; Duel2P4/0. Každý world checkpoint ověřuje přepnutí originál↔HD beze změny world state. Pozdější verze runneru odděluje cold/settled cache; staré prealias/cold receipts se nezamlčují. `beginner-1p-pre-alias/` zachovává reprodukci opraveného alias bugu.

Osobně prohlédnuty skutečné HD screenshoty Stage3/4/5/6/7/8, oba hráči, Duel bossové, interlude otevření, rescue zavření, závěrečná cesta a výsledky. Není tím tvrzena ruční kontrola každého frame každého záznamu. Samostatné podrobné akční RAF kontakty jsou v `../actions/`.

## Konkrétní nálezy a cílené opravy

1. **Canonical sprite alias/clamp:** native getFrame správně vybíral např. chicken2→1, pot14→0, bone15→0, ale HD lookup hledal nesprávné původní číslo. Presentation owner přidal společný resolver pro renderer/preload. Nový Beginner browser výslovně ověřil t3418/3422/5860/8158 s0 originalSprites; fyzika nebyla měněna.
2. **Viditelný working set cache:** normální2P t8611 vyžaduje9atlasů. Při8/64MiB vzniklo174evictions/180RAF a střídání původní mapy. Při12/16 a stejném64MiB je9resident/47.89MB,0evictions a plný HD viewport. Presentation owner upravil pouze default počet na16; byte budget zůstává64MiB. `cache-checks-default.json` ověřuje skutečný opravený default, posledních30RAF bez fallbacku. PNG8/12/16/default byly osobně porovnány. JSON snapshot obnovuje sdílenou player/entity referenci, nikoli hodnoty aktéra.
3. **Původní mapové paletové změny:** původní první HD bundle neobsahoval late script-op4 varianty map1/2/4/7, takže správně fail-closed vykreslil DOS pozadí. `persistent-map-palette-checkpoints.json` uchovává21 přesných normálních stavů (17 původních případů +4 bonus16–19), viewportů, sourceRLE SHA a výsledek skutečné Renderer.palette (včetně used-index fingerprint). Map6t13800, bonus16t2484 a oba map3 checkpointy mají původní used RGB přesně shodné s defaultem: tam jde o samostatný cacheworking-set problém, nikoli jinou paletu. DATA/presentation připravují offline derived painted varianty; `palette-recheck/` je cílený nový renderer důkaz po jejich publikaci. Samostatně byla podle původního DS225b lookupu doplněna opomenutá čistě grafická bonus inicializace PAL37–40 do sdíleného renderer/warmup helperu, bez Simulation mutace. Starý17snapshot kolor zůstává v `persistent-map-palette-checkpoints-pre-bonus.json`. Nejde o nové generování artworku ani úpravu původních barevných tabulek. Předchozí plné browser receipts zůstávají na svém původním render checkpointu; nové cílené receipts jsou explicitní most.

## Mobilní rozvržení

`mobile/checks.json`: čtyři skutečné Chromium emulation případy,1P/2P ×390×844 a844×390. Skutečné tap pointer události vyvolaly fresh right/jump/attack, P2 původní KeyD byl oddělen od P1. HD↔originál při pauze nezměnil world JSON. Skutečný Fullscreen API fungoval; žádný horizontal clipping ovládání/canvas, všechny čtyři screenshoty osobně prohlédnuty. HD canvas1280×800, plná mapa62400 native pixelů/0original, bez sprite fallbacku. Decoded cache peak61.56MB<64MiB a palette<16MiB. Zvuk ztlumen, audio dispose a browser closed.

**Touch panel ovládá P1. P2 při mobilní2P hře potřebuje klávesnici nebo controller.** Nejsou zde dva mobilní touch gamepady. Jde o emulaci browser viewportu, nikoli fyzický telefon/gamepad nebo měření skutečné celkové RAM zařízení. Uváděné paměťové limity platí pro sledované decoded-image/palette caches, ne pro celý proces browseru.

## Testy a identita

Po původním codefreeze proběhla celá127testová sada (`unit-pre-alias-127.log`). Po konkrétní alias freeze výjimce navíc6 cílených testů; po cache opravě vlastník uvádí11 souvisejících assets/canonical testů včetně9atlasového working-set a72MiB eviction případu. Nejde o tvrzení, že později znovu proběhla celá přejmenovaná132testová sada.

Před map-palette/cache změnou byl refresh+verify PASS na snapshotu `e6ef82c3bcf1ccaf865b658c715e0d8d604a5d7011c958db6abd740419322e04`/309files. Jeho exact manifest/build/receipt zůstává v `pre-palette-cache-*`. Závěrečný další refresh/verify se provádí až po finálním asset freeze; aktuální finální identity je uvedena v `final-checks.json`, nesmí se odhadnout ze starého browser PNG.

Žádné Pre2 soubory, physics ani originální assets nebyly QA upraveny. Žádný push, commit, publish nebo deploy. Vlastní server5796 je jen oddělený QA server; uživatelský5790 zůstává nedotčen.

## Finální cílený most

Publikovaný mapový manifest `8809f332d4983bf54cba025cd1627f14462dfc893aa601e8791c0ac094d725d3`: všech21 cílených stavů vykreslilo62400 native pixelů HD pozadí bez původního mapového fallbacku. Dva zbývající cold sprite palette procesy v t1800/t20300 se v pevném15s limitu dokončily po2277.7/1517.9ms dodatečného čekání; finální viditelné sprites mají0fallbacku. Background a sprite readiness jsou oddělené. Osm různých paletových source/HD dvojic bylo osobně prohlédnuto (`eight-palette-review.png`); nejde o pixelově totožnou malovanou barevnost, spatial map4 recolor zůstává přiznaná aproximace.

Nový HD MAP přehled:5/5 jednotkových testů a2 actual browser případy PASS (Stage3 otevřené dveře a bonus16). HD používá2x backing, původní1x; teleport marker/tap používá logical native world souřadnice. Closeepoch ruší opožděné kreslení a uvolňuje canvas. HD state patch následuje po původních změněných buňkách; nesedící tileword fail-closed. Žádný actor/audio preload. Desktopdoor/mobiletap screenshoty osobně prohlédnuty.

Po všech změnách proběhl jeden nový plný `npm test`:140/140 PASS (`final-current-unit.log`). Starý127testový receipt zůstává historický.

### Native Duel omezení

Nový omezený read-only DOSBox pokus přečetl initialized menu DS:11eb=32/11ed=36. Skutečně pozorované mode byte byly1 a2; mode3 Duel ani final preloader13/14 nebyly dosaženy do180s. Proto není doložena native final-Duel PAL0 dosažitelnost ani runtime file-retry. Oddělená původní statika ukazuje neplatné názvy při těchto počtech, nikoli oprávnění vymyslet2/2 či nový HD PAL0 kontext. Žádná Simulation změna. Raw RAM/transcript a přesný limit jsou v `evidence/native-duel-palette/`. Vlastní DOSBox/debugger uzavřeny.

## Konečný freeze

Po konkrétní render-only provisional Death výjimce proběhly jen dva nezávislé actual browser checkpointy4534/5126 (`death-provisional-recheck/`):0 originalSprites,62400 HDbase,0fallback reasons, nezměněnýworldJSON, oba source/HD screenshoty osobně prohlédnuty. Barvy odpovídají současnému original režimu portu; jde o explicitní26SHA-bound `runtime-observed` kontext, `provisional:true/nativeReachabilityVerified:false`, nikoli rozšíření983 nativně dokládaných kontextů. Žádný count/Simulation patch.

Finální plný aktuální `npm test`: **142/142 PASS** (`final-current-unit.log`). Předchozí140 je zachován jako `unit-pre-provisional-140.log`; původní127 také beze změn. Následný jediný final identity refresh + `npm run verify`: **PASS**, `372` runtime files, snapshot `80dd4aee69233a1c3c4480dfe690c8017b991299d830888ba01d322dc01f1b3f`. Přesný manifest/build/receipt jsou `final-runtime-manifest.json`, `final-build.json`, `final-verify.json`. Žádná další6mode replay nebyla provedena ani relabelována.

Vlastní5796server, browsery, audio i native debugger/proces jsou uzavřené. Uživatelský5790 nebyl měněn.
