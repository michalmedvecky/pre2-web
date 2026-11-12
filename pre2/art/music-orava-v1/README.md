# ORAVA — original vocal songs for all seventeen stages

Release 1.5.0. Type **ORAVA** during play to select the vocal folk soundtrack; repeat to restore original music. **MUSIC** still selects the violin/piano/string-orchestra arrangements. Either cheat can switch directly from the other mode. Sound on/off is separate. Every page load defaults to original music; neither optional soundtrack is downloaded before selection. Original effects remain unchanged.

The approved forest pilot is retained for stage 1. Sixteen additional short songs match that format: approximately thirty seconds, a Slovak verse and refrain, male lead and group refrain with fiddle, bowed strings, folk bass, restrained bagpipe drone and flute replies. These are **new compositions**, not note-preserving remixes of the original MODs. They are Orava-inspired originals, not archival performances or authenticated local dialect reconstructions. Pronunciation and sung adherence to the submitted text are generated and may vary; automated audio checks do not certify those qualities. No specific performer is imitated. No traditional lyrics or recordings are copied.

## Songbook

| Stage | Song | Theme |
| --- | --- | --- |
| 1 | Hej, cez jamu | Forest, bears, hungry adventurer |
| 2 | Svieca v sivej skale | Dark caves and crumbling planks |
| 3 | Pod zelenou skalou | Green rocks, roots and a bear |
| 4 | Žlté krídlo nad horou | Giant trees and a hang-glider |
| 5 | Jesenný chodníček | Autumn leaves and a hollow tree |
| 6 | Nedáš ma, starý strom | Tree boss and striking roots |
| 7 | Sneh pod bosou nohou | Snow and the warmth of home |
| 8 | Ľadová jaskyňa | Ice ledges and hanging stalactites |
| 9 | Kľúč od kamennej brány | Castle, statues and a locked gate |
| A | Obor za hradbami | Giant boss and victory |
| B | Čerešne na veľkej žemli | Giant sandwich, cheese and cherries |
| C | Hostina pod nosom | Roast pig, grapes and a feast |
| D | Po lístku za ovocím | Leaf ramps and sweet treasure |
| E | Pod kvapľovou strechou | Flowstone, bones and a buzzing wasp |
| F | Domov s plnou kapsou | Homecoming and closing credits |
| G | Burger na ľade | Slippery platforms and a burger |
| H | Jantárová kráľovná | Amber hive, honey and the queen |

[songs.json](songs.json) contains the submitted original lyrics and themes. Exact prompts are in `prompts/`; `tasks.json` retains all seventeen provider task IDs. The pilot's original prompt and lyrics also remain beside this document. The playback catalog includes song titles, lyrics, task IDs, lengths, file sizes and SHA-256 hashes.

## Playback and packaging

The level ID selects `LEVEL_1` through `LEVEL_H` independently of the twelve shared original MOD names. Menus reuse the forest song; completion tallies reuse the homecoming song; game over reuses the dark-cave song. No extra paid generations are needed for those contexts.

Only the current optional player runs. Switching modes stops both pending decodes and playback; stale requests cannot silence newer music. Inactive players release their decoded buffer. Each player caches at most one decoded song; no whole-album download or decode occurs. Native music plays during loading and on failure. The music buses follow the normal mute control; the native mixer continues to own sound effects.

The shipped AAC/M4A files total about 12.5 MB; each is fetched individually. They loop the full short song, with 20 ms fades at either edge to reduce clicks. This is not a claim of beat-matched, seamless vocal looping. `scripts/pack-orava-music.py` preserves the full decoded duration, normalizes level with peak headroom and encodes 192 kb/s AAC. Source MP3s and decoded WAVs are local ignored intermediates; source hashes and measured RMS/peak/gain are recorded per song in `review/`.

## Verification

`tests/orava-music.test.mjs` checks prefix handling, all seventeen mappings, mutually exclusive modes, cancellation, original fallback, SFX, provenance and asset hashes. `scripts/verify-orava-music-browser.mjs` exercises real ORAVA/MUSIC keyboard input and all seventeen actual stage transitions in Chromium and WebKit, decodes every asset, checks duration/loop/RMS/peak, simulates an HTTP failure, checks mute and verifies original mode with no optional requests after reload. Results are in `review/browser.json`. The pre-existing orchestral browser checks also passed for all twelve arrangements in both engines. The complete test suite passed 366 tests; all 54 original files remain unchanged.

## Regional references

The Centre for Traditional Folk Culture documents bagpipes and violin in upper Orava: [muzika](https://www.ludovakultura.sk/polozka-encyklopedie/muzika/). A regional archive record documents male/female singing with bagpipes and violin from Oravská Polhora: [Obrtki](https://fondtlk.sk/sk/detail-sluk_us_cat.2-0001552-Obrtki-z-Oravskej-Polhory/). These descriptions informed the creative direction; no archived audio was used.
