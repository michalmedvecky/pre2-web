# Golden Axe — samostatný webový balíček

Tato složka obsahuje Golden Axe, nikoli Prehistorik2. Je umístěná v repozitáři [michalmedvecky/pre2-web](https://github.com/michalmedvecky/pre2-web/tree/main/ga); Prehistorik zatím zůstává na původním místě. `dist/` je ověřená kopie Golden runtime s odděleným build-info hookem, původním OPL/WASM/SND/FLAC a licencovaným zdrojovým kódem Nuked. Neobsahuje EXE, ZIP ani prohlížečový DOS emulátor.

Repozitář je veřejný. Golden Axe má samostatná [vydání `ga-v*`](https://github.com/michalmedvecky/pre2-web/releases), GA-only archiv a kontejnerový image; prefix `v*` jiných her nepřebírá. Zveřejnění zdrojů či vydání samo nemění běžící aplikaci.

**Pro deployera: [DEPLOYER.md](DEPLOYER.md).** Dockerfile, samostatné CI a parametrické k3s manifesty jsou připravené. Přesný release commit, CI a image digest patří ke konkrétnímu GitHub vydání. Lokální Docker není dostupný, skutečný image build/smoke provádí CI nebo deployer. Žádný cluster deployment není součástí vydání.

## Vydání ga-v0.3.0

Obsahuje volitelný hudební remaster, opravu návratu zvuku z historie prohlížeče a přehled ovládání obou hráčů přímo ve hře. Původní hudba zůstává výchozí, HD grafika je výchozí. Aktuální stav vydání určuje GitHub release, nikoli tato pracovní dokumentace. Publikační kontrola: [reports/publication-readiness-20261112.md](reports/publication-readiness-20261112.md).

Souhrn ověření a známých mezí: [reports/release-030.md](reports/release-030.md). Přesný commit a image jsou v [release ga-v0.3.0](https://github.com/michalmedvecky/pre2-web/releases/tag/ga-v0.3.0).

## Auditní opravy ga-v0.2.6

Restart meziscén, body jezdce, původní rozestup komba, Duel HUD, ukončování audia
a zadní jezdecká póza byly opraveny a cíleně ověřeny.
Souhrn: [provenance/ga-v0.2.6-qa.json](provenance/ga-v0.2.6-qa.json).

## Hudební remaster

Původní hudba zůstává výchozí. Napsáním **MUSIC** v menu nebo během hry se
přepíná původní zvuk a schválený akustický remaster. Na telefonu slouží
tlačítko **Hudba: původní / remaster** v Options a v pauze. F3 zapíná/vypíná
hudbu, F2 zvukové efekty; MUSIC vybírá její zvukovou variantu.

Zpracováno je všech 26 původních hudebních programů včetně úvodu, meziscén,
výsledků a souvislých levelových sekvencí. Nové skladby ani noty nepřibyly.
Remaster se načítá po jednotlivých skladbách a při chybě pokračuje originál.
Součást samostatného vydání ga-v0.3.0. Ověření a přesné meze:
[reports/music-remaster.md](reports/music-remaster.md).

## Ovládání

Tlačítko **Ovládání a kombinace** otevře úplný přehled v hlavním menu, Options, pauze i patičce. Ukazuje oba hráče podle aktuálních zařízení a vysvětluje původní i webové klávesy, běh, skok z běhu a kombinace útoků. Během čtení je hra pozastavená; Esc přehled zavře.

Po úvodu se přejde rovnou do menu bez hesla. P1: šipky, J útok, K skok,
L magie, **R + vlevo/vpravo běh**. P2: QWE/A·D/ZXC, S útok, Tab skok,
levý Shift magie, **F + A/D běh**. Původní dvojklep směru pro běh zůstává.
Na telefonu držte tlačítko **BĚH** současně se směrem a SKOKem.
První vysoký schod ve stage 4 vyžaduje běhový skok: R + doprava + K.
Zkratka bezpečně zahájí rozběh před skokem i při současném stisku.

Původní klávesy zůstávají: Keypad používá numerické směry, Num5 útok a Insert skok; Keyboard používá QWE/A·D/ZXC, S útok a Tab skok. Tyto dva typy lze v Options prohodit mezi hráči. Magie zůstává podle hráče: P1 pravý Shift, P2 levý Shift. Šipky/J/K/L jsou rozšíření P1 a R/F jsou webové zkratky pro běh. Nejde o nové herní schopnosti.

## Lokální spuštění a kontroly

Node24+, žádné npm závislosti ani instalace:

```sh
cd ga
node scripts/serve.mjs
# http://127.0.0.1:5790/ — ukončení Ctrl-C
```

Z druhého terminálu v této složce:

```sh
npm test
node scripts/verify-package.mjs
```

Je-li k dispozici jen Node: `node --test tests/*.test.mjs tests/mechanics-*.mjs`. Test izolace CI čte také dva workflow soubory v nadřazeném repozitáři; předejte deployerovi repo včetně `.github/workflows/publish-ga-image.yml`, ne pouze vytržený runtime. Samotná aplikace, Docker buildcontext a deploy renderer jsou samostatné uvnitř `ga/`.

- `provenance/original-runtime-manifest.json`: nedotčená původní kopie z výzkumného workspace.
- `provenance/runtime-manifest.json`: současné runtime soubory; `build.json` je záměrně vyjmut, protože se injektuje pro každé sestavení.
- `provenance/source-state.json`: původní parentHEAD, dirty stav a snapshotSHA; **původní dirty pracovní kopie není commit Golden Axe**.
- `provenance/parent-protected-files.json`: SHA39 již existujících dirty/untracked souborů a výslovně schválená jednořádková CI výjimka.
- `validation/` a `evidence/browser/checks.json`: provedené kontroly, nikoli důkaz nasazení.

Po záměrné a zkontrolované změně runtime použijte `node scripts/refresh-manifest.mjs --local-build-info`, znovu testujte a commitněte nové checksumy. CI manifest automaticky neopravuje. `/build.json` v pracovní kopii poctivě ukazuje `dirty-snapshot`, commitnull. Čistý CI image dostává skutečný plný packaging commit a původní snapshot jako samostatné pole; GitHub odkaz je ve stránce.

## Rozsah a známé meze

Core75 má75 přenesených mechanických regresí, nikoli úplný byteexact native replay. Cílené Stage4 skoky, mountedJ animace/offsety a Knightexit mají native/browser důkazy v původním výzkumu. Globální IRQ/RNG/wallclock, hit ordering a některé near-goods útoky mají známé meze; fyzický iOS/Gamepad nebyl ověřen. Uživatel samostatně hlásil dokončení hry; není to verzovaný machine/nativefullrun receipt.

Výchozí je nyní **HD remaster**, přepínatelný tlačítkem nebo cheatem `HD` na původní grafiku. Zahrnuje úvod, otáčený výběr postav, všechny mapy a jejich původní barevné varianty, postavy, bossy, předměty, kouzla, meziscény a výsledky. Také přehled `MAP` podporuje HD. Herní jádro a výchozí původní hudba zůstávají zachované. Podrobnosti a přiznané výtvarné limity: [HD remaster](reports/hd-remaster.md).

Pozdní1P Duel obsahuje **předběžnou barevnou variantu bosse podle současného portu**; její dosažitelnost/shoda s DOS originálem není ověřená. Je odděleně označená v diagnostice a UI „O této verzi“. Vydání netvrdí úplnou nativní IRQ/fyzikální ekvivalenci.

Prohlížeč potřebuje pro vzdálené OPL AudioWorklet **HTTPS** a uživatelské gesto; localhost je vývojová výjimka. Publikujte na kořeni samostatného hostu `/`, ne pod URL `/ga/`: `/ga` je cesta v Git repo; starý `/hd-pilot.html` zůstává pouze historickou referencí. Node server je pouze lokální preview, produkci obsluhuje nginx8080. Žádný nový CSP/COOP/COEP se nezavádí bez ověření Workletu.

## Licence a původ souborů

Původní herní artwork/melodie/data si zachovávají původní autorství; tento balíček jim neuděluje novou licenci. Nuked-OPL3 je LGPL-2.1-or-later, včetně plného původního C/h, licence, wrapperu a přenositelného buildreceptu v `dist/assets/audio/opl/source/`. Podrobnosti [LICENSES.md](LICENSES.md). Tajné údaje do repozitáře nepatří.

CC0 u VSCO2 Community Edition se vztahuje k použitým nástrojovým nahrávkám, nikoli k původním melodiím Golden Axe. Veřejný repozitář neznamená, že všechny jeho části mají společnou open-source licenci. Původní EXE ani ZIP se nepublikují.

Samostatné Golden Axe vydání používá tagprefix `ga-v*` a ručně přiložený GA-only archiv+SHA256SUMS po úspěšném GA CI; automatický GitHub reposourceZIP není tento balíček. Viz release postup vDEPLOYER.md.

## Verze0.1.1 — původní výběr postav

Samostatný preview [localhost5790](http://127.0.0.1:5790/) obnovuje původní scénu modré kostry a obíhajících hrdinů. Ve2P vybírají oba hráči současně na vlastních rukách; potvrzení stejného hrdiny je zakázané. Dotykové šipky/názvy/potvrzení jsou pod plátnem. VýchozíP1 Num4/Num6 aNum5 (navíc šipky/J/Enter),P2 A/D aS; Options mohou vstupní zařízení prohodit. Zahrnuto v samostatném preview vydání ga-v0.1.1; existující release ga-v0.1.0 zůstává beze změny. Skutečný releasecommit/image/CI jsou uvedené v GitHub release notes.

Důkazy a meze: [character-select report](reports/character-select.md), `evidence/character-select/checks.json`,6nových cílených presenter testů. Počáteční1P obraz souhlasí62400/62400RGBpixelů s původním DOS capture; ostatní pózy nejsou tímto jedním snímkem plošně ověřené.

## Verze0.2.0 — HD grafika výchozí

142 testů a kontrola runtime manifestu prošly; všechny šest kombinací režimu/počtu hráčů mají nové portové průchody a browser zakončení. Kontroly původního DOS runtime mají užší, výslovně popsaný rozsah. Vizuálně prohlédnutá místa jsou odlišena od automatických kontrol v [souhrnu QA](evidence/hd-release/README.md).

Balíček obsahuje196 HD atlasů,111 mapových regionů a10 dynamických dveřních stavů. Původní fonty a jedna scoring tečka zůstávají přesně zachovanou vektorovou typografií. Původní melodie a zvuky se nemění; nový hudební remaster součástí tohoto vydání není.
