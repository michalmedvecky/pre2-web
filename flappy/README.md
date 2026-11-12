# Flappy — webový remaster pro PMD 85

Hratelná webová verze Flappy začíná rovnou v **původním sektoru 1**. Obsahuje všech **200 úrovní vytěžených z FLAPPY+4**, moderní i původní pixelovou grafiku a ovládání klávesnicí nebo dotykem.

**Aktuální nasazení:** společný kontejner repozitáře [michalmedvecky/remastered](https://github.com/michalmedvecky/remastered) servíruje hru na **https://remastered.500miles.cz/flappy/**. Použijte konfiguraci nasazení v kořeni repozitáře. [Původní samostatné nasazení](deploy/README.md) zůstává jako historická kompatibilita.

## Spuštění

Potřebujete Node.js 24 nebo novější. Projekt nemá externí závislosti; instalace balíčků není nutná.

```sh
npm start
```

Otevřete [http://localhost:4173](http://localhost:4173). Jiný sektor vyberete v nabídce STAGE nebo pomocí adresy, například [http://localhost:4173/?stage=9](http://localhost:4173/?stage=9). Platné hodnoty jsou 1–200; bez parametru se otevře sektor 1. Hra se rozběhne prvním pohybem nebo střelou.

## Jak hrát

Dopravte **světlé vejce na světlou podložku**. Flappy se volně pohybuje ve čtyřech směrech. Vejce a tmavé kameny lze tlačit ze strany; podléhají gravitaci a mohou rozdrtit hráče i příšery. Tmavý kámen rozbijete přitlačením k překážce nebo nárazem shora či zdola. Světlé vejce se nerozbíjí.

Sbírejte houbičky a střílejte je ve směru pohledu. Zasažená příšera dočasně usne; padající vejce nebo kámen ji odstraní. Každý nový pokus začíná s časovým počítadlem 1500; hra má pět životů. Po vyřešení sektoru pokračujte do dalšího.

| Ovládání | Akce |
| --- | --- |
| Šipky nebo WASD | Pohyb |
| E / Y | Původní pohyb nahoru / dolů |
| Mezerník | Vystřelit sebranou houbičku |
| R | Nový pokus v aktuálním sektoru |
| P nebo Escape | Pozastavit / pokračovat |
| Enter | Pokračovat po vyřešení sektoru |
| Dotyková tlačítka pod hrou | Pohyb a střelba na telefonu |

## Ověření

```sh
npm test
```

## Předloha a rozsah

Původní Flappy vytvořili **Shoichi Shibata a Kazuyuki Okuyama**. Port pro PMD 85 připravili **Vlastimil Veselý, Libor Bedrlík a Ladislav Gavar — VBG Software**. Tato verze vychází z FLAPPY+4 pro PMD 85 z roku 1988, zpřístupněného na [PMD 85 Infoserveru](https://pmd85.borik.net/wiki/Flappy).

Jde o novou webovou implementaci s přesnými původními daty úrovní a vytěženými sprity. Není to emulátor procesoru; časování, kolize v mezních situacích a chování nepřátel se mohou od originálu lišit. Netvrdí shodu každého procesorového cyklu ani totožný pohyb příšer.

Podklady a způsob extrakce popisuje [SOURCES.md](SOURCES.md).

## Kontejner a CI

Z kořene repozitáře:

```sh
docker build -t flappy-local ./flappy
docker run --rm --read-only --tmpfs /tmp:rw,noexec,nosuid,size=64m \
  --cap-drop=ALL --security-opt=no-new-privileges \
  -p 127.0.0.1:8080:8080 flappy-local
```

Pak otevřete `http://127.0.0.1:8080/`. Produkci obsluhuje nginx na 8080; Node server slouží pro lokální vývoj. Kontejner má `/healthz` a `/build.json`. Hra se otevírá v sektoru 1 také po nasazení.

Workflow `.github/workflows/publish-flappy-image.yml` spouští testy a skutečný build/smoke test image v pull requestech. Po začlenění do `main` publikuje samostatný image pro amd64/arm64 s tagem `sha-<commit>`. Přesný digest je v Actions summary. Workflow neprovádí rollout do clusteru.

`provenance/runtime-manifest.json` ověřuje všechny herní soubory. Po úmyslné změně runtime a kontrole diffu spusťte `npm run manifest`, `npm test` a `npm run verify` ve složce `flappy/`. CI checksumy automaticky nepřepisuje. Image dostane skutečný build commit do `/build.json`; lokální pracovní metadata žádný CI commit nepředstírají.
