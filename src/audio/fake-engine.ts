import type { AppliedProcessing, CaptureMeasurements, PhaseMeasurement } from "../core/model";
import type { AudioDevice, AudioEngine, CaptureCallbacks, LiveLevel } from "./engine";

interface FakeScenario {
  devices: AudioDevice[];
  quiet: PhaseMeasurement;
  speak: PhaseMeasurement;
  processing: AppliedProcessing;
  liveClipping: boolean;
  deny?: boolean;
}

const scenarios: Record<string, FakeScenario> = {
  pass: {
    devices: [
      { deviceId: "builtin", label: "Built-in Microphone" },
      { deviceId: "usb", label: "Yeti USB Microphone" },
    ],
    quiet: { rms: 0.004, peak: 0.02, clipCount: 0 },
    speak: { rms: 0.09, peak: 0.42, clipCount: 0 },
    processing: {
      autoGainControl: false,
      noiseSuppression: false,
      echoCancellation: false,
    },
    liveClipping: false,
  },
  check: {
    devices: [
      { deviceId: "builtin", label: "Built-in Microphone" },
      { deviceId: "usb", label: "Yeti USB Microphone" },
    ],
    quiet: { rms: 0.06, peak: 0.3, clipCount: 0 },
    speak: { rms: 0.12, peak: 0.999, clipCount: 12 },
    processing: {
      autoGainControl: true,
      noiseSuppression: true,
      echoCancellation: false,
    },
    liveClipping: true,
  },
};

const WINDOW_MS = 350;

function parseScenario(raw: string | null): FakeScenario {
  if (raw === "deny") return { ...scenarios.pass, deny: true };
  return scenarios[raw ?? ""] ?? scenarios.pass;
}

export function createFakeEngine(raw: string | null): AudioEngine {
  const scenario = parseScenario(raw);
  const pending = new Set<ReturnType<typeof setTimeout>>();

  function delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        pending.delete(timer);
        resolve();
      }, ms);
      pending.add(timer);
    });
  }

  return {
    requestPermission(): Promise<void> {
      if (scenario.deny) {
        const error = new Error("Microphone access was blocked by the browser.");
        error.name = "NotAllowedError";
        return Promise.reject(error);
      }
      return Promise.resolve();
    },
    listInputs(): Promise<AudioDevice[]> {
      return Promise.resolve(scenario.devices);
    },
    async capture(callbacks?: CaptureCallbacks): Promise<CaptureMeasurements> {
      const runPhase = (phase: "quiet" | "speak"): Promise<void> => {
        callbacks?.onPhase?.(phase);
        const measurement = scenario[phase];
        const level: LiveLevel = {
          rms: measurement.rms,
          peak: measurement.peak,
          clipping: phase === "speak" && scenario.liveClipping,
        };
        callbacks?.onLiveLevel?.(level);
        return delay(WINDOW_MS);
      };
      await runPhase("quiet").then(() => runPhase("speak"));
      return { quiet: scenario.quiet, speak: scenario.speak, processing: scenario.processing };
    },
    recordPlayback(): Promise<Blob> {
      return Promise.resolve(new Blob([new Uint8Array(0)], { type: "audio/webm" }));
    },
    reset(): Promise<void> {
      pending.forEach((timer) => clearTimeout(timer));
      pending.clear();
      return Promise.resolve();
    },
  };
}
