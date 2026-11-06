# Podklady a původ dat

Průzkum proběhl 5.–6. listopadu 2026. Texty jsou vlastní shrnutí; původní program ani celý obraz paměti nejsou součástí tohoto webového projektu.

## Primární zdroje

- [Uživatelem zadaný archiv VBG](https://pmd85.borik.net/?action=download&did=8) obsahuje celou sbírku her, včetně FLAPPY+4. [Seznam obsahu balíčku](https://pmd85.borik.net/wiki/Package:Games_VBG.zip).
- [Flappy na PMD 85 Infoserveru](https://pmd85.borik.net/wiki/Flappy): autorství, verze, cíl hry a odkazy na mapy a hesla.
- [Mapa všech 200 původních místností](https://pmd85.borik.net/?action=gc&type=map&gcid=6), Karel Ondráček / Solaris104, 2011: vizuální kontrola sektoru 9.
- [Původní hesla](https://pmd85.borik.net/?action=gc&type=pwd&gcid=15): heslo DROPS patří sektorům 006–010.
- [Specifikace PTP](https://pmd85.borik.net/wiki/PTP): posloupnost bloků s dvoubajtovou délkou a struktura hlavičky.
- [Autorský rozbor FLAPPY2k](https://www.pmd85.cz/?page_id=965): doplňující informace o pohybu, půlbuňkách a časování. Tento pozdější remaster některá pravidla a mapy mění; jeho mapy zde použity nejsou.

## Reprodukce extrakce

1. Z uvedeného archivu rozbalte `games-vbg.ptp`. Projděte pásku podle specifikace PTP: dvoubajtová délka v pořadí little endian, poté příslušný počet bajtů. Bloky číslujte od nuly.
2. Blok 6 má hlavičku `FLAPPY+4`, blok 7 je zavaděč, blok 8 úvodní obrazovka a blok 9 herní data. Obsah bloku 9 zahrnuje čtyři segmenty s úvodní značkou `00 56` a dvěma závěrečnými kontrolními bajty.
3. Následující řezy obsahu bloku 9 obnoví příslušné oblasti paměti. Offset i délka jsou hexadecimální; kontrolní bajty se nekopírují.

| Offset dat v bloku 9 | Cílová adresa | Délka |
| --- | --- | --- |
| 0002 | 0000 | 2000 |
| 2006 | 2000 | 2000 |
| 400A | 4000 | 2B00 |
| 6B0E | 6C00 | 0400 |

4. Z adresy `2000h` čtěte 200 záznamů po 96 bajtech. První bajt obsahuje pořadí úrovně; kontrola potvrdila posloupnost 1–200. Sektor 9 začíná na `2300h`.

| Offset v záznamu | Obsah |
| --- | --- |
| 0 | Číslo úrovně |
| 1–50 | Deset řádků zdiva, každý 40 bitů, nejvyšší bit první |
| 51–52 | Adresa světlého vejce |
| 53–54 | Adresa cílové podložky |
| Od 55 | Čtyři seznamy adres: kameny, duchové, žáby, houbičky; každý končí dvojicí nul |

Adresy objektů používají pořadí big endian. Pro adresu `a` je souřadnice vůči levému okraji pole `x = ((a & 63) − 2) × 6`, `y = floor((a − C000h) / 64) − 48`. Jeden bit zdiva pokrývá 6 × 18 pixelů. Pohyblivé objekty mají 12 × 18 pixelů a půlkroky 6 × 9 pixelů. Podložka leží pod požadovanou polohou vejce; v sektoru 9 je na `(198,180)` a vejce má skončit na `(198,162)`.

Původní data jsou zachována i v neobvyklých případech: 17 úrovní obsahuje zdivo o šířce půlbuňky a jedna houbička v sektoru 91 má nepravidelnou výšku. Přesné masky a souřadnice ukládá `dist/levels.json`; pomocné celé dlaždice neurčují kolize.

## Sprity a pravidla

Sprity se čtou po svislých sloupcích ukončených `FFh`. Nízkých šest bitů tvoří obraz, bit 0 je vlevo. Hlavní objekty mají dva sloupce; houbička a cihla jeden. Základní adresy: vejce `0132h`, kámen `0158h`, podložka `017Eh`, houbička `0192h`, hráč `0233h/0259h/027Fh/02A5h`, duch `041Fh`, cihla `0529h`, žába `05A7h`. Výsledek je v `dist/sprites.json`.

Statická kontrola původního kódu potvrdila pět počátečních životů (`1635h–1643h`), obnovení časového počítadla 1500 (`0619h`), pohyb a střelbu (`1721h–1B78h`), gravitaci a smrt při kontaktu s padajícím objektem (`080Ch–0A02h`) a rozpad tmavého kamene (`1775h`, `17BFh`). Také ukazuje místní přibližování žab a duchů; nový webový kód tyto principy znovu implementuje. Nejde o důkaz úplné shody běhu ani o přímé spouštění původního programu.

## Kontrolní součty získaných vstupů

SHA-256 staženého archivu:

```text
c7189dc20739f2fc35b737fca5f078212cc0f051755070ad3cb99a816a2a7e45
```

SHA-256 jeho `games-vbg.ptp`:

```text
1d7884b3da76f610ef2ab5dcedead68ccdde8ca6d0f5eef2a2cd64ab5cfbeec5
```

Autory originálu jsou Shoichi Shibata a Kazuyuki Okuyama; port pro PMD 85 vytvořili Vlastimil Veselý, Libor Bedrlík a Ladislav Gavar / VBG Software. Webové zpracování zachovává uvedení jejich autorství.
