# Audit kvality před ga-v0.3.0 — 12. 11. 2026

Všech šest kanonických kombinací Arcade / Beginner / The Duel × 1P / 2P
znovu došlo skutečnou aplikací až do menu. Herní jádro ani renderer se při
tomto auditu neměnily; nebyl nalezen nový příčinně doložený gameplay defekt.

## Úplné portové průchody

| Režim | 1P world ticků | 2P world ticků |
| --- | ---: | ---: |
| Arcade | 22174 | 19223 |
| Beginner | 8306 | 7923 |
| The Duel | 6606 | 1339 |

Celkem **65571 legálních vstupních ticků, 133 world checkpointů, 83 fází
meziscén a 89 ustálených RAF prezentačních vzorků**. Všech šest běhů bez page
errors a bez ustáleného SD fallbacku spritů, glyphů, mapového podkladu či
měněných buněk. Přepnutí HD / originál nezměnilo world state.

Browser použil celý neměnný hudební kandidát
`12b277f59c0d96434d3085ead1eb610652fdf0c0aa56e15c36a4961bc38de570`
(616 runtime souborů), bez přesměrování jednotlivých modulů. Před a po každém
běhu souhlasí celý runtime manifest. SHA simulation.js
`6ca2e6f98c1e97ae148aca3f21f69b4b44fa0b3bdab13465b04e2cc0a05c589e`.
Původní archivované vstupy byly přijaty pouze po přesné shodě všech čtyř
tranzitivních core modulů; každý stav se znovu vypočítal.

Jde o dávkované legální `Simulation.step(input)` vstupy a skutečný RAF/UI tok
meziscén. **Nejde o souvislé realtime klávesnicové hraní ani o nový plný běh
původního DOS EXE.** Life Meter 5 je původní volba Options. Kooperativní
záznamy zahrnují výslovně zaznamenané odmítnutí Continue P2; nejsou důkazem,
že oba hráči přežijí až do konce. Duel2P má původní dvě kola.

Nová nápověda a následná audio interrupt obnova patří do navazujícího
finálního QA, nikoli zpětně do tohoto neměnného fullrun snapshotu. Core,
renderer a jejich data zůstaly shodné; finální zdrojová identita je v hlavním
HANDOFF a release provenance.

## Hudba

Ve všech šesti bězích byl vybraný MUSIC remaster a zaznamenaný skutečný
nenulový post-master PCM signál; aplikace nebyla testovacím přepínačem
ztlumená, pouze hostitelský Chrome měl vypnutý fyzický výstup. Dalších
**97 diagnostických audio oken** ve zbývajících pěti větvích měřilo jednotlivé
vybrané tracky po rozběhnutí pouze audio clocku při zastaveném world state;
všechna byla nenulová a svět zůstal beze změny. Tato okna nejsou tvrzením,
že běžná pauza přehrává hudbu. Duel1P měl průběžný sampler bez těchto
samostatných diagnostických oken.

Dvě neplatné počáteční Duel2P QA varianty jsou uchované zvlášť: první
vyžadovala nenulový zvuk z pauzovaného audio clocku, druhá čekala na Worklet
select ACK před jeho rozběhnutím. Ani jedna neprokázala závadu hry. Správná
varianta nejprve výslovně rozběhne diagnostický audio clock, potom čeká na
připravenou skladbu. Subjektivní poslech celého katalogu nebyl proveden.

## Cílené kontroly

- Šest skutečných UI restart případů PASS: interlude, travel, dva nové úvody,
  Play again po game-over a zachování zvoleného LEVEL startu.
- Sedm MAP / pause / fullscreen / P2 Continue případů PASS. Conditional death
  fixture a cheat teleport jsou označené; nejde o legální úmrtí či nativní běh.
- Stage4: skutečné klávesy + RAF, běžný skok zůstane na nižší podlaze;
  původní dvojtap i `R + doprava + K` překonají obě plošiny. Stejně
  trojdotyk BĚH / doprava / SKOK v emulovaném portrait telefonu. HP12 se
  nezměnilo. Toto je podmíněná geometrická fixture, ne celý Stage4 ani
  fyzický telefon. Osobně prohlédnuty desktop lower a touch upper snímky.
