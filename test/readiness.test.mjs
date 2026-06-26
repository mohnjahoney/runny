import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { inspectLaunchReadiness } from "../dist/readiness.js";

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "runny-readiness-"));
  return {
    root,
    writePackage(cwd = root, contents = {}) {
      mkdirSync(cwd, { recursive: true });
      writeFileSync(
        join(cwd, "package.json"),
        JSON.stringify({ name: "fixture", ...contents }),
      );
    },
    cleanup() {
      rmSync(root, { recursive: true, force: true });
    },
  };
}

test("offers npm install when declared dependencies are absent", () => {
  const f = fixture();
  try {
    f.writePackage(f.root, { dependencies: { vite: "latest" } });
    writeFileSync(join(f.root, "package-lock.json"), "{}");

    const finding = inspectLaunchReadiness(f.root);
    assert.equal(finding?.code, "node-dependencies-missing");
    assert.equal(finding?.confidence, "high");
    assert.equal(finding?.treatment.command, "npm");
    assert.equal(finding?.treatment.cwd, f.root);
  } finally {
    f.cleanup();
  }
});

test("does not diagnose missing dependencies when node_modules exists", () => {
  const f = fixture();
  try {
    f.writePackage(f.root, { devDependencies: { vite: "latest" } });
    writeFileSync(join(f.root, "pnpm-lock.yaml"), "lockfileVersion: 9");
    mkdirSync(join(f.root, "node_modules"));

    assert.equal(inspectLaunchReadiness(f.root), null);
  } finally {
    f.cleanup();
  }
});

test("selects the package manager from its lockfile", () => {
  const f = fixture();
  try {
    f.writePackage(f.root, { devDependencies: { vite: "latest" } });
    writeFileSync(join(f.root, "pnpm-lock.yaml"), "lockfileVersion: 9");

    assert.equal(inspectLaunchReadiness(f.root)?.treatment.command, "pnpm");
  } finally {
    f.cleanup();
  }
});

test("does not offer an install treatment when the lockfile manager is unavailable", () => {
  const f = fixture();
  const previousPath = process.env.PATH;
  try {
    process.env.PATH = "";
    f.writePackage(f.root, { devDependencies: { vite: "latest" } });
    writeFileSync(join(f.root, "bun.lock"), "");

    const finding = inspectLaunchReadiness(f.root);
    assert.equal(finding?.code, "node-dependencies-missing");
    assert.equal(finding?.treatment, undefined);
    assert.match(finding?.detail ?? "", /bun is not installed/);
  } finally {
    process.env.PATH = previousPath;
    f.cleanup();
  }
});

test("recognizes dependencies installed at a workspace root", () => {
  const f = fixture();
  try {
    const child = join(f.root, "apps", "web");
    f.writePackage(f.root, { packageManager: "npm@10.0.0" });
    f.writePackage(child, { dependencies: { react: "latest" } });
    writeFileSync(join(f.root, "package-lock.json"), "{}");
    mkdirSync(join(f.root, "node_modules"));

    assert.equal(inspectLaunchReadiness(child), null);
  } finally {
    f.cleanup();
  }
});

test("ignores Node projects with no declared dependencies", () => {
  const f = fixture();
  try {
    f.writePackage(f.root, { scripts: { dev: "node server.js" } });
    assert.equal(inspectLaunchReadiness(f.root), null);
  } finally {
    f.cleanup();
  }
});
