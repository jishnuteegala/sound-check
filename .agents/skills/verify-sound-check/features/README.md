# Sound Check verification map

This directory is the maintained source for verifying Sound Check's user-facing behavior. Read this index before driving the app, then use the matching feature file as the recipe.

## Baseline preconditions

- Dev server launched by this verification run at `http://localhost:5173` (`pnpm dev --port 5173`, backgrounded).
- Doctor passed: `/?fake=pass` serves the app `<title>` and `/src/main.tsx` returns 200.
- The `?fake=pass|check|deny` query parameter replaces the real audio engine - it exists only in dev builds (`import.meta.env.DEV`), so never drive `pnpm preview` or the deployed site for flow checks.
- Headless Playwright is installed in a scratch directory outside the repo.
- Never drive an instance this run did not start.

## Driving conventions

- Start every recipe from the baseline state unless its preconditions say otherwise.
- Prefer semantic hooks (button text, `role="meter"`, the `a.skip-link` skip link) and route hashes over ad-hoc CSS selectors or tab order.
- Fake scenario timings are ~350ms per phase; wait on the state text, never on a fixed sleep.
- Run browser actions through Playwright (`p.click`, `p.waitForSelector`, `p.focus`, `p.keyboard.press`); run assertions against text, DOM state, and screenshots.
- One known-benign console error: the playback shot logs `ERR_REQUEST_RANGE_NOT_SATISFIABLE` because the fake engine returns an empty `Blob`.

## Proof and skip reporting

- Capture the user action and the resulting state, not only the final screen.
- UI proof is a screenshot plus the console/pageerror log; state proof is a DOM assertion (`document.activeElement.id`, `location.hash`, `aria-valuenow`).
- Record the feature ID and scenario (`pass`/`check`/`deny`) with every artifact. In the shipped driver, artifact names encode `<width>-<state>` and the scenario is fixed per name (see `drive.mjs`); when driving manually, prefer names that also carry the feature ID or scenario (`360-deny-blocked.png`).
- A screenshot set is incomplete without the horizontal-overflow check (`document.documentElement.scrollWidth - clientWidth === 0`).
- Report an unreachable path with the attempted command and the unmet precondition; never report a skipped entry point as verified through a different one.

## Feature entry contract

Each feature file starts with an H1 title and one paragraph describing the user-visible behavior. It then uses exactly four H2 sections in this order.

1. `Sub-features` lists short IDs with one line for each behavior.
2. `How to get to it (user POV)` lists every user entry point.
3. `Driving it with <harness>` starts with `Preconditions:` and uses labeled bullets pairing each action with an exact command and observable result.
4. `Gotchas` lists traps that can waste or invalidate a verification run.

Keep implementation details out of the map. Name only user paths, stable handles, required state, commands, and observable proof.

## Features

- [Microphone check](./microphone-check.md) covers the core flow: idle, device choice, quiet and speaking guidance, verdict with findings and evidence.
- [Permission outcomes](./permission-outcomes.md) covers denied, dismissed, and missing-device permission failures and the blocked screen.
- [Playback](./playback.md) covers the optional ten-second in-memory recording, its retention copy, and discard.
- [Design system](./design-system.md) covers the `/#/design-system` hash route, skip-link behavior, and navigation back to the check.
