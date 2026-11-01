# Golden Axe — HD HANDOFF (1. 11. 2026)

## Výsledek a spuštění
HD grafika celé současné hry je připravená v `../web/ga`, lokálně http://127.0.0.1:5790/. HD je výchozí; tlačítko/cheat HD přepíná původní grafiku bez změny světa. Zahrnuje úvod, otáčený výběr postav, všechny mapy, postavy, bossy, předměty, kouzla, meziscény, výsledky, titulní credits a HD přehled MAP. Původní hudba zůstává výchozí; nová hudba ani MUSIC remaster se nevytvářely.

## Grafická sada a provenance
- 580 malovaných source frame záznamů + přesná vektorová scoring tečka; 72 původních fontových znaků zachováno vektorově. Typografie se nevydává za malovaný artwork.
- 13 základních map, 8 původních paletových variant, 10 dynamických stavů dveří. Aktuální manifest `8809f332d4983bf54cba025cd1627f14462dfc893aa601e8791c0ac094d725d3`: 196 atlasů/111 mapových regionů. Validace SHA, rozměrů, source metadata a coverage union PASS.
- RAW malby a přesné prompty v `hd-remaster/art/` a `hd-remaster/prompts/`. Nový schválený styl vznikl přes image_gen; starý Spark styl byl odmítnut a není použit. Paletové odvození upravuje barvy skutečných maleb, nikoli původní pixelové obrázky vydávané za HD.
- Rigidní registrace respektuje původní pivoty/časování, alfa, oddělení snímků a švihové stopy. Při opravách nebyly deformovány části těl ani kopírována původní alfa přes novou kresbu.

## Ověření
- Nové běžnými vstupy řízené průchody Arcade/Beginner/Duel × 1P/2P dokončeny v současném portu i skutečné aplikaci. Nejde o plný nativní DOS průchod nebo souvislý ruční keyboard test.
- Osobně zkontrolovány Gilius, 136 akčních slotů/350 snímků dalších bank, 31 kontaktů a sestavená kouzla; titul, výběr, meziscény, výsledky a credits mají samostatné skutečné browser kontroly. Rozsah osobních prohlídek je odlišen od automatického počítání snímků v `hd-remaster/qa/`.
- Všech 8 mapových barevných kontextů osobně prohlédnuto; 3 materiálové chyby opraveny. 21 dotčených skutečných pozdních/bonusových snapshotů má HD mapu bez pixelového propadu. Dva studené sprite převody se ustálily do 15sekundového testovacího limitu, obvykle po 1,5–2,3 s dodatečného čekání.
- Cache 16 atlasů má nezměněný limit 64 MiB; konkrétní dřívější přehazování viditelné mapy odstraněno a regresně ověřeno. Další paletová cache je omezena 16 MiB.
- HD MAP přehled používá 2× světové rozlišení, přesné world click/tap souřadnice a dynamické dveře; 5 testů + desktop/mobile browser PASS. Původní přehled zůstává dostupný.
- Chromium portrait/landscape, fullscreen a touch P1 ověřeny pro 1P/2P. Druhý hráč potřebuje klávesnici/controller; fyzický telefon a Safari/WebKit nebyly otestovány.
- Finální testy a identita sestavení: viz `hd-remaster/qa/fullgame/README.md` a `final-checks.json`; finální aktuální běh **142/142 PASS**, verify PASS. Snapshot `80dd4aee69233a1c3c4480dfe690c8017b991299d830888ba01d322dc01f1b3f`,372 runtime souborů.

## Podstatná nejistota původního Duelu
V pozdním Duelu současný port aplikuje PAL0 z reload průchodu tabulkou, která v původním modulu obsahuje počty 32/36 a neplatné SPR názvy. Statika doložila DOS file-error retry, skutečné inicializované RAM dumpy potvrdily počty 32/36 v menu/Beginner flow. Reálný Duel mode3 a úspěšný finální nativní reload13/14 se v omezených probech nepodařilo potvrdit. Nesmí se z toho tvrdit ani prokázaná nativní PAL0, ani prokázaný kompletní Duel bug. Důkazy: `qa/death-duel-palette-static-review.md`, `evidence/native-duel-palette/`.

HD barvy těchto dvou pozorovaných bossových stavů jsou proto oddělený SHA-vázaný kontext **runtime-observed / provisional / nativeReachabilityVerified:false** v `hd-observed-death-context.js`. Přesně odpovídají současnému původnímu renderovacímu režimu, nemění simulaci ani neodhadují nové barvy. Oba skutečné snapshoty4534/5126 osobně source/HD ověřeny, bez fallbacku a změny světa. Poznámka je také v UI „O této verzi“. Původní native registry37/983 se tím nerozšířila a nejistota se nevydává za opravenou fyziku nebo ověřenou DOS věrnost.

## Známé limity
Dva úzké paletové případy rytíře používají přiznanou většinovou aproximaci. Jeden ohnivý efekt má spodní část asi o7 původních pixelů kratší; jeden obláček drobný dotyk okraje. Drobné runové znaky na mapě jsou výtvarně interpretované. Některé ohnivé detaily si zachovávají blokovější původní siluetu. Neexistuje runtime writer průběžného livePalette fade; neznámý takový stav by poctivě použil originál. Úplná DOS IRQ/fyzikální ekvivalence zůstává samostatně neprokázaná (`verifiedCompleteGame:false`).

## Integrita a provoz
39 chráněných Pre2 souborů,91 originálních source,91 runtime kopií,2 ZIPy a4 core GA/source moduly shodné: `qa/final-source-integrity.json`. Původní fyzika/kolize/audio nebyly HD prací změněny. Žádný nový commit, push, release ani nasazení; poslední vydaný release je ga-v0.1.1. Vlastní prohlížeče, zvuk, debugger a bridge uzavřeny; uživatelský server5790 ponechán. Podrobnější technický handoff: `hd-remaster/HANDOFF.md`.


## Release0.2.0
Tento souhrn zachycuje ověřený HD snapshot. Relativní výzkumné cesty odkazují na původní místní evidence; přenositelný souhrn a strojové výsledky jsou v `ga/evidence/hd-release/`. Skutečný release commit a image digest uvádí GitHub release.
