#!/usr/bin/env node

import { printStartup } from "./debug.js";
import { inferLaunchPlan } from "./inference.js";
import { launchPlan } from "./launcher.js";
import { detectProjectContext } from "./project.js";
import { getVersion } from "./version.js";

function printHelp(): void {
  console.log(`runny — lightweight local development orchestrator

Usage:
  runny              Detect project and launch dev server
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
} {
  const debug =
    argv.includes("--debug") ||
    argv.includes("-d") ||
    process.env.RUNNY_DEBUG === "1";
  const help = argv.includes("--help") || argv.includes("-h");
  const dryRun = argv.includes("--dry-run") || argv.includes("-n");
  return { debug, help, dryRun };
}

export async function main(
  argv: string[] = process.argv.slice(2),
): Promise<number> {
  const { debug, help, dryRun } = parseArgs(argv);

  if (help) {
    printHelp();
    return 0;
  }

  const project = detectProjectContext();
  const plan = inferLaunchPlan(project.cwd);

  printStartup({
    version: getVersion(),
    debug,
    project,
    plan,
    dryRun,
  });

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

  const result = await launchPlan(plan, project.cwd);

  if (result.pid && debug) {
    console.log(`[debug] child exited (pid was ${result.pid})`);
  }

  return result.exitCode;
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
