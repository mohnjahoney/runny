import { execFile } from "node:child_process";
import { createServer } from "node:net";
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
  onListenersUpdate?: (listeners: Listener[]) => void;
}

export interface FindAvailablePortOptions {
  preferred?: number;
  rangeStart: number;
  rangeEnd: number;
}

export interface Listener {
  pid: number;
  host: string;
  port: number;
}

export async function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer();

    server.once("error", () => {
      resolve(false);
    });

    server.once("listening", () => {
      server.close(() => {
        resolve(true);
      });
    });

    server.listen(port);
  });
}

export async function findAvailablePort(
  options: FindAvailablePortOptions,
): Promise<number> {
  const { preferred, rangeStart, rangeEnd } = options;

  if (rangeStart > rangeEnd) {
    throw new Error("Invalid port range: rangeStart must be <= rangeEnd");
  }

  if (
    preferred !== undefined &&
    preferred >= rangeStart &&
    preferred <= rangeEnd &&
    (await isPortAvailable(preferred))
  ) {
    return preferred;
  }

  for (let port = rangeStart; port <= rangeEnd; port += 1) {
    if (port === preferred) {
      continue;
    }

    if (await isPortAvailable(port)) {
      return port;
    }
  }

  throw new Error(`No available port found in range ${rangeStart}-${rangeEnd}`);
}

function parseListeningListeners(pid: number, stdout: string): Listener[] {
  const listeners: Listener[] = [];

  for (const line of stdout.split("\n")) {
    const match = line.match(/\bTCP\s+(.+):(\d+)\s+\(LISTEN\)/);
    if (match) {
      listeners.push({
        pid,
        host: normalizeListenerHost(match[1]),
        port: Number(match[2]),
      });
    }
  }

  return listeners;
}

function normalizeListenerHost(host: string): string {
  if (host.startsWith("[") && host.endsWith("]")) {
    return host.slice(1, -1);
  }

  return host;
}

function portsFromListeners(listeners: Listener[]): number[] {
  return [...new Set(listeners.map((listener) => listener.port))].sort(
    (a, b) => a - b,
  );
}

function portsEqual(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((port, index) => port === b[index]);
}

function listenersEqual(a: Listener[], b: Listener[]): boolean {
  return (
    a.length === b.length &&
    a.every((listener, index) => {
      const other = b[index];
      return (
        listener.pid === other.pid &&
        listener.host === other.host &&
        listener.port === other.port
      );
    })
  );
}

async function listListeningListenersForPids(
  pids: number[],
): Promise<Listener[]> {
  if (pids.length === 0) {
    return [];
  }

  const listeners: Listener[] = [];

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
      listeners.push(...parseListeningListeners(pid, stdout));
    } catch {
      // No listeners for this pid.
    }
  }

  return listeners.sort(
    (a, b) => a.port - b.port || a.host.localeCompare(b.host) || a.pid - b.pid,
  );
}

async function listListeningPortsForPids(pids: number[]): Promise<number[]> {
  const listeners = await listListeningListenersForPids(pids);
  return portsFromListeners(listeners);
}

export async function detectPortsForProcess(rootPid: number): Promise<number[]> {
  const pids = await collectProcessTree(rootPid);
  return listListeningPortsForPids(pids);
}

export async function detectListenersForProcess(
  rootPid: number,
): Promise<Listener[]> {
  const pids = await collectProcessTree(rootPid);
  return listListeningListenersForPids(pids);
}

export function watchPorts(options: PortWatcherOptions): PortWatcher {
  const {
    rootPid,
    intervalMs = 1_500,
    maxAttempts = 40,
    onUpdate,
    onListenersUpdate,
  } = options;

  let stopped = false;
  let lastPorts: number[] = [];
  let lastListeners: Listener[] = [];
  let attempts = 0;

  const tick = async (): Promise<void> => {
    if (stopped) {
      return;
    }

    attempts += 1;
    const listeners = await detectListenersForProcess(rootPid);
    const ports = portsFromListeners(listeners);

    if (!portsEqual(ports, lastPorts)) {
      lastPorts = ports;
      onUpdate(ports);
    }

    if (!listenersEqual(listeners, lastListeners)) {
      lastListeners = listeners;
      onListenersUpdate?.(listeners);
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
