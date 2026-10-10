# CONTEXT

Glossary of terms for sound-check.

## Terms

### Check

A single measurement pass: two seconds of quiet followed by three seconds of speaking.
Produces a verdict, never audio that leaves the browser.
The five checks are dead input, low speaking level, clipping, quiet-period noise, and browser audio processing.

### Quiet phase

The first two seconds of a check.
Measures the room's noise floor while the visitor stays silent; the result is compared against the speaking phase rather than an absolute level.

### Speaking phase

The second, three-second phase of a check.
Measures RMS level, peak, and clip count while the visitor talks at call volume.

### Verdict

The plain-language result of a check: **PASS** when every measurement sits inside the conservative operating range, **CHECK** when one or more measurements need attention.
A PASS is scoped to the raw signal; it does not promise behaviour inside Zoom, Meet, Teams, or any other meeting app, and the UI says so.

### Thresholds

The conservative cut-offs in `src/core/thresholds.ts`, each with an in-code rationale.
Dead input trips at RMS 0.003 or below, low speech at RMS 0.02 or below while above the dead floor, clipping when at least 3 samples in the speaking phase reach the 0.98 peak ceiling, and quiet-period noise when the quiet/speaking RMS ratio reaches 0.5 (unusable at 0.8).

### Flow

The explicit screen state machine in `src/flow.ts`: `idle`, `permission`, `devices`, `guiding`, `verdict`, `blocked`.
`dismissed` (the visitor closed the browser prompt, surfaced as `AbortError` or a dismissed `NotAllowedError`) returns to idle; `denied` and any other failure land on `blocked`, which explains what happened.

### Playback

An optional, user-initiated recording of up to ten seconds, kept as an in-memory object URL and revoked on discard, reset, or unmount.
Nothing is uploaded, persisted, or retained.

### Fake engine

`src/audio/fake-engine.ts`, active only in dev builds via `?fake=pass|check|deny`.
Replaces real capture with scripted measurements so every screen state can be exercised without a microphone.

### `_headers` contract

`public/_headers` ships with the bundle and is applied as-is by Cloudflare Pages; Netlify also reads `_headers`, though the `!` detach lines are a Pages convention.
It carries the strict CSP (`default-src 'self'`, `connect-src 'self'`, `media-src 'self' blob:`), the microphone-scoped `Permissions-Policy`, `X-Frame-Options: DENY`, immutable caching for `/assets/*`, and `!` detachments for Cloudflare's NEL/Report-To reporting headers so the "no third-party requests" claim holds in production.
Other hosts must configure the same headers explicitly; the README self-hosting snippets mirror them.

### `llms.txt` contract

`llms.txt` and `public/llms.txt` are byte-identical on purpose.
`pnpm run check:llms` enforces it; `pnpm run verify:preview` enforces it again against the built bundle.

### Release archive

The deterministic `dist/` bundles (`sound-check-<version>.zip` / `.tar.gz`) plus `SHA256SUMS` produced by `scripts/package_release.py` and attached to every GitHub Release.
They are the supported self-hosting path.
