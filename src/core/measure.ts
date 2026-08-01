import type { PhaseMeasurement } from "./model";
import { thresholds } from "./thresholds";

export function measureSamples(samples: Float32Array): PhaseMeasurement {
  if (samples.length === 0) {
    return { rms: 0, peak: 0, clipCount: 0 };
  }

  let sumSquares = 0;
  let peak = 0;
  let clipCount = 0;
  for (const sample of samples) {
    const magnitude = Math.abs(sample);
    sumSquares += sample * sample;
    peak = Math.max(peak, magnitude);
    if (magnitude >= thresholds.clippingPeak) clipCount += 1;
  }
  return {
    rms: Math.sqrt(sumSquares / samples.length),
    peak,
    clipCount,
  };
}
