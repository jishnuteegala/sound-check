import { useEffect, useRef, useState } from "react";
import { createAudioEngine, type AudioDevice, type LiveLevel } from "./audio/engine";
import { createFakeEngine } from "./audio/fake-engine";
import {
  checkBrowserProcessing,
  checkClipping,
  checkDeadInput,
  checkLowLevel,
  checkNoisyQuiet,
} from "./core/checks";
import type { Verdict } from "./core/model";
import { deriveVerdict } from "./core/verdict";
import {
  discardPlayback,
  initialFlow,
  permissionEvent,
  transition,
  type FlowEvent,
  type FlowState,
} from "./flow";
import "./styles.css";

const fakeScenario = import.meta.env.DEV ? new URLSearchParams(location.search).get("fake") : null;
const engine = fakeScenario !== null ? createFakeEngine(fakeScenario) : createAudioEngine();
const METER_GAIN = 500;
const PERCENT_SCALE = 100;

export function App() {
  const [flow, setFlow] = useState<FlowState>(initialFlow);
  const [devices, setDevices] = useState<AudioDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState("");
  const [level, setLevel] = useState<LiveLevel>({ rms: 0, peak: 0, clipping: false });
  const [verdict, setVerdict] = useState<Verdict>();
  const [error, setError] = useState("");
  const [playbackUrl, setPlaybackUrl] = useState<string>();
  const [recording, setRecording] = useState(false);
  const playbackUrlRef = useRef<string | undefined>(undefined);

  function setPlayback(url: string | undefined): void {
    playbackUrlRef.current = discardPlayback(playbackUrlRef.current);
    playbackUrlRef.current = url;
    setPlaybackUrl(url);
  }

  useEffect(
    () => () => {
      setPlayback(undefined);
      void engine.reset();
    },
    [],
  );

  function move(event: FlowEvent): void {
    setFlow((state) => transition(state, event));
  }

  async function requestPermission(): Promise<void> {
    setError("");
    move("request");
    try {
      await engine.requestPermission();
      const inputs = await engine.listInputs();
      setDevices(inputs);
      setSelectedDevice(inputs[0]?.deviceId ?? "");
      move("granted");
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : "Microphone permission was not granted.";
      const event = permissionEvent(caught);
      if (event === "denied") {
        setError(message);
      }
      move(event);
    }
  }

  async function startCheck(): Promise<void> {
    setError("");
    setVerdict(undefined);
    setPlayback(undefined);
    move("start");
    try {
      await engine.requestPermission(selectedDevice || undefined);
      const measured = await engine.capture({
        onLiveLevel: setLevel,
        onPhase: (phase) => move(phase),
      });
      const results = [
        checkDeadInput(measured.speak),
        checkLowLevel(measured.speak),
        checkClipping(measured.speak),
        checkNoisyQuiet(measured.quiet, measured.speak),
        checkBrowserProcessing(measured.processing),
      ];
      setVerdict(deriveVerdict(results));
      move("complete");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The microphone check could not finish.");
      setFlow({ screen: "devices", phase: "quiet" });
    }
  }

  async function recordPlayback(): Promise<void> {
    setRecording(true);
    setError("");
    try {
      setPlayback(URL.createObjectURL(await engine.recordPlayback()));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Playback capture could not start.");
    } finally {
      setRecording(false);
    }
  }

  async function reset(): Promise<void> {
    setPlayback(undefined);
    setVerdict(undefined);
    setError("");
    await engine.reset();
    move("reset");
  }

  if (location.hash === "#/design-system") return <DesignSystem />;

  return (
    <div className="site-shell">
      <a className="skip-link" href="#main-content">
        Skip to check
      </a>
      <header className="masthead">
        <a className="wordmark" href="#/">
          sound-check-card
        </a>
        <a className="quiet-link" href="#/design-system">
          Design system
        </a>
      </header>
      <main id="main-content" className="check-layout">
        <section className="intro" aria-labelledby="page-title">
          <h1 id="page-title">Know your microphone before the call starts.</h1>
          <p className="lede">
            One practical check for input, speaking level, clipping, and room noise.
          </p>
          <div className="intro-notes">
            <aside className="disclaimer">
              <strong>Before your meeting:</strong> a PASS here cannot guarantee Zoom, Meet, or
              Teams. Those apps may apply their own processing.
            </aside>
            <p className="retention">
              <strong>Zero retention.</strong> Audio stays in this browser and is never uploaded or
              saved.
            </p>
          </div>
        </section>
        <section className="check-panel" aria-live="polite">
          {flow.screen === "idle" && <Idle onStart={() => void requestPermission()} />}
          {flow.screen === "permission" && <Pending />}
          {flow.screen === "blocked" && <Blocked error={error} onReturn={() => void reset()} />}
          {flow.screen === "devices" && (
            <DevicePick
              devices={devices}
              selected={selectedDevice}
              onSelect={setSelectedDevice}
              onStart={() => void startCheck()}
              error={error}
            />
          )}
          {flow.screen === "guiding" && <Guidance phase={flow.phase} level={level} />}
          {flow.screen === "verdict" && verdict && (
            <VerdictCard
              verdict={verdict}
              level={level}
              playbackUrl={playbackUrl}
              recording={recording}
              error={error}
              onRecord={() => void recordPlayback()}
              onDiscard={() => setPlayback(undefined)}
              onReset={() => void reset()}
            />
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}

function Idle({ onStart }: { onStart: () => void }) {
  return (
    <>
      <h2>Ready when you are.</h2>
      <p>We will ask for microphone access only after you start.</p>
      <div className="panel-actions">
        <button className="button primary block" type="button" onClick={onStart}>
          Check my microphone
        </button>
      </div>
    </>
  );
}

function Pending() {
  return (
    <>
      <p className="step">Step 1 of 3</p>
      <h2>Allow microphone access</h2>
      <p>Choose “Allow” in your browser prompt. We will show available inputs next.</p>
    </>
  );
}

function Blocked({ error, onReturn }: { error: string; onReturn: () => void }) {
  return (
    <>
      <h2>We could not access your microphone.</h2>
      <p>
        {error || "Microphone access was blocked."} Re-enable it from this site’s permissions in
        your browser settings, then try again.
      </p>
      <div className="panel-actions">
        <button className="button primary block" type="button" onClick={onReturn}>
          Back to start
        </button>
      </div>
    </>
  );
}

function DevicePick({
  devices,
  selected,
  onSelect,
  onStart,
  error,
}: {
  devices: AudioDevice[];
  selected: string;
  onSelect: (id: string) => void;
  onStart: () => void;
  error: string;
}) {
  const mobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
  return (
    <>
      <p className="step">Step 2 of 3</p>
      <h2>Choose your input</h2>
      {mobile ? (
        <p className="notice">
          Your browser uses the OS default microphone. Switching inputs is not available here.
        </p>
      ) : (
        <label className="field">
          Microphone
          <select value={selected} onChange={(event) => onSelect(event.target.value)}>
            <option value="">Browser default</option>
            {devices.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || "Unnamed microphone"}
              </option>
            ))}
          </select>
        </label>
      )}
      <p>Each result runs a new quiet period followed by a speaking period.</p>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="panel-actions">
        <button className="button primary block" type="button" onClick={onStart}>
          Start microphone check
        </button>
      </div>
    </>
  );
}

