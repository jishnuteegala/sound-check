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
  const [permissionGranted, setPermissionGranted] = useState(false);

  useEffect(() => () => void engine.reset(), []);

  async function requestPermission(): Promise<void> {
    setBusy(true);
    try {
      await engine.requestPermission();
      const inputs = await engine.listInputs();
      setDevices(inputs);
      if (!selectedDevice && inputs[0]) setSelectedDevice(inputs[0].deviceId);
      setPermissionGranted(true);
      setVerdict("Choose an input, then start the microphone check.");
    } catch (error) {
      setVerdict(error instanceof Error ? error.message : "Microphone permission failed.");
    } finally {
      setBusy(false);
    }
  }

  async function capture(): Promise<void> {
    setBusy(true);
    try {
      if (selectedDevice) await engine.requestPermission(selectedDevice);
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
      <button
        type="button"
        onClick={() => void (permissionGranted ? capture() : requestPermission())}
        disabled={busy}
      >
        {busy
          ? "Checking..."
          : permissionGranted
            ? "Start microphone check"
            : "Check my microphone"}
      </button>
      <pre>{verdict}</pre>
    </main>
  );
}
