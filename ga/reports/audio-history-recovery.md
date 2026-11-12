# Zvuk po návratu z historie — oprava V4

Uživatel hlásil úplné ticho ve vestavěném náhledu. Nezávislé měření skutečného
PCM za masterem prokázalo zdravou čerstvou původní hudbu i remaster. Závada byla
následně reprodukována skutečným Chrome Back/Forward: prohlížeč obnovil stejný
dokument z BFCache, ale jeho pagehide už terminálně zrušil audio, vstupy a
MAP/LEVEL. Další unlock/MUSIC nemohly zavřené audio oživit. Stejná závada je
prokázaná i ve vydané0.2.6, nejde o změnu původní melodie.

Při persisted pagehide nyní aplikace pouze suspenduje audio a vyčistí držené
klávesy. Neodstraňuje event listenery ani overlay DOM. Po pageshow vrací hru
bezpečně pozastavenou a obnoví clock až při skutečném Resume/kliku/klávese.
První♪ klik v navráceném menu obnoví a odmutuje zvuk; dalšíklikymute/unmute.
Aktuální pause režim se zvukovým tlačítkem neodpauzuje. Opravdový discard stále
provádí úplný terminaldispose; OriginalAudio.dispose se nestal znovuoživitelným.
Souvislost pagehide/pageshow.persisted popisuje [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window/pagehide_event).

Finální snapshot `babd1a92606563ff6e36b97dbd1e4604f65708fbbad9bb636f577d4740a61548`,
616 souborů. Oproti394b změněn pouze js/app.js (+buildmetadata); všech26 audio
assetů i původní hudba/SFX/fyzika jsou beze změny.208 unit testů/package PASS.

Skutečný host-muted Chrome bez GOLDEN_AXE_TEST_MUTED ověřil9 cached-lifecycle
kontrol a7 nenulových post-master PCM odběrů: title/menu/original/remaster,
první♪ klik, skutečná hra/klávesy/LEVEL a terminaldiscard. Nezávislý actual
native Back/Forward test obnovil stejný dokument a po Resume→nováhra změřil
původnípeak0.295955, poMUSIC0.139988; žádnéNaN/pageerrors.616 hashů před/po stejné.

Root přímo v CUA IAB Chrome156 použil pasivní same-origin iframe diagnostiku
s produkční V4 hrou. Po explicitní PageTransitionEvent cachedfixture zůstal
context živý/suspended; skutečnýklikPokračovat obnovil post-masterpeak0.124756,
RMS0.069888. Po skutečně napsanémMUSIC peak0.156087/RMS0.047128,
master1/originalgain0/remastergain1. Jde o skutečnýIAB PCM, nikoli fyzickýposlech
ani tvrzení o nativeIABcachehitu. Samostatný skutečnýcachehit je doloženChrome
reviewerem. Dočasnádiagnostickároute a vlastnítestovacíIABtab byly odstraněny.

Důkazy: provenance/audio-history-recovery-v1.json a research evidence
music-silence-20261105/{runtime,review,iframe-probe.html,iab-restored-signal.json}.
Portable browser regrese tests/music-bfcache-browser.mjs podporuje GA_TEST_URL,
GA_QA_OUTPUT,GA_PLAYWRIGHT_MODULE,GA_CHROME_PATH. Kontroluje skutečnou amplitudu,
nikoli pouze flagplaying. FyzickýSafari/iOS a subjektivníposlech se netvrdí.

Oprava je v soukromém náhledu. Starý užcached dokument potřebuje jednou běžně
reloadnout; novýJS jeho uzavřené objekty zpětněneopraví. Potom při návratu
použít Pokračovat. Žádný nový GitHub release ani clusterdeployment.
