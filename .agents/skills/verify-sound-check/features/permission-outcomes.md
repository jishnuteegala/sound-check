# Permission outcomes

The check handles every way microphone access can fail: denial and missing devices land on an explanatory blocked screen, while a dismissed prompt quietly returns to idle.

## Sub-features

- `perm-denied` maps a denied prompt to the blocked screen.
- `perm-dismissed` maps a dismissed prompt (AbortError or Chromium's dismissed `NotAllowedError`) back to idle.
- `perm-missing` maps missing-device failures (`NotFoundError`, other errors) to the blocked screen.
- `perm-retry` lets a blocked visitor try again back to idle.

## How to get to it (user POV)

- Load `/`, choose `Check my microphone`, then deny, dismiss, or have no microphone when the browser prompts.
- From the blocked screen, choose the retry affordance to return to the start.

## Driving it with Playwright

Preconditions:

- Dev server healthy at `http://localhost:5173`; doctor checks passed.

- **Denied.** Load `?fake=deny` (the fake engine rejects `requestPermission` with `NotAllowedError`), click `Check my microphone`, and wait for `text=We could not access your microphone`. The blocked copy explains that access was blocked and mentions checking that a microphone is connected. Screenshot `1280-blocked.png`.
- **Dismissed.** Drive `permissionEvent` in unit space instead: `error.name === "AbortError"` or `NotAllowedError` with a `dismiss` message maps to `dismissed`, which `transition` returns to `initialFlow` (covered by `src/flow.test.ts`). No browser prompt can be scripted to dismiss itself, so unit coverage is the proof here - say so in the run notes.
- **Missing device.** Same unit seam: a `NotFoundError` maps to `failed`, landing on `blocked`. The blocked copy is why this matters - it must not claim denial specifically.
- **Retry.** From the blocked screen, choose `Back to start` (button in the blocked panel) and wait for `text=Check my microphone`. The app returns to idle.

## Gotchas

- Chromium rejects a dismissed prompt as `NotAllowedError` ("Permission dismissed"), not `AbortError` - asserting only `AbortError` misses the real dismissal path.
- A blocked state reached through a real denial cannot be scripted headlessly without CDP permission overrides; the `?fake=deny` scenario is the intended surrogate.
- The blocked message covers both denial and missing-device cases by design - do not tighten it to "denied" wording.
