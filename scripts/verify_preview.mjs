import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";

const port = "4174";
const preview = spawn(
  process.execPath,
  ["node_modules/vite/bin/vite.js", "preview", "--host", "127.0.0.1", "--port", port],
  { stdio: "ignore" },
);

try {
  async function fetchPreview(attempt = 0) {
    try {
      return await fetch(`http://127.0.0.1:${port}/`);
    } catch {
      if (attempt === 39) return undefined;
      await new Promise((resolve) => setTimeout(resolve, 250));
      return fetchPreview(attempt + 1);
    }
  }

  const response = await fetchPreview();

  if (!response?.ok) {
    throw new Error("Vite preview did not serve the built app");
  }

  const llmsResponse = await fetch(`http://127.0.0.1:${port}/llms.txt`);
  if (!llmsResponse.ok) {
    throw new Error("Vite preview did not serve /llms.txt");
  }

  const [html, headers, llms] = await Promise.all([
    response.text(),
    readFile("dist/_headers", "utf8"),
    llmsResponse.text(),
  ]);
  const csp = headers.match(/Content-Security-Policy: (.+)/)?.[1];

  if (!csp?.includes("default-src 'self'") || !csp.includes("script-src 'self'")) {
    throw new Error("dist/_headers does not contain the required strict CSP");
  }

  if (/<script(?![^>]*\bsrc=)/i.test(html) || /<style(?:\s|>)/i.test(html)) {
    throw new Error("The built HTML requires inline script or style under the Pages CSP");
  }

  if (llms !== (await readFile("llms.txt", "utf8"))) {
    throw new Error("The built /llms.txt differs from the repository copy");
  }
} finally {
  preview.kill();
  await new Promise((resolve) => preview.once("exit", resolve));
}
