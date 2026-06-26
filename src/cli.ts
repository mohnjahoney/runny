#!/usr/bin/env node

import { createInterface } from "node:readline/promises";
import { printStartup } from "./debug.js";
import { inferLaunchPlan } from "./inference.js";
import { printProjectList } from "./list.js";
import { applyMobileLaunchOptions } from "./mobile.js";
import { runProjectSession } from "./run-session.js";
import { detectProjectContext } from "./project.js";
import {
  applyLaunchTreatment,
  inspectLaunchReadiness,
  type LaunchFinding,
} from "./readiness.js";
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
  runny dash         Alias for dashboard
  runny web          Open the browser dashboard
  runny list         Show active projects from the registry
  runny --mobile     Launch Vite on the LAN for phone access
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
  web: boolean;
  mobile: boolean;
} {
  const debug =
    argv.includes("--debug") ||
    argv.includes("-d") ||
    process.env.RUNNY_DEBUG === "1";
  const help = argv.includes("--help") || argv.includes("-h");
  const dryRun = argv.includes("--dry-run") || argv.includes("-n");
  const mobile = argv.includes("--mobile") || argv.includes("-mobile");
  const list = argv[0] === "list";
  const dashboard =
    argv[0] === "dashboard" || argv[0] === "dash" || argv[0] === "ui";
  const web = argv[0] === "web" || argv[0] === "browser";
  return { debug, help, dryRun, list, dashboard, web, mobile };
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

async function offerLaunchTreatment(
  finding: LaunchFinding,
  projectCwd: string,
): Promise<boolean> {
  console.log("");
  console.log(
    `runny: ${finding.title} (${finding.confidence} confidence)`,
  );
  for (const evidence of finding.evidence) {
    console.log(`  • ${evidence}`);
  }

  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    console.error(`runny: ${finding.detail}`);
    return false;
  }

  if (!finding.treatment) {
    console.error(`runny: ${finding.detail}`);
    return false;
  }

  const prompt = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await prompt.question(`${finding.detail} [y/N] `);
    if (!/^(y|yes)$/i.test(answer.trim())) return false;
  } finally {
    prompt.close();
  }

  console.log(`runny: applying treatment — ${finding.treatment.label}`);
  await applyLaunchTreatment(finding.treatment);

  const remaining = inspectLaunchReadiness(projectCwd);
  if (remaining) {
    throw new Error(
      "dependency installation finished, but the project still appears unprepared",
    );
  }
  console.log("runny: dependencies installed — continuing launch");
  return true;
}

export async function main(
  argv: string[] = process.argv.slice(2),
): Promise<number> {
  const { debug, help, dryRun, list, dashboard, web, mobile } = parseArgs(argv);

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

  if (web) {
    const { runWebDashboard } = await import("./web/server.js");
    return runWebDashboard();
  }

  restoreRegistryOnStartup(debug);

  const project = detectProjectContext();
  const inferredPlan = await inferLaunchPlan(project.cwd);
  const plan =
    mobile && inferredPlan
      ? applyMobileLaunchOptions(inferredPlan)
      : inferredPlan;

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

  const finding = inspectLaunchReadiness(project.cwd);
  if (finding && !(await offerLaunchTreatment(finding, project.cwd))) {
    console.error("runny: launch cancelled; dependencies were not installed");
    return 1;
  }

  console.log("");
  console.log(`starting: ${plan.command}`);
  console.log("");

  return runProjectSession(project.cwd, plan, { skipNotices: true, mobile });
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
