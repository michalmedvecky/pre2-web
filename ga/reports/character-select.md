# Původní výběr postav a2P

Feature batch pro samostatné preview vydání `ga-v0.1.1`. Gameplay core75 se nezměnil, historický `ga-v0.1.0` se nepřepisuje. Konkrétní vydaný commit/image/úspěšný CI jsou v GitHub release notes; žádný clusterdeploy není součástí tohoto vydání.

## Obnovené chování

Původní MAPC s modrou kostrou a červeným SELECT PLAYER zůstává celé viditelné. Hrdinové SELECT1/2/3 obíhají ruce podle původních120polohových tabulek; nejedná se o nové sprity nebo nově vytvořenou animaci kostry. Kód a data přeneseny z AXE3a48/3c10/3cc2/3ced/3d98/3df4/3e35, modul SHA uvedený v `character-select-data.js`.

Výběr má původní zastávky20/60/100 a krok±2. Směr za pohybu lze obrátit; potvrzení funguje pouze v zastavené poloze. Ve2P má každý vlastní trojici, ruku a nezávislé vstupy, oba vybírají současně. Stejného hrdinu nelze potvrdit oběma hráčům, při kolizi má původní pořadí zpracováníP1 předP2. Hra začne až po potvrzení obou a dalším původním presentation update. Předchozí nucený sekvenční webový výběr je nahrazen.

Klávesové vstupy používají stejný Input/Options device sampler jako hra. VýchozíP1: Num4/Num6, Num5 potvrzení; navíc webové šipky/J/Enter. P2 Keyboard: A/D, S potvrzení. Options mohou logická zařízení hráčům prohodit. Přístupné názvy, šipky a potvrzení pod plátnem poskytují dotykovou alternativu; klik na jméno spouští stejnou rotační cestu, nepřeskakuje fázi. Dotyk neznamená dvě fyzické klávesnice ani síťový multiplayer.

## Ověření a meze

`evidence/character-select/checks.json`: actualRAF Chromium1P šipka→rotace→Tyris→J,2P nezávislý výběr/odmítnutí duplicity/P2 dotyková rotace a start skutečných dvou herních actorů,390px mobile touch startHero+Dwarf. Nula pageerrors. Snímky1Pinitial/rotating a2Pinitial/choice/mobile osobně prohlédnuty. Testovací browser/AudioContext zavřeny. Samostatný localhost5790 preview podle pokynu ponechán; původní5788 nedotčen.

`native-pixel-comparison.json`: jedna původní počáteční1P poloha phase20 je přesně62400/62400RGBpixelů shodná s existujícím skutečným DOS `axe_003.png` po nejbližším zmenšení2×, oblast312×200. To nedokazuje všechny mezifáze, nový nativní2P průchod ani přesnou globální IRQ/wallclock synchronizaci. Browser mobile emulace není fyzický iOS/Gamepad test. Gameplay fyzika se neměnila, nebyl opakován celý herní průchod.

Cílené unit testy6/6 presenter +5/5 build identity PASS (`unit-tests.txt`). Nezávislý read-only review vlastníka původního presenteru ověřil device sampler1P→2P, nextstep confirmation, P1Enter alias a audioevent drain bez nalezeného blockeru; oba GA moduly jsou bajtově shodné s exportovanými research moduly. Full gameplay testy se kvůli čistě prezentační změně neopakovaly. Aktuální finální metadata a checksum snapshot v `final-checks.json`.
