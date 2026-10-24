import { transition, initialFlow, permissionEvent } from "../../../src/flow.ts";
import type { FlowEvent, FlowState, Screen } from "../../../src/flow.ts";

// Exhaustive verifier for the flow state machine in src/flow.ts.
// Runs the real transition() over every (state, event) pair, then the
// reachability graph, and asserts the invariants listed in SKILL.md.
// Any failure prints a counterexample and exits 1.

const screens = [
  "idle",
  "permission",
  "devices",
  "guiding",
  "verdict",
  "blocked",
] as const satisfies readonly Screen[];
const phases = ["quiet", "speak"] as const;
const events = [
  "request",
  "granted",
  "denied",
  "dismissed",
  "failed",
  "start",
  "quiet",
  "speak",
  "complete",
  "reset",
] as const satisfies readonly FlowEvent[];

const states: FlowState[] = screens.flatMap((screen) => phases.map((phase) => ({ screen, phase })));

// Compile-time tripwires: tsc fails here if a union gains a member the lists
// omit, or the lists name a member the union dropped. The check file is not in
// any tsconfig - the typecheck command in SKILL.md is what makes these fire.
const exhaustiveTripwire: [
  Exclude<FlowEvent, (typeof events)[number]> extends never ? true : never,
  Exclude<Screen, (typeof screens)[number]> extends never ? true : never,
  Exclude<FlowState["phase"], (typeof phases)[number]> extends never ? true : never,
] = [true, true, true];
void exhaustiveTripwire;

const expectedGuarded: [Screen, FlowEvent, (s: FlowState) => FlowState][] = [
  ["idle", "request", (s) => ({ ...s, screen: "permission" })],
  ["permission", "granted", (s) => ({ ...s, screen: "devices" })],
  ["permission", "denied", (s) => ({ ...s, screen: "blocked" })],
  ["permission", "failed", (s) => ({ ...s, screen: "blocked" })],
  ["permission", "dismissed", () => ({ screen: "idle", phase: "quiet" })],
  ["devices", "start", () => ({ screen: "guiding", phase: "quiet" })],
  ["guiding", "quiet", (s) => ({ ...s, phase: "quiet" })],
  ["guiding", "speak", (s) => ({ ...s, phase: "speak" })],
  ["guiding", "complete", (s) => ({ ...s, screen: "verdict" })],
  ["verdict", "reset", (s) => ({ ...s, screen: "devices" })],
  ["blocked", "reset", (s) => ({ ...s, screen: "idle" })],
];

const guarded = new Set(expectedGuarded.map(([screen, e]) => `${screen}|${e}`));

// Shallow compare over every own field, not just screen/phase: a FlowState
// that grows a field the check cannot see must still fail.
function same(a: FlowState, b: FlowState): boolean {
  const ea = Object.entries(a);
  const eb = Object.fromEntries(Object.entries(b));
  return ea.length === Object.keys(eb).length && ea.every(([k, v]) => Object.is(v, eb[k]));
}
function name(s: FlowState): string {
  const extra = Object.entries(s)
    .filter(([k]) => k !== "screen" && k !== "phase")
    .map(([k, v]) => `${k}:${JSON.stringify(v)}`)
    .join(",");
  return `${s.screen}{${s.phase}${extra ? `,${extra}` : ""}}`;
}

let failures = 0;
let total = 0;
function check(label: string, ok: boolean, counterexample = "") {
  total++;
  if (ok) {
    console.log(`PASS ${label}`);
    return;
  }
  failures++;
  console.log(`FAIL ${label}${counterexample ? ` - ${counterexample}` : ""}`);
}

// I0 the app boots on idle{quiet}, not some other state.
check(
  "I0 initial state: initialFlow is {idle,quiet}",
  same(initialFlow, { screen: "idle", phase: "quiet" }),
  name(initialFlow),
);

// I1 totality: every pair returns a valid FlowState.
const bad: string[] = [];
for (const s of states)
  for (const e of events) {
    const out = transition(s, e);
    if (
      out === null ||
      out === undefined ||
      !screens.some((sc) => sc === out.screen) ||
      (out.phase !== "quiet" && out.phase !== "speak")
    ) {
      bad.push(`${name(s)} --${e}--> ${JSON.stringify(out)}`);
    }
  }
check(
  "I1 totality: all 120 (state,event) pairs return a valid FlowState",
  bad.length === 0,
  bad[0],
);

// I2 no-op discipline: unguarded pairs return the input object itself.
// Identity, not just value equality: a fresh {...state} defeats React's
// Object.is bailout in App.tsx and re-renders on every ignored event.
const noisy: string[] = [];
for (const s of states)
  for (const e of events) {
    if (guarded.has(`${s.screen}|${e}`)) continue;
    const out = transition(s, e);
    if (out !== s) noisy.push(`${name(s)} --${e}--> ${name(out)}`);
  }
check(
  "I2 no-op discipline: unguarded pairs return the input unchanged",
  noisy.length === 0,
  noisy[0],
);