- **18 mount případů PASS**: všichni tři hrdinové, kuře a oba typy dračího
  útoku (flag4 / flag5), oba směry. Nasednutí proběhlo původním handlerem,
  jediný attack input prošel skutečnou animací a jezdec zůstal připojený.
  54 následných HD renderů bez původních spritů/glyphů. Umístění je
  podmíněná Stage1 floor fixture s jejími paletami, nikoli důkaz barevné
  shody červeného/modrého draka v původním Stage2. Osobně prohlédnut
  Gilius s plamenem a Tyris po útoku v opačném směru.
- Osobně prohlédnut nový finální Stage8 snímek. Ostatní checkpointy jsou
  automatické; není tvrzena osobní kontrola všech snímků nebo videa.

Všechny vlastní testovací browsery byly zavřeny a vytvořené audio contexty
zrušeny. Mount render test žádné audio nevytvářel. Vlastní QA server5931 byl po finalizaci ukončen; uživatelský preview ani
rootův final5932 se neměnily.

## Závěrečný smoke finálního kandidáta

Finální HTTP kandidát
`154f24aaeaac84995675c629e4d6eab0d8d53e2a821c901865055e40bb737078`
(617 souborů) prošel následným `tests/runtime-browser.mjs`: skutečný původní
OPL/AudioWorklet, vstup bez hesla, LEVEL, oba grafické režimy beze změny
world state a mobilní build/repository/commit metadata. Bez page errors nebo
HTTP chyb. Vlastní browsery a audio byly uzavřeny, server5932 ponechán rootovi.

Všech šest core/renderer/input modulů bylo navíc staženo z finálního HTTP
serveru a porovnáno bajt po bajtu s fullrun snapshotem. Úplné manifesty se
liší pouze index.html, app.js, audio.js, novým controls-help.js a style.css;
herní data ani artwork se nezměnily. Důkazy `final-smoke/checks.json` a
`final-core-bridge.json` patří do výzkumné složky tohoto auditu. Cílené QA
nápovědy/interrupt helperu dodali jejich vlastníci; nejsou nahrazované tímto
krátkým smoke testem.

## Přenosný CI test

`tests/full-mode-replays.test.mjs` nyní spouští všech šest world průchodů
přímo v běžném `npm test` (samostatně přibližně 0.62s). Fixture
`tests/fixtures/full-mode-replays.json` má 500KB, obsahuje bezeztrátové
true/present bitmasky původních booleovských vstupů, source archive SHA256,
core SHA256, volby, přesné stage boundary a koncové HP/lives/potions/skóre/
úmrtí/eliminaci. Neobsahuje EXE ani změny RNG, HP, pozic či kolizí.

Těchto šest testů dokládá world integraci a zakončovací handoff, nikoli
browser meziscény nebo native DOS shodu. Převod bitmasek byl pro každý
původní vstup ověřen strukturálním roundtripem včetně absent vs false.

## Důkazy a zbylé meze

Výzkumné reprodukce:
`golden-axe-research/evidence/quality-027/{summary.json,freeze.json,fullruns/,restart/,ui/,stage4/,mounts/}`.
Původní neplatné QA pokusy jsou pod `duel-2p-invalid-*`, ne v PASS souhrnu.

Zůstává neověřená globální nativní IRQ/RNG/wallclock shoda, některé pořadí
zásahů/throw/tether a dřívější mounted phase rozdíly. Pozdní Duel palette/
loader dosažitelnost není nově potvrzená DOS runtime; portový průchod ji
sám nepotvrzuje. Neproběhl test fyzického Safari/iOS nebo gamepadu. Žádná
nová grafika, skladby, levely, kreativní režimy ani deployment tímto auditem
nevznikly. Dokonalá či úplná native ekvivalence se netvrdí.