function Guidance({ phase, level }: { phase: "quiet" | "speak"; level: LiveLevel }) {
  const speaking = phase === "speak";
  return (
    <>
      <p className="step">Step 3 of 3 · {speaking ? "Speaking" : "Quiet"} phase</p>
      <h2>{speaking ? "Speak normally" : "Stay quiet"}</h2>
      <p>
        {speaking
          ? "Talk at the level you expect to use in the call."
          : "We are measuring the room before you speak."}
      </p>
      <div className="evidence">
        <span className="evidence-label">Live input level</span>
        <Level level={level} showClipping={speaking} />
      </div>
    </>
  );
}

function VerdictCard({
  verdict,
  level,
  playbackUrl,
  recording,
  error,
  onRecord,
  onDiscard,
  onReset,
}: {
  verdict: Verdict;
  level: LiveLevel;
  playbackUrl?: string;
  recording: boolean;
  error: string;
  onRecord: () => void;
  onDiscard: () => void;
  onReset: () => void;
}) {
  const highlights = verdict.results.filter((result) => result.status !== "pass");
  const browserProcessingActive = verdict.results.some(
    (result) => result.id === "browser-processing" && result.status === "info",
  );
  return (
    <>
      <div className="verdict-head">
        <span className={`status ${verdict.status.toLowerCase()}`}>{verdict.status}</span>
        <h2>
          {verdict.status === "PASS"
            ? "Your microphone passed this check."
            : "Review your microphone setup."}
        </h2>
      </div>
      <div className="findings">
        {highlights.length ? (
          highlights.map((result) => (
            <div key={result.id} className={`finding ${result.status}`}>
              <strong>{result.label}</strong>
              <p>{result.reason}</p>
              {result.status === "check" && <p className="action">Next: {result.nextAction}</p>}
            </div>
          ))
        ) : (
          <div className="finding info">
            <strong>All checks passed</strong>
            <p>Your input, speaking level, clipping, and quiet-period noise passed this check.</p>
          </div>
        )}
      </div>
      <div className="evidence">
        <span className="evidence-label">Supporting evidence</span>
        <Level level={level} showClipping />
      </div>
      {browserProcessingActive && (
        <p className="notice">
          Meeting apps may process audio differently. This check reports whether your browser could
          turn off its own input processing.
        </p>
      )}
      <Playback
        url={playbackUrl}
        recording={recording}
        error={error}
        onRecord={onRecord}
        onDiscard={onDiscard}
      />
      <div className="panel-actions">
        <button className="button primary block" type="button" onClick={onReset}>
          Check again
        </button>
      </div>
    </>
  );
}

