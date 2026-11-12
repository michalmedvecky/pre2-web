# Hudba ve stage2 — kontrola 6.11.2026

Hlášené ticho ve druhém levelu se v izolovaném Google Chrome nepodařilo reprodukovat. Není doložena oprava příčiny výpadku. Runtime audio ani herní fyzika se v této kontrole neměnily. Root přidal do herního footeru existující stav přípravy remasteru; čekání na stažení tak nemusí působit jako ignorovaný cheat.

Přenosný regression: `tests/music-stage-transition-browser.mjs`. Výstup a screenshoty jsou v research `evidence/music-stage2-20261106/final/` (checks.json, loading-original.png, loading-hd.png). Starší diagnostické běhy jsou browser-before.json a browser-hd-before.json; finální test měří čistá časová okna.

14 případů PASS, sedm v původní grafice a sedm v HD. Host audio je ztlumené, aplikace zůstává unmuted, master gain1; PC-speaker efekty byly vypnuté. Analyser měří skutečný signál za master gain, nikoliv pouze příznak playing. V každém případě bylo všech16 oken po50ms nenulových.

| Situace | Peak SD | Peak HD |
|---|---:|---:|
| Stage1 originál | 0.133514 | 0.142059 |
| Stage1 po MUSIC | 0.131794 | 0.131794 |
| Stage2 během zadrženého stažení remasteru: originál | 0.112824 | 0.107430 |
| Stage2 remaster po bonusu a cestovní mapě | 0.082367 | 0.082367 |
| Stage2 návrat na originál pomocí MUSIC | 0.118042 | 0.112671 |
| LEVEL do stage2, originál | 0.113037 | 0.113037 |
| LEVEL do stage2, remaster | 0.082367 | 0.082367 |

MUSIC přepnul stage1 do měřitelně znějícího remasteru již při elapsed1.780s (SD), respektive1.770s (HD), tedy před první původní score EOT13.404s. Přepnutí se neváže na konec původní skladby. Při cíleně zadrženém FLAC requestu stage2 pokračoval signál originálu i herní tick; loading status byl DOM-visible, po povolení downloadu zmizel a začal remaster.

Stage1 completion byla v testu nastavena řízeným fixture, následující bonus, cestovní mapa a přechod do stage2 prošly skutečným app sequencerem. Nejde o ruční průchod boji. Není to ověření konkrétního vzdáleného embedded náhledu, fyzického Safari/iOS ani všech pozdějších levelů. Žádné subjektivní poslechové hodnocení. Hypotéza async suspend/resume při HD loadu se v těchto bězích nepotvrdila; nepřidával se spekulativní restart přehrávače.

Vlastní Chrome contexty/audio byly uzavřeny. QA server5921 se ukončil, uživatelský preview5799 zůstal běžet.
