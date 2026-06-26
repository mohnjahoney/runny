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
  displayName?: string;
  cwd: string;
  command: string;
  kind: ProjectKind;
  pid?: number;
  ports: number[];
  mobile?: boolean;
  status: ProjectStatus;
  startedAt: string;
  updatedAt: string;
}

export interface RegistryFile {
  version: 2;
  projects: RegistryEntry[];
}

const REGISTRY_DIR = join(homedir(), ".runny");
const REGISTRY_PATH = join(REGISTRY_DIR, "registry.json");

function emptyRegistry(): RegistryFile {
  return { version: 2, projects: [] };
}

export function loadRegistry(): RegistryFile {
  try {
    const raw = readFileSync(REGISTRY_PATH, "utf8");
    const parsed = JSON.parse(raw) as {
      version?: number;
      projects?: RegistryEntry[];
    };
    if (
      (parsed.version !== 1 && parsed.version !== 2) ||
      !Array.isArray(parsed.projects)
    ) {
      return emptyRegistry();
    }
    return { version: 2, projects: parsed.projects };
  } catch {
    return emptyRegistry();
  }
}

export function saveRegistry(registry: RegistryFile): void {
  mkdirSync(REGISTRY_DIR, { recursive: true });
  writeFileSync(REGISTRY_PATH, `${JSON.stringify(registry, null, 2)}\n`, "utf8");
}

export function pruneStaleEntries(registry: RegistryFile): RegistryFile {
  const projects = registry.projects.map((entry) => {
    if (
      entry.status === "running" &&
      (entry.pid === undefined || !isProcessAlive(entry.pid))
    ) {
      return {
        ...entry,
        pid: undefined,
        ports: [],
        status: "stopped" as const,
        updatedAt: new Date().toISOString(),
      };
    }
    return entry;
  });

  return { version: 2, projects };
}

export function getProjects(): RegistryEntry[] {
  const reconciled = pruneStaleEntries(loadRegistry());
  saveRegistry(reconciled);
  return reconciled.projects;
}

export function getRunningProjects(): RegistryEntry[] {
  return getProjects().filter((entry) => entry.status === "running");
}

export function upsertRunningEntry(input: {
  name: string;
  cwd: string;
  command: string;
  kind: ProjectKind;
  pid: number;
  ports?: number[];
  mobile?: boolean;
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
        ports: input.ports ?? [],
        mobile: input.mobile,
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
        ports: input.ports ?? [],
        mobile: input.mobile,
        status: "running",
        startedAt: now,
        updatedAt: now,
      };

  const others = registry.projects.filter((project) => project.id !== entry.id);
  saveRegistry({ version: 2, projects: [...others, entry] });
  return entry;
}

export function upsertKnownProject(input: {
  name: string;
  cwd: string;
  command: string;
  kind: ProjectKind;
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
        updatedAt: now,
      }
    : {
        id: randomUUID(),
        name: input.name,
        cwd: input.cwd,
        command: input.command,
        kind: input.kind,
        ports: [],
        status: "stopped",
        startedAt: now,
        updatedAt: now,
      };

  const others = registry.projects.filter((project) => project.id !== entry.id);
  saveRegistry({ version: 2, projects: [...others, entry] });
  return entry;
}

export function updateEntry(
  id: string,
  patch: Partial<
    Pick<RegistryEntry, "displayName" | "ports" | "pid" | "status">
  >,
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
  updateEntry(id, { status: "stopped", pid: undefined, ports: [] });
}

export function renameProject(id: string, displayName?: string): void {
  const normalized = displayName?.trim() || undefined;
  updateEntry(id, { displayName: normalized });
}

export function getProject(id: string): RegistryEntry | undefined {
  return getProjects().find((entry) => entry.id === id);
}

export function getRegistryPath(): string {
  return REGISTRY_PATH;
}
