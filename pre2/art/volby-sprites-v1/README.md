# VOLBY — lokální sada spritů v1

Lokálně zapojený cheat **VOLBY**. Napište jej během hry nebo zvolte **VOLBY characters** v pauze; opakováním se vrátí původní postavy. Při prvním zapnutí se načtou čtyři průhledné archy. Defaultně je režim vypnutý a volba platí do obnovení stránky. Přechody mezi levely a restart jej zachovávají. ORAVA a VOLBY se vzájemně přepínají; MUSIC lze s VOLBY kombinovat.

- `hero.png`: 16 póz schváleného prehistorika — čekání, běh, skok, pád, přikrčení, útok do strany, dolů i nahoru, zásah a komická porážka.
- `hero-unarmed.png`: 16 stejných póz bez kyje pro kladivo, tomahawk, dvojitou sekeru a závěsný kluzák. Zbraně a kluzák kreslí původní herní systém.
- `bear-replacement.png`: 8 póz lidské karikatury podle druhé fotografie místo medvěda — čekání, chůze, nápřah, výpad, zásah a komická porážka.
- `tiger-replacement.png`: 8 póz čtyřnohé tygří kočky s tváří inspirovanou třetí fotografií — čekání, tři fáze chůze, příprava výpadu, skok vpřed, zásah a komická porážka. Kočičí tělo, tlapky, uši, ocas a tygří pruhy; bez lidského těla a oblečení. Opraveno podle upřesnění uživatele.
- `manifest.json`: pojmenované výřezy, pivoty, konstantní měřítko a návrhy animací. Doleva se zrcadlí.
- `inspection.json`: kontrola skutečného alfa kanálu a prázdných dělicích čar.
- `prompts.json`: přesná zadání; grafiku vytvořil vestavěný image_gen.
- `inspect.py`: opakovatelná kontrola a tvorba metadat, obrázky nepřepisuje.

Grafika je zapojená přes `dist/js/volby.js` a vykreslovač, původní atlas a simulace zůstávají zdrojem kolizí, zásahů, pohybu a bodování. Náhrada medvěda je člověk; jeho vylézání ze země odhaluje postavu postupně výřezem. Tygří micinka nahrazuje kočkovitou šelmu pouze v prvním levelu a respektuje původní obtížnost — zde se tygr objevuje v **EXPERT**. Běžné příšery se nemění. Smrt protivníka vybírá komickou porážku. Fotografie sloužily pouze jako reference vzhledu.

Náhledy ze hry a záznam browser testu jsou v `review/`. V Chromiu byly ověřeny oba grafické režimy, originální zbraně, porážka medvěda, přepínání ORAVA/VOLBY, změna levelu, výchozí vypnutí i mobilní pauza a úder dolů do skutečného bonusu pod semaforem. Testovací prohlížeče se zavírají v `finally`; hra při testech zůstala ztlumená. Místní WebKit se zavřel už při vytvoření prázdné stránky, takže kontrola Safari/WebKit nebyla dokončena. PNG mají skutečnou průhlednost, jejich obrazové pixely nebyly po generování upravovány. Druhý generativní průchod rozvolnil mezery a opravil úder dolů. Kontrola potvrdila nulový počet výrazných pixelů na zvolených dělicích čarách všech čtyř archů. Výřezy berte z manifestu, nikoli z odhadnuté pravidelné mřížky.
