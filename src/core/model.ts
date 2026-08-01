export type CheckId =
  | "dead-input"
  | "low-level"
  | "clipping"
  | "noisy-quiet"
  | "browser-processing";

export type CheckStatus = "pass" | "check" | "info";

export interface CheckResult {
  id: CheckId;
  label: string;
  status: CheckStatus;
  measured: Record<string, number | boolean>;
  threshold: Record<string, number>;
  reason: string;
  nextAction: string;
}

export type VerdictStatus = "PASS" | "CHECK";

export interface Verdict {
  status: VerdictStatus;
  results: CheckResult[];
}

export interface PhaseMeasurement {
  rms: number;
  peak: number;
  clipCount: number;
  sampleCount: number;
}

export interface AppliedProcessing {
  autoGainControl: boolean;
  noiseSuppression: boolean;
  echoCancellation: boolean;
}

export interface CaptureMeasurements {
  quiet: PhaseMeasurement;
  speak: PhaseMeasurement;
  processing: AppliedProcessing;
}
