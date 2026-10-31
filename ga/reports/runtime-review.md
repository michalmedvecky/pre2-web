# Nezávislá kontrola GA balíčku

Kontrola 2026-10-31; pouze samostatné `ga/dist`, bez změny původního research runtime, deploye či publikování. Runtime kontrolován na vlastním localhost:5790, nikoli na uživatelově5788. Zdrojový core75: `5213829f351f710dddefc27a37edbd2f4a715a901e86da62bf81ab0bb073b1e0`.

## Výsledky

- `node --test ga/tests/build-info.test.mjs`: 5/5 PASS. Commit se odvozuje pouze ze servírovaných metadat: validní HTTPS GitHub repository, přesný40znakový SHA, `buildSource:ci`, `dirty:false`. Lokální/dirty/neznámý snapshot nemá commitlink. JSON/chybějící metadata nezpůsobí pád; žádná interpolace HTML.
- `ga/tests/runtime-browser.mjs`: PASS, receipt `ga/evidence/browser/checks.json` s SHA skutečně načtených souborů. Původní title/password/menu, skutečný OPL `AudioWorkletNode` s běžícím kladným cursorem a bez FLAC fallbacku; LEVEL přepne Dwarf Arcade na index2 a označí cheated; HD iframe zůstává oddělenou zamítnutou ukázkou (`quality-gate-failed`, renderScale1), zavření zachová pauzu.
- Lokální metadata správně ukazují pracovní snapshot, skutečný repozitář a žádný commit. Mobilní390px fixture `buildSource:ci/dirty:false` ověřuje plný commitlink a čitelný footer; jde o HTTP fixture, nikoli důkaz skutečného Docker buildu nebo publikovaného commitu.
- Žádná page error, chybějící HTTP reference ani request mimo vlastní origin. Osobně prohlédnuty `local-footer.png`, `ci-footer-mobile-fixture.png`, `ga-stage3.png`. Nejde o nový fullgame průchod ani fyzický telefon.
- Browser i AudioContext zlikvidovány; vlastní5790 server zastaven, původní5788 ponechán. První pokusy testu používaly příliš časný jednotlivý audio sample0; finální test explicitně čeká na kladný skutečný cursor, runtime se kvůli tomu neměnil.

## Build a provozní review

CI má samostatný `ga/**` filtr, `./ga` context/Dockerfile, čistý checkout gate, plný `github.sha`, samostatnou explicitní image repository a neměnný nginx digest. Image smoke ověřuje obě architektury, skutečný digest image, read-only root/tmp/UID10001, MIME/health/dependencies a vložená metadata. Workflow nemá cluster přístup. Namespace/host/TLS/image/context se nezjištěnými hodnotami nepředstírají; renderer vyžaduje explicitní konfiguraci. K8s deployment zachovává3revize, nonroot10001, dropALL, RuntimeDefault, zákaz privilege escalation, read-only root, `/tmp` emptyDir, probes a resources. Rootparent workflow izolaci vlastní source owner.

Kopie obsahuje lokální OPL WASM/score/table assets i FLAC fallback, původní SND a LGPL/source/build podklady. AudioWorklet vyžaduje HTTPS nebo localhost. `/ga` je cesta repozitáře; runtime je na kořeni dedikovaného hostu (HD iframe `/hd-pilot.html`). Žádné sourcemaps nalezeny. Nezaveden plošný CSP bez ověření inline pilotu/stylů. Docker engine, skutečný GitHub Actions run a cluster rollout tímto browser testem ověřeny nejsou; image smoke zůstává skutečnou release gate.

Primární dokumentace: [Docker context](https://docs.docker.com/build/concepts/context/), [GitHub workflow filters](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax), [GitHub sha context](https://docs.github.com/en/actions/reference/workflows-and-actions/contexts), [Docker GitHub Actions](https://docs.docker.com/build/ci/github-actions/), [Kubernetes rollback](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/), [Kubernetes security context](https://kubernetes.io/docs/tasks/configure-pod-container/security-context/). Context7/npx nebyly v prostředí dostupné, použity přímo oficiální stránky bez instalací.
