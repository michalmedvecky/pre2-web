# ORAVA — Zvončeky nad Oravou

Kompletní návrh levelu, verze 1. **Pouze návrh; do hry není nic zapojené.** Otevřené návrhové hodnoty nejsou výsledkem testování fyziky.

## Celek

- Jeden dlouhý level: **7680 × 640 herních jednotek**, tedy **24 obrazovek na šířku**, osm úseků po třech obrazovkách. Souvislý postup zleva doprava, průběžně horní a spodní odbočky.
- Cíl: získat **tři pečeti — ovečku, jedli a vlnu — a zklidnit medvědího strážce**. Cesta ke všem třem pečetím je viditelná; žádný povinný předmět není schovaný v secretu.
- **10 tajemství, 5 checkpointů**, dvě bezpečné odpočinkové pasáže. Zamýšlená první výprava 15–20 minut, důkladné hledání 25–35 minut; jde o cílové tempo, nikoli změřenou délku.
- Hrdina, věrný pejsek, zvonky a hvězdičky z režimu ORAVA. Halušky značí bonus; pirohy a slanina jsou jídlo. Pejsek nesmí blokovat cestu ani dostávat zranění.
- Žádný Oravský hrad, ani v pozadí. Místa tvoří záměrně zhuštěnou herní cestu, ne geograficky přesnou mapu.

## Pravidla průchodnosti

Hlavní trasu lze projít běžným skokem bez J, IDDQD nebo MAP. Návrhové mezery jsou 24–48 jednotek, jednotlivá stoupání 16–32; vyšší odbočky používají několik stupňů, nikoli jediný velký skok. Finální rozměry je nutné ověřit v prototypu. Vstupy do běžných chodeb mají alespoň 48 jednotek na výšku. Nad hlavní cestou nesmí dekorace skrývat hranu podlahy.

Pohyb, skok a útok zůstávají stejné. **↓ + útok** otevírá podlahové skrýše, boční útok slabé stěny, **↓ u páky** ovládá mechanismus. Na telefonu odpovídající existující gesto a útok, bez nové povinné klávesy. Pejskovo očichání naznačuje některá tajemství; jejich splnění nesmí záviset na tom, zda je zapnutý zvuk.

Hlavní trasa má teplou světlou hranu, odbočky jsou čitelné podle plošin a jídla, secrets mají konkrétní nenápadnou nápovědu. Nevstupuje se naslepo do černé díry. Z neúspěšného skoku nad řekou vede spodní kamenná cesta zpět; skutečně nebezpečná voda má jasný proud/pěnu.

## Osm úseků

| Úsek | Rozsah X | Obrazovky | Hlavní překážka / úkol | Alternativa a návrat |
| --- | --- | --- | --- | --- |
| 1. Kolonádový most | 0–960 | 1–3 | Překročit most v Dolném Kubíně, přeskočit dvě uvolněné fošny; výuka hvězdiček a úderu dolů. | Spodní říční kameny vracejí hráče na lávku. |
| 2. Řeka a mlýnský břeh | 960–1920 | 4–6 | Dvě plovoucí klády a zdvihací plošina u vodního kola; před skokem viditelný celý cyklus. | Stabilní horní břeh je delší a bezpečnější, nevyžaduje časování. |
| 3. Salaš a košár | 1920–2880 | 7–9 | **Ú1:** přivést tři ovečky do ohrady. Každou přivolá zazvonění z blízka; ztracená ovečka se vrátí na svou loučku. | K horní ovečce vedou tři nízké stupně. Z ohrady lze znovu vyjít. |
| 4. Dřevěnice | 2880–3840 | 10–12 | Průchod mezi domy a přes jedoucí vůz se senem, lesní vrány pouze na okraji vsi. | Ulice je bezpečnější; střechy poskytují jídlo a kratší cestu. |
| 5. Muzeum oravské dědiny | 3840–4800 | 13–15 | **Ú2:** vrátit tři viditelné dřevěné řezby — ovci, jedli a vlnu — na výstavní desku. | Jedna řezba u potoka, jedna v otevřené světnici, jedna na nízké galerii; všechny na běžných cestách. |
| 6. Kříž a hřbitovy | 4800–5760 | 16–18 | Klidnější cesta kolem velkého krucifixu s Ježíšem a dvou oplocených hřbitovů; krátké kamenné schody, žádný boj. | Stezka vede mimo hroby; neúspěšný skok znamená pouze spodní pěšinu. |
| 7. Přehrada | 5760–6720 | 19–21 | **Ú3:** ovládnout kola A a B a snížit vodu v servisním kanálu; odhalí se spodní přechod a pečeť vlny. | Horní servisní lávka zůstává otevřená jako delší obchvat. |
| 8. Strážce Oravy | 6720–7680 | 22–24 | Aréna zeleného medvěda z loga, tři čitelné soubojové cykly, poté odchod s trojicí pečetí. | Horní větev se zpřístupní po zklidnění medvěda; návrat z ní k cíli je bezpečný. |

