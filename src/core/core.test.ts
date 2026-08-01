import { describe, expect, it } from "vitest";
import {
  checkBrowserProcessing,
  checkClipping,
  checkDeadInput,
  checkLowLevel,
  checkNoisyQuiet,
} from "./checks";
import { measureSamples } from "./measure";
import type { CheckResult, PhaseMeasurement } from "./model";
import { thresholds } from "./thresholds";
import { deriveVerdict } from "./verdict";

const silence = new Float32Array(32);
const lowSpeech = new Float32Array(32).fill(0.01);
const clipped = Float32Array.from([0.99, -0.99, 1, ...Array.from({ length: 29 }, () => 0.2)]);
const noisyQuiet = new Float32Array(32).fill(0.065);
const cleanSpeech = new Float32Array(32).fill(0.1);

function cleanResults(): CheckResult[] {
  const quiet = measureSamples(new Float32Array(32).fill(0.01));
  const speak = measureSamples(cleanSpeech);
  return [
    checkDeadInput(speak),
    checkLowLevel(speak),
    checkClipping(speak),
    checkNoisyQuiet(quiet, speak),
    checkBrowserProcessing({
      autoGainControl: false,
      noiseSuppression: false,
      echoCancellation: false,
    }),
  ];
}

describe("check runners", () => {
  it("classifies synthetic audio fixtures", () => {
    expect(checkDeadInput(measureSamples(silence)).status).toBe("check");
    expect(checkLowLevel(measureSamples(lowSpeech)).status).toBe("check");
    expect(checkClipping(measureSamples(clipped)).status).toBe("check");
    expect(checkNoisyQuiet(measureSamples(noisyQuiet), measureSamples(cleanSpeech)).status).toBe(
      "info",
    );
    expect(
      checkNoisyQuiet(measureSamples(new Float32Array(32).fill(0.01)), measureSamples(cleanSpeech))
        .status,
    ).toBe("pass");
    expect(
      checkBrowserProcessing({
        autoGainControl: true,
        noiseSuppression: false,
        echoCancellation: false,
      }).status,
    ).toBe("info");
  });

  it("holds every threshold boundary", () => {
    expect(checkDeadInput(phase(thresholds.deadRms - 0.0001)).status).toBe("check");
    expect(checkDeadInput(phase(thresholds.deadRms)).status).toBe("check");
    expect(checkDeadInput(phase(thresholds.deadRms + 0.0001)).status).toBe("pass");
    expect(checkDeadInput(phase(0.0029)).status).toBe("check");
    expect(checkDeadInput(phase(0.0031)).status).toBe("pass");

    expect(checkLowLevel(phase(thresholds.lowSpeechRms - 0.0001)).status).toBe("check");
    expect(checkLowLevel(phase(thresholds.lowSpeechRms)).status).toBe("check");
    expect(checkLowLevel(phase(thresholds.lowSpeechRms + 0.0001)).status).toBe("pass");

    expect(checkClipping(phase(0.2, thresholds.clippingSamples - 1)).status).toBe("pass");
    expect(checkClipping(phase(0.2, thresholds.clippingSamples)).status).toBe("check");
    expect(checkClipping(phase(0.2, thresholds.clippingSamples + 1)).status).toBe("check");

    expect(
      checkNoisyQuiet(phase(0.1 * (thresholds.noisyQuietRatio - 0.01)), phase(0.1)).status,
    ).toBe("pass");
    expect(checkNoisyQuiet(phase(0.1 * thresholds.noisyQuietRatio), phase(0.1)).status).toBe(
      "info",
    );
    expect(
      checkNoisyQuiet(phase(0.1 * (thresholds.noisyQuietRatio + 0.01)), phase(0.1)).status,
    ).toBe("info");

    expect(checkNoisyQuiet(phase(0.65), phase(1)).status).toBe("info");
    expect(checkNoisyQuiet(phase(0.8), phase(1)).status).toBe("check");
    expect(checkNoisyQuiet(phase(0.81), phase(1)).status).toBe("check");
  });
});

describe("measureSamples", () => {
  it("counts samples at or above the clipping-peak boundary", () => {
    expect(measureSamples(Float32Array.of(0.97)).clipCount).toBe(0);
    expect(measureSamples(Float32Array.of(-0.98)).clipCount).toBe(1);
    expect(measureSamples(Float32Array.of(0.99)).clipCount).toBe(1);
  });
});

describe("deriveVerdict", () => {
  it.each([
    ["all pass", cleanResults(), "PASS"],
    ["dead input", replace(cleanResults(), "dead-input", "check"), "CHECK"],
    ["low level", replace(cleanResults(), "low-level", "check"), "CHECK"],
    ["clipping", replace(cleanResults(), "clipping", "check"), "CHECK"],
    ["mild noisy quiet", noisyResult(false), "PASS"],
    ["unusable noisy quiet", noisyResult(true), "CHECK"],
    ["browser processing note", replace(cleanResults(), "browser-processing", "info"), "PASS"],
    ["missing result ambiguity", cleanResults().slice(0, 4), "CHECK"],
  ])("returns %s as %s", (_name, results, status) => {
    expect(deriveVerdict(results).status).toBe(status);
  });

  it("never returns PASS while a forcing check is present", () => {
    for (const id of ["dead-input", "low-level", "clipping"] as const) {
      expect(deriveVerdict(replace(cleanResults(), id, "check")).status).toBe("CHECK");
    }
  });
});

function phase(rms: number, clipCount = 0): PhaseMeasurement {
  return { rms, peak: clipCount > 0 ? thresholds.clippingPeak : rms, clipCount };
}

function replace(
  results: CheckResult[],
  id: CheckResult["id"],
  status: CheckResult["status"],
): CheckResult[] {
  return results.map((result) => (result.id === id ? { ...result, status } : result));
}

function noisyResult(unusable: boolean): CheckResult[] {
  const results = cleanResults();
  const noisyQuietResult = results.find((result) => result.id === "noisy-quiet");
  if (!noisyQuietResult) return results;

  noisyQuietResult.status = unusable ? "check" : "info";
  noisyQuietResult.measured = { ...noisyQuietResult.measured, unusable };
  return results;
}
