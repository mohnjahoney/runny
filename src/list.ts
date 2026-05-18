import { formatPorts } from "./ports.js";
import {
  getRegistryPath,
  loadRegistry,
  pruneStaleEntries,
  saveRegistry,
} from "./registry.js";

function formatUptime(startedAt: string): string {
  const started = Date.parse(startedAt);
  if (Number.isNaN(started)) {
    return "unknown";
  }

  const seconds = Math.max(0, Math.floor((Date.now() - started) / 1000));
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

export function printProjectList(): void {
  const pruned = pruneStaleEntries(loadRegistry());
  saveRegistry(pruned);

  const running = pruned.projects.filter((entry) => entry.status === "running");

  console.log(`registry: ${getRegistryPath()}`);

  if (running.length === 0) {
    console.log("no active projects");
    return;
  }

  for (const entry of running) {
    console.log("");
    console.log(`${entry.name}  (${entry.kind})`);
    console.log(`  cwd: ${entry.cwd}`);
    console.log(`  pid: ${entry.pid}`);
    console.log(`  ports: ${formatPorts(entry.ports)}`);
    console.log(`  command: ${entry.command}`);
    console.log(`  uptime: ${formatUptime(entry.startedAt)}`);
  }
}
