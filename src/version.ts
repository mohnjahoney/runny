import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

export function getVersion(): string {
  const raw = readFileSync(join(packageRoot, "package.json"), "utf8");
  const pkg = JSON.parse(raw) as { version: string };
  return pkg.version;
}
