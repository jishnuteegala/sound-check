# sound-check-card

A plain PASS or CHECK verdict on whether your microphone hardware is sane before you join the call - fully client-side, nothing uploaded, nothing retained.

Status: pre-release.

## Detection thresholds

The core uses conservative defaults that prefer a CHECK verdict when a measurement is unclear:

- Dead input: RMS at or below `0.003` (-50 dBFS).
- Low speech: RMS at or below `0.02` (-34 dBFS), after excluding dead input.
- Clipping: at least three samples at or above `0.98` magnitude.
- Quiet noise: surfaced at 50% of speaking RMS; escalated to CHECK at 80%.

The source records the rationale for each value and tests their boundaries. These are defaults pending calibration on real devices.

MIT - see [LICENSE](LICENSE)
