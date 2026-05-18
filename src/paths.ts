import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export function getCliScriptPath(): string {
  return join(dirname(fileURLToPath(import.meta.url)), "cli.js");
}
