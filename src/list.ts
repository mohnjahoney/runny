import { formatUptime } from "./format.js";
import { formatPorts } from "./ports.js";
import { getRegistryPath, getRunningProjects } from "./registry.js";

export function printProjectList(): void {
  const running = getRunningProjects();

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
