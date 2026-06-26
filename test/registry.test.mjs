import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const home = mkdtempSync(join(tmpdir(), "runny-registry-home-"));
process.env.HOME = home;

const {
  getProjects,
  upsertKnownProject,
  upsertRunningEntry,
} = await import("../dist/registry.js");

test.after(() => {
  rmSync(home, { recursive: true, force: true });
});

test("stores a known stopped project before it ever runs", () => {
  const cwd = join(home, "project");
  const known = upsertKnownProject({
    name: "project",
    cwd,
    command: "npm run dev",
    kind: "vite",
  });

  assert.equal(known.status, "stopped");
  assert.equal(known.pid, undefined);
  assert.deepEqual(known.ports, []);

  const running = upsertRunningEntry({
    name: "project",
    cwd,
    command: "npm run dev",
    kind: "vite",
    pid: process.pid,
    ports: [5173],
  });

  assert.equal(running.id, known.id);
  assert.equal(running.status, "running");
  assert.equal(running.pid, process.pid);
  assert.deepEqual(running.ports, [5173]);
  assert.equal(getProjects().length, 1);
});
