# Playback

After a verdict, a visitor can optionally record up to ten seconds and listen locally; the recording lives only as an in-memory object URL and is revoked on discard, reset, or unmount.

## Sub-features

- `playback-offer` renders the optional recording affordance after a verdict.
- `playback-record` records up to ten seconds and swaps to a discard affordance.
- `playback-listen` exposes an audio element pointing at the in-memory blob URL.
- `playback-discard` revokes the URL and returns to the offer state.

## How to get to it (user POV)

- Complete a check to reach the verdict screen.
- Choose `Record up to 10 seconds`.
- Listen via the audio element, or choose `Discard recording` to delete it.

## Driving it with Playwright

Preconditions:

- Dev server healthy at `http://localhost:5173`; doctor checks passed.
- `?fake=pass` verdict reached (see microphone-check recipe).

- **Offer.** On the verdict screen, the button `Record up to 10 seconds` is enabled beside copy stating the recording stays in memory only.
- **Record.** Click `Record up to 10 seconds` and wait for `text=Discard recording`. An `<audio controls>` element appears whose `src` starts with `blob:`.
- **Retention.** Assert the page contains `in memory only` copy and that the fake flow issued no network requests beyond same-origin assets (dev-server traffic).
- **Discard.** Click `Discard recording`; the audio element disappears and the offer button returns. `URL.revokeObjectURL` is called on the old blob URL (assertable via `page.exposeFunction` spy if the run needs it).
- **Disabled rerun.** While `recording` is true, `Check again` is disabled (`disabled={recording}` at `src/App.tsx`) - but the fake's `recordPlayback` resolves within a frame, so the window is not deterministically observable under `?fake=`. Assert it only when driving a real engine (the recording holds for up to 10s); under the fake the guard is source-verified, not driven.

## Gotchas

- The fake engine's `recordPlayback` returns an empty `Blob`; the `<audio>` element logs `ERR_REQUEST_RANGE_NOT_SATISFIABLE` on load. Expected here, and only here.
- The real engine caps recording at ten seconds; the fake resolves immediately - do not assert a ten-second wait under `?fake=`.
- A verdict-screen reset (`Check again`) must not fire while a recording is in flight; the disabled state is the regression to watch.
