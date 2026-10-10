# Product

## Register

product

## Platform

web

## Users

People about to join a call who suspect - or have been told - their microphone is not working.
They arrive mid-task, often minutes before a meeting, on whatever desktop or mobile browser is in front of them.
They need a fast, unambiguous answer about the raw signal, not a diagnostics suite, and they need to trust that granting microphone permission to a website will not leak their audio.

## Product Purpose

Sound Check answers one question: is the microphone signal itself ready before the call starts?
After an explicit start and a browser permission prompt, it runs a short quiet phase and a speaking phase, measures input presence, speaking level, clipping, room noise, and browser audio processing, and returns a plain PASS or CHECK verdict with named reasons and next actions.
An optional ten-second in-memory playback lets the visitor hear exactly what the microphone captured.
Audio never leaves the browser: no upload, no storage, no accounts, no analytics, no third-party requests.

## Positioning

The five-second sanity check before the meeting app, scoped deliberately to the signal itself - it reports what it can measure and says plainly what it cannot guarantee.

## Brand Personality

Plain-spoken, calm, and precise.
The voice states exactly what was measured and what failed ("Your microphone signal is clipping") and never oversells: a PASS carries its own caveat that meeting apps may apply their own processing.
Zero-retention is stated as a fact of the architecture, not a promise.

## Anti-references

Not a meeting-app settings clone with device graphs and sliders.
Not a landing page: no hero, no testimonials, no marketing copy between the visitor and the button.
Not an audio workbench: no waveform editors, no export, no accounts.

## Design Principles

Ask before measuring: microphone access is requested only after the visitor starts, and every state - idle, pending, denied, missing device - is named and explained.

Two phases, one verdict: the quiet-then-speaking ritual is the entire interaction, announced step-by-step, ending in PASS or CHECK rather than a score.

Show the evidence: every verdict carries the measurements behind it - live level, clipping status, named findings - so the result is auditable, not asserted.

Privacy is architecture: the absence of upload paths is a property of the code, restated in the UI, the README, the privacy page, and verified against the built bundle.

Honour the platform: skip link, live regions, visible focus, 44px+ targets, and motion gated behind `prefers-reduced-motion`.

## Accessibility & Inclusion

The whole flow is keyboard-operable with a skip link into the check flow and visible `:focus-visible` outlines.
Verdicts and phase changes are announced through a polite live region.
Interactive controls meet a 44px tap target.
All palette pairs meet WCAG AA contrast (the weakest text pair measures 6.78:1), and all motion is effectively instant under `prefers-reduced-motion`.
