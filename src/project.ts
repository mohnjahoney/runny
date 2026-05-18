import { basename } from "node:path";
import { packageJsonName } from "./inference.js";

export interface ProjectContext {
  cwd: string;
  name: string;
}

export function detectProjectContext(cwd: string = process.cwd()): ProjectContext {
  const fromPackage = packageJsonName(cwd);
  const name = fromPackage || basename(cwd) || "unknown";
  return { cwd, name };
}
