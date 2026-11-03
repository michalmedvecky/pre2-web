# Golden Axe — předání deployerovi pro k3s

## Patch ga-v0.2.3

Rychlejší příprava HD levelů, bezztrátový WebP přenos (o 35,34 % méně dat),
hladší rozhraní a doplněné efekty ohně, titulní scény a výsledků.
Při stejných vstupních PNG se příprava Stage 1 v izolovaném Chrome měření
zkrátila z 20,042 s na 2,490 s; skutečná doba závisí na zařízení a síti.
Runtime snapshot: `ca1bd6c7401ef188f61eef5083c724457d7a864c49528f4dcd916d3ddb4aed1c`.
Přesný commit, CI, nový image digest a GA-only archiv jsou v
[release ga-v0.2.3](https://github.com/michalmedvecky/pre2-web/releases/tag/ga-v0.2.3).

Zachovejte stávající GA aplikaci na `ga.500miles.cz`, její namespace, Ingress
 a TLS. Změňte jen image na digest z release; Prehistorik neměňte.
Pokud je před aplikací další proxy, musí podporovat `image/webp` a nesmí
přepisovat nová cache pravidla. Po rollout ověřte `/build.json`, studený
start, pohyb bez opakovaného načítání a přepnutí HD/originál.
Vydání samo do k3s nic nenasazuje.

163 testů a šest automatických průchodů režimů do menu prošlo. Herní jádro
zůstává stejné jako v 0.2.2; úplná shoda s native DOS není prokázaná
(IRQ časování a pozdní Duel paleta zůstávají otevřené). Fyzický iOS/Safari
nebyl ověřen. Podrobnosti: [reports/remaster-20261103.md](reports/remaster-20261103.md).

## Patch ga-v0.2.2

Opravuje regresi 0.2.1, která zastavovala hru při změnách animací kvůli načítání
HD. Celý level a jeho skriptované barevné varianty se nyní připravují před
hraním. Přesný commit, úspěšné CI a nový digest jsou v
[release ga-v0.2.2](https://github.com/michalmedvecky/pre2-web/releases/tag/ga-v0.2.2).
Runtime snapshot: `4607e6161f2cbe2c33729b1621c5fcc09182c90ecc020e5432d12d317477b137`.
Přílohy: `ga-v0.2.2.tar.gz` a `ga-v0.2.2.SHA256SUMS`, pouze GA subtree.

Zachovejte stávající samostatnou GA aplikaci na `ga.500miles.cz`, namespace,
Ingress a TLS; změňte jen image na nový digest z release. Prehistorik neměňte.
Vydání samo do clusteru nic nenasazuje. 0.2.1 má známou regresi hratelnosti;
pro případný rollback je v předchozích poznámkách také digest 0.2.0.

Po rollout ověřte `/build.json` proti releasu a studený start levelu. Jednorázová
příprava může trvat déle (v Chrome s PNG uměle +450ms přibližně15–30s), ale
následná souvislá chůze, útoky a skoky nemají opakovaně ukazovat načítání.
Ověřte i 2P a ruční HD/originál přepnutí. Lokálně152testů a cílený desktop/mobilní
Chromium test prošly. Nový celý native DOS průchod ani fyzický iOS/Safari test
se neprovedl. Display bitmapy jsou paměťově zmenšené; source PNG se nemění.
Cache limity128MiB atlasy +64MiB palety +4MiB LUT nejsou limitem celého procesu
prohlížeče. Podrobnosti [reports/hd-loading.md](reports/hd-loading.md).

Níže jsou historické release poznámky a obecný deployment postup.


## Patch ga-v0.2.1

Oprava problikávání SD/HD při načítání animací a map. Vydání používá samostatný
GA image a nemění Prehistorik. Přesný commit, CI a nový image digest jsou v
[release ga-v0.2.1](https://github.com/michalmedvecky/pre2-web/releases/tag/ga-v0.2.1).
Runtime snapshot: `c5889e843987d61dd5ea6adc6d0290fd5914829790794dcf03845ab5b318d2f6`.
GA-only archiv: `ga-v0.2.1.tar.gz` + `ga-v0.2.1.SHA256SUMS`.

Cílový host je `ga.500miles.cz`; zachovejte nynější GA namespace, service,
ingress a TLS. Použijte nový image přes digest z release. Cluster konfiguraci
zde neodhadujeme ani neměníme. Rollback 0.2.0:
`ghcr.io/michalmedvecky/pre2-web-ga@sha256:e0c37b426105b49ebb7038f63757a39a60ac23a914c0f88dd16ea8d55d01bda0`.

Přijetí: ověřte `/build.json`, poté se studenou cache pohyb, útoky protivníků
a přechod scénou. HD má při chybějících souborech podržet hotový obraz a
pozastavit herní čas i zvuk s hláškou načítání; nesmí zobrazit SD mezisnímek.
Při výpadku souboru musí fungovat ruční přepnutí tlačítkem HD do originálu.
146 testů a cílený Chrome test se zpožděním PNG 450 ms prošly; celá hra
proti DOS se kvůli tomuto patchi znovu netestovala. Detaily:
[reports/hd-loading.md](reports/hd-loading.md). Níže je obecný postup a
historický popis původní přípravy; vydání samo nic do k3s nenasazuje.

**Připraveno, nenasazeno.** Žádný push, publish ani cluster access během přípravy. Lokální Docker není dostupný: skutečný image build, nginx runtime a registry manifest smoke zatím čekají na CI/deployera. Browser QA se skutečně provedla nad místním Node preview, nikoli uvnitř kontejneru.

Repo: `https://github.com/michalmedvecky/pre2-web`, aplikace a buildcontext `ga/`, Deployment/Service `ga`. Původní Prehistorik2 aplikace/data se neměnily. Jediná schválená změna starého workflow je `push.paths-ignore` pro `ga/**`, nový GAworkflow a Pre2workflow samotný; přesný patch `provenance/parent-workflow-delta.patch`. GA-only včetně prvního commitu s oběma workflow spustí jen GA, Pre2-app-only jen Pre2, mixed app změny obě. Samotná Pre2workflow-only změna image automaticky nepublikuje; workflow_dispatch zůstává. Platí standardní GitHub limity diff filtrů; není to nová cluster izolace.

## Nejkratší cesta

1. Zkontrolujte změny a checksumy; pro budoucí commit vyberte **jen** `ga/`, nový `.github/workflows/publish-ga-image.yml` a schválený jednořádkový patch `.github/workflows/publish-image.yml`. Neberte již existující dirty Pre2 README/app/cheats/render ani nesouvisející untracked art. Commit/push zde nebyl proveden.
2. Nastavte dvě repository **variables**, nikoli secrets: `GA_IMAGE_REPOSITORY` = vámi zvolený nový GHCR repository pro Golden Axe, bez tagu; `GA_NGINX_IMAGE` = ověřený oficiální multiarch nginx pin `nginx:stable-alpine@sha256:<64hex>`. Nepoužívejte `ghcr.io/michalmedvecky/pre2-web`; renderer/CI jej pro Golden odmítají. Nezadané hodnoty publishing zastaví. Existující digest staré hry se nepřenáší.
3. Po vlastním schváleném pushi na main nebo workflow_dispatch nechte [Golden Axe image](../../.github/workflows/publish-ga-image.yml) úspěšně projít. Pinned actions jsou převzaté z reference, nikoli automaticky aktualizované. CI testuje, ověřuje manifest, vyžaduje clean checkout, používá SOURCE_DATE_EPOCH z commit timestampu, staví amd64+arm64 a publikuje jen `sha-<fullSHA>` do odděleného repository. Pak ověří oba platformní manifesty a skutečný readonly/UID/MIME/buildmetadata container smoke. Žádné latest ani Kubernetes credentials.
4. Z Actions summary převezměte **nový** `registry/repository@sha256:<digest>`, odpovídající build commit a runtime snapshot. Digest je deployment/rollback autorita; GitHubtag není nezměnitelná registry policy. Pin+checksumy+SOURCE_DATE_EPOCH zafixují vstupy; bitově shodný opakovaný image build zde nebyl proveden.
5. Doplňte konfiguraci, vyrenderujte a až s vlastní deploy autorizací postupujte níže. Zde nejsou žádné implicitní context/namespace/domain/registry hodnoty.

## Konfigurace a offline validace

Z kořene repozitáře:

```sh
npm --prefix ga test
node ga/scripts/verify-package.mjs
cp ga/deploy/config.example.json ga/deploy/config.local.json
```

Vyplňte `ga/deploy/config.local.json`:

| Pole | Hodnota |
|---|---|
| kubeContext | explicitní cílový context operátora; renderer jej nekontaktuje |
| namespace | přidělený/dedikovaný namespace, neodhadovat z názvu adresáře |
| image | nový úspěšný Golden image přes `@sha256:<64hex>` |
| imagePullSecret | volitelně jméno již externě vytvořeného registry Secret v témže namespace; nikdy token |
| expose | false pro interní workload; true až pro potvrzené HTTPS zveřejnění |
| host / tlsSecret | při expose:true skutečný host/DNS a existující cert Secret ve stejném namespace |
| ingressClass | `traefik` je pouze ověřená referenční třída; potvrďte ji v cílovém clusteru |
| httpsEntrypoint | při expose:true skutečný HTTPS entrypoint existujícího Traefiku, bez odhadu websecure |

```sh
node ga/scripts/render-deployment.mjs ga/deploy/config.local.json > /tmp/ga-release.json
```

Tento příkaz pouze zapisuje JSON `v1/List`, nic nenasazuje. Chybějící hodnoty, mutable image a starý Pre2 repository odmítne. `config.local.json` je ignorovaný Gitem. JSON manifesty nepotřebují další npm/YAML dependency. Lokální offline ověření Kustomize je zaznamenané v `validation/offline-kustomize.json`; **není to server-side schema/admission kontrola**. Nikdy neaplikujte šablony/config adresář hromadně.

## Vlastní rollout — pouze autorizovaný deployer

Nastavte `KUBE_CONTEXT` a `NAMESPACE` přesně podle vyplněné konfigurace. Nejprve ověřte context, node architektury, existující IngressClass/TLS/pull přístup. Nepřepínejte globální current-context; všechny příkazy explicitně cílí context.

Pro nový namespace jej po kontrole vytvořte nejprve, jinak server dry-run celé List nemůže ověřit workload v dosud neexistujícím namespace:

```sh
kubectl --context "$KUBE_CONTEXT" create namespace "$NAMESPACE" --dry-run=client -o yaml | \
  kubectl --context "$KUBE_CONTEXT" apply -f -
kubectl --context "$KUBE_CONTEXT" apply --dry-run=server -f /tmp/ga-release.json
kubectl --context "$KUBE_CONTEXT" diff -f /tmp/ga-release.json
# diff exit1 = změny; >1 = chyba. Posuďte výstup, teprve pak:
kubectl --context "$KUBE_CONTEXT" apply -f /tmp/ga-release.json
kubectl --context "$KUBE_CONTEXT" -n "$NAMESPACE" rollout status deployment/ga --timeout=180s
kubectl --context "$KUBE_CONTEXT" -n "$NAMESPACE" get pods,service,ingress
```

Workload má2repliky, Service80→8080, nonroot UID/GID10001, tokenoff, RuntimeDefault seccomp, capabilitiesdropALL, readonlyroot a64Mi `/tmp`. Liveness/readiness jsou oddělené `/healthz` probes. Namespace template nemění existující namespace labels. Neinstaluje se controller, Traefik chart, certificate manager ani nový cluster-wide addon. Private GHCR přístup vytvořte svým secret-managementem; ActionsGITHUB_TOKEN není dlouhodobý cluster credential. Zachovejte existující přístupovou politiku; route/Secret reference samy autentizaci nezajišťují.

## Přijetí a rollback

Nejprve případně interní port-forward Servicega, potom ověřte skutečný dedikovaný HTTPS host na `/` bez pathrewrite. Traefik template nastavuje explicitní router.tls:true i potvrzený entrypoint; samotný tls.secretName TLS nezapíná. Certifikát/DNS musí obstarat existující cluster postup.

Ověřte `/healthz`, `/build.json`, title/LEVEL, vstup+audio po kliknutí, OPLWorklet/WASM i FLACfallback, výchozí HD grafiku, přepnutí `HD` do původního režimu a HD přehled `MAP`, konzoli/404 a skutečný mobil zvlášť. `/build.json.commit` musí být plný buildSHA a sourceSnapshot musí souhlasit s release manifestem. Skutečný CIcommit se neplete s původním dirty parentHEAD ve source-state. Probe200 není game/playthrough důkaz. Reload během aktualizace může resetovat současnou partii; hráče upozorněte, userpartie se při přípravě nereloadovala.

Preferovaný rollback: doplňte předchozí **ověřený digest** do configu, znovu render/dry-run/diff/apply. Nouzově `kubectl --context "$KUBE_CONTEXT" -n "$NAMESPACE" rollout undo deployment/ga`, ověřte rollout a pak opravte deklarovanou image konfiguraci, aby další apply rollback nezrušil. Neměňte host/origin bez důvodu: browser storage je vázaná na origin.

Předávací zápis po skutečné práci: build commit+snapshot, image digest/platformy, context/namespace/URL, rollout, TLS a runtime přijetí, zjištěné meze, rollback digest. Zde zatím **žádná taková deployment úspěšnost netvrzena není**.

## Reference

[GitHub path filter semantics](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#onpushpull_requestpull_request_targetpathspaths-ignore), [Docker multi-platform](https://docs.docker.com/build/ci/github-actions/multi-platform/), [reproducible timestamps](https://docs.docker.com/build/ci/github-actions/reproducible-builds/), [K3s networking](https://docs.k3s.io/networking/networking-services), [Traefik Ingress TLS](https://doc.traefik.io/traefik/reference/routing-configuration/kubernetes/ingress/), [Kubernetes probes](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/).

## Samostatný GitHub release Golden Axe

Verze balíčku0.2.0 používá vlastní prefix `ga-v0.2.0`, nikoli existující Pre2tag `v*`. Image se staví na main/workflow_dispatch; tagpush sám další image ani release nevytváří. Po úspěšném GA CI vytvoří release owner tag na přesném otestovaném packaging commitu a samostatný GitHub release s názvem Golden Axe. Před vytvořením musí znovu ověřit nepoužitý tag.

Deployer asset je explicitní `ga-v0.2.0.tar.gz` z committed `ga/` subtree a `ga-v0.2.0.SHA256SUMS`; GitHub automatický SourcecodeZIP obsahuje celý parentrepo a není GA-only balíček. Archiv ponechává tracked build.json jako poctivý lokální template; skutečný čistý buildcommit se ověřuje vCI image. Pro CI-integrační test použijte cílový repo včetně obou rootworkflow; samotný GA kontejner/render nepotřebují Pre2runtime.

Release notes uvedou actual packagingcommit, runtime snapshot, GA CIrun, skutečný image digest/platformy, checksum přiloženého archivu, známé meze a žádný clusterdeploy. HD je výchozí remaster; release netvrdí úplnou nativeexact věrnost. Pozdní1P Duel má jasně označený předběžný bossův barevný kontext podle současného portu, shoda s DOS zůstává neověřená. Žádný release/push při původním balení neproběhl.

Požadovaný deployment host pro toto předání je `ga.500miles.cz`. Je to vstup pro deployera, nikoli potvrzení změnyDNS/TLS/Ingressu nebo skutečného nasazení; žádný cluster se při vydání nemění. Historický ga-v0.1.0 zůstává neměnný.
