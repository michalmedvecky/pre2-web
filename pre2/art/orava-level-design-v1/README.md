# ORAVA — kompletní návrh levelu

**Návrh, nikoli implementace.** Hra, nasazení ani její zvuky se nemění.

- `panorama.png`: souvislá široká výtvarná představa osmi prostředí; prostor je pro přehlednost výtvarně zhuštěný.
- `plan.png`: návrhářský přehled hlavní trasy, odboček, úkolů, checkpointů a všech tajemství. Zobrazuje záměrně i spoilery.
- `DESIGN.md`: závazný soupis všech osmi úseků, tří úkolů, deseti tajemství a návratových cest, souboje i pravidel průchodnosti. Tento text je při odchylce generovaných popisků rozhodující.
- `prompts.json`: odevzdaná zadání; použit byl vestavěný **image_gen**, schválený koncept ORAVA sloužil jako obrazová reference. Finální plán následně prošel cílenou opravou legendy tajemství a tvaru tří muzejních řezeb.

Rozsah je 7680 × 640 herních jednotek, tedy 24 obrazovek na šířku. Nejde o ověřenou kolizní mapu. Při realizaci bude potřeba nejprve blokový prototyp a ověření skoků; větší šířka také vyžaduje úpravu mapového omezení nebo navazující interní mapy. Žádný Oravský hrad není součástí návrhu.
