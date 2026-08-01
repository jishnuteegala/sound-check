export const thresholds = {
  deadRms: 0.003,
  lowSpeechRms: 0.02,
  clippingPeak: 0.98,
  clippingSamples: 3,
  noisyQuietRatio: 0.5,
  noisyQuietUnusableRatio: 0.8,
} as const;

export const thresholdRationale = {
  deadRms: "-50 dBFS near-silence floor catches muted or disconnected inputs.",
  lowSpeechRms: "-34 dBFS keeps the usable-speech floor conservative for calls.",
  clippingPeak: "Within 0.18 dB of full scale marks likely hard clipping.",
  clippingSamples: "Three near-full-scale samples avoids a single-sample false alarm.",
  noisyQuietRatio: "Quiet at half the speaking level is worth surfacing as a note.",
  noisyQuietUnusableRatio: "Quiet at 80% of speech is conservatively unusable.",
} as const;
