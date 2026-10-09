import { useEffect, useState } from "react";
import { Footer, Level } from "./components";
import {
  colorTokens,
  controlTokens,
  fontTokens,
  layeringTokens,
  layoutTokens,
  leadingTokens,
  motionTokens,
  radiusTokens,
  shadowTokens,
  spaceTokens,
  textTokens,
  trackingTokens,
  weightTokens,
} from "./tokens";

function useTokenValues(): (token: string) => string {
  const [root, setRoot] = useState<CSSStyleDeclaration>();
  useEffect(() => {
    setRoot(getComputedStyle(document.documentElement));
  }, []);
  return (token) => root?.getPropertyValue(token).trim() ?? "";
}

function TokenValue({ read, token }: { read: (token: string) => string; token: string }) {
  return (
    <span className="ds-token">
      <code>{token}</code>
      <span className="ds-value">{read(token) || "unset"}</span>
    </span>
  );
}

function ColourGroup({ read }: { read: (token: string) => string }) {
  return (
    <div className="ds-grid">
      {colorTokens.map((token) => (
        <span key={token} className="swatch">
          <span className="swatch-chip" style={{ background: `var(${token})` }} />
          <TokenValue read={read} token={token} />
        </span>
      ))}
    </div>
  );
}

function SpaceGroup({ read }: { read: (token: string) => string }) {
  return (
    <div className="ds-scale">
      {spaceTokens.map((token) => (
        <div key={token} className="ds-ruler">
          <span style={{ width: `var(${token})` }} />
          <TokenValue read={read} token={token} />
        </div>
      ))}
    </div>
  );
}

function TypeGroup({ read }: { read: (token: string) => string }) {
  return (
    <div className="ds-type">
      {textTokens.map((token) => (
        <div key={token} className="ds-type-row">
          <span style={{ fontSize: `var(${token})`, lineHeight: "var(--leading-tight)" }}>
            Speak normally
          </span>
          <TokenValue read={read} token={token} />
        </div>
      ))}
    </div>
  );
}

function LeadingGroup({ read }: { read: (token: string) => string }) {
  return (
    <div className="ds-type">
      {leadingTokens.map((token) => (
        <div key={token} className="ds-type-row">
          <p style={{ lineHeight: `var(${token})`, margin: 0, maxWidth: "var(--measure-lede)" }}>
            One practical check for input, speaking level, clipping, and room noise before your
            call.
          </p>
          <TokenValue read={read} token={token} />
        </div>
      ))}
    </div>
  );
}

function WeightGroup({ read }: { read: (token: string) => string }) {
  return (
    <div className="ds-type">
      {weightTokens.map((token) => (
        <div key={token} className="ds-type-row">
          <span style={{ fontWeight: `var(${token})`, fontSize: "var(--text-lg)" }}>
            Know your microphone
          </span>
          <TokenValue read={read} token={token} />
        </div>
      ))}
    </div>
  );
}

function TrackingGroup({ read }: { read: (token: string) => string }) {
  return (
    <div className="ds-type">
      {trackingTokens.map((token) => (
        <div key={token} className="ds-type-row">
          <span
            style={{
              letterSpacing: `var(${token})`,
              textTransform: "uppercase",
              fontWeight: "var(--weight-semibold)",
            }}
          >
            Supporting evidence
          </span>
          <TokenValue read={read} token={token} />
        </div>
      ))}
    </div>
  );
}

function RadiiGroup({ read }: { read: (token: string) => string }) {
  return (
    <div className="ds-radii">
      {radiusTokens.map((token) => (
        <span key={token} style={{ borderRadius: `var(${token})` }}>
          <TokenValue read={read} token={token} />
        </span>
      ))}
    </div>
  );
}

function ShadowGroup({ read }: { read: (token: string) => string }) {
  return (
    <div className="ds-row">
      {shadowTokens.map((token) => (
        <span key={token} className="ds-shadow" style={{ boxShadow: `var(${token})` }}>
          <TokenValue read={read} token={token} />
        </span>
      ))}
    </div>
  );
}

function ValueList({ read, tokens }: { read: (token: string) => string; tokens: string[] }) {
  return (
    <div className="ds-list">
      {tokens.map((token) => (
        <TokenValue key={token} read={read} token={token} />
      ))}
    </div>
  );
}

