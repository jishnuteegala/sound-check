import type { CheckResult, Verdict } from "./model";

export function deriveVerdict(results: CheckResult[]): Verdict {
  const forcingFailure = results.some((result) => result.status === "check");
  const complete = new Set(results.map((result) => result.id)).size === 5;
  return { status: forcingFailure || !complete ? "CHECK" : "PASS", results };
}
