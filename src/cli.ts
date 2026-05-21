#!/usr/bin/env node

import { printStartup } from "./debug.js";
import { inferLaunchPlan } from "./inference.js";
import { printProjectList } from "./list.js";
import { runProjectSession } from "./run-session.js";
import { detectProjectContext } from "./project.js";
import {
  loadRegistry,
  pruneStaleEntries,
  saveRegistry,
} from "./registry.js";
import { getVersion } from "./version.js";

function printHelp(): void {
  console.log(`runny — lightweight local development orchestrator

Usage:
  runny              Detect project and launch dev server
  runny dashboard    Open live TUI dashboard (singleton)
  runny list         Show active projects from the registry
  runny --dry-run    Detect project and print launch command only
  runny --debug      Include debug details
  runny --help       Show this help

Environment:
  RUNNY_DEBUG=1      Same as --debug
`);
}

function parseArgs(argv: string[]): {
  debug: boolean;
  help: boolean;
  dryRun: boolean;
  list: boolean;
  dashboard: boolean;
} {
  const debug =
    argv.includes("--debug") ||
    argv.includes("-d") ||
    process.env.RUNNY_DEBUG === "1";
  const help = argv.includes("--help") || argv.includes("-h");
  const dryRun = argv.includes("--dry-run") || argv.includes("-n");
  const list = argv[0] === "list";
  const dashboard = argv[0] === "dashboard" || argv[0] === "ui";
  return { debug, help, dryRun, list, dashboard };
}

function restoreRegistryOnStartup(debug: boolean): void {
  const pruned = pruneStaleEntries(loadRegistry());
  saveRegistry(pruned);

  if (debug && pruned.projects.length > 0) {
    console.log(
      `[debug] registry: ${pruned.projects.length} active project(s) after cleanup`,
    );
  }
}

export async function main(
  argv: string[] = process.argv.slice(2),
): Promise<number> {
  const { debug, help, dryRun, list, dashboard } = parseArgs(argv);

  if (help) {
    printHelp();
    return 0;
  }

  if (list) {
    printProjectList();
    return 0;
  }

  if (dashboard) {
    const { runDashboard } = await import("./tui/run.js");
    return runDashboard();
  }

  restoreRegistryOnStartup(debug);

  const project = detectProjectContext();
  const plan = await inferLaunchPlan(project.cwd);

  printStartup({
    version: getVersion(),
    debug,
    project,
    plan,
    dryRun,
  });

  for (const notice of plan?.notices ?? []) {
    console.log(`runny: ${notice}`);
  }

  if (!plan) {
    console.error("");
    console.error(
      "runny: could not infer a launch command for this directory.",
    );
    console.error("runny: try running from a project root or use --help.");
    return 1;
  }

  if (dryRun) {
    return 0;
  }

  console.log("");
  console.log(`starting: ${plan.command}`);
  console.log("");

  return runProjectSession(project.cwd, plan, { skipNotices: true });
}

main()
  .then((code) => {
    if (code !== 0) {
      process.exitCode = code;
    }
  })
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`runny: ${message}`);
    process.exitCode = 1;
  });
