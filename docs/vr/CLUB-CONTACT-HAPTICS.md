# Crafted wooden club and environmental contact

The VR club is now a smooth crooked mesh with 48 angular subdivisions and 81 axial rings (7,776 body triangles), a 1024×2048 procedural wood-grain map, subtle bump detail, knots/drying checks and a separate six-turn leather band. Shared geometry/materials serve desktop and either controller. This is editable authored 3D geometry, not an AI preview substituted for the actual game object. [Rendered preview](carved-club-preview.png).

The entire shaft is approximated by overlapping conservative spheres. The collision solver interpolates position and rotation in steps of at most 18mm of estimated swept travel, then refines the first contact. Its broad phase covers both previous and desired positions. Thin railing ropes and posts, solid source terrain, authored room shells, arch pillars, scenery proxies, trees/rocks and active moving platforms provide box proxies. Enemy/secret interactions retain their gameplay logic and use the constrained club pose. A quick swing cannot continue striking beyond a blocking wall. Decorative proxies are conservative rather than exact mesh triangles.

Only the rendered club is constrained. Actual tracked head and controller poses are never changed. When the user pushes a controller into a wall, the visible club stays at its last reachable contact pose; pulling back releases it. Initial tracking/recentering inside geometry searches for a free translated weapon pose. Session changes, tracking loss, checkpoint returns and passage changes reset contact history. This is a contact proxy rather than a force-feedback device or full rigid-body simulation; it cannot physically stop the user's hand. Extreme tracking already inside a fully enclosed volume remains a hardware acceptance case.

A moving strike against an obstacle produces a short 65ms cue with strength based on tracked motion, plus a low impact sound. Holding the hand stationary against a surface does not repeatedly buzz. Head impacts queue both controllers at strength 0.85 for 140ms. The new haptic scheduler takes live session input sources, merges simultaneous requests and preserves a stronger active cue against weaker following cues. It supports both pulse actuators and a vibrationActuator fallback, recording accepted, rejected and unsupported requests in QA snapshots. Previously each event independently sent a new pulse, allowing a later weaker event to overwrite stronger feedback. Physical head contact now triggers at the beginning of the existing proximity fade rather than after 90% occlusion.

Side rails remain along exposed outdoor floors, with original passage openings. They are omitted where the authored cave or underground boundary wall already encloses that side. Movement confinement remains unchanged. Source terrain/support/ceiling distinctions and game rewards are unchanged.

## Verification and remaining hardware check

- [x] 281 game/unit tests, including thin-object sweeps, middle-shaft contact, retreat, initial overlap, stationary contact and haptic priority/fallback.
- [x] All six browser scenarios: original controller combat, level-one rendering, HD/secret reveals, spatial rendering/turning, adventure/music/underground and new physical-grip contact.
- [x] Mocked XR grip crosses an actual level-one rail; visible club stops before it, contact buzz occurs, holding still does not repeat, retreat releases.
- [x] Head-hit event and actual tracked-head contact with exposed terrain each send both 0.85/140ms pulses; no delivery failures in mock.
- [x] Workflow lint and whitespace checks; new modules included in published-image smoke checks.
- [ ] Physical Quest: confirm both actuators, perceived impact strength, contact alignment and GPU frame time. A browser mock cannot verify physical vibration delivery.

[Saved browser evidence](club-contact-validation.json). The complete browser suite remains required before GHCR publication. No original DOS executable or emulator was run and the original files are preserved. CI artifacts contain fresh evidence for each release; Kubernetes rollout is separate.
