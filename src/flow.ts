export type Screen = "idle" | "permission" | "devices" | "guiding" | "verdict" | "blocked";

export interface FlowState {
  screen: Screen;
  phase: "quiet" | "speak";
}

export type FlowEvent =
  | "request"
  | "granted"
  | "denied"
  | "dismissed"
  | "start"
  | "quiet"
  | "speak"
  | "complete"
  | "reset";

export const initialFlow: FlowState = { screen: "idle", phase: "quiet" };

export function transition(state: FlowState, event: FlowEvent): FlowState {
  if (event === "request" && state.screen === "idle") return { ...state, screen: "permission" };
  if (event === "granted" && state.screen === "permission") return { ...state, screen: "devices" };
  if (event === "denied" && state.screen === "permission") return { ...state, screen: "blocked" };
  if (event === "dismissed" && state.screen === "permission") return initialFlow;
  if (event === "start" && state.screen === "devices") return { screen: "guiding", phase: "quiet" };
  if (event === "quiet" && state.screen === "guiding") return { ...state, phase: "quiet" };
  if (event === "speak" && state.screen === "guiding") return { ...state, phase: "speak" };
  if (event === "complete" && state.screen === "guiding") return { ...state, screen: "verdict" };
  if (event === "reset" && (state.screen === "verdict" || state.screen === "blocked")) {
    return { ...state, screen: state.screen === "blocked" ? "idle" : "devices" };
  }
  return state;
}

export function discardPlayback(url: string | undefined): undefined {
  if (url) URL.revokeObjectURL(url);
  return undefined;
}
