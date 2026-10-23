# ORAVA — připravené sprity, verze 1

Grafické podklady podle schváleného návrhu. Zdrojová sada schválená pro [integraci do hry od verze 1.6.0](../orava-game-v1/README.md). Samostatný náhled níže zůstává oddělený od hry.

- `hero.png`: 16 snímků — čekání, čtyři fáze běhu, výskok, pád, přikrčení, tři fáze útoku, zásah, dopad, porážka a radost.
- `dog.png`: 12 snímků — čekání, čtyři fáze klusu, dvě fáze běhu, skok, pád, sednutí a radost.
- `effects.png`: 12 snímků — čtyři natočení hvězdičky, čtyři fáze zásahu, dva samostatné páry zvonků, zvuková vlna a jiskry.
- `food.png`: talíř bryndzových halušek pro bonusový objekt, bryndzové pirohy místo sbíraného burgeru a oravská slanina místo donutu. Jde o návrh náhrad pro režim ORAVA.
- `bells.wav`: připravené syntetické cinknutí dvou různě naladěných kovových zvonků, 44,1 kHz / 16 bit / mono, 2,4 s. Nejde o nahrávku skutečného nástroje.
- `preview.html`: samostatný animovaný náhled; SPACE nebo tlačítko zazvoní a vypustí hvězdičku. Zvuk se spustí při druhém snímku útoku, současně s hvězdičkou. Náhled používá HRTF prostorové umístění mono zdroje podle místa postavy a krátký stereofonní dozvuk; pro vjem směru jsou vhodná sluchátka. Samotný WAV zůstává mono pro budoucí umístění do prostoru. Lze přepnout běh, čekání, skok a zrcadlení.
- `manifest.json`: přesné výřezy snímků, pivoty, navržené měřítko, animace, rychlosti a časování zvuku / projektilu.

## Použití

Otevřete `preview.html` v browseru, nebo v této složce spusťte obyčejný statický server. V aktuální pracovní relaci běží náhled na http://127.0.0.1:5780/preview.html.

Postavy jsou kreslené doprava; doleva se zrcadlí. PNG obsahují skutečný alfa kanál. Atlas vznikl generováním, proto jeho buňky nejsou přesně stejně velké: pro použití berte **rect z manifestu**, nikoli dělení obrázku na matematicky pravidelnou mřížku. Obrázky se po generování nepřemalovávaly ani nepřevzorkovávaly. Výřezy respektují viditelný obsah; velmi slabé okraje pod alfa 8 nejsou součástí těsného obdélníku. Pivot postav je navržený uprostřed spodní hrany výřezu, efektů uprostřed. Před finálním zapojením může následovat ruční doladění pivotů a rytmu animací při skutečném pohybu.

Navržená výška stojícího hrdiny je 36 herních jednotek, pejska 20. Měřítko se nemění snímek od snímku, takže se přikrčení nezvětšuje na výšku stojící postavy. V útoku jsou zvonky už součástí hrdinova obrázku; samostatné zvonky v archu efektů jsou doplňkové podklady, nekreslí se přes ně podruhé.

`inspection.json` ověřuje rozměry, průhlednost a nulový počet výrazných pixelů (alfa ≥ 32) na zvolených hranicích mezi snímky. `preview-check.json` zaznamenává ověření 43 náhledů, útoku se zvukem a přepnutí směru. Jde o kontrolu podkladů, nikoli o test integrace do hry.

## Vznik grafiky

Použit byl vestavěný nástroj **image_gen**. Referencí byl schválený koncept ORAVA z této konverzace. Zadání a seznamy póz jsou v `prompts/brief.md`; druhý průchod efektů omezil záři a oddělil zvonky od výstřelu. Sprity jsou první připravená sada pro posouzení animací, ne automaticky zaměnitelný původní atlas hry.
