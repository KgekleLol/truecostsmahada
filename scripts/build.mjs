import { cpSync, existsSync, mkdirSync, rmSync, copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(root, "dist");

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

copyFileSync(join(root, "index.html"), join(dist, "index.html"));

if (existsSync(join(root, "_redirects"))) {
  copyFileSync(join(root, "_redirects"), join(dist, "_redirects"));
}

for (const asset of ["images", "model"]) {
  const source = join(root, asset);
  if (existsSync(source)) {
    cpSync(source, join(dist, asset), { recursive: true });
  }
}

console.log("Static site prepared in dist/");
