import { readFile } from "node:fs/promises";

const [root, served] = await Promise.all([
  readFile("llms.txt", "utf8"),
  readFile("public/llms.txt", "utf8"),
]);

if (root !== served) {
  throw new Error("llms.txt and public/llms.txt must be identical");
}
