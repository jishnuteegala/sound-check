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
- **Permission.** Click `Check my microphone` and wait for `text=Choose your input`. Between the click and the picker a `Step 1 of 3` / `Allow microphone access` permission screen exists but resolves within a few microtask turns under `?fake=` - do not assert seeing it. The `Microphone`-labeled selector lists three options: `Browser default` (empty value), `Built-in Microphone`, `Yeti USB Microphone`. The picker carries the `Step 2 of 3` marker. Screenshot `1280-devices.png`.
- **Guidance.** Click `Start microphone check` and wait for `text=Stay quiet`, then `text=Speak normally` (each fake phase is ~350ms). The meter (`role="meter"`) reads `aria-valuenow` above 0 during speak (fake levels are one-shot constants per phase: quiet also nonzero - pass sets 2 quiet / 45 speak, check sets 30 / 60). Under `?fake=check` the live meter additionally shows an active `Clipping detected` badge during speak. Screenshots `1280-guiding-quiet.png`, `1280-guiding-speak.png`.
- **PASS.** Wait for `.status.pass` and `text=Your microphone passed`. The findings area shows `All checks passed`; the evidence row shows `Input level` and `Clipping not detected`. Screenshot `1280-verdict-pass.png`.
- **CHECK.** In a fresh context load `?fake=check`, click through to the verdict, and wait for `text=Review your microphone setup`. Findings show `Clipping` with a `Next:` action plus informational `Quiet-period noise` and `Browser processing` cards; the evidence badge reads `Clipping detected`, and an extra `.notice` paragraph about meeting-app audio processing renders (it is tied to the browser-processing finding's `info` status - present under `?fake=check`, absent under `?fake=pass`). Screenshot `1280-verdict-check.png`.
- **Rerun.** Click `Check again` and wait for `text=Choose your input`. The device picker returns with the prior selection retained.
- **Full recipe.** `cp .agents/skills/verify-sound-check/drive.mjs <scratch-dir>/ && node <scratch-dir>/drive.mjs http://localhost:5173 <out-dir>` performs the whole walk and writes `issues.txt` - `ALL CLEAN` is the passing end state. The script file must sit next to the Playwright install's `node_modules` (Node resolves the import relative to the script path); the working directory it is invoked from does not matter.

## Gotchas

- `?fake=` is dev-only; a production preview silently ignores it and prompts for a real microphone.
- The fake playback blob is empty, so the playback step logs `ERR_REQUEST_RANGE_NOT_SATISFIABLE` - expected there, unexpected anywhere else.
- The panel entry animation can capture mid-fade; it runs ~200ms (`--duration`), so let animations finish or wait at least that long before the shot.
- Mobile user agents (`Android|iPhone|iPad`) replace the input selector with a `.notice` ("Your browser uses the OS default microphone...") - device-emulated contexts will not find `Built-in Microphone`; the recipes assume a desktop UA.
- An unknown `?fake=` value (including a bare `?fake`) activates the fake engine anyway and falls back to the pass scenario with only a `console.warn` - always use an exact `pass|check|deny` value or evidence is silently pass-shaped.
- Vite picks a free port when 5173 is taken - parse the printed `Local:` URL instead of assuming.