function Level({ level, showClipping }: { level: LiveLevel; showClipping: boolean }) {
  const meterValue = Math.min(level.rms * METER_GAIN, PERCENT_SCALE);
  return (
    <div className="level">
      <div className="meter" aria-hidden="true">
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

function Playback({
  url,
  recording,
  error,
  onRecord,
  onDiscard,
}: {
  url?: string;
  recording: boolean;
  error: string;
  onRecord: () => void;
  onDiscard: () => void;
}) {
  if (url)
    return (
      <div className="playback">
        <audio controls src={url}>
          Your browser cannot play this audio.
        </audio>
        <button className="button secondary" type="button" onClick={onDiscard}>
          Discard recording
        </button>
      </div>
    );
  return (
    <div className="playback">
      <p>
        Optional: make a local recording of up to 10 seconds to hear this input. It stays in memory
        only.
      </p>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button className="button secondary" type="button" onClick={onRecord} disabled={recording}>
        {recording ? "Recording..." : "Record up to 10 seconds"}
      </button>
    </div>
  );
}

function Footer() {
  return (
    <footer>
      <span>© 2026 sound-check-card</span>
      <a href="/privacy">Privacy</a>
      <a href="https://github.com/jishnuteegala/sound-check-card">Source</a>
    </footer>
  );
}

function DesignSystem() {
  return (
    <div className="site-shell">
      <a className="skip-link" href="#tokens">
        Skip to tokens
      </a>
      <header className="masthead">
        <a className="wordmark" href="#/">
          sound-check-card
        </a>
      </header>
      <main id="tokens" className="design-system">
        <h1>Design system</h1>
        <p className="lede">
          Every value on this site flows from the tokens below. Nothing is set by hand.
        </p>
        <section className="ds-section">
          <h2>Colour</h2>
          <div className="ds-grid">
            <span className="swatch canvas">
              Canvas<code>--canvas</code>
            </span>
            <span className="swatch surface">
              Surface<code>--surface</code>
            </span>
            <span className="swatch ink">
              Ink<code>--ink</code>
            </span>
            <span className="swatch muted">
              Muted<code>--muted</code>
            </span>
            <span className="swatch accent">
              Accent<code>--accent</code>
            </span>
            <span className="swatch check">
              Check<code>--check</code>
            </span>
            <span className="swatch pass-bg">
              Pass<code>--pass-bg</code>
            </span>
            <span className="swatch check-bg">
              Check bg<code>--check-bg</code>
            </span>
            <span className="swatch meter-track">
              Meter<code>--meter-track</code>
            </span>
            <span className="swatch focus">
              Focus<code>--focus</code>
            </span>
          </div>
        </section>
        <section className="ds-section">
          <h2>Type scale</h2>
          <div className="ds-type">
            <h1>Display · --text-3xl</h1>
            <h2>Heading · --text-xl</h2>
            <h3>Subheading · --text-base</h3>
            <p>Body copy · --text-base sits at a calm, readable measure for instructions.</p>
            <p className="step">Label · --text-xs uppercase</p>
          </div>
        </section>
        <section className="ds-section">
          <h2>Spacing scale</h2>
          <div className="ds-scale">
            {["--space-1", "--space-2", "--space-3", "--space-4", "--space-5", "--space-6"].map(
              (token) => (
                <div key={token} className="ds-ruler">
                  <span style={{ width: `var(${token})` }} />
                  <code>{token}</code>
                </div>
              ),
            )}
          </div>
        </section>
        <section className="ds-section">
          <h2>Radii</h2>
          <div className="ds-radii">
            <span style={{ borderRadius: "var(--radius-sm)" }}>sm</span>
            <span style={{ borderRadius: "var(--radius)" }}>base</span>
            <span style={{ borderRadius: "var(--radius-lg)" }}>lg</span>
            <span style={{ borderRadius: "var(--radius-pill)" }}>pill</span>
          </div>
        </section>
        <section className="ds-section">
          <h2>Buttons</h2>
          <div className="ds-row">
            <button className="button primary" type="button">
              Primary action
            </button>
            <button className="button secondary" type="button">
              Secondary action
            </button>
            <button className="button primary" type="button" disabled>
              Disabled
            </button>
          </div>
        </section>
        <section className="ds-section">
          <h2>Status</h2>
          <div className="ds-row">
            <span className="status pass">PASS</span>
            <span className="status check">CHECK</span>
          </div>
        </section>
        <section className="ds-section">
          <h2>Findings</h2>
          <div className="findings">
            <div className="finding check">
              <strong>Clipping</strong>
              <p>Your microphone signal is clipping.</p>
              <p className="action">Next: Lower microphone gain or move farther away.</p>
            </div>
            <div className="finding info">
              <strong>Browser processing</strong>
              <p>Your browser is processing this input; your meeting app may behave differently.</p>
            </div>
          </div>
        </section>
        <section className="ds-section">
          <h2>Level meter</h2>
          <div className="evidence">
            <span className="evidence-label">Supporting evidence</span>
            <Level level={{ rms: 0.09, peak: 0.4, clipping: false }} showClipping />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