// I3 guarded transitions match the documented table.
const wrong: string[] = [];
for (const [screen, e, want] of expectedGuarded) {
  for (const phase of phases) {
    const s = { screen, phase };
    const out = transition(s, e);
    if (!same(out, want(s)))
      wrong.push(`${name(s)} --${e}--> ${name(out)} (want ${name(want(s))})`);
  }
}
check("I3 guarded transitions produce the documented outputs", wrong.length === 0, wrong[0]);

// Reachability graph over reachable states only.
const reachable = new Map<string, FlowState>();
const queue: FlowState[] = [initialFlow];
reachable.set(name(initialFlow), initialFlow);
let cur: FlowState | undefined;
while ((cur = queue.shift()) !== undefined) {
  for (const e of events) {
    const out = transition(cur, e);
    const k = name(out);
    if (!same(out, cur) && !reachable.has(k)) {
      reachable.set(k, out);
      queue.push(out);
    }
  }
}

// I4 reachability: exactly these 9 states are reachable.
const wantReachable = new Set([
  "idle{quiet}",
  "permission{quiet}",
  "blocked{quiet}",
  "devices{quiet}",
  "devices{speak}",
  "guiding{quiet}",
  "guiding{speak}",
  "verdict{quiet}",
  "verdict{speak}",
]);
const extra = [...reachable.keys()].filter((k) => !wantReachable.has(k));
const missing = [...wantReachable].filter((k) => !reachable.has(k));
check(
  "I4 reachability: exactly the 9 documented states are reachable",
  extra.length === 0 && missing.length === 0,
  [...extra.map((k) => `unexpected ${k}`), ...missing.map((k) => `unreached ${k}`)].join("; "),
);

// I5 no dead ends: every reachable state has an enabled outgoing transition.
const dead = [...reachable.values()].filter((s) => events.every((e) => same(transition(s, e), s)));
check(
  "I5 no dead ends: every reachable state has an enabled transition",
  dead.length === 0,
  dead.map(name).join(", "),
);

// I6 gating: guiding only via start@devices, verdict only via complete@guiding.
const leaks: string[] = [];
for (const s of states)
  for (const e of events) {
    const out = transition(s, e);
    if (out.screen === s.screen) continue;
    if (out.screen === "guiding" && !(s.screen === "devices" && e === "start"))
      leaks.push(`${name(s)} --${e}--> guiding`);
    if (out.screen === "verdict" && !(s.screen === "guiding" && e === "complete"))
      leaks.push(`${name(s)} --${e}--> verdict`);
  }
check(
  "I6 gating: no path skips devices (permission) or guiding (measurement)",
  leaks.length === 0,
  leaks[0],
);

// I7 phase discipline: start on devices always lands in the quiet phase.
const phaseBad = states
  .filter((s) => s.screen === "devices")
  .map((s) => transition(s, "start"))
  .filter((out) => out.screen === "guiding" && out.phase !== "quiet");
check("I7 phase discipline: start always enters the quiet phase", phaseBad.length === 0);

// I8 recovery: every reachable state can reach idle or devices.
function reaches(states0: FlowState[], pred: (s: FlowState) => boolean): boolean {
  const seen = new Set(states0.map(name));
  const q = [...states0];
  let s: FlowState | undefined;
  while ((s = q.shift()) !== undefined) {
    if (pred(s)) return true;
    for (const e of events) {
      const out = transition(s, e);
      if (!same(out, s) && !seen.has(name(out))) {
        seen.add(name(out));
        q.push(out);
      }
    }
  }
  return false;
}
const stuck = [...reachable.values()].filter(
  (s) => !reaches([s], (t) => t.screen === "idle" || t.screen === "devices"),
);
check(
  "I8 recovery: every reachable state can reach idle or devices",
  stuck.length === 0,
  stuck.map(name).join(", "),
);

// I9 permissionEvent partition (5 classes).
const err = (n: string, m = "") => Object.assign(new Error(m), { name: n });
const permCases: Array<[unknown, string]> = [
  [42, "failed"],
  [{ name: "NotAllowedError" }, "failed"], // non-Error object: not the Error path
  [err("AbortError"), "dismissed"],
  [err("NotAllowedError", "Permission dismissed"), "dismissed"],
  [err("NotAllowedError", "Permission denied"), "denied"],
  [err("NotFoundError", "no device"), "failed"],
];
const permBad = permCases.filter(([e, want]) => permissionEvent(e) !== want);
check(
  "I9 permissionEvent partition: non-Error/AbortError/dismiss-msg/NotAllowed/other",
  permBad.length === 0,
  permBad.map(
    ([e, w]) => `${e instanceof Error ? e.name : String(e)} -> ${permissionEvent(e)} (want ${w})`,
  )[0],
);

if (failures === 0) {
  console.log(
    `\nALL ${total} INVARIANTS HOLD over ${screens.length * phases.length * events.length} pairs, ${reachable.size} reachable states`,
  );
} else {
  console.log(`\n${failures} invariant(s) FAILED`);
  process.exit(1);
}
