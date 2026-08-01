import type { CheckId, CheckResult, Verdict } from "./model";

const REQUIRED_CHECK_IDS = [
  "dead-input",
  "low-level",
  "clipping",
  "noisy-quiet",
  "browser-processing",
] as const satisfies readonly CheckId[];

export function deriveVerdict(results: CheckResult[]): Verdict {
  const forcingFailure = results.some((result) => result.status === "check");
  // Missing or duplicated checks make the measurement ambiguous, so never return a false PASS.
  const resultIds = new Set(results.map((result) => result.id));
  const complete =
    results.length === REQUIRED_CHECK_IDS.length &&
    REQUIRED_CHECK_IDS.every((id) => resultIds.has(id));
  return { status: forcingFailure || !complete ? "CHECK" : "PASS", results };
}
