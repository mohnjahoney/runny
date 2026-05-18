import type { LaunchPlan } from "./inference.js";
import type { ProjectContext } from "./project.js";

export interface StartupInfo {
  version: string;
  debug: boolean;
  project: ProjectContext;
  plan: LaunchPlan | null;
  dryRun: boolean;
}

export function printStartup(info: StartupInfo): void {
  const { version, debug, project, plan, dryRun } = info;

  console.log(`runny v${version}`);
  console.log(`cwd: ${project.cwd}`);
  console.log(`project: ${project.name}`);

  if (plan) {
    console.log(`type: ${plan.kind}`);
    console.log(`launch: ${plan.command}`);
    if (dryRun) {
      console.log("mode: dry-run (command not executed)");
    }
  } else {
    console.log("launch: (none detected)");
  }

  if (debug) {
    console.log("");
    console.log("[debug] phase: detect+launch");
    console.log(`[debug] pid: ${process.pid}`);
    console.log(`[debug] node: ${process.version}`);
    console.log(`[debug] platform: ${process.platform}`);
    if (plan) {
      console.log(`[debug] argv: ${plan.argv.join(" ")}`);
      console.log(`[debug] reason: ${plan.reason}`);
    }
  }
}
