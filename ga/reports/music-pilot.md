# Golden Axe — první hudební pilot

Stav: jedna ukázka ke schválení, bez změny produkčního runtime.
Základ je vydaný ga-v0.2.6, commit948a63da647628a25fe3fed8cd6fc49d6e540a9c.

## Poslech

[Soukromé A/B srovnání](https://michals-macbook-pro.quagga-bee.ts.net/music-pilot/)
přepíná oba zvuky na společné časové ose. Začíná až po kliknutí; podporuje
pauzu, posun, restart a dotykové ovládání. Náhled závisí na běžícím Macu/Tailscale.
42 sekund hudby první úrovně a3 sekundy analytického dozvuku. Původní hudba
zůstává ve hře výchozí; cheat MUSIC se doplní až po schválení a zpracování katalogu.

## Věrnost a zvukový návrh

Všech8640 semantic událostí celé Stage1 souhlasí s uloženým původním native
záznamem, všech3504 not ověřil nezávislý dekodér. Aktuální GoldVoice má
16111/16111 shodných register zápisů. Tento krok znovu nespouštěl DOS hru.
Pilot obsahuje999 původních notových nástupů na osmi hlasech, bez nových not
či doprovodů. Absolutní nástupy a konce jsou zaokrouhlené na48kHz sample grid
s chybou nejvýše poloviny vzorku.

Akustická instrumentace je návrh: housle, horn, smyčce, cello, trumpeta a bicí.
Není tvrzeno, že původní OPL patche nesou identitu těchto akustických nástrojů.
Zachována melodická MIDI výška a relativní změny tónů bicích; absolutní zvuk
akustických bicích a jejich základní ladění je redakční volba. Nativní rytmické
hlasy jsou zachované. Tón ve vysokém registru bass kanálu používá smyčcovou
sekci, aby nedošel cello sample před koncem noty. Původní FM envelope/patch
změny nejsou identicky napodobené akustickými samply.

Obě45s varianty jsou48kHz/16bit stereo WAV. Reference je persistentní původní
GoldSequence/Nuked; prvních2016000 mono PCM vzorků před A/B gainem se shoduje
s původním REG renderem. Ve42s je analytický note-off a3s release, nikoli
původní závěr celé skladby. A/B přidává pouze konstantní gain a poslední400ms
fade; obsahové RMS je přibližně0.12 pro obě varianty. RMS není vnímaná hlasitost
ani LUFS. Peak0.696/0.669, žádný clipping. Suchý mix a osm stop zachované.

## Nástroje, licence a kontrola

Exponovaný Runway hudební nástroj nabízí textové zadání, nikoli přesné notové
řízení/MIDI vstup. Nebyl spuštěn. Použit místní NumPy sampler a21 ověřených
CC0 samplů VSCO2CE z pinu440300901dfe9275fd84e0b7763af1f8443ae62e.
Nový13souborový subset10 672 244B, z něj9 souborů použito; ostatní samply již
existovaly místně. Náklady0. URL, licence a SHA v render/review podkladech.
WAV i menší bezeztrátové FLAC jsou uložené mimo produkční assets.

Nezávislý audit ověřil999 not,21 zdrojových samplů, osm nenulových stop,
součet suchého mixu, room reflections, normalizaci a skutečné výstupní PCM.
Browser:12 cílených kontrol v Chrome desktop a emulovaném dotyku390px,
bez page errors. Root osobně prohlédl desktop/mobile snímky. Skutečný HTTPS
Tailscale přenos stránky/manifestu/playeru shodný. QA browsery/zvuk zavřeny.
Neproběhl subjektivní poslech ani test fyzického telefonu/Safari.

Všech15 původních efektů byte/sample přesně odpovídá SND.DAT; death/magic/hit/
pickup vazby ověřeny staticky. Efekty nebyly remasterovány ani změněny.

Důkazy: provenance/music-pilot-v1.json. Úplné reprodukční skripty, surové
reference, noty, samply, stopy a reporty jsou v pracovním adresáři
`golden-axe-research/evidence/music-pilot-20261104/{score,render,review,preview}/`.
Další krok: schválení zvukového stylu uživatelem, poté katalog ostatních skladeb
s jednotlivými instrumentálními/rytmickými variantami a integrace MUSIC.

## Oprava dostupnosti 5.11.2026
Původní server skončil s relací a vracel502. Náhled nyní spravuje samostatný
launchd job z veřejné pracovní kopie `/private/tmp/ga-music-preview-501`.
Je nezávislý na chatu, vyžaduje běžící přihlášený Mac a Tailscale. Po restartu
Macu se musí znovu spustit. Resume AudioContext je přímo v uživatelském gestu
před načítáním podle [Web Audio best practices](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices).
Chrome ověřil gesture-backed resume ještě před uvolněním zadržených WAV
requestů a následné skutečné HTTPS přehrávání. Fyzický Safari test neproběhl.
