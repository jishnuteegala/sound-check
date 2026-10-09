# Design system

The `/#/design-system` hash route renders the token and component reference page; masthead links navigate live between it and the check, and both pages carry working skip links.

## Sub-features

- `ds-route` renders the design-system page at `/#/design-system`.
- `ds-nav` navigates masthead links both ways without a reload.
- `ds-skip` focuses `main#tokens` without changing the route hash.
- `check-skip` focuses `main#main-content` on the check page.
- `ds-scroll` resets scroll position when the route changes.

## How to get to it (user POV)

- Load `/#/design-system` directly, or choose `Design system` in the masthead.
- Choose `Back to check` or the wordmark to return.
- Press Tab then Enter on the `Skip to tokens` / `Skip to check` skip link.

## Driving it with Playwright

Preconditions:

- Dev server healthy at `http://localhost:5173`; doctor checks passed.

- **Route.** Load `${base}/#/design-system` and wait for `text=Findings`. Token groups render with names like `--canvas`. Screenshot `1280-design-system.png`.
- **Nav out.** From the check page, click `a.quiet-link` labeled `Design system`; the design-system heading appears without a reload and `location.hash === "#/design-system"`.
- **Skip link.** `p.focus('a.skip-link')`, then `p.keyboard.press("Enter")`. `document.activeElement.id === "tokens"`, the design-system page is still visible, and the hash is unchanged - the skip link must not route.
- **Back.** Click `a.quiet-link` labeled `Back to check`; the idle screen returns and `window.scrollY === 0`.
- **Check skip.** `p.focus('a.skip-link')` then Enter on the check page: `document.activeElement.id === "main-content"` and the hash is unchanged (`#/` after navigating back).
- **Hidden during capture.** During `?fake=pass` guidance, `a.quiet-link` labeled `Design system` is absent from the masthead (the link hides while a check or recording is in flight).

## Gotchas

- The design-system skip link uses `href="#tokens"` with a preventDefault focus handler; a plain anchor jump would fire `hashchange` and eject the user back to the check page - assert the hash did not change.
- Skip links are off-viewport until focused; `p.click` times out on them. Focus then press Enter.
- React re-renders on `hashchange`; state persists across navigation, so scroll position must be asserted separately (`window.scrollY`).
