---
name: formal-verify-sound-check
description: "Exhaustively verify Sound Check's flow state machine (src/flow.ts) - every (state, event) pair, reachability, phase discipline, and the permissionEvent partition. Run after any change to src/flow.ts, and before trusting a green runtime pass on navigation or permission code."
---

# Formal verify: sound-check flow machine

## What it proves

The permission/check flow in `src/flow.ts` is a promise: a visitor can never be stranded on a screen with no way out, can never reach `guiding` without the device pick or `verdict` without a measurement, the quiet phase always precedes the speak phase on a fresh check, and a dismissed browser prompt quietly returns to idle. The harm if it breaks: a user stuck on a buttonless screen, a mic check that skips its quiet baseline (corrupting the verdict), or a benign prompt-dismiss showing the scary `blocked` screen.

`check.mts` runs the **real** `transition()`, `initialFlow`, and `permissionEvent()` - not a hand model - over every input the types allow: 12 FlowStates x 10 FlowEvents = 120 pairs, plus the BFS reachability graph and the `permissionEvent` error partition. Nine invariants (I1-I9) are asserted; each failure prints a counterexample like `devices{speak} --start--> guiding{speak} (want guiding{quiet})`.

## Run

```bash
node .agents/skills/formal-verify-sound-check/check.mts
```

Requires Node >= 22.18 (native TypeScript type-stripping; verified on v24). No install, no build, no deps - exits 0 with `ALL 9 INVARIANTS HOLD`, exits 1 listing each `FAIL` line.

## Coverage record

| Covered       | Functions                                      | Notes                                    |
| ------------- | ---------------------------------------------- | ---------------------------------------- |
| `src/flow.ts` | `transition`, `initialFlow`, `permissionEvent` | the whole machine + the error classifier |

**Sync commit:** `df743fb` (2026-10-24). Move this forward only after re-running the check and confirming the invariants describe the code at the new commit.

Not covered, on purpose: `discardPlayback` (side-effecting, unit-tested), `App.tsx`'s direct `setFlow` calls (a side channel that bypasses `transition` - e.g. the capture-failure path near App.tsx:110 - flag it in review if a change adds more), and all rendering.

## Reading a failure

A `FAIL` names the invariant and the smallest counterexample. Check the transition in `src/flow.ts` first: if the counterexample is a legal step in the code, the code (or an intended change) broke the promise - treat it as a bug candidate and confirm with `pnpm vitest run src/flow.test.ts` plus the runtime drive in `verify-sound-check`. If the step cannot happen, `check.mts` modeled the guard set wrong - the `guarded`/`expectedGuarded` tables must match every `if` in `transition()`; fix the check, not the code.

## Updating the verification

When a change is intended (a new screen, event, or reroute - evidence in the change: tests, commit message, design doc), update all of: the `screens`/`phases`/`events` lists, the `guarded` set and `expectedGuarded` table, `wantReachable`, and the invariant list. Then break the new code the way the property guards against (e.g. drop a phase reset or a guard condition) and confirm a `FAIL` appears before restoring. Record the new sync commit above.
