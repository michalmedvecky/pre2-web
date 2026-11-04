# Audio shutdown lifecycle audit

Confirmed defect in ga-v0.2.5: OriginalAudio.unlock awaited AudioContext.resume
outside its try/catch. Closing the page/context while autoplay held that promise
rejected the caller with InvalidStateError. App callers generally attach a success
handler only, so this became an unhandled promise rejection. A late buffer failure
could also overwrite the terminal closed status, and stale fetches could attempt
to decode against a disposed context.

Changes: context creation/resume are inside the guarded operation; dispose is
terminal and idempotent; pending unlock/pause operations returnfalse on shutdown.
Late manifest/buffer completions cannot revive or decode on a dead context.
Ordinary device/network failures remain diagnosable. Terminal worklet disposal
releases outstanding RPC timers and the message port without waiting for a
suspended processor acknowledgment; a disposed processor returnsfalse from its
render callback, ending its active-source lifetime. Original OPL engine, sequencer,
register/music data, PCM and speaker-clock behavior are unchanged.

Ten targeted Node tests cover concurrent resume, pause, fetch/JSON/download races,
normal error diagnostics, repeated disposal, worklet RPC/port cleanup and final
processor output. Actual Chrome reproduces the old unhandledInvalidStateError
from an autonomous page script without user activation. Candidate returnsfalse,
keeps closed status and produces no rejection. A separate trusted click starts
normal originalOPL, plays3072frames, pauses/resumes to4608frames, then closes a
suspended context in~0.9ms with no page errors; browser closed, output muted.
These frame counts are this captured sample, not a universal timing assertion.

Research: golden-axe-research/evidence/audio-lifecycle-026/{before.json,
browser-checks.json,browser.mjs}. First browser setup used automation evaluation
which activated audio, so it was rejected as a reproduction; retained under
browser-setup-invalid.json. Final reproduction runs inside the page before any
synthetic gesture. No waveform/fullgame/native audio comparison was repeated.

Specification consulted through find-docs: Web Audio AudioContext close/resume
lifecycle, https://github.com/webaudio/web-audio-api/blob/main/index.bs.
