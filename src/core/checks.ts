import type { AppliedProcessing, CheckResult, PhaseMeasurement } from "./model";
import { thresholds } from "./thresholds";

export function checkDeadInput(speak: PhaseMeasurement): CheckResult {
  const failed = speak.rms <= thresholds.deadRms;
  return result(
    "dead-input",
    "Microphone input",
    failed ? "check" : "pass",
    { speakRms: speak.rms },
    { deadRms: thresholds.deadRms },
    failed ? "No usable microphone signal was detected." : "Microphone input was detected.",
    "Check that the selected microphone is connected and unmuted.",
  );
}

export function checkLowLevel(speak: PhaseMeasurement): CheckResult {
  const failed = speak.rms > thresholds.deadRms && speak.rms <= thresholds.lowSpeechRms;
  return result(
    "low-level",
    "Speaking level",
    failed ? "check" : "pass",
    { speakRms: speak.rms, speakPeak: speak.peak },
    { deadRms: thresholds.deadRms, lowSpeechRms: thresholds.lowSpeechRms },
    failed ? "Your speaking level is too low for a reliable call." : "Speaking level is usable.",
    "Move closer to the microphone or raise its input level.",
  );
}

export function checkClipping(speak: PhaseMeasurement): CheckResult {
  const failed = speak.clipCount >= thresholds.clippingSamples;
  return result(
    "clipping",
    "Clipping",
    failed ? "check" : "pass",
    { speakPeak: speak.peak, clipCount: speak.clipCount },
    { clippingPeak: thresholds.clippingPeak, clippingSamples: thresholds.clippingSamples },
    failed ? "Your microphone signal is clipping." : "No gross clipping was detected.",
    "Lower microphone gain or move farther from the microphone.",
  );
}

export function checkNoisyQuiet(quiet: PhaseMeasurement, speak: PhaseMeasurement): CheckResult {
  const ratio = speak.rms === 0 ? 1 : quiet.rms / speak.rms;
  const noisy = ratio >= thresholds.noisyQuietRatio;
  const unusable = ratio >= thresholds.noisyQuietUnusableRatio;
  return result(
    "noisy-quiet",
    "Quiet-period noise",
    unusable ? "check" : noisy ? "info" : "pass",
    { quietRms: quiet.rms, speakRms: speak.rms, ratio, unusable },
    {
      noisyQuietRatio: thresholds.noisyQuietRatio,
      noisyQuietUnusableRatio: thresholds.noisyQuietUnusableRatio,
    },
    unusable
      ? "Background sound is nearly as loud as your speech."
      : noisy
        ? "Background sound may be noticeable on a call."
        : "Quiet-period noise is low.",
    "Reduce background noise or use a closer microphone.",
  );
}

export function checkBrowserProcessing(processing: AppliedProcessing): CheckResult {
  const active = Object.values(processing).some(Boolean);
  return result(
    "browser-processing",
    "Browser processing",
    active ? "info" : "pass",
    { ...processing },
    {},
    active
      ? "Your browser is processing this input; your meeting app may behave differently."
      : "Browser input processing was disabled.",
    "Compare this result with your meeting app's microphone test.",
  );
}

function result(
  id: CheckResult["id"],
  label: string,
  status: CheckResult["status"],
  measured: CheckResult["measured"],
  threshold: CheckResult["threshold"],
  reason: string,
  nextAction: string,
): CheckResult {
  return { id, label, status, measured, threshold, reason, nextAction };
}
