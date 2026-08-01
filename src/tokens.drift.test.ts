import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
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

const inventory: string[] = [
  ...colorTokens,
  ...spaceTokens,
  ...textTokens,
  ...leadingTokens,
  ...weightTokens,
  ...trackingTokens,
  ...radiusTokens,
  ...shadowTokens,
  ...controlTokens,
  ...motionTokens,
  ...layoutTokens,
  ...layeringTokens,
  ...fontTokens,
];

function rootCustomProperties(css: string): string[] {
  const blockStart = css.indexOf("{", css.indexOf(":root {"));
  const blockEnd = css.indexOf("}", blockStart);
  const block = css.slice(blockStart + 1, blockEnd);
  const names: string[] = [];
  for (const match of block.matchAll(/(--[\w-]+)\s*:/g)) {
    names.push(match[1]);
  }
  return names;
}

function duplicates(names: string[]): string[] {
  const seen = new Set<string>();
  const dupes = new Set<string>();
  for (const name of names) {
    if (seen.has(name)) dupes.add(name);
    seen.add(name);
  }
  return [...dupes];
}

describe("token gallery drift", () => {
  const css = readFileSync(fileURLToPath(new URL("./styles.css", import.meta.url)), "utf8");
  const declared = rootCustomProperties(css);

  it("declares no duplicate custom properties in :root", () => {
    expect(duplicates(declared)).toEqual([]);
  });

  it("lists no duplicate names in the tokens inventory", () => {
    expect(duplicates(inventory)).toEqual([]);
  });

  it("matches the tokens inventory exactly to the :root custom properties", () => {
    const declaredSet = new Set(declared);
    const inventorySet = new Set(inventory);
    const missing = [...declaredSet].filter((name) => !inventorySet.has(name));
    const extra = [...inventorySet].filter((name) => !declaredSet.has(name));
    expect({ missing, extra }).toEqual({ missing: [], extra: [] });
  });
});
