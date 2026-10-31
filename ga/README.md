# Golden Axe — samostatný webový balíček

Tato složka obsahuje Golden Axe, nikoli Prehistorik2. Je umístěná v repozitáři [michalmedvecky/pre2-web](https://github.com/michalmedvecky/pre2-web/tree/main/ga); Prehistorik zatím zůstává na původním místě. `dist/` je ověřená kopie Golden runtime s odděleným build-info hookem, původním OPL/WASM/SND/FLAC a licencovaným zdrojovým kódem Nuked. Neobsahuje EXE, ZIP ani prohlížečový DOS emulátor.

**Pro deployera: [DEPLOYER.md](DEPLOYER.md).** Připravené jsou Dockerfile, samostatné CI a parametrické k3s manifesty. Při původní přípravě nic nebylo commitnuto, pushnuto ani publikováno; skutečný release commit/CI/image digest je uvedený v samostatném GitHub vydání `ga-v*`. Lokální Docker není dostupný, image build/smoke provádí CI nebo deployer. Žádný cluster deployment není součástí vydání.

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

Výchozí grafika je původní. HD je pouze pauzovaný **preview**; starý pilot neprošel geometry/alpha gate a nikdy nenahrazuje live sprite/terrain. Další důsledný HD remaster běží odděleně; výzkumné `golden-axe-research/hd-lab/`, `reports/hd-material-pilot.md` a `HANDOFF-HD.md` nejsou deployment dependencies ani schválená hotová HD hra. Nepřidávejte je do image narychlo.

Prohlížeč potřebuje pro vzdálené OPL AudioWorklet **HTTPS** a uživatelské gesto; localhost je vývojová výjimka. Publikujte na kořeni samostatného hostu `/`, ne pod URL `/ga/`: `/ga` je cesta v Git repo a HDiframe používá `/hd-pilot.html`. Node server je pouze lokální preview, produkci obsluhuje nginx8080. Žádný nový CSP/COOP/COEP se nezavádí bez ověření Worklet/iframe.

## Licence

Původní herní artwork/melodie/data si zachovávají původní autorství; tento balíček jim neuděluje novou licenci. Nuked-OPL3 je LGPL-2.1-or-later, včetně plného původního C/h, licence, wrapperu a přenositelného buildreceptu v `dist/assets/audio/opl/source/`. Podrobnosti [LICENSES.md](LICENSES.md). Tajné údaje do repozitáře nepatří.

Samostatné Golden Axe vydání používá tagprefix `ga-v*` a ručně přiložený GA-only archiv+SHA256SUMS po úspěšném GA CI; automatický GitHub reposourceZIP není tento balíček. Viz release postup vDEPLOYER.md.

## Verze0.1.1 — původní výběr postav

Samostatný preview [localhost5790](http://127.0.0.1:5790/) obnovuje původní scénu modré kostry a obíhajících hrdinů. Ve2P vybírají oba hráči současně na vlastních rukách; potvrzení stejného hrdiny je zakázané. Dotykové šipky/názvy/potvrzení jsou pod plátnem. VýchozíP1 Num4/Num6 aNum5 (navíc šipky/J/Enter),P2 A/D aS; Options mohou vstupní zařízení prohodit. Zahrnuto v samostatném preview vydání ga-v0.1.1; existující release ga-v0.1.0 zůstává beze změny. Skutečný releasecommit/image/CI jsou uvedené v GitHub release notes.

Důkazy a meze: [character-select report](reports/character-select.md), `evidence/character-select/checks.json`,6nových cílených presenter testů. Počáteční1P obraz souhlasí62400/62400RGBpixelů s původním DOS capture; ostatní pózy nejsou tímto jedním snímkem plošně ověřené.
