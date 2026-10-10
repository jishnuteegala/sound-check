import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createAudioEngine, type AudioDevice, type LiveLevel } from "./audio/engine";
import { createFakeEngine } from "./audio/fake-engine";
import { Footer, Level } from "./components";
import {
  checkBrowserProcessing,
  checkClipping,
  checkDeadInput,
  checkLowLevel,
  checkNoisyQuiet,
} from "./core/checks";
import type { Verdict } from "./core/model";
import { deriveVerdict } from "./core/verdict";
import { DesignSystem } from "./design-system";
import {
  discardPlayback,
  initialFlow,
  permissionEvent,
  transition,
  type FlowEvent,
  type FlowState,
} from "./flow";
import "./styles.css";

const fakeScenario = import.meta.env.DEV
  ? new URLSearchParams(window.location.search).get("fake")
  : null;
const engine = fakeScenario !== null ? createFakeEngine(fakeScenario) : createAudioEngine();

function subscribeHash(onChange: () => void): () => void {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

function readHash(): string {
  return window.location.hash;
}

export function App() {
  const [flow, setFlow] = useState<FlowState>(initialFlow);
  const [devices, setDevices] = useState<AudioDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState("");
  const [level, setLevel] = useState<LiveLevel>({ rms: 0, clipping: false });
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
      if (event !== "dismissed") {
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

  const hash = useSyncExternalStore(subscribeHash, readHash);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [hash]);
  if (hash === "#/design-system") return <DesignSystem />;

  return (
    <div className="site-shell">
      <a
        className="skip-link"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById("main-content")?.focus();
        }}
      >
        Skip to check
      </a>
      <header className="masthead">
        <a className="wordmark" href="#/">
          Sound Check
        </a>
        {flow.screen !== "guiding" && !recording && (
          <a className="quiet-link" href="#/design-system">
            Design system
          </a>
        )}
      </header>
      <main id="main-content" tabIndex={-1} className="check-layout">
        <section className="intro" aria-labelledby="page-title">
          <h1 id="page-title">Know your microphone before the call starts.</h1>
          <p className="lede">
            One practical check for input, speaking level, clipping, and room noise.
          </p>
          <div className="intro-notes">
            <aside className="disclaimer">
              <strong>Before your meeting:</strong> a PASS here does not guarantee the call. Zoom,
              Meet, and Teams may apply their own processing.
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
      <p>Choose "Allow" in your browser prompt. We will show available inputs next.</p>
    </>
  );
}

function Blocked({ error, onReturn }: { error: string; onReturn: () => void }) {
  return (
    <>
      <h2>We could not access your microphone.</h2>
      <p>
        {error || "Microphone access was blocked."} Check that a microphone is connected and that
        this site has permission to use it, then try again.
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
      <p>Each check runs a fresh quiet period followed by a speaking period.</p>
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
  playbackUrl,
  recording,
  error,
  onRecord,
  onDiscard,
  onReset,
}: {
  verdict: Verdict;
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
  const speakMeasured = verdict.results.find((result) => result.id === "low-level")?.measured;
  const evidence: LiveLevel = {
    rms: Number(speakMeasured?.speakRms ?? 0),
    clipping: verdict.results.find((result) => result.id === "clipping")?.status === "check",
  };
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
        <Level level={evidence} showClipping />
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
        <button
          className="button primary block"
          type="button"
          onClick={onReset}
          disabled={recording}
        >
          Check again
        </button>
      </div>
    </>
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
        Optional: record up to 10 seconds to hear what the microphone captured. The recording stays
        in memory only.
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
