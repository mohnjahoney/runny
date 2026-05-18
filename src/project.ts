import { basename } from "node:path";

export interface ProjectContext {
  cwd: string;
  name: string;
}

export function detectProjectContext(cwd: string = process.cwd()): ProjectContext {
  const name = basename(cwd) || "unknown";
  return { cwd, name };
}
