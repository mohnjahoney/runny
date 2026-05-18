import type { ProjectContext } from "./project.js";

export interface StartupInfo {
  version: string;
  debug: boolean;
  project: ProjectContext;
}

export function printStartup(info: StartupInfo): void {
  const { version, debug, project } = info;

  console.log(`runny v${version}`);
  console.log(`cwd: ${project.cwd}`);
  console.log(`project: ${project.name}`);

  if (debug) {
    console.log("");
    console.log("[debug] phase: bootstrap");
    console.log(`[debug] pid: ${process.pid}`);
    console.log(`[debug] node: ${process.version}`);
    console.log(`[debug] platform: ${process.platform}`);
  }
}
