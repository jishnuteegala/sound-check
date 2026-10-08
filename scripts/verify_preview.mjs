import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";

const preview = spawn(
  process.execPath,
  ["node_modules/vite/bin/vite.js", "preview", "--host", "127.0.0.1"],
  { stdio: ["ignore", "pipe", "inherit"] },
);
const exited = new Promise((resolve) => {
  preview.once("close", resolve);
  preview.once("error", resolve);
});

try {
  const origin = await new Promise((resolve, reject) => {
    let out = "";
    const watchdog = setTimeout(
      () => reject(new Error("vite preview did not report its address")),
      15000,
    );
    preview.stdout.on("data", (chunk) => {
      out += chunk;
      // oxlint-disable-next-line no-control-regex
      const plain = out.replace(/\u001b\[[0-9;]*m/g, "");
      const url = plain.match(/http:\/\/127\.0\.0\.1:\d+\//)?.[0];
      if (url) {
        clearTimeout(watchdog);
        resolve(url);
      }
    });
    preview.once("exit", (code) => {
      clearTimeout(watchdog);
      reject(new Error(`vite preview exited with code ${code}`));
    });
    preview.once("error", (error) => {
      clearTimeout(watchdog);
      reject(error);
    });
  });

  const response = await fetch(origin);
  if (!response.ok) {
    throw new Error("Vite preview did not serve the built app");
  }

  const llmsResponse = await fetch(new URL("llms.txt", origin));
  if (!llmsResponse.ok) {
    throw new Error("Vite preview did not serve /llms.txt");
  }

  const [html, headers, llms] = await Promise.all([
    response.text(),
    readFile("dist/_headers", "utf8"),
    llmsResponse.text(),
  ]);
  const csp = headers.match(/Content-Security-Policy: (.+)/)?.[1];

  if (!/default-src 'self'\s*;/.test(csp ?? "") || !/script-src 'self'\s*;/.test(csp ?? "")) {
    throw new Error("dist/_headers does not contain the required strict CSP");
  }

  if (/<script(?![^>]*\bsrc=)/i.test(html) || /<style(?:\s|>)/i.test(html)) {
    throw new Error("The built HTML requires inline script or style under the Pages CSP");
  }

  if (llms !== (await readFile("llms.txt", "utf8"))) {
    throw new Error("The built /llms.txt differs from the repository copy");
  }

  console.log(`Preview check passed at ${origin}`);
} finally {
  preview.kill();
  await exited;
}
