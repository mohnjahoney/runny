import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { collectProcessTree } from "./process-tree.js";

const execFileAsync = promisify(execFile);

export interface PortWatcher {
  stop: () => void;
}

export interface PortWatcherOptions {
  rootPid: number;
  intervalMs?: number;
  maxAttempts?: number;
  onUpdate: (ports: number[]) => void;
}

function parseListeningPorts(stdout: string): number[] {
  const ports = new Set<number>();

  for (const line of stdout.split("\n")) {
    const match = line.match(/:(\d+)\s+\(LISTEN\)/);
    if (match) {
      ports.add(Number(match[1]));
    }
  }

  return [...ports].sort((a, b) => a - b);
}

function portsEqual(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((port, index) => port === b[index]);
}

async function listListeningPortsForPids(pids: number[]): Promise<number[]> {
  if (pids.length === 0) {
    return [];
  }

  const ports = new Set<number>();

  for (const pid of pids) {
    try {
      const { stdout } = await execFileAsync("lsof", [
        "-nP",
        "-iTCP",
        "-sTCP:LISTEN",
        "-a",
        "-p",
        String(pid),
      ]);
      for (const port of parseListeningPorts(stdout)) {
        ports.add(port);
      }
    } catch {
      // No listeners for this pid.
    }
  }

  return [...ports].sort((a, b) => a - b);
}

export async function detectPortsForProcess(rootPid: number): Promise<number[]> {
  const pids = await collectProcessTree(rootPid);
  return listListeningPortsForPids(pids);
}

export function watchPorts(options: PortWatcherOptions): PortWatcher {
  const {
    rootPid,
    intervalMs = 1_500,
    maxAttempts = 40,
    onUpdate,
  } = options;

  let stopped = false;
  let lastPorts: number[] = [];
  let attempts = 0;

  const tick = async (): Promise<void> => {
    if (stopped) {
      return;
    }

    attempts += 1;
    const ports = await detectPortsForProcess(rootPid);

    if (!portsEqual(ports, lastPorts)) {
      lastPorts = ports;
      onUpdate(ports);
    }

    if (!stopped && (ports.length === 0 && attempts < maxAttempts)) {
      setTimeout(() => {
        void tick();
      }, intervalMs).unref();
    }
  };

  void tick();

  return {
    stop: () => {
      stopped = true;
    },
  };
}

export function formatPorts(ports: number[]): string {
  if (ports.length === 0) {
    return "(none yet)";
  }
  return ports.join(", ");
}
