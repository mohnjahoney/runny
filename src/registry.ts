import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import type { ProjectKind } from "./inference.js";
import { isProcessAlive } from "./process-tree.js";

export type ProjectStatus = "running" | "stopped";

export interface RegistryEntry {
  id: string;
  name: string;
  cwd: string;
  command: string;
  kind: ProjectKind;
  pid: number;
  ports: number[];
  status: ProjectStatus;
  startedAt: string;
  updatedAt: string;
}

export interface RegistryFile {
  version: 1;
  projects: RegistryEntry[];
}

const REGISTRY_DIR = join(homedir(), ".runny");
const REGISTRY_PATH = join(REGISTRY_DIR, "registry.json");

function emptyRegistry(): RegistryFile {
  return { version: 1, projects: [] };
}

export function loadRegistry(): RegistryFile {
  try {
    const raw = readFileSync(REGISTRY_PATH, "utf8");
    const parsed = JSON.parse(raw) as RegistryFile;
    if (parsed.version !== 1 || !Array.isArray(parsed.projects)) {
      return emptyRegistry();
    }
    return parsed;
  } catch {
    return emptyRegistry();
  }
}

export function saveRegistry(registry: RegistryFile): void {
  mkdirSync(REGISTRY_DIR, { recursive: true });
  writeFileSync(REGISTRY_PATH, `${JSON.stringify(registry, null, 2)}\n`, "utf8");
}

export function pruneStaleEntries(registry: RegistryFile): RegistryFile {
  const projects = registry.projects.filter((entry) => {
    if (entry.status !== "running") {
      return false;
    }
    return isProcessAlive(entry.pid);
  });

  return { ...registry, projects };
}

export function upsertRunningEntry(input: {
  name: string;
  cwd: string;
  command: string;
  kind: ProjectKind;
  pid: number;
}): RegistryEntry {
  const registry = pruneStaleEntries(loadRegistry());
  const now = new Date().toISOString();
  const existing = registry.projects.find((entry) => entry.cwd === input.cwd);

  const entry: RegistryEntry = existing
    ? {
        ...existing,
        name: input.name,
        command: input.command,
        kind: input.kind,
        pid: input.pid,
        ports: [],
        status: "running",
        startedAt: now,
        updatedAt: now,
      }
    : {
        id: randomUUID(),
        name: input.name,
        cwd: input.cwd,
        command: input.command,
        kind: input.kind,
        pid: input.pid,
        ports: [],
        status: "running",
        startedAt: now,
        updatedAt: now,
      };

  const others = registry.projects.filter((project) => project.id !== entry.id);
  saveRegistry({ version: 1, projects: [...others, entry] });
  return entry;
}

export function updateEntry(
  id: string,
  patch: Partial<Pick<RegistryEntry, "ports" | "pid" | "status">>,
): void {
  const registry = loadRegistry();
  const projects = registry.projects.map((entry) => {
    if (entry.id !== id) {
      return entry;
    }

    return {
      ...entry,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
  });

  saveRegistry({ ...registry, projects });
}

export function markEntryStopped(id: string): void {
  updateEntry(id, { status: "stopped", ports: [] });
  const registry = loadRegistry();
  const projects = registry.projects.filter(
    (entry) => !(entry.status === "stopped" && entry.id === id),
  );
  saveRegistry({ ...registry, projects });
}

export function getRegistryPath(): string {
  return REGISTRY_PATH;
}
