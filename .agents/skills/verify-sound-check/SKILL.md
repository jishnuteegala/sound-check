---
name: verify-sound-check
description: "Verify Sound Check's mic-check web UI end to end: launch the Vite dev server, drive the ?fake= scenarios through the real React flow with headless Playwright, and capture screenshot/console evidence. Reach for it before shipping UI, copy, flow, or accessibility changes to this repo."
---

# Verify Sound Check

Sound Check is a single-page React 19 + Vite app. Its real surface is the browser UI; a dev-only fake audio engine (`?fake=pass|check|deny` in `src/audio/fake-engine.ts`) replaces the microphone so every screen state is drivable headlessly. Production builds ignore `?fake=`, so verification always runs against `pnpm dev`, never `pnpm preview`.

## Launch

From the repo root:

```sh
pnpm dev --port 5173
```

Run it backgrounded (a persistent shell, `timeout: 0`, or `nohup`). Ready when `curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/` returns `200`; Vite also prints `Local: http://localhost:5173/` on stdout. Record the shell/PID you started - teardown kills that process only, never a node process by name.

## Doctor

One read-only check before driving, and again whenever anything looks off:

```sh
curl -s "http://localhost:5173/?fake=pass" | grep -o "<title>[^<]*"
curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/src/main.tsx
```

Expect the `<title>` line from `index.html` and a `200` on the transformed entry module. A `200` on `/` alone is not proof: any file server can answer 200. If Vite drifted to another port (`5174+`), read the port it printed rather than guessing - a wrong-port fetch can silently hit an unrelated server. Do not drive an instance this run did not start.

## Drive

Headless Chromium via Playwright, installed in a scratch directory outside the repo so nothing pollutes `package.json`:

```sh
mkdir -p "$TEMP/sc-verify" && cd "$TEMP/sc-verify" && pnpm add playwright@1.63.0
pnpm exec playwright install chromium   # once per machine, if browsers are absent
```

Copy `drive.mjs` into the scratch directory and run it there - Node resolves `playwright` relative to the script's own directory, so invoking it in place inside the repo fails:

```sh
cp /path/to/repo/.agents/skills/verify-sound-check/drive.mjs "$TEMP/sc-verify/"
node "$TEMP/sc-verify/drive.mjs" http://localhost:5173 "$TEMP/sc-verify/out"
```

The script drives the `?fake=pass` scenario through the full check: idle, device picker, quiet phase, speaking phase, PASS verdict, playback and discard, rerun to the device picker, plus a CHECK verdict, a denied-permission blocked state and retry, the design-system route and its nav/skip contracts, and 360/768px variants. It asserts no horizontal overflow, collects `console.error`/`pageerror` output, and asserts no request leaves the origin. Stable handles (from `src/App.tsx`, `src/design-system.tsx`, `src/components.tsx`, `src/styles.css`): text `Check my microphone`, `Choose your input`, `Start microphone check`, `Stay quiet`, `Speak normally`, `Your microphone passed`, `Review your microphone setup`, `Back to start`, `Discard recording`, `Check again`, `Record up to 10 seconds`, `Design system`, `Back to check`, `Findings`, `We could not access your microphone`, `in memory only`, classes `.status.pass`, `.status.check`, selectors `a.skip-link`, `a.quiet-link`, `role="meter"`, `audio`, route `#/design-system`, targets `main#tokens`, `main#main-content`.

## Evidence

Capture under a named artifacts directory outside the repo - `"$TEMP/sc-verify/out"` in the recipe above - so cleanup can never eat the proof. A real proof includes:

- A screenshot per state at the verified widths, named `<width>-<state>.png`.
- The console/pageerror log for the run.
- For interaction proof: the action plus the resulting state (e.g. activating the skip link, then `document.activeElement.id`).
- One known-benign error is expected on the playback shot: the fake engine returns an empty `Blob`, so the `<audio>` element logs `ERR_REQUEST_RANGE_NOT_SATISFIABLE`. Dev-only; the real engine records real audio. Flag anything else.

## Cleanup

Kill only the server process this run started (the recorded shell/PID; on Windows `powershell.exe Stop-Process -Id <pid>` if a handle is needed). Delete the scratch Playwright install only if disk pressure demands it. Evidence in the named artifacts directory survives teardown by construction - confirm it still exists before calling the run done.

## Helpers

`drive.mjs` in this directory is the shipped driver: `node drive.mjs <base-url> <out-dir>`. It needs Playwright resolvable from its own directory - copy it into the scratch install before running (Node ESM ignores cwd and `NODE_PATH`). Feature recipes live in `features/`; drive one mapped feature per run at minimum.
