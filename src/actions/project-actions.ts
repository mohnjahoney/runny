import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { inferLaunchPlan } from "../inference.js";
import { getCliScriptPath } from "../paths.js";
import { killProcessTree } from "../process-tree.js";
import type { RegistryEntry } from "../registry.js";
import { markEntryStopped } from "../registry.js";
import { notifyTuiRefresh } from "../tui/singleton.js";

const execFileAsync = promisify(execFile);

export type SortMode = "uptime-desc" | "uptime-asc" | "name" | "port";

const SORT_LABELS: Record<SortMode, string> = {
  "uptime-desc": "uptime ↓",
  "uptime-asc": "uptime ↑",
  name: "name",
  port: "port",
};

export function nextSortMode(current: SortMode): SortMode {
  const order: SortMode[] = ["uptime-desc", "uptime-asc", "name", "port"];
  const index = order.indexOf(current);
  return order[(index + 1) % order.length];
}

export function sortModeLabel(mode: SortMode): string {
  return SORT_LABELS[mode];
}

export function sortProjects(
  projects: RegistryEntry[],
  mode: SortMode,
): RegistryEntry[] {
  const copy = [...projects];

  copy.sort((a, b) => {
    switch (mode) {
      case "name":
        return a.name.localeCompare(b.name);
      case "port":
        return (a.ports[0] ?? 0) - (b.ports[0] ?? 0);
      case "uptime-asc":
        return Date.parse(a.startedAt) - Date.parse(b.startedAt);
      case "uptime-desc":
      default:
        return Date.parse(b.startedAt) - Date.parse(a.startedAt);
    }
  });

  return copy;
}

export function filterProjects(
  projects: RegistryEntry[],
  query: string,
): RegistryEntry[] {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return projects;
  }

  return projects.filter(
    (entry) =>
      entry.name.toLowerCase().includes(needle) ||
      entry.kind.toLowerCase().includes(needle) ||
      entry.cwd.toLowerCase().includes(needle),
  );
}

export async function killProject(entry: RegistryEntry): Promise<string> {
  if (!entry.pid) {
    return `no pid for ${entry.name}`;
  }

  await killProcessTree(entry.pid);
  markEntryStopped(entry.id);
  notifyTuiRefresh();
  return `killed ${entry.name}`;
}

export async function restartProject(entry: RegistryEntry): Promise<string> {
  const plan = inferLaunchPlan(entry.cwd);
  if (!plan) {
    return `cannot restart ${entry.name}: no launch command for ${entry.cwd}`;
  }

  if (entry.pid) {
    await killProcessTree(entry.pid);
  }
  markEntryStopped(entry.id);

  const cliPath = getCliScriptPath();
  const child = spawn(process.execPath, [cliPath], {
    cwd: entry.cwd,
    detached: true,
    stdio: "ignore",
    env: process.env,
  });

  child.unref();
  notifyTuiRefresh();
  return `restarting ${entry.name} (${plan.command})`;
}

export async function openProjectInBrowser(
  entry: RegistryEntry,
): Promise<string> {
  const port = entry.ports[0];
  if (!port) {
    return `no port yet for ${entry.name}`;
  }

  const url = `http://127.0.0.1:${port}`;
  await execFileAsync("open", [url]);
  return `opened ${url}`;
}

export function logsHint(entry: RegistryEntry): string {
  return `logs for ${entry.name} stream in the terminal where you ran runny`;
}
