export interface TokenGroup {
  title: string;
  tokens: string[];
}

export const colorTokens: string[] = [
  "--canvas",
  "--surface",
  "--surface-sunken",
  "--ink",
  "--ink-soft",
  "--muted",
  "--line",
  "--line-strong",
  "--accent",
  "--accent-hover",
  "--accent-soft",
  "--on-accent",
  "--check",
  "--check-ink",
  "--check-bg",
  "--check-line",
  "--pass-ink",
  "--pass-bg",
  "--pass-line",
  "--meter-track",
  "--focus",
];

export const spaceTokens: string[] = [
  "--space-1",
  "--space-2",
  "--space-3",
  "--space-4",
  "--space-5",
  "--space-6",
  "--space-7",
  "--space-8",
  "--space-10",
];

export const textTokens: string[] = [
  "--text-xs",
  "--text-sm",
  "--text-base",
  "--text-lg",
  "--text-xl",
  "--text-2xl",
  "--text-3xl",
];

export const leadingTokens: string[] = ["--leading-tight", "--leading-snug", "--leading-normal"];

export const weightTokens: string[] = [
  "--weight-regular",
  "--weight-medium",
  "--weight-semibold",
  "--weight-bold",
];

export const trackingTokens: string[] = [
  "--tracking-tight",
  "--tracking-label",
  "--tracking-status",
];

export const radiusTokens: string[] = ["--radius-sm", "--radius", "--radius-lg", "--radius-pill"];

export const shadowTokens: string[] = ["--shadow-card"];

export const controlTokens: string[] = [
  "--border-thin",
  "--meter-height",
  "--control-height",
  "--tap-target",
  "--status-dot",
  "--focus-ring-width",
  "--focus-ring-offset",
  "--press-offset",
];

export const motionTokens: string[] = [
  "--duration-fast",
  "--duration",
  "--ease-out",
  "--shift-panel",
];

export const layoutTokens: string[] = [
  "--measure",
  "--measure-title",
  "--measure-title-narrow",
  "--measure-lede",
  "--shell-width",
  "--sidebar-width",
  "--panel-min-height",
  "--pad-fluid-block",
  "--pad-fluid-inline",
  "--specimen-size",
  "--swatch-min-height",
  "--swatch-col",
];

export const layeringTokens: string[] = ["--z-skip"];

export const fontTokens: string[] = ["--font"];