export function DesignSystem() {
  const read = useTokenValues();
  return (
    <div className="site-shell">
      <a
        className="skip-link"
        href="#tokens"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById("tokens")?.focus();
        }}
      >
        Skip to tokens
      </a>
      <header className="masthead">
        <a className="wordmark" href="#/">
          Sound Check
        </a>
        <a className="quiet-link" href="#/">
          Back to check
        </a>
      </header>
      <main id="tokens" tabIndex={-1} className="design-system">
        <h1>Design system</h1>
        <p className="lede">
          Every value on this site flows from the tokens below, listed from a single typed source
          that a test holds in lockstep with the stylesheet. Nothing is set by hand.
        </p>
        <section className="ds-section">
          <h2>Colour</h2>
          <ColourGroup read={read} />
        </section>
        <section className="ds-section">
          <h2>Spacing scale</h2>
          <SpaceGroup read={read} />
        </section>
        <section className="ds-section">
          <h2>Type scale</h2>
          <TypeGroup read={read} />
        </section>
        <section className="ds-section">
          <h2>Line height</h2>
          <LeadingGroup read={read} />
        </section>
        <section className="ds-section">
          <h2>Font weight</h2>
          <WeightGroup read={read} />
        </section>
        <section className="ds-section">
          <h2>Tracking</h2>
          <TrackingGroup read={read} />
        </section>
        <section className="ds-section">
          <h2>Radii</h2>
          <RadiiGroup read={read} />
        </section>
        <section className="ds-section">
          <h2>Shadow</h2>
          <ShadowGroup read={read} />
        </section>
        <section className="ds-section">
          <h2>Controls &amp; states</h2>
          <ValueList read={read} tokens={controlTokens} />
        </section>
        <section className="ds-section">
          <h2>Motion</h2>
          <ValueList read={read} tokens={motionTokens} />
        </section>
        <section className="ds-section">
          <h2>Layout</h2>
          <ValueList read={read} tokens={layoutTokens} />
        </section>
        <section className="ds-section">
          <h2>Layering</h2>
          <ValueList read={read} tokens={layeringTokens} />
        </section>
        <section className="ds-section">
          <h2>Font</h2>
          <ValueList read={read} tokens={fontTokens} />
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
          <h2>Field &amp; select</h2>
          <label className="field">
            Microphone
            <select defaultValue="builtin">
              <option value="builtin">Built-in Microphone</option>
              <option value="usb">Yeti USB Microphone</option>
            </select>
          </label>
        </section>
        <section className="ds-section">
          <h2>Status</h2>
          <div className="ds-row">
            <span className="status pass">PASS</span>
            <span className="status check">CHECK</span>
          </div>
        </section>
        <section className="ds-section">
          <h2>Notice &amp; error</h2>
          <p className="notice">
            Meeting apps may process audio differently. This check reports whether your browser
            could turn off its own input processing.
          </p>
          <p className="error" role="alert">
            Playback capture could not start.
          </p>
        </section>
        <section className="ds-section">
          <h2>Disclaimer &amp; retention</h2>
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
        <section className="ds-section">
          <h2>Findings</h2>
          <div className="findings">
            <div className="finding check">
              <strong>Clipping</strong>
              <p>Your microphone signal is clipping.</p>
              <p className="action">
                Next: Lower microphone gain or move farther from the microphone.
              </p>
            </div>
            <div className="finding info">
              <strong>Browser processing</strong>
              <p>Your browser is processing this input; your meeting app may behave differently.</p>
            </div>
          </div>
        </section>
        <section className="ds-section">
          <h2>Panel</h2>
          <div className="check-panel">
            <p className="step">Step 3 of 3 · Speaking phase</p>
            <h2>Speak normally</h2>
            <p>Talk at the level you expect to use in the call.</p>
          </div>
        </section>
        <section className="ds-section">
          <h2>Blocked &amp; pending states</h2>
          <div className="ds-states">
            <div className="check-panel">
              <p className="step">Step 1 of 3</p>
              <h2>Allow microphone access</h2>
              <p>Choose "Allow" in your browser prompt. We will show available inputs next.</p>
            </div>
            <div className="check-panel">
              <h2>We could not access your microphone.</h2>
              <p>
                Microphone access was blocked. Check that a microphone is connected and that this
                site has permission to use it, then try again.
              </p>
            </div>
          </div>
        </section>
        <section className="ds-section">
          <h2>Playback controls</h2>
          <div className="playback">
            <p>
              Optional: record up to 10 seconds to hear what the microphone captured. The recording
              stays in memory only.
            </p>
            <button className="button secondary" type="button">
              Record up to 10 seconds
            </button>
          </div>
        </section>
        <section className="ds-section">
          <h2>Level meter</h2>
          <div className="evidence">
            <span className="evidence-label">Supporting evidence</span>
            <Level level={{ rms: 0.09, clipping: false }} showClipping />
          </div>
        </section>
        <section className="ds-section">
          <h2>Clipping active</h2>
          <div className="evidence">
            <span className="evidence-label">Supporting evidence</span>
            <Level level={{ rms: 0.12, clipping: true }} showClipping />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
