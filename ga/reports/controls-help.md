# Přehled ovládání a bojových kombinací

Přidán český přehled dostupný přímo z hlavního menu, Options, pauzy a patičky.
Oba hráči mají vlastní kartu; pohyb/útok/skok se řídí právě vybraným logickým
zařízením v Options. Magie a zkratka běhu jsou vázány na hráče, nikoli zařízení.
Při prohození Keypad/Keyboard se proto nemohou prohodit pravý/levý Shift ani R/F.
V režimu jednoho hráče je karta P2 výslovně označena pro hru dvou hráčů.

Popsány jsou původní dvojstisk pro běh, webová zkratka R/F, skok z běhu,
útok z běhu, současný útok+skok, útok ve vzduchu a série/zblízka. Příklady
kláves jsou výslovně označené jako výchozí P1 Keypad/P2 Keyboard; obecné názvy
ÚTOK/SKOK platí i pro jiná zařízení. Přehled dále vysvětluje dotyk, pauzu,
F2/F3, hudební edice a cheaty. Nepřidává žádnou bojovou mechaniku.

Autorita: původní `goldaxe.doc` (Special Moves), aktuální `input.js`,
`legacy-controls-data.js`, `simulation.js` control/controlRider a existující
native zprávy runtime-mechanics, legacy-controls a stage4-run-shortcut.
Myš popisuje skutečný native program (levé útok, pravé skok), přednostně před
rozporuplným textem původního návodu. Pozemní komba se nevydávají za jezdecká.
Nové spouštění původního EXE v tomto úkolu nebylo provedeno.

Native HTML dialog je uvnitř fullscreen kořene. Dlouhý obsah má vlastní scroll,
zavírání zůstává viditelné, Tab/Shift+Tab udržuje focus v dialogu a Esc zavře
jen nápovědu. Hra, character selection i sound-test tick jsou během otevření
pozastavené; vstupy/cheaty nemohou protéct do hry. Původní pauza se zachová.
Po zavření z rozehrané hry focus přejde na canvas a pohyb znovu funguje;
při návratu do pauzy/menu zůstane u původního tlačítka. Cached návrat respektuje
bezpečnou pauzu a samostatné obnovení audia. Skutečný discard dialog uklidí.

## Ověření 12. 11. 2026

- `tests/controls-help.test.mjs`: **3/3 PASS**. Zahrnuje prohození zařízení při
  zachování player-dependent magie/běhu, WASD pouze v povolené 1P větvi,
  správná tlačítka myši a absenci nefunkčních J/K aliasů u fyzických zařízení.
- `tests/controls-help-browser.mjs`: **11/11 PASS**, skutečný Chrome se ztlumeným
  hostitelským výstupem, bez nové browser dependency. Výchozí menu, 2P device
  swap, myš, zmrazení ticku a AudioContextu, blokace pohybu/cheatů/F2–F4,
  Tab focus, Esc→skutečný ArrowRight pohyb, zachování původní pauzy,
  nativní fullscreen, explicitní cached lifecycle fixture→Pokračovat,
  zmrazení výběru postav a dotykové 390×844 i 844×390.
- Desktop a oba dotykové screenshoty byly osobně prohlédnuté; text je čitelný,
  dialog a minimálně44px zavírací tlačítko uvnitř viewportu, dlouhý obsah
  scrollovatelný. Safe-area insety jsou zohledněné v CSS. Nejde o fyzický iPhone,
  Safari ani o test skutečné obrazovkové čtečky či reálného gamepadu.
- Mezi uloženými nefinálními důkazy jsou dvě chybné setup čekací podmínky
  (pending track/menu cursor), chybné načtení globálu před ready a reprodukce
  před doplněním focus cyklu. Finální `checks.json` obsahuje jen konečný PASS;
  původní negativní doklady nebyly přepsány za úspěchy.

Raw důkazy:
`golden-axe-research/evidence/controls-help-20261112/{checks.json,desktop-default.png,touch-390.png,touch-844.png}`.
Browser test používá GA_TEST_URL, GA_QA_OUTPUT, GA_PLAYWRIGHT_MODULE a GA_CHROME_PATH.
Všechny vlastní browsery/audio byly po testu uzavřeny. Lokální QA server5925
byl ukončen; uživatelský náhled5799 agent neměnil. Runtime checksumy a vydání
finalizuje řídící agent.
