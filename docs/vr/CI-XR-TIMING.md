# XR controller regression timing

The first controller regression in run [39623600462](https://github.com/michalmedvecky/pre2-web/actions/runs/39623600462) stopped before Docker publication. The preserved [failure record](ci-xr-timeout.json) comes from the SHA-256-verified Actions artifact.

Observed: the club approach exceeded its 60-second wall-clock limit after only 532 XR frames in the entire scenario. Player X was 10.9325 and bear X was 12.26578: their gap was 1.33328 metres, while the test waits for less than 1.3 metres. Tracking and simulation were active. Inference: software stereo rendering made wall time a poor proxy for gameplay progress; the record does not demonstrate a game freeze.

The controller test now uses a 640×360 canvas, matching its mock XR framebuffer, and bounds the stick-driven approach by 900 additional XR frames with a separate 240-second wall-clock failsafe. Reaching the original distance remains mandatory. The grip swing, bear defeat, 500-point award, haptics, tracking loss, recentering and session-end assertions remain intact. The success report records approach distance and frame count. Production rendering and game rules are unchanged.

The CI job still runs all five browser scenarios and the complete game test suite before building either image architecture. Publication is accepted only after both architectures and the published-image HTTP smoke test pass. Physical Quest testing remains separate from this browser regression.

Local verification: all 274 game tests and all five browser scenarios (controllers, level one, HD/secrets, spatial rendering and adventure) passed. The controller approach took 226 XR frames and stopped at a 1.29283m gap; the tracked swing defeated the bear and awarded 500 points. Workflow lint and whitespace checks also passed.
