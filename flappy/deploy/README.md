# Flappy: nasazení do k3s

Flappy je samostatná statická aplikace. Produkční nginx servíruje celý obsah `flappy/dist/` na portu 8080. Nepotřebuje Node, databázi, PVC ani společný backend s Prehistorikem nebo Golden Axe. Složka `flappy/` je cesta v repozitáři; aplikaci publikujte na `/` vlastního hostname, nikoli pod URL `/flappy/`.

## Image a soubory

- Samostatný workflow publikuje image pro `linux/amd64` i `linux/arm64`. Výchozí repository je `ghcr.io/michalmedvecky/pre2-web-flappy`; volitelné repository variables `FLAPPY_IMAGE_REPOSITORY` a `FLAPPY_NGINX_IMAGE` dovolují změnit repository a digestem připnutou oficiální nginx základnu.
- Počkejte na úspěšné CI pro požadovaný commit. Z Actions summary zkopírujte celý `registry/repository@sha256:<digest>`; renderer nepřijímá pohyblivé tagy.
- Kontejner používá UID/GID 10001, port 8080, `/healthz` a revalidaci cache. Chybějící soubory vrací 404; není zde SPA fallback ani service worker.
- `workload.template.json` vytváří Namespace, dvoureplikový Deployment a ClusterIP Service `flappy`. Pod má read-only root filesystem, omezená oprávnění a zapisovatelný `/tmp`.
- `ingress.template.json` přidá samostatnou HTTPS routu pouze při explicitním `expose: true`.
- Renderer pouze vytváří JSON. Nevybírá context a neprovádí žádnou síťovou ani clusterovou operaci.

Následující příkazy se spouštějí ze složky `flappy/`. Všechny skutečné hodnoty vyberte pro zamýšlený cluster; příklady neobsahují konkrétní produkční context, doménu ani certifikát.

## 1. Vyplňte lokální konfiguraci

```sh
cp deploy/config.example.json deploy/config.local.json
```

Upravte `deploy/config.local.json`:

| Pole | Hodnota |
| --- | --- |
| `kubeContext` | Přesný zamýšlený context; povinný i pro samotné renderování. |
| `namespace` | Vyhrazený namespace, ve vzoru `flappy`. Názvy Deploymentu a Service zůstávají `flappy`. |
| `image` | Image digest úspěšného Flappy CI. Renderer odmítá repository Prehistoriku i Golden Axe. |
| `imagePullSecret` | Jméno existujícího Secretu pro soukromý registry v tomto namespace, jinak prázdný řetězec. |
| `expose` | `false` pro workload a Service bez ingressu; `true` pro explicitně připravenou HTTPS routu. |
| `host`, `tlsSecret` | Při `expose: true` skutečný DNS hostname a existující TLS Secret ve stejném namespace. |
| `ingressClass` | Při `expose: true` nainstalovaná ingress class; příklad uvádí `traefik`. |
| `httpsEntrypoint` | Při `expose: true` přesný nainstalovaný HTTPS entrypoint Traefiku; neodvozuje se automaticky. |

Privátní GHCR package vyžaduje existující pull Secret s přístupem k image. Krátkodobý Actions `GITHUB_TOKEN` není clusterový pull credential. Konfigurace odkazuje pouze na název Secretu; registry tokeny ani TLS klíče do ní nepatří.

## 2. Vyrenderujte a zkontrolujte manifest

```sh
node scripts/render-deployment.mjs deploy/config.local.json > /tmp/flappy-manifests.json
```

Zkontrolujte image digest, namespace, selektory a případný hostname. Nevyřešené zástupné hodnoty, neplatné typy nebo chybějící povinné údaje renderování zastaví. Při `expose: false` výstup neobsahuje Ingress.

## 3. Proveďte rollout ve zvoleném contextu

Použijte stejné hodnoty contextu a namespace jako v konfiguraci. Následující příkazy spouští deployer s přístupem k vybranému clusteru, až po kontrole manifestu:

```sh
KUBE_CONTEXT='zamysleny-context-z-konfigurace'
NAMESPACE='flappy'
MANIFEST='/tmp/flappy-manifests.json'

kubectl --context "$KUBE_CONTEXT" apply --dry-run=client --validate=false -f "$MANIFEST"
kubectl --context "$KUBE_CONTEXT" diff -f "$MANIFEST"
kubectl --context "$KUBE_CONTEXT" apply -f "$MANIFEST"
kubectl --context "$KUBE_CONTEXT" -n "$NAMESPACE" rollout status deployment/flappy --timeout=180s
kubectl --context "$KUBE_CONTEXT" -n "$NAMESPACE" get deployment,pods,service
```

`kubectl diff` vrací kód 1, pokud našel změny; zkontrolujte je před `apply`. Readiness ověřuje nginx, nikoli všechny herní mechaniky. CI k žádnému clusteru přístup nepotřebuje a samotné publikování image neprovádí rollout.

Pro kontrolu neveřejné Service můžete dočasně otevřít lokální forward:

```sh
kubectl --context "$KUBE_CONTEXT" -n "$NAMESPACE" port-forward service/flappy 8080:80
```

Pak otevřete [lokální hru](http://localhost:8080/) a ověřte také [health endpoint](http://localhost:8080/healthz) a [identitu buildu](http://localhost:8080/build.json). Forward ukončete po kontrole.

## HTTPS, ověření a návrat verze

Před zapnutím ingressu připravte DNS, existující Traefik HTTPS entrypoint a TLS Secret podle zavedené konfigurace clusteru. Šablona neinstaluje ingress controller ani cert-manager a nepřepisuje routy ostatních her. Zachovejte požadovanou autentizaci a přístupovou politiku.

Na výsledném HTTPS hostname ověřte platný certifikát, `/healthz`, `/build.json` se správným commitem a načtení `game.js`, `engine.js`, `levels.json` a `sprites.json`. Hra se má otevřít na stage 09. Vyzkoušejte pohyb, restart, pauzu, výběr stage, původní grafiku a zvuk po kliknutí; na mobilu také dotyková tlačítka a rozložení. Chybějící URL musí vracet 404. Plný test na fyzickém telefonu je samostatné ověření.

Pro další release změňte `image` na nový ověřený digest a opakujte renderování, diff, apply a čekání na rollout. Pro návrat použijte předchozí ověřený digest v konfiguraci a stejný postup. Zachovejte stejný origin hry. Zaznamenejte commit, image digest, context, namespace, stav rolloutu a finální URL; samotné úspěšné `apply` nepotvrzuje běžící hru.
