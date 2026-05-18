import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

async function directChildPids(pid: number): Promise<number[]> {
  try {
    const { stdout } = await execFileAsync("pgrep", ["-P", String(pid)]);
    return stdout
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value));
  } catch {
    return [];
  }
}

export async function collectProcessTree(rootPid: number): Promise<number[]> {
  const seen = new Set<number>();
  const queue = [rootPid];

  while (queue.length > 0) {
    const pid = queue.shift();
    if (pid === undefined || seen.has(pid)) {
      continue;
    }

    seen.add(pid);
    const children = await directChildPids(pid);
    queue.push(...children);
  }

  return [...seen];
}

export function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function signalPids(pids: number[], signal: NodeJS.Signals): void {
  for (const pid of pids) {
    try {
      process.kill(pid, signal);
    } catch {
      // Process may already be gone.
    }
  }
}

export async function killProcessTree(rootPid: number): Promise<void> {
  const pids = await collectProcessTree(rootPid);
  signalPids(pids, "SIGTERM");

  await new Promise((resolve) => setTimeout(resolve, 400));

  const remaining = pids.filter((pid) => isProcessAlive(pid));
  signalPids(remaining, "SIGKILL");
}
