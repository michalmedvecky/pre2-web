# Migration to the Remastered collection

## Source and URL mapping

| Before | After |
| --- | --- |
| GitHub `michalmedvecky/pre2-web` | `michalmedvecky/remastered` (same repository/history) |
| Root Prehistorik2 source | `pre2/` |
| Golden Axe source | `ga/` |
| Flappy source | `flappy/` |
| Separate game hosts/images | One `remastered.500miles.cz` host and Remastered image |
| Root browser document | Tile index with project description, GitHub and buildcommit |
| Game browser URLs | `/pre2/`, `/ga/`, `/flappy/` |

The [GitHub repository-rename contract](https://docs.github.com/en/repositories/creating-and-managing-repositories/renaming-a-repository) redirects ordinary previous repository links. Historical tags retain their original layouts and release identities. Current source defaults and the active CI publisher use the new repository; former workflow files are retired outside `.github/workflows/`.

## What is preserved

The move initially verifies every selected Pre2 file byte-for-byte, including ignored/untracked data. Existing Pre2 WIP is saved separately during clean validation and restored under the new prefix without adding it to the migration commit. Modern metadata/link changes are isolated from engine/game data. Golden Axe and Flappy retain their pergame checksums; the root catalog additionally hashes every public runtime file. No old GitHub releases, original files or research data are removed.

This migration corrects genuine prefix failures, including Golden Axe's historical HD pilot URL/module. It adds no levels, modes or new graphics/music. Portal images are actual game renders. Detailed method/results are in HANDOFF.md and pergame migration reports.

## Fresh Kubernetes application

The image serves all sites directly from one NGINX document tree, so route prefixes must remain intact at the ingress. Missing files fail with404. Audio/WASM/webmanifest types and hashed-asset cache behavior are retained. CI tests all projects and the actual read-only multiarch image before handing its immutable digest to the deployer.

The independent deployer follows [DEPLOYER.md](DEPLOYER.md). All previous applications are to be replaced after their actual resources/dependencies are inventoried and backed up. Source examples are not proof of live cluster names. Delete the reviewed old application allowlist, then create the fresh Remastered application using the confirmed context, namespace, TLS and ingress configuration. Shared controllers, credential/certificate stores and PVC data must not be removed incidentally. The new release source/image can be fully prepared before destructive cluster changes.

No cluster operations are performed by repository preparation or image CI. Local validation is not a successful rollout receipt; production acceptance must check root and all three game prefixes, asset/audio delivery, build identity and mobile controls.
