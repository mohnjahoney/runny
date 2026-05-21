import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { Listener } from "./ports.js";

const execFileAsync = promisify(execFile);

export type BrowserOpenDecision =
  | { type: "open"; url: string }
  | { type: "pending" }
  | { type: "ambiguous"; reason: string };

export async function openUrl(url: string): Promise<void> {
  await execFileAsync("open", [url]);
}

export function chooseBrowserUrl(listeners: Listener[]): BrowserOpenDecision {
  if (listeners.length === 0) {
    return { type: "pending" };
  }

  const ports = [...new Set(listeners.map((listener) => listener.port))].sort(
    (a, b) => a - b,
  );

  if (ports.length > 1) {
    return {
      type: "ambiguous",
      reason: `multiple ports detected: ${ports.join(", ")}`,
    };
  }

  return { type: "open", url: listenerUrl(preferredListener(listeners)) };
}

function preferredListener(listeners: Listener[]): Listener {
  const preferredHosts = ["127.0.0.1", "localhost", "::1", "0.0.0.0", "*"];

  return [...listeners].sort((a, b) => {
    const hostRankA = hostRank(a.host, preferredHosts);
    const hostRankB = hostRank(b.host, preferredHosts);
    return hostRankA - hostRankB || a.pid - b.pid;
  })[0];
}

function hostRank(host: string, preferredHosts: string[]): number {
  const index = preferredHosts.indexOf(host);
  return index === -1 ? preferredHosts.length : index;
}

function listenerUrl(listener: Listener): string {
  return `http://${hostForUrl(listener.host)}:${listener.port}/`;
}

function hostForUrl(host: string): string {
  if (host === "0.0.0.0" || host === "*" || host === "::") {
    return "localhost";
  }

  if (host.includes(":")) {
    return `[${host}]`;
  }

  return host;
}
