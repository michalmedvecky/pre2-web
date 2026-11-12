# Připravenost veřejného vydání Golden Axe — 12. 11. 2026

## Co je již veřejné

Read-only GitHub API (`gh repo view`, `gh release list/view`, `gh api compare`)
potvrdilo veřejný repozitář
[michalmedvecky/pre2-web](https://github.com/michalmedvecky/pre2-web), výchozí
větev `main` a samostatná GA vydání. Není nutné zakládat nový repozitář ani
měnit jeho viditelnost. Nejnovější GA vydání v okamžiku kontroly je
[ga-v0.2.6](https://github.com/michalmedvecky/pre2-web/releases/tag/ga-v0.2.6),
zveřejněné4.11.2026 jako pre-release; tag ga-v0.3.0 při kontrole ještě neexistoval.

Vydání0.2.6 uvádí commit
`948a63da647628a25fe3fed8cd6fc49d6e540a9c`, CI run41820527465,
image `ghcr.io/michalmedvecky/pre2-web-ga@sha256:b3546aa167084a6eddf5e96216ce9405701172761ca81e1d3794bee661257c32`
a GA-only archiv574771647B se SHA256
`28f1ca60f971d58003c29a261c4294918133b15081d0674f57063e07115e6428`.
Jde o údaje starého vydání, nikoli o identitu připravovaného0.3.0.

## Souběžné změny a izolace

Vzdálený `main` je při kontrole na
`899c1e6e44150603cf24b6ad398f79a72ca70f58`, o4commity napřed oproti místnímu
základu GA0.2.6. Přibylo Flappy a jeho workflow; současně se změnil
`publish-image.yml` a `ga/tests/ci-isolation.test.mjs`. GA runtime se na remote
nezměnil. Release owner musí začít od aktuálního remote a přenést pouze
skutečné GA změny, nikoli přepsat upstream integrační test starou kopií.
Po tomto sloučení se izolace testuje znovu.

GA workflow používá build context `./ga`, samostatný GHCR repository,
cache scope `ga`, pinované Actions a oficiální nginx přes digest. Publikuje
jen `sha-<fullcommit>` na main/ruční spuštění, nikoli tagpush. PR nemůže
publikovat image. CI kontroluje clean checkout, manifest a testy, staví
amd64+arm64, pak nad skutečným image provádí read-only/UID10001/MIME/cache/
metadata smoke. Nemá Kubernetes credentials ani krok cluster deploymentu.

Repository variables byly read-only ověřeny: samostatný
`GA_IMAGE_REPOSITORY=ghcr.io/michalmedvecky/pre2-web-ga` a immutable
`GA_NGINX_IMAGE` existují. Žádné secrets nebyly čteny či vypsány.

Místní ne-GA dirty změny zůstaly nedotčené. SHA256 jejich `git diff --binary HEAD`
je `aa202d826d7a9ad06205b68194153f9df17532916daec0a9e35d018ffeb40111`.
Tento hash nekryje untracked nesouvisející art; jeho zachování kontroluje
release owner samostatně. Agent upravil pouze GA dokumentaci.

## Licence a balíček

- Původní artwork, animace, mapy a melodie nejsou v tomto projektu nově
  relicencovány. Dodání podkladů ani public viditelnost neznamenají společnou
  open-source licenci celého balíčku. Původní EXE/ZIP se do runtime nedodává.
- Nuked-OPL3 revize `765ec962e473aeb767e4cba74ffdc8f588ffbfe8` má v runtime
  plný LGPL-2.1-or-later text, C/h zdroje, wrapper, build recept a provenienci.
  Samostatný WASM lze podle ponechaného receptu nahradit/přestavět.
- VSCO2CE sample nahrávky mají ponechané CC0-1.0 LICENSE/NOTICE, pin
  `440300901dfe9275fd84e0b7763af1f8443ae62e`; manifest uchovává33 použitých
  zdrojů a jejich SHA256. CC0 se nevztahuje na melodie Golden Axe.
- Kontrola názvů souborů pod `ga/` nenašla `.env`, soukromé klíče,
  `kubeconfig`, `config.local.json`, EXE, ZIP, PEM/P12/PFX. Není to obecný
  důkaz, že libovolný budoucí soubor neobsahuje tajné údaje.

Před integrací nové nápovědy má runtime617 souborů včetně `build.json`,
celkem682731443B. Největší soubor je Stage1 remaster FLAC13175894B;
žádný runtime soubor nepřesahuje100MiB. Velikost celé distribuce není
velikostí počátečního downloadu: HD se připravuje po scénách a hudební
remaster se načítá až na požádání po skladbách. Originály PNG a odvozené
WebP záměrně zůstávají vedle sebe pro provenienci/fallback; jejich odstranění
není součástí této publikační úpravy. Nové FLAC přidávají100700490B.

## Kontroly a zbývající kroky

V tomto auditu prošlo9 existujících testů CI izolace, deployment rendereru
a build identity. Bylo přečteno GA/Pre2 workflow, Dockerfile, dockerignore,
nginx/cache smoke a licence/provenience; nebyl spuštěn Docker ani cluster.
Jde o kontrolu místního základu; upstream Flappy test se validuje až po
sloučení release ownerem.

Před vydáním0.3.0 zbývá integrovat a ověřit novou nápovědu, převzít aktuální
gameplay audit, obnovit manifest a verzi a otestovat finální neměnný snapshot.
Pak GA-only commit na současném main, úspěšné nové GA CI a skutečný image
smoke, ověření obou architektur a digestu, GA tag a release s archivem/SHA256.
Žádný zde uvedený draft ani starý QA receipt nedokazuje tyto budoucí kroky.

Známé meze zůstávají výslovné: globální IRQ/hit/throw pořadí, původní
dosažitelnost pozdní Duel palety a fyzický iOS/Safari/gamepad. Hudební
remaster mění barvu nástrojů/envelope a F3 chování držené noty. Hlášení ticha
ve stage2 nebylo při14 cílených PCM kontrolách zopakováno; nesmí být
označeno za opravené bez nového důkazu. Celá hra se neoznačuje za dokonalou
či úplně native-exact jen na základě portových průchodů.

Tento agent neprovedl commit, push, tag, release, změnu visibility ani deployment.
