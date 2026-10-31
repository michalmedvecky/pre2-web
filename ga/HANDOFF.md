# GA — deployer handoff

Tento zápis zachycuje původní přípravu a následný release postup. Aktuální vydaný commit, úspěšný CIrun a image digest patří do samostatného GitHub release `ga-v*`, nikoli do nepravdivé self-reference tohoto souboru.

- Stav: připravený samostatný Golden Axe balíček v `web/ga`; žádný commit/push/publish/deploy ani cluster access.
- Repo `https://github.com/michalmedvecky/pre2-web`, aplikace/context `ga/`; ostatní Pre2 runtime/README/untracked soubory zachovány.
- Jediná výslovná parent výjimka:1řádek paths-ignore v dříve clean Pre2 workflow; GA-only včetně obou workflow/Pre2-app-only/mixed filtry ověřené. Přesný patch `provenance/parent-workflow-delta.patch`.
- Source core75 SHA `5213829f351f710dddefc27a37edbd2f4a715a901e86da62bf81ab0bb073b1e0`. Původní runtime copy a parentdirty provenance jsou oddělené od budoucího CIpackaging commitu.
- `dist/`: původní grafika/audio+OPL/WASM/SND/FLAC, pouze HDpreview. Žádný EXE/ZIP/interpreter. Všechny LGPL C/h/licence/wrapper/buildrecipe součást runtime.
- Runtime manifest `provenance/runtime-manifest.json`,152files bez build.json, snapshot `95612700e3f875032e2f11d34dd5cef7e19a74ab64779f9964c1d668ec3ae49d`.
- Local `/build.json` poctivě dirty-snapshot/commitnull; DockerCI injektuje skutečný40SHA pouze při cleanCI. GitHub a commit odkaz ve stránce; sourceSnapshot je samostatný.
- Dev start: Node24+ `node scripts/serve.mjs`, localhost5790; žádná npm instalace. Produkční image má nginx8080/UID10001/read-only/tmp64Mi.
- K3s renderer pouze připraví JSON; bez explicit context/namespace/image digestu selže. HTTPS host/TLS/Traefik entrypoint a pull access musí dodat deployer.
- Primární návod: `DEPLOYER.md` (repo variables→CI digest→render→manual diff/apply→acceptance→rollback). Nepoužívat starý Pre2 image/latest.
-84/84 unit PASS (75mechanics+5identity+3deployment/metadata+1CIisolation); fixture přenos nahrazuje EXE-only testinput datovými JSON referencemi.
- Runtime manifest/license/requireddependencies PASS; offline kubectlKustomize4resources PASS bezAPI/servervalidation. `validation/` uchovává výsledky.
- Nezávislý browser PASS: actual OPL AudioWorkletNode/cursor, LEVELStage3, HDpreviewgatefalse/scale1, localdirtymetadata a CI HTTPfixture. Nejde o skutečný imageproof.
- Vizuálně prohlédnuté footer/mobile/Stage3 PNG; browser+audio+vlastní5790 server uzavřeny, uživatelský5788 ponechán. `reports/runtime-review.md`, `evidence/browser/checks.json`.
- Docker lokálně chybí. Imagebuild, skutečný nginxcontainer smoke, registrypublish a cílový k3s rollout nebyly provedené; CI je obsahuje jako povinné gate.
- Úplná nativefidelity/globalIRQ/RNG/hitordering a fyzickýiOS/Gamepad nejsou prokázané. Starší transientstally nejsou univerzálně uzavřené jednotlivými opravami.
- Oddělený HDworkstream/materialpilot není schválený fullremaster ani deploymentdependency; do této frozen kopie se narychlo neimportoval.
- Nejbližší krok deployera: review pouze GA souborů+schválenéCI výjimky, potvrdit vnějšívstupy, vlastní commit/CIbuild a až na výslovný pokyn clusterrollout.

- Release příprava: vlastní prefix ga-v0.1.0, manuální release po úspěšném main GA CI, explicitní ga-onlytar+SHA; žádný tag-trigger automatický release. Publish/tag/release provádí release owner až po rootreview a úspěšném GA CI; žádný cluster rollout.
