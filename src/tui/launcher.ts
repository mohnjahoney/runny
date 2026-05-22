import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { getCliScriptPath } from "../paths.js";
import { isTuiRunning, notifyTuiRefresh } from "./singleton.js";

const execFileAsync = promisify(execFile);

export async function ensureDashboardTerminal(cwd: string): Promise<void> {
  if (isTuiRunning()) {
    notifyTuiRefresh();
    return;
  }

  await openDashboardInTerminal(cwd);
}

async function openDashboardInTerminal(cwd: string): Promise<void> {
  const command = shellCommand([
    ["cd", cwd],
    [process.execPath, getCliScriptPath(), "dashboard"],
  ]);

  await execFileAsync("osascript", [
    "-e",
    [
      'tell application "Terminal"',
      "activate",
      `do script ${appleScriptString(command)}`,
      "end tell",
    ].join("\n"),
  ]);
}

function shellCommand(commands: string[][]): string {
  return commands
    .map((command) => command.map(shellQuote).join(" "))
    .join(" && ");
}

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

function appleScriptString(value: string): string {
  return `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}
