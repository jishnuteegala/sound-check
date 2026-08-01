import { measureSamples } from "../core/measure";
import type { AppliedProcessing, CaptureMeasurements, PhaseMeasurement } from "../core/model";

export interface AudioDevice {
  deviceId: string;
  label: string;
}

export interface LiveLevel {
  rms: number;
  peak: number;
  clipping: boolean;
}

export interface AudioPlatform {
  getUserMedia(constraints: MediaStreamConstraints): Promise<MediaStream>;
  enumerateDevices(): Promise<MediaDeviceInfo[]>;
  createContext(): AudioContext;
}

export interface PhaseSampler {
  sample(durationMs: number): Promise<Float32Array>;
  subscribe(listener: (level: LiveLevel) => void): () => void;
  close(): void;
}

export interface AudioEngine {
  requestPermission(deviceId?: string): Promise<void>;
  listInputs(): Promise<AudioDevice[]>;
  capture(onLiveLevel?: (level: LiveLevel) => void): Promise<CaptureMeasurements>;
  reset(): Promise<void>;
}

const quietDurationMs = 2_000;
const speakDurationMs = 3_000;

export function createAudioEngine(
  platform: AudioPlatform = browserPlatform(),
  samplerFactory: (
    context: AudioContext,
    stream: MediaStream,
  ) => PhaseSampler = createAnalyserSampler,
): AudioEngine {
  let stream: MediaStream | undefined;
  let context: AudioContext | undefined;
  let sampler: PhaseSampler | undefined;
  let processing: AppliedProcessing = {
    autoGainControl: false,
    noiseSuppression: false,
    echoCancellation: false,
  };

  async function requestPermission(deviceId?: string): Promise<void> {
    await teardown();
    stream = await platform.getUserMedia({
      audio: {
        deviceId: deviceId ? { exact: deviceId } : undefined,
        autoGainControl: false,
        noiseSuppression: false,
        echoCancellation: false,
      },
    });
    const track = stream.getAudioTracks()[0];
    if (!track) throw new Error("No audio track was provided.");
    const settings = track.getSettings();
    processing = {
      autoGainControl: settings.autoGainControl === true,
      noiseSuppression: settings.noiseSuppression === true,
      echoCancellation: settings.echoCancellation === true,
    };
    context = platform.createContext();
    sampler = samplerFactory(context, stream);
  }

  return {
    requestPermission,
    async listInputs(): Promise<AudioDevice[]> {
      const devices = await platform.enumerateDevices();
      return devices
        .filter((device) => device.kind === "audioinput")
        .map(({ deviceId, label }) => ({ deviceId, label }));
    },
    async capture(onLiveLevel): Promise<CaptureMeasurements> {
      if (!sampler) throw new Error("Microphone permission is required before capture.");
      const unsubscribe = onLiveLevel ? sampler.subscribe(onLiveLevel) : undefined;
      try {
        const quiet = measureSamples(await sampler.sample(quietDurationMs));
        const speak = measureSamples(await sampler.sample(speakDurationMs));
        return { quiet, speak, processing };
      } finally {
        unsubscribe?.();
      }
    },
    async reset(): Promise<void> {
      await teardown();
    },
  };

  async function teardown(): Promise<void> {
    sampler?.close();
    sampler = undefined;
    stream?.getTracks().forEach((track) => track.stop());
    stream = undefined;
    if (context) await context.close();
    context = undefined;
  }
}

export function createAnalyserSampler(context: AudioContext, stream: MediaStream): PhaseSampler {
  const source = context.createMediaStreamSource(stream);
  const analyser = context.createAnalyser();
  analyser.fftSize = 2048;
  source.connect(analyser);
  const buffer = new Float32Array(analyser.fftSize);
  let frame: number | undefined;

  function current(): PhaseMeasurement {
    analyser.getFloatTimeDomainData(buffer);
    return measureSamples(buffer);
  }

  return {
    sample(durationMs): Promise<Float32Array> {
      return new Promise((resolve) => {
        const samples: number[] = [];
        const startedAt = performance.now();
        const collect = () => {
          analyser.getFloatTimeDomainData(buffer);
          samples.push(...buffer);
          if (performance.now() - startedAt < durationMs) {
            frame = window.requestAnimationFrame(collect);
          } else {
            resolve(Float32Array.from(samples));
          }
        };
        collect();
      });
    },
    subscribe(listener): () => void {
      const update = () => {
        const measurement = current();
        listener({
          rms: measurement.rms,
          peak: measurement.peak,
          clipping: measurement.clipCount > 0,
        });
        frame = window.requestAnimationFrame(update);
      };
      update();
      return () => {
        if (frame !== undefined) window.cancelAnimationFrame(frame);
        frame = undefined;
      };
    },
    close(): void {
      if (frame !== undefined) window.cancelAnimationFrame(frame);
      source.disconnect();
      analyser.disconnect();
    },
  };
}

function browserPlatform(): AudioPlatform {
  return {
    getUserMedia: (constraints) => navigator.mediaDevices.getUserMedia(constraints),
    enumerateDevices: () => navigator.mediaDevices.enumerateDevices(),
    createContext: () => new AudioContext(),
  };
}
