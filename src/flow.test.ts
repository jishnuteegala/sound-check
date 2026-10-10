import { describe, expect, it, vi } from "vitest";
import { discardPlayback, initialFlow, permissionEvent, transition } from "./flow";

describe("microphone check flow", () => {
  it("requires permission before device choice and a complete two-phase run before verdict", () => {
    let state = transition(initialFlow, "request");
    state = transition(state, "granted");
    state = transition(state, "start");
    expect(state).toEqual({ screen: "guiding", phase: "quiet" });
    state = transition(state, "speak");
    expect(state).toEqual({ screen: "guiding", phase: "speak" });
    state = transition(state, "complete");
    expect(state.screen).toBe("verdict");
    expect(transition(state, "reset").screen).toBe("devices");
  });

  it("shows an explanatory state for a NotAllowedError", () => {
    const error = new Error("Permission was not granted.");
    error.name = "NotAllowedError";
    const blocked = transition(transition(initialFlow, "request"), permissionEvent(error));
    expect(blocked.screen).toBe("blocked");
    expect(transition(blocked, "reset").screen).toBe("idle");
  });

  it("returns to idle for an aborted permission prompt", () => {
    const error = new Error("Permission prompt closed.");
    error.name = "AbortError";
    expect(transition(transition(initialFlow, "request"), permissionEvent(error))).toEqual(
      initialFlow,
    );
  });

  it("returns to idle when Chromium reports a dismissed prompt as NotAllowedError", () => {
    const error = new Error("Permission dismissed");
    error.name = "NotAllowedError";
    expect(transition(transition(initialFlow, "request"), permissionEvent(error))).toEqual(
      initialFlow,
    );
  });

  it("shows an explanatory state when no microphone exists or the device fails", () => {
    const error = new Error("Requested device not found.");
    error.name = "NotFoundError";
    const blocked = transition(transition(initialFlow, "request"), permissionEvent(error));
    expect(blocked.screen).toBe("blocked");
    expect(transition(blocked, "reset").screen).toBe("idle");
  });
});

describe("playback discard", () => {
  it("revokes the in-memory object URL and clears its reference", () => {
    const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    expect(discardPlayback("blob:memory-only")).toBeUndefined();
    expect(revoke).toHaveBeenCalledWith("blob:memory-only");
    revoke.mockRestore();
  });
});
