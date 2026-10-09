# Microphone check

The core feature: a visitor runs a quiet phase then a speaking phase and receives a plain PASS or CHECK verdict with findings, supporting evidence, and a next action.

## Sub-features

- `check-idle` renders the idle screen with hero copy, meeting-app disclaimer, and zero-retention note.
- `check-permission` requests microphone access only after an explicit click.
- `check-devices` lists available inputs on desktop-style flows.
- `check-guidance` steps the visitor through "Stay quiet" then "Speak normally" with a live input meter.
- `check-verdict-pass` renders PASS with an all-clear finding and phase-aggregate evidence.
- `check-verdict-check` renders CHECK with failing findings, next actions, and informational findings.
- `check-rerun` returns to the device picker via "Check again".

## How to get to it (user POV)

- Load `/` and choose `Check my microphone`.
- Allow microphone access when the browser prompts.
- Choose `Start microphone check` on the input screen.
- Complete the guided quiet and speaking phases.

## Driving it with Playwright

Preconditions:

- Dev server healthy at `http://localhost:5173`; doctor checks passed.
- Playwright scratch install exists outside the repo.

- **Idle.** Load `${base}/?fake=pass` and wait for `text=Check my microphone`. The hero `Know your microphone before the call starts.` and the `Zero retention.` note are visible. Screenshot `1280-idle.png`.
- **Permission.** Click `Check my microphone` and wait for `text=Choose your input`. The input selector lists `Built-in Microphone` and `Yeti USB Microphone`. Screenshot `1280-devices.png`.
- **Guidance.** Click `Start microphone check` and wait for `text=Stay quiet`, then `text=Speak normally` (each fake phase is ~350ms). The meter (`role="meter"`) reads `aria-valuenow` above 0 during speak. Screenshots `1280-guiding-quiet.png`, `1280-guiding-speak.png`.
- **PASS.** Wait for `.status.pass` and `text=Your microphone passed`. The findings area shows `All checks passed`; the evidence row shows `Input level` and `Clipping not detected`. Screenshot `1280-verdict-pass.png`.
- **CHECK.** In a fresh context load `?fake=check`, click through to the verdict, and wait for `text=Review your microphone setup`. Findings show `Clipping` with a `Next:` action plus informational `Quiet-period noise` and `Browser processing` cards; the evidence badge reads `Clipping detected`. Screenshot `1280-verdict-check.png`.
- **Rerun.** Click `Check again` and wait for `text=Choose your input`. The device picker returns with the prior selection retained.
- **Full recipe.** `cp .agents/skills/verify-sound-check/drive.mjs <scratch-dir>/ && node <scratch-dir>/drive.mjs http://localhost:5173 <out-dir>` performs the whole walk and writes `issues.txt` - `ALL CLEAN` is the passing end state. The script must run from the Playwright install dir; Node resolves the import relative to the script.

## Gotchas

- `?fake=` is dev-only; a production preview silently ignores it and prompts for a real microphone.
- The fake playback blob is empty, so the playback step logs `ERR_REQUEST_RANGE_NOT_SATISFIABLE` - expected there, unexpected anywhere else.
- The panel entry animation can capture mid-fade; let animations finish or wait 150ms before the shot.
- Vite picks a free port when 5173 is taken - parse the printed `Local:` URL instead of assuming.
