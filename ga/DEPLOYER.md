# Golden Axe — předání deployerovi pro k3s

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

Ověřte `/healthz`, `/build.json`, title/LEVEL, vstup+audio po kliknutí, OPLWorklet/WASM i FLACfallback, HDpreview (jenpreview), konzoli/404 a skutečný mobil zvlášť. `/build.json.commit` musí být plný buildSHA a sourceSnapshot musí souhlasit s release manifestem. Skutečný CIcommit se neplete s původním dirty parentHEAD ve source-state. Probe200 není game/playthrough důkaz. Reload během aktualizace může resetovat současnou partii; hráče upozorněte, userpartie se při přípravě nereloadovala.

Preferovaný rollback: doplňte předchozí **ověřený digest** do configu, znovu render/dry-run/diff/apply. Nouzově `kubectl --context "$KUBE_CONTEXT" -n "$NAMESPACE" rollout undo deployment/ga`, ověřte rollout a pak opravte deklarovanou image konfiguraci, aby další apply rollback nezrušil. Neměňte host/origin bez důvodu: browser storage je vázaná na origin.

Předávací zápis po skutečné práci: build commit+snapshot, image digest/platformy, context/namespace/URL, rollout, TLS a runtime přijetí, zjištěné meze, rollback digest. Zde zatím **žádná taková deployment úspěšnost netvrzena není**.

## Reference

[GitHub path filter semantics](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#onpushpull_requestpull_request_targetpathspaths-ignore), [Docker multi-platform](https://docs.docker.com/build/ci/github-actions/multi-platform/), [reproducible timestamps](https://docs.docker.com/build/ci/github-actions/reproducible-builds/), [K3s networking](https://docs.k3s.io/networking/networking-services), [Traefik Ingress TLS](https://doc.traefik.io/traefik/reference/routing-configuration/kubernetes/ingress/), [Kubernetes probes](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/).

## Samostatný GitHub release Golden Axe

Verze balíčku0.1.1 používá vlastní prefix `ga-v0.1.1`, nikoli existující Pre2tag `v*`. Image se staví na main/workflow_dispatch; tagpush sám další image ani release nevytváří. Po úspěšném GA CI vytvoří release owner tag na přesném otestovaném packaging commitu a samostatný GitHub release s názvem Golden Axe. Před vytvořením musí znovu ověřit nepoužitý tag.

Deployer asset je explicitní `ga-v0.1.1.tar.gz` z committed `ga/` subtree a `ga-v0.1.1.SHA256SUMS`; GitHub automatický SourcecodeZIP obsahuje celý parentrepo a není GA-only balíček. Archiv ponechává tracked build.json jako poctivý lokální template; skutečný čistý buildcommit se ověřuje vCI image. Pro CI-integrační test použijte cílový repo včetně obou rootworkflow; samotný GA kontejner/render nepotřebují Pre2runtime.

Release notes uvedou actual packagingcommit, runtime snapshot, GA CIrun, skutečný image digest/platformy, checksum přiloženého archivu, známé meze a žádný clusterdeploy. Release se nevydává jako dokončený HD/nativeexact remaster; HD zůstává preview. Žádný release/push při původním balení neproběhl.

Požadovaný deployment host pro toto předání je `ga.500miles.cz`. Je to vstup pro deployera, nikoli potvrzení změnyDNS/TLS/Ingressu nebo skutečného nasazení; žádný cluster se při vydání nemění. Historický ga-v0.1.0 zůstává neměnný.
