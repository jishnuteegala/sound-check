import type { AppliedProcessing, CheckResult, PhaseMeasurement } from "./model";
import { thresholds } from "./thresholds";

export function checkDeadInput(speak: PhaseMeasurement): CheckResult {
  const failed = speak.rms <= thresholds.deadRms;
  return {
    id: "dead-input",
    label: "Microphone input",
    status: failed ? "check" : "pass",
    measured: { speakRms: speak.rms },
    threshold: { deadRms: thresholds.deadRms },
    reason: failed ? "No usable microphone signal was detected." : "Microphone input was detected.",
    nextAction: "Check that the selected microphone is connected and unmuted.",
  };
}

export function checkLowLevel(speak: PhaseMeasurement): CheckResult {
  const failed = speak.rms > thresholds.deadRms && speak.rms <= thresholds.lowSpeechRms;
  return {
    id: "low-level",
    label: "Speaking level",
    status: failed ? "check" : "pass",
    measured: { speakRms: speak.rms, speakPeak: speak.peak },
    threshold: { deadRms: thresholds.deadRms, lowSpeechRms: thresholds.lowSpeechRms },
    reason: failed
      ? "Your speaking level is too low for a reliable call."
      : "Speaking level is usable.",
    nextAction: "Move closer to the microphone or raise its input level.",
  };
}

export function checkClipping(speak: PhaseMeasurement): CheckResult {
  // Peak thresholding happens while raw samples are measured; this check interprets the count.
  const failed = speak.clipCount >= thresholds.clippingSamples;
  return {
    id: "clipping",
    label: "Clipping",
    status: failed ? "check" : "pass",
    measured: { speakPeak: speak.peak, clipCount: speak.clipCount },
    threshold: { clippingSamples: thresholds.clippingSamples },
    reason: failed ? "Your microphone signal is clipping." : "No gross clipping was detected.",
    nextAction: "Lower microphone gain or move farther from the microphone.",
  };
}

export function checkNoisyQuiet(quiet: PhaseMeasurement, speak: PhaseMeasurement): CheckResult {
  // A dead speaking phase cannot support a noise comparison; the dead-input check reports it.
  const ratio = speak.rms <= thresholds.deadRms ? 0 : quiet.rms / speak.rms;
  const noisy = ratio >= thresholds.noisyQuietRatio;
  const unusable = ratio >= thresholds.noisyQuietUnusableRatio;
  return {
    id: "noisy-quiet",
    label: "Quiet-period noise",
    status: unusable ? "check" : noisy ? "info" : "pass",
    measured: { quietRms: quiet.rms, speakRms: speak.rms, ratio, unusable },
    threshold: {
      noisyQuietRatio: thresholds.noisyQuietRatio,
      noisyQuietUnusableRatio: thresholds.noisyQuietUnusableRatio,
    },
    reason: unusable
      ? "Background sound is nearly as loud as your speech."
      : noisy
        ? "Background sound may be noticeable on a call."
        : "Quiet-period noise is low.",
    nextAction: "Reduce background noise or use a closer microphone.",
  };
}

export function checkBrowserProcessing(processing: AppliedProcessing): CheckResult {
  const active = Object.values(processing).some(Boolean);
  return {
    id: "browser-processing",
    label: "Browser processing",
    status: active ? "info" : "pass",
    measured: { ...processing },
    threshold: {},
    reason: active
      ? "Your browser is processing this input; your meeting app may behave differently."
      : "Browser input processing was disabled.",
    nextAction: "Compare this result with your meeting app's microphone test.",
  };
}
