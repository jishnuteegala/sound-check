import { measureSamples } from "../core/measure";
import type { AppliedProcessing, CaptureMeasurements, PhaseMeasurement } from "../core/model";
import { captureDurations } from "../core/thresholds";

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
  capture(callbacks?: CaptureCallbacks): Promise<CaptureMeasurements>;
  recordPlayback(): Promise<Blob>;
  reset(): Promise<void>;
}

export interface CaptureCallbacks {
  onLiveLevel?: (level: LiveLevel) => void;
  onPhase?: (phase: "quiet" | "speak") => void;
}

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
    async capture(callbacks): Promise<CaptureMeasurements> {
      if (!sampler) throw new Error("Microphone permission is required before capture.");
      const unsubscribe = callbacks?.onLiveLevel
        ? sampler.subscribe(callbacks.onLiveLevel)
        : undefined;
      try {
        callbacks?.onPhase?.("quiet");
        const quiet = measureSamples(await sampler.sample(captureDurations.quietMs));
        callbacks?.onPhase?.("speak");
        const speak = measureSamples(await sampler.sample(captureDurations.speakMs));
        return { quiet, speak, processing };
      } finally {
        unsubscribe?.();
      }
    },
    recordPlayback(): Promise<Blob> {
      if (!stream || typeof MediaRecorder === "undefined") {
        return Promise.reject(new Error("Playback capture is not available in this browser."));
      }
      const activeStream = stream;
      return new Promise((resolve, reject) => {
        const recorder = new MediaRecorder(activeStream);
        const chunks: Blob[] = [];
        recorder.addEventListener("dataavailable", (event) => {
          if (event.data.size > 0) chunks.push(event.data);
        });
        recorder.addEventListener("error", () =>
          reject(new Error("Playback capture could not start.")),
        );
        recorder.addEventListener("stop", () =>
          resolve(new Blob(chunks, { type: recorder.mimeType })),
        );
        recorder.start();
        window.setTimeout(() => recorder.state === "recording" && recorder.stop(), 10_000);
      });
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
  let sampleFrame: number | undefined;
  let subscriptionFrame: number | undefined;

  return {
    sample(durationMs): Promise<Float32Array> {
      return new Promise((resolve) => {
        const chunks: Float32Array[] = [];
        const startedAt = performance.now();
        const buffer = new Float32Array(analyser.fftSize);
        const collect = () => {
          analyser.getFloatTimeDomainData(buffer);
          chunks.push(buffer.slice());
          if (performance.now() - startedAt < durationMs) {
            sampleFrame = window.requestAnimationFrame(collect);
          } else {
            const samples = new Float32Array(chunks.length * analyser.fftSize);
            chunks.forEach((chunk, index) => samples.set(chunk, index * analyser.fftSize));
            sampleFrame = undefined;
            resolve(samples);
          }
        };
        collect();
      });
    },
    subscribe(listener): () => void {
      const buffer = new Float32Array(analyser.fftSize);
      const update = () => {
        analyser.getFloatTimeDomainData(buffer);
        const measurement: PhaseMeasurement = measureSamples(buffer);
        listener({
          rms: measurement.rms,
          peak: measurement.peak,
          clipping: measurement.clipCount > 0,
        });
        subscriptionFrame = window.requestAnimationFrame(update);
      };
      update();
      return () => {
        if (subscriptionFrame !== undefined) window.cancelAnimationFrame(subscriptionFrame);
        subscriptionFrame = undefined;
      };
    },
    close(): void {
      if (sampleFrame !== undefined) window.cancelAnimationFrame(sampleFrame);
      if (subscriptionFrame !== undefined) window.cancelAnimationFrame(subscriptionFrame);
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
