import type { LiveLevel } from "./audio/engine";

const METER_GAIN = 500;
const PERCENT_SCALE = 100;

export function Level({ level, showClipping }: { level: LiveLevel; showClipping: boolean }) {
  const meterValue = Math.min(level.rms * METER_GAIN, PERCENT_SCALE);
  return (
    <div className="level">
      <div
        className="meter"
        role="meter"
        aria-label="Input level"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(meterValue)}
      >
        <span style={{ "--level": `${meterValue}%` } as React.CSSProperties} />
      </div>
      <div className="level-row">
        <span>Input level</span>
        {showClipping && (
          <span className={level.clipping ? "clip active" : "clip"}>
            Clipping {level.clipping ? "detected" : "not detected"}
          </span>
        )}
      </div>
    </div>
  );
}

export function Footer() {
  return (
    <footer>
      <span>© {new Date().getFullYear()} Jishnu Teegala</span>
      <a href="https://jishnuteegala.com/privacy">Privacy</a>
      <a href="https://github.com/jishnuteegala/sound-check">Source</a>
    </footer>
  );
}
