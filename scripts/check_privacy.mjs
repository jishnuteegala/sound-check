import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join } from "node:path";

const dist = process.argv[2] ?? "dist";
if (!existsSync(join(dist, "index.html"))) {
  console.error(`Privacy check needs a build first - ${dist}/index.html not found.`);
  process.exit(1);
}
const allowed = new Set([
  "https://jishnuteegala.com/privacy",
  "https://github.com/jishnuteegala/sound-check",
  "https://sound-check.jishnuteegala.com/",
  "https://sound-check.jishnuteegala.com",
  "http://www.w3.org/2000/svg",
  "http://www.w3.org/1999/xhtml",
  "http://www.w3.org/1999/xlink",
  "http://www.w3.org/1998/Math/MathML",
  "http://www.w3.org/XML/1998/namespace",
]);
const allowedPrefixes = ["https://react.dev/errors/"];

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const textExtensions = /\.(html|js|css|txt|json|svg|webmanifest)$/i;
const failures = [];

for (const path of walk(dist)) {
  if (!textExtensions.test(path) && basename(path) !== "_headers") continue;
  const contents = readFileSync(path, "utf8");
  for (const match of contents.matchAll(/(?:https?|wss?):\/\/[^\s"'`<>\\)]+/gi)) {
    const url = match[0].replace(/[.,;]+$/, "");
    if (allowed.has(url)) continue;
    if (allowedPrefixes.some((prefix) => url.startsWith(prefix))) continue;
    failures.push(`${path}: ${url}`);
  }
  for (const match of contents.matchAll(/["'(=`]\s*\/\/[\w.-]+\.[a-z]{2,}/gi)) {
    failures.push(`${path}: protocol-relative URL ${match[0]}`);
  }
  if (/@import\s+url|fonts\.googleapis|fonts\.gstatic|use\.typekit/i.test(contents)) {
    failures.push(`${path}: external font reference`);
  }
}

const headersPath = join(dist, "_headers");
if (!existsSync(headersPath)) {
  failures.push(`${headersPath}: missing - public/_headers must ship with the build`);
}
const headers = existsSync(headersPath) ? readFileSync(headersPath, "utf8") : "";
for (const directive of ["default-src", "connect-src"]) {
  if (!new RegExp(`${directive} 'self'\\s*;`).test(headers)) {
    failures.push(`dist/_headers: CSP must restrict ${directive} to 'self'`);
  }
}
for (const name of ["NEL", "Report-To", "Reporting-Endpoints"]) {
  if (!new RegExp(`^[\\t ]*! ${name}[\\t ]*$`, "im").test(headers)) {
    failures.push(`dist/_headers: ${name} must be detached with "! ${name}"`);
  }
}

if (failures.length > 0) {
  console.error("Privacy check failed - off-origin references found:");
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}
console.log("Privacy check passed: no third-party requests in the built bundle.");
