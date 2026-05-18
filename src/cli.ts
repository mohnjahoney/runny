#!/usr/bin/env node

import { printStartup } from "./debug.js";
import { detectProjectContext } from "./project.js";
import { getVersion } from "./version.js";

function printHelp(): void {
  console.log(`runny — lightweight local development orchestrator

Usage:
  runny              Show project context and startup info
  runny --debug      Include debug details
  runny --help       Show this help

Environment:
  RUNNY_DEBUG=1      Same as --debug
`);
}

function parseArgs(argv: string[]): { debug: boolean; help: boolean } {
  const debug =
    argv.includes("--debug") ||
    argv.includes("-d") ||
    process.env.RUNNY_DEBUG === "1";
  const help = argv.includes("--help") || argv.includes("-h");
  return { debug, help };
}

export function main(argv: string[] = process.argv.slice(2)): void {
  const { debug, help } = parseArgs(argv);

  if (help) {
    printHelp();
    return;
  }

  const project = detectProjectContext();
  printStartup({
    version: getVersion(),
    debug,
    project,
  });
}

main();
