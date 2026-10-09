// Drives Sound Check through its ?fake= scenarios with headless Playwright.
// Usage: node drive.mjs <base-url> <out-dir>
// Requires playwright resolvable from this script's own directory (Node ESM resolves
// imports relative to the module, not the cwd - copy drive.mjs next to node_modules).
import { chromium } from "playwright";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

const argv = process.argv.slice(2);
const [rawBase, out] = argv;
if (argv.length !== 2 || !rawBase || !out) {
  writeFileSync(2, "Usage: node drive.mjs <base-url> <out-dir>\n");
  process.exit(2);
}
let base, baseHost;
try {
  const url = new URL(rawBase.replace(/\/+$/, ""));
  // Bare http(s) origin only - path, query, fragment, userinfo, other schemes
  // all rejected. Canonical equivalents (case, default port) normalize to origin.
  if (
    !/^https?:$/.test(url.protocol) ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    url.username ||
    url.password
  ) {
    throw new Error("base must be a bare http(s) origin");
  }
  base = url.origin;
  baseHost = url.host;
} catch (e) {
  writeFileSync(
    2,
    `Usage: node drive.mjs <base-url> <out-dir> - "${rawBase}" is not a usable base URL (${e instanceof Error ? e.message : e})\n`,
  );
  process.exit(2);
}
// Fresh evidence dir per run - a fatal early exit must not leave stale shots
// that read as this run's proof. issues.txt below is always rewritten. Refuse
// a path that isn't a dir, or a non-empty dir whose issues.txt isn't this
// tool's output - an argv slip must not delete work.
const EVIDENCE_MARKER = "# sound-check drive evidence";
function isEvidenceDir(dir) {
  try {
    // Marker line written by this tool below - a foreign issues.txt (release
    // notes, "deploy failed yesterday") must not read as wipeable evidence. A
    // shots-only dir from a SIGKILLed run has no marker and stays refused:
    // provenance can't be proven, so fail safe.
    return readFileSync(join(dir, "issues.txt"), "utf8").startsWith(`${EVIDENCE_MARKER}\n`);
  } catch {
    return false;
  }
}
try {
  if (
    existsSync(out) &&
    (!statSync(out).isDirectory() || (readdirSync(out).length && !isEvidenceDir(out)))
  ) {
    writeFileSync(2, `Refusing to clear "${out}" - not a directory, or missing evidence marker\n`);
    process.exit(2);
  }
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
} catch (e) {
  writeFileSync(
    2,
    `Cannot prepare evidence dir "${out}" (${e instanceof Error ? e.message : e})\n`,
  );
  process.exit(2);
}

const issues = [];
// Set when a context reaches the playback flow; the fake's empty Blob trips a
// benign range error on <audio> mount, tolerated only in that window.
let playbackActive = false;
let browser;

function expect(cond, label, detail = "") {
  if (cond) {
    console.log(`assert ${label}: ok`);
  } else {
    issues.push(`${label} failed${detail ? ` (${detail})` : ""}`);
    console.log(`assert ${label}: FAILED${detail ? ` (${detail})` : ""}`);
  }
}

// The fake engine's empty playback Blob trips a benign Chromium range error on
// <audio> load. It is expected wherever playback ran, fatal anywhere else.
function drainErrors(name, errors, external) {
  const benign = errors.filter((e) => e.includes("ERR_REQUEST_RANGE_NOT_SATISFIABLE"));
  const real = errors.filter((e) => !e.includes("ERR_REQUEST_RANGE_NOT_SATISFIABLE"));
  if (real.length) issues.push(`${name}: console errors: ${real.join(" | ")}`);
  if (benign.length && !playbackActive)
    issues.push(`${name}: unexpected blob-range error outside playback`);
  errors.length = 0;
  if (external.length) issues.push(`${name}: external requests: ${external.join(" | ")}`);
  external.length = 0;
}

async function page(width, height = 900) {
  const ctx = await browser.newContext({ viewport: { width, height } });
  const p = await ctx.newPage();
  const errors = [];
  const external = [];
  p.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  p.on("pageerror", (e) => errors.push(String(e)));
  // retention claim: no request may leave this origin (blob:/data:/about:/chrome: are local)
  p.on("request", (r) => {
    const u = r.url();
    if (/^(blob|data|about|chrome):/.test(u)) return;
    try {
      if (new URL(u).host !== baseHost) external.push(u);
    } catch {
      external.push(u);
    }
  });
  p.on("websocket", (ws) => {
    try {
      if (new URL(ws.url()).host !== baseHost) external.push(ws.url());
    } catch {
      external.push(ws.url());
    }
  });
  return { p, errors, external, ctx };
}

