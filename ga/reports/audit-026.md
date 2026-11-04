# Integrovaný audit ga-v0.2.6

Základ ga-v0.2.5, finální snapshot
`6f5dd207fe67a5b96580bbf0b6e11f56c6fa63a49d72a9e27490b704192c3e2d`,586 runtime souborů.

## Doložené opravy

- Restart během meziscény nechával starý presenter nad novým světem. Nyní se odstraní stará scéna a příznaky nového průchodu; výslovně vybraný LEVEL start se zachová.
- Killy kuřetem, drakem, fireballem a plamenem připisují body správnému jezdci/majiteli, včetně P2 a původního16bitového přetečení.
- Combo stejného zasaženého cíle zachovává vzdálenost prvního zásahu, místo chybné změny finisheru při přiblížení cíle. Původní8bitové combo zachováno.
- Duel enemy HUD má původní limit9 bloků. HP nepřátel zůstávají stejné. Platí pro oba grafické režimy; hráčovy ukazatele mají samostatnou větev.
- Zavření audia během čekání na resume už nezpůsobuje nezachycenou chybu. Pozdní downloady nic neobnovují; worklet ukončí aktivní životní cyklus a uvolní port/RPC.
- HD evillady20/1 má skutečný zadní jezdecký pohled podle source spritu. Původní pivot, délka snímku a identity zachovány; jedno rovnoměrné měřítko, původní PNG ponecháno. Nový asset má ověřené palety9/42/44, oba směry a alfa kanál.

## Rozsah kontrol

192 Node testů PASS. Přesné původní x86 fragmenty byly spuštěny ve29 izolovaných
native případech:8 skóre,9 combo,12 Duel HUD. To není celý průchod DOS hrou.

Finální neměnný browser kandidát dokončil14 průchodů do menu: všechny3 postavy
ve všech3 režimech1P, kanonické2P všechny režimy a dvě další2P dvojice vBeginner.
171064 legálních vstupních ticků,340 world checkpointů,183 prezentačních fází
 a195 ustálených RAF vzorků; žádné page errors ani ustálený SD fallback.
Snapshot586 souborů stejný před/po každém běhu. Jde o dávkovaný legální vstup
 a skutečné prezentace, nikoli souvislé realtime klávesnicové/native DOS hraní.
Použit původní OptionsLifeMeter5; politika odmítnutí P2 Continue je zapsaná,
netvrdíme přežití obou hráčů do konce.

Další kontroly:6 restartů,7 MAP/pauza/fullscreen/P2 Continue případů,10 audio
regresí a skutečný Chrome resume-close/OPL test. HD:580 source snímků,23 world
stavů,14 RAF smyček,23 spell framů a6 opravených jezdeckých variant. Rozlišení
osobně prohlédnutých listů, automatických kontrol a nezhlédnutého videa je v
podrobném reportu. Root viděl i novou jezdeckou paletovou desku a opravený Duel HUD.

## Důkazy a otevřené části

Souhrn `provenance/ga-v0.2.6-qa.json`. Podrobnosti v `native-mechanics-026.md`,
`gameplay-audit-026.md`, `hd-animation-audit-026.md`, `audio-lifecycle-026.md`.
Výzkumné artefakty v golden-axe-research/evidence/{audit-20261104,
native-mechanics-026,full-gameplay-026,hd-animation-026,audio-lifecycle-026}/.

Globální IRQ fáze, některé pořadí zásahů/throw, původní dosažitelnost pozdní
Duel palety/loaderu a fyzický iOS/Safari/gamepad zůstávají otevřené. Tyto audity
nejsou certifikace úplné native shody. Nebyly přidány nové levely/režimy/hudba.
