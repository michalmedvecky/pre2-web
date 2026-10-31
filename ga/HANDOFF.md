# GA — verze0.1.1 / původní výběr postav

- Samostatný Golden Axe v `ga/`, repo `https://github.com/michalmedvecky/pre2-web`. Nový release používá `ga-v0.1.1`; publikovaný0.1.0 se nepřepisuje.
- Přesný releasecommit, úspěšný CIrun, image digest a přílohy jsou v GitHub release notes; netvoří se nepravdivá self-reference commitu tohoto souboru.
- Změna0.1.1: původní MAPC/SELECT1–3,120originálních orbitálních poloh, současný nezávislý1P/2P výběr a původní confirmation/duplicate gates. Touch ovladače pod plátnem.
- P1 defaultNum4/6+Num5 (webalias šipky/J/Enter),P2 A/D+S; Options mohou zařízení prohodit. Oba musí potvrdit, pak další původnípresentation update spustí hru.
- Gameplay core75 zůstává SHA `5213829f351f710dddefc27a37edbd2f4a715a901e86da62bf81ab0bb073b1e0`; žádná změna fyziky/audio engine ani HDliveassetů.
- Runtime154files bez injektovaného build.json, snapshot `e60da36a1307690d417693bb94ca4bf2d18a58376523a5652e59b68c74aa764b`; manifest/sourceSnapshot a localdirtymetadata poctivě oddělené od CI40SHA.
- Presenter6unit+identity5PASS a independent read-only/sourcebyte review; actual1P/2P/390px touch browserPASS/0errors. Použity stávající receipts, nevydává se nový whole-game průchod.
- Počáteční1P312×200 obraz62400/62400RGB shodný se skutečným DOS capture axe_003; jedna póza není všechnyfáze/native2P/wallclock proof.
- Autority: `reports/character-select.md`, `evidence/character-select/{checks,final-checks,native-pixel-comparison}.json`, raw datovéfixtures místoEXE.
- Testovacíbrowser/audio zavřené; userpreview5790 ponechán na výslovný pokyn, původní5788 nedotčen. Žádné nové browser/native boot opakování pro release.
- Release preflight: runtime/provenance/parentchecks +testy v `validation/release-0.1.1-preflight.json` a příslušném unitlogu. Skutečný container smoke až GA CI, ne localNode preview.
-39původních dirty/untrackedPre2souborů mají původníSHA a nesmějí se stageovat; oba rootworkflow beze změny proti0.1.0, GA-onlyCI izolace zachovaná.
- Repo variablesGA_IMAGE_REPOSITORY/GA_NGINX_IMAGE z0.1.0 se jen ověřují; bez zbytečného přepisu. Žádné tajné hodnoty v repo.
- Docker lokálně není; CI musí projít testy/manifestem, oběma linuxarchitekturami, registry a skutečným readonly/UID/MIME/commit smoke před vydáním prerelease/latest:false.
- Přílohyrelease: GA-onlycommittedtar.gz+SHA256SUMS; GitHubautomaticSourceZIP je celýparentrepo. ZdrojovéLGPL C/h/licence/wrapper/buildrecipe součást runtime.
- Deployer `DEPLOYER.md`: image digest→explicitcontext/namespace→render→manualdiff/apply/verify/rollback. Požadovanýhostga.500miles.cz jen předanývstup; žádnéDNS/TLS/k3s změny.
- Nadále nejde o úplný nativeexact/HD remaster: IRQ/RNG/wallclock/globalhitordering/near-goods a fyzickýiOS/Gamepad mají doložené meze.
- HD zatím pouze pozastavenýpreview s failedqualitygate; důslednýupscaling má samostatný workstream až po tomto releasu, neimportuje se narychlo.