async function snap(p, name, errors, external) {
  await p.waitForTimeout(150);
  const overflow = await p.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  await p.screenshot({ path: join(out, `${name}.png`) });
  writeFileSync(
    join(out, `${name}.console.txt`),
    errors.length ? errors.join("\n") + "\n" : "no console errors\n",
  );
  if (overflow > 0) issues.push(`${name}: horizontal overflow ${overflow}px`);
  console.log(`shot ${name} (overflow=${overflow}px, errors=${errors.length})`);
  drainErrors(name, errors, external);
}

// Any thrown timeout/navigation/launch error must still leave its evidence
// trail: push it into issues so issues.txt is always written before exit.
try {
  browser = await chromium.launch();
  // Desktop 1280px: full check walk on the fake pass scenario
  {
    const { p, errors, external, ctx } = await page(1280);
    await p.goto(`${base}/?fake=pass`);
    await p.waitForSelector("text=Check my microphone");
    await snap(p, "1280-idle", errors, external);
    await p.click("text=Check my microphone");
    await p.waitForSelector("text=Choose your input");
    await snap(p, "1280-devices", errors, external);
    await p.click("text=Start microphone check");
    await p.waitForSelector("text=Stay quiet");
    expect(
      (await p.locator('a.quiet-link:has-text("Design system")').count()) === 0,
      "ds-link-hidden-during-capture",
    );
    await snap(p, "1280-guiding-quiet", errors, external);
    await p.waitForSelector("text=Speak normally", { timeout: 8000 });
    // Poll for a nonzero sample - a single read can land a frame before the
    // meter's first rAF update and false-fail.
    await p
      .waitForFunction(
        () =>
          Number(document.querySelector('[role="meter"]')?.getAttribute("aria-valuenow") ?? 0) > 0,
        undefined,
        { timeout: 4000 },
      )
      .catch(() => {});
    const meterNow = await p.evaluate(() =>
      Number(document.querySelector('[role="meter"]')?.getAttribute("aria-valuenow") ?? 0),
    );
    expect(meterNow > 0, "meter-live-during-speak", String(meterNow));
    await snap(p, "1280-guiding-speak", errors, external);
    await p.waitForSelector("text=Your microphone passed", { timeout: 8000 });
    expect((await p.locator(".status.pass").count()) === 1, "status-pass-badge");
    expect((await p.locator("text=in memory only").count()) >= 1, "retention-copy");
    await snap(p, "1280-verdict-pass", errors, external);
    playbackActive = true;
    await p.click('button:has-text("Record up to 10 seconds")');
    await p.waitForSelector("text=Discard recording");
    await snap(p, "1280-playback", errors, external);
    // playback-discard: audio element leaves, offer button returns
    await p.click('button:has-text("Discard recording")');
    await p.waitForSelector('button:has-text("Record up to 10 seconds")');
    expect((await p.locator("audio").count()) === 0, "playback-discard-audio-gone");
    await snap(p, "1280-playback-discarded", errors, external);
    // check-rerun: verdict -> Check again -> device picker returns
    await p.click('button:has-text("Check again")');
    await p.waitForSelector("text=Choose your input");
    await snap(p, "1280-rerun-devices", errors, external);
    await ctx.close();
    drainErrors("1280-pass-tail", errors, external);
    playbackActive = false;
  }
  // CHECK verdict
  {
    const { p, errors, external, ctx } = await page(1280);
    await p.goto(`${base}/?fake=check`);
    await p.click("text=Check my microphone");
    await p.click("text=Start microphone check");
    await p.waitForSelector("text=Review your microphone setup", { timeout: 8000 });
    expect((await p.locator(".status.check").count()) === 1, "status-check-badge");
    await snap(p, "1280-verdict-check", errors, external);
    await ctx.close();
    drainErrors("1280-check-tail", errors, external);
  }
  // Denied permission -> blocked -> perm-retry back to idle
  {
    const { p, errors, external, ctx } = await page(1280);
    await p.goto(`${base}/?fake=deny`);
    await p.click("text=Check my microphone");
    await p.waitForSelector("text=We could not access your microphone");
    await snap(p, "1280-blocked", errors, external);
    await p.click('button:has-text("Back to start")');
    await p.waitForSelector("text=Check my microphone");
    await snap(p, "1280-retry-idle", errors, external);
    await ctx.close();
    drainErrors("1280-deny-tail", errors, external);
  }
  // Design-system route + navigation contracts (features/design-system.md)
  // Short viewport keeps the check page scrollable, so ds-scroll-reset is non-vacuous:
  // without the route-change scroll reset, scrollY would stay > 0 after "Back to check".
  {
    const { p, errors, external, ctx } = await page(1280, 600);
    await p.goto(`${base}/#/design-system`);
    await p.waitForSelector("text=Findings");
    await snap(p, "1280-design-system", errors, external);
    // ds-skip: focus + Enter focuses main#tokens without changing the route hash
    await p.focus("a.skip-link");
    await p.keyboard.press("Enter");
    const focusedId = await p.evaluate(() => document.activeElement?.id);
    expect(focusedId === "tokens", "ds-skip-focus", focusedId);
    expect(
      (await p.evaluate(() => window.location.hash)) === "#/design-system",
      "ds-skip-hash-stable",
    );
    // ds-nav + ds-scroll: scroll down, then Back to check resets route and scroll
    await p.evaluate(() => window.scrollTo(0, 400));
    expect((await p.evaluate(() => window.scrollY)) > 0, "ds-scrolled", "scrollY stayed 0");
    await p.click('a.quiet-link:has-text("Back to check")');
    await p.waitForSelector("text=Check my microphone");
    await p
      .waitForFunction(() => window.scrollY === 0, undefined, { timeout: 5000 })
      .catch(() => {});
    expect((await p.evaluate(() => window.scrollY)) === 0, "ds-scroll-reset");
    // check-skip: focus + Enter focuses main#main-content, hash unchanged
    await p.focus("a.skip-link");
    await p.keyboard.press("Enter");
    const checkFocusId = await p.evaluate(() => document.activeElement?.id);
    expect(checkFocusId === "main-content", "check-skip-focus", checkFocusId);
    const checkHash = await p.evaluate(() => window.location.hash);
    expect(checkHash === "#/", "check-skip-hash-stable", checkHash);
    // ds-nav out: masthead link routes back to the design page without a reload
    await p.click('a.quiet-link:has-text("Design system")');
    await p.waitForSelector("text=Findings");
    const navHash = await p.evaluate(() => window.location.hash);
    expect(navHash === "#/design-system", "ds-nav-out", navHash);
    await ctx.close();
    drainErrors("ds-nav-tail", errors, external);
  }
  // 768px
  {
    const { p, errors, external, ctx } = await page(768);
    await p.goto(`${base}/?fake=pass`);
    await p.waitForSelector("text=Check my microphone");
    await snap(p, "768-idle", errors, external);
    await p.click("text=Check my microphone");
    await p.click("text=Start microphone check");
    await p.waitForSelector("text=Your microphone passed", { timeout: 8000 });
    await snap(p, "768-verdict-pass", errors, external);
    await ctx.close();
    drainErrors("768-pass-tail", errors, external);
  }
  // 360px
  {
    const { p, errors, external, ctx } = await page(360, 740);
    await p.goto(`${base}/?fake=pass`);
    await p.waitForSelector("text=Check my microphone");
    await snap(p, "360-idle", errors, external);
    await p.click("text=Check my microphone");
    await p.waitForSelector("text=Choose your input");
    await snap(p, "360-devices", errors, external);
    await p.click("text=Start microphone check");
    await p.waitForSelector("text=Your microphone passed", { timeout: 8000 });
    await snap(p, "360-verdict-pass", errors, external);
    await p.goto(`${base}/?fake=deny`);
    await p.click("text=Check my microphone");
    await p.waitForSelector("text=We could not access your microphone");
    await snap(p, "360-blocked", errors, external);
    await ctx.close();
    drainErrors("360-tail", errors, external);
  }
} catch (e) {
  issues.push(`fatal: ${e instanceof Error ? e.message : String(e)}`);
}

await browser?.close().catch(() => {});
try {
  writeFileSync(
    join(out, "issues.txt"),
    `${EVIDENCE_MARKER}\n${issues.length ? issues.join("\n") + "\n" : "ALL CLEAN\n"}`,
  );
} catch (e) {
  issues.push(`fatal: could not write issues.txt (${e instanceof Error ? e.message : e})`);
  writeFileSync(2, `${issues.join("\n")}\n`);
}
console.log(issues.length ? `ISSUES:\n${issues.join("\n")}` : "ALL CLEAN");
process.exitCode = issues.length ? 1 : 0;
