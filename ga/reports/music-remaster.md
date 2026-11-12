# Golden Axe — úplný hudební remaster a MUSIC

Hotový pracovní kandidát po schválení Stage1 pilotu dne5.11.2026.
Původní hudba je výchozí. Napsáním MUSIC v menu nebo hře se přepíná zvuková
varianta; na telefonu je tlačítko v Options a v pauze. F3 zapíná/vypíná hudbu,
F2 efekty. Kandidát není nové GitHub vydání ani cluster deployment.

## Hudební obsah

26 původních programů:21 jednotlivých score a5 souvislých playlistů. Zahrnují
úvod, všechny levelové sekvence, travel, thief, showdown, score a výsledky.
Opening hraje INTRO pouze jednou, dále INTRO2. Žádné nové noty, harmonie,
postavy, levely ani režimy.54535 semantic událostí a22891 notových spanů
odpovídá uloženým instrumentovaným native EVT; nejde o nové celé DOS hraní.
Nezávisle ověřeny pitch/nástupy/gate/velocity a3 tlakové změny v SASSA.

Styl používá33 ověřených CC0 samplů VSCO2CE: smyčce, žestě, další vhodné
akustické registry a bicí podle původních rolí. Dobově znějící instrumentace
je schválená remasterová volba, nikoli údajná GM identita původních FM patchů.
Žádné nové stahování či placená služba v této fázi. Licence a zdrojové SHA jsou
v runtime remaster/LICENSE,sources.json a third-party/vsco2-ce/.

26 bezeztrátových FLAC má dohromady100700490B. Normalizace odpovídá RMS
původní OPL hudby příslušného prvního cyklu; nepřidává dřívější pilotníA/B
zesílení. RMS není LUFS ani tvrzení o identické vnímané hlasitosti.
Maximální peak0.422119, bez clippingu; všechny skutečně dekódované FLAC
odpovídají přesně PCM masterům. Dva jedinečné dlouhé tóny používají sample
sustain loop (INTRO stejný také v OPENING); délky, kontinuita a frekvence
ověřeny, nejde o nový notový nástup ani subjektivní poslech.

## Smyčky a přehrávač

Jediný buffer obsahuje cold prefix a začátek prvního cyklu, pak celý steady
cyklus. Dva sdílené zdroje jsou předem naplánované na společném audio frame
joinu. Nevzniká předčasný dozvuk konce skladby na prvním začátku. Po2s jsou
first/steady přesně shodné; release+room rozdíl skončí nejpozději za0.787s.
Výsledkem je největší buffer59965360B při48kHz místo téměřdvojnásobné kopie.

OriginalAudio nechává původní OPL běžet, MUSIC mění slyšitelnou větev a zachová
pozici. Nový FLAC se načítá až na vyžádání, SHA se ověřuje před dekódováním;
zastaralé requesty se ruší a neabortovatelná dekódování jsou sériová. Jeden
aktuální remasterový buffer má limit64MiB; to není limit celé paměti prohlížeče,
HD, původních bufferů nebo dočasné dekódovací paměti. Zastaralé fade zdroje se
uvolní při pauze. Při nedostupném remasteru dál hraje originál bez zastavení hry.
Přepnutí má krátký crossfade, stop15ms gain ramp; žádné časování main-thread
intervalem pro hudební handoff. Pause suspenduje společný AudioContext.

## Ověření finální V3

Snapshot394b40bf36cd8a278e4a2d2a85638605cd22253721733fc717949911cb4d29f8,
616 runtime souborů.208 Node testů, package identity a diffcheck PASS.
Actual Chrome:26 skutečných FLAC načtení/dekódování, stejný původní OPL node,
10 app/menu/touch kontrol, HTTP503 fallback, F3/pause/restore a cache.
Nezávislý OfflineAudioContext:13 actual music cold/steady/wrap/seek případů
 a40 přesných scheduling případů při48k/44.1k, maximální chyba0. Nalezený
V2 jednovzorkový překryv kvůli floating duration opraven celočíselným frame
plánováním a sdíleným absolutním stop/start bodem, selhání zachovaná jako důkaz.

Po skutečném dokončení opening běžel HD world35 ticků/s před i během
zadrženého FLAC downloadu, žádná herní loading pauza. Původní pokus měřil
worldtick během opening meziscény, kde má záměrně stát; je označen neplatný.
Root prohlédl HD pauzu s tlačítkem MUSIC a mobilní/desktopové UI snímky.
Přes skutečný Tailscale HTTPS ověřen V3 build/module/catalog SHA, původní
default bez remaster requestů, MUSIC, přehrání Stage1 a návrat ke stejnému OPL.
Native lokální Nginx ověřil FLAC SHA/MIME a immutable cache; manifest no-cache.
Docker zde nebyl spuštěn, kontejnerový smoke je připraven pro příští release CI.

81 původních audio/core souborů byte-identických;15 efektů přes každý PCM
sample odpovídá SND.DAT. Death/magic/hit/pickup vazby staticky ověřené.
Gameplaycore a původní source/ZIP/Prehistorik změny zachované. Žádné efekty
nebyly nově složené či přegenerované. QA browsery/audio a dočasné QA servery jsou uzavřené; userpreview zůstává.

## Přiznané rozdíly a další krok

SASSA mění původní FM patch i během držené noty (tick34335/ch2 a35385/ch0).
Remaster zachová tón/časování/pressure, ale stejnou akustickou barvu; tyto dvě
události jsou explicitně uvedené v manifestu. Původní režim je přehrává přesně.
Remasterový F3 je gain gate PCM a může po zapnutí vrátit držený tón; native
OPL F3 dekey/TL zůstává nezměněný. Rolehi-hat používá krátce obálkovaný kovový
úder, nikoli tvrzený nahraný hi-hat. Akustické envelope nejsou původní FM.

Source periody jsou kvantované na48kHz; runtime na skutečný context frame grid.
Nejhorší vypočtený drift při hypotetické hodině stejné smyčky je3.771ms při48k
 a4.075ms při44.1k; hodinové hraní se neměřilo. Nejde o nekonečně bitově shodný
PIT/chip replay. Subjektivní poslech celého katalogu ani fyzický Safari/iOS test
neproběhl. Uživatel poslechem schválil Stage1 styl. Další krok je uživatelský
poslech integrované hry a případné vydání na výslovný pokyn; cluster beze změny.

Přenosné důkazy: provenance/music-remaster-v1.json. Surové zdrojové/rendrovací
skripty a reporty jsou v golden-axe-research/evidence/music-catalog-20261105/.
Přenosné browser regrese: tests/music-browser.mjs a music-handoff-offline.mjs
(GA_TEST_URL,GA_QA_OUTPUT,GA_PLAYWRIGHT_MODULE,GA_CHROME_PATH). Npm unit suite
nevyžaduje Playwright; browser testy se spouštějí samostatně v prostředí s Chrome.

## Následná oprava návratu V4
Po uživatelském hlášení ticha opravena zděděná terminalpagehide/BFCache závada.
Hudební soubory ani sampler/scheduler se nemění, změněn pouze app.js. Současný
runtime snapshot babd1a92606563ff6e36b97dbd1e4604f65708fbbad9bb636f577d4740a61548.
Podrobnosti a nové skutečné post-master PCM důkazy v audio-history-recovery.md.