### Ú1 — Ovečky

První ovečka stojí na hlavní louce, druhá na nízké seníkové galerii, třetí za dřevěnou brankou s viditelnou pákou. Zazvonění z přibližně jedné délky postavy zahájí následování. Pejsek běží za stádem; jeho chování pomáhá čitelnosti, ale není druhým ovládáním. Ovečky nepadají do smrtící vody a útok je nezraní. Po třetím příchodu do košáru se rozsvítí tři symboly na brance a hráč dostane **pečeť ovečky**. Stav je zachovaný po smrti.

### Ú2 — Řezby

Tři kusy jsou předem zobrazené na neúplné výstavní desce, proto hráč ví, co hledá. Jejich umístění vyžaduje krátký okruh kolem potoka a galerie, nikoli lov neviditelných stěn. Po vrácení všech tří dostane hráč **pečeť jedle**. Hřbitovy, kostel a velký krucifix nejsou rozbitelné objekty ani zdroje kořisti.

### Ú3 — Servisní kanál

Z nástupní plošiny je vidět vodní kanál, obě kola a destička s šipkou **A → B**. A zastaví přívod a vysune bezpečný mezistupeň, B otevře odtok a odhalí spodní cestu. Pokud hráč zkusí nejprve B, nic nezničí a neztratí život; ukazatel připomene A. Voda se nezvedá na nevratný časovač. Mění se jen malý servisní kanál, **celá Oravská přehrada zůstává napuštěná**. Za kontrolním stanovištěm čeká **pečeť vlny**.

## Deset tajemství

| ID | Místo a nápověda | Jak dovnitř | Odměna | Návrat |
| --- | --- | --- | --- | --- |
| S1 | Pod kamenným pilířem mostu; prasklá fošna a jediná piroha níž. | Úder dolů otevře vstup na bezpečnou kamennou římsu. | Jídlo a body. | Dva nízké stupně zpět na most. |
| S2 | Za malým vodopádem u kola; za vodou občas probleskne teplé světlo. | Ze spodní říční cesty se vejde do boční dutiny. | Slanina a srdce. | Tunel ústí na stejný břeh. |
| S3 | Seník nad ohradou; seno skrývá obrys dřevěného poklopu. | Z horní galerie rozbít slabou boční přepážku. | Haluškový bonusový výklenek. | Seskočit po senových stupních. |
| S4 | Kámen vedle košáru; pejsek u něj zřetelně zastaví a očichá zem. | Úder dolů, nikoli náhodný skok do ohrady. | Zásoba piroh a stříbrný zvonek do sbírky. | Nízká chodba se vrací ke vstupu. |
| S5 | Sklep dřevěnice; sud stojí na popraskaných prknech. | Ze strany odstranit sud a udeřit do podlahy. | Kus slaniny a body. | Otevřený schodový východ do ulice. |
| S6 | Podkroví vedle komína; řada dvou piroh ukazuje horní cestu. | Vůz se senem → stříška → otevřená půdní dvířka. | Srdce a druhý sběratelský zvonek. | Zpět stejnou střechou nebo bezpečným okapním stupněm. |
| S7 | Oblouk pod vnější pěšinou u hřbitovní zdi; mech má tvar vstupu. | Boční průchod pod cestou, **mimo pohřebiště**. | Jeden život. | Zadní schody k hlavní stezce. |
| S8 | Servisní komůrka přehrady; prasklá omítka a půlka vyčnívající páky. | Boční úder do slabé přepážky z horní lávky. | Třetí sběratelský zvonek. | Otevře se vnitřní zkratka ke kolu A. |
| S9 | Výklenek suchého kanálu; objeví se po úkolu A → B. | Sestoupit po viditelných servisních stupních. | Jídlo a velký bodový bonus. | Tytéž stupně; žádné časované zatopení. |
| S10 | Větev za medvědem; po souboji se medvěd otočí a podívá nahoru. | Dva přístupné stupně na větev, bez cheatu J. | Tajná hostina a poslední sběratelský zvonek. | Šikmá větev ústí přímo před závěrečný znak. |

