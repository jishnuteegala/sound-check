import { useEffect, useState } from "react";
import { createAudioEngine, type AudioDevice } from "./audio/engine";
import {
  checkBrowserProcessing,
  checkClipping,
  checkDeadInput,
  checkLowLevel,
  checkNoisyQuiet,
} from "./core/checks";
import { deriveVerdict } from "./core/verdict";

const engine = createAudioEngine();

export function App() {
  const [devices, setDevices] = useState<AudioDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState("");
  const [verdict, setVerdict] = useState<string>("No measurement yet.");
  const [busy, setBusy] = useState(false);

  useEffect(() => () => void engine.reset(), []);

  async function start(): Promise<void> {
    setBusy(true);
    try {
      await engine.requestPermission(selectedDevice || undefined);
      const inputs = await engine.listInputs();
      setDevices(inputs);
      if (!selectedDevice && inputs[0]) setSelectedDevice(inputs[0].deviceId);
      const measured = await engine.capture();
      const results = [
        checkDeadInput(measured.speak),
        checkLowLevel(measured.speak),
        checkClipping(measured.speak),
        checkNoisyQuiet(measured.quiet, measured.speak),
        checkBrowserProcessing(measured.processing),
      ];
      setVerdict(JSON.stringify(deriveVerdict(results), null, 2));
    } catch (error) {
      setVerdict(error instanceof Error ? error.message : "Microphone capture failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <h1>sound-check-card core</h1>
      <label>
        Input device
        <select value={selectedDevice} onChange={(event) => setSelectedDevice(event.target.value)}>
          <option value="">Browser default</option>
          {devices.map((device) => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label || "Unnamed microphone"}
            </option>
          ))}
        </select>
      </label>
      <button type="button" onClick={() => void start()} disabled={busy}>
        {busy ? "Checking..." : "Check my microphone"}
      </button>
      <pre>{verdict}</pre>
    </main>
  );
}