Čtyři sběratelské zvonky jsou čistě nepovinné. Za jejich komplet je na výsledkové obrazovce zvláštní označení; **neotevírají hlavní bránu**. Po zklidnění medvěda zůstává možné vracet se a dohledat secrets. Všechny skrýše mají výstup, žádná nevynucuje ztrátu života.

## Medvěd — Strážce Oravy

Čtyřnohý zelený medvěd podle dodaného loga: bílý čenich a kontury končetin, motivy jedlí ve srsti. Nejde o běžnou příšeru; finále znamená **zklidnění**, nikoli jeho zabití. Aréna má přibližně 640 jednotek, rovnou spodní plochu a dvě nízké únikové římsy. Před ní je C5 a místo na doplnění zdraví.

1. **Přečti signál:** zvedne tlapu a zvýrazní se listí, asi 0,8 s předstihem.
2. **Překonej útok:** jednou převaluje kládu, podruhé pošle nízkou zemní vlnu, potřetí krátce vyrazí vpřed. Překážky jsou přeskakovatelné nebo se jim uhne na římsu. Žádný náhodný neoznámený zásah.
3. **Zazvoň:** po útoku je asi 1,4 s přístupný světelný znak na hrudi. Dva přesné zásahy hvězdičkou dokončí cyklus. Celkem šest zásahů, tři cykly; neúspěšné okno se opakuje.
4. **Závěr:** medvěd se uklidní, sedne si, pejsek radostně štěkne. S trojicí pečetí se otevře dřevěná brána se znakem ORAVA. Bez pečetě se ukáže její konkrétní symbol a směr zpět; žádný nenapravitelný konec.

## Checkpointy a čitelnost

C1 za mostem (x960), C2 po košáru (x2880), C3 za muzeem (x4800), C4 před servisním kanálem (x5760), C5 před medvědem (x6820). Checkpointem je obyčejná lucerna u pěšiny. Už vyřešené úkoly a získané pečeti se po smrti neztrácejí; rozpracované ovečky lze bezpečně přivolat znovu. Před obtížnější pasáží je dost místa na zastavení a pohled dopředu.

Most, košáry i hráz mají viditelnou podlahovou hranu; pozadí je méně kontrastní. Cestu značí jídlo a přirozené tvary, nikoli všudypřítomné šipky. Secret nápovědy jsou viditelné i bez zvuku; štěknutí a cinknutí je jen doplňují. V klidové části nejsou nepřátelé a žádná odměna neleží na hrobech ani na Ježíšově kříži.

## Co by vyžadovala realizace

Před tvorbou finální grafiky otestovat šedý blokový prototyp všech skoků, návratů, směrových útoků a checkpointů. Šířka 7680 přesahuje původní mapové omezení 4096: realizace potřebuje rozšíření souřadnic/mapy, nebo dvě navazující interní mapy po 3840 se zachovanými úkoly. Obě varianty jsou pro hráče jeden navazující level; současná hra se tímto návrhem nemění.

Nové systémy: vedení oveček, tři úkolové pečeti, muzejní sbírka, dvě stavové páky a zklidnitelný strážce. Grafické sady: most a pilíře, vodní kolo a klády, ovečky a košár, varianty dřevěnic/střech, muzeum a řezby, pietní dekorace, hráz/servisní kanál, medvědovy tři útoky a klidová póza. Podklady se teprve promění v herní sprity; koncepční malba není hotová mapa ani ověřená kolizní vrstva.

## Vizuální reference

Schválený návrh ORAVA z této konverzace, dodané logo, hrdina a pejsek. Podobu památek opírá původní koncept o městské podklady Dolného Kubína, Múzeum oravskej dediny a Slovakia.travel. Návrh používá herní zkratku, nikoli přesnou polohu jednotlivých památek.

- https://www.dolnykubin.sk/pamiatky-a-pamatihodnosti.html
- https://muzeum.zuberec.sk/zakladne-informacie/
- https://slovakia.travel/co-vidiet-a-robit/objavujeme-slovensko-z-domu/oravska-priehrada
