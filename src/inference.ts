import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { findAvailablePort } from "./ports.js";

export type ProjectKind =
  | "node-dev"
  | "vite"
  | "python-app"
  | "static-site"
  | "unknown";

export interface LaunchPlan {
  kind: ProjectKind;
  command: string;
  argv: string[];
  reason: string;
  ports?: number[];
  notices?: string[];
}

const VITE_CONFIG_FILES = [
  "vite.config.ts",
  "vite.config.js",
  "vite.config.mjs",
  "vite.config.cjs",
];
const STATIC_PORT_RANGE_START = 8000;
const STATIC_PORT_RANGE_END = 8999;

function fileExists(cwd: string, name: string): boolean {
  return existsSync(join(cwd, name));
}

function hasViteConfig(cwd: string): boolean {
  return VITE_CONFIG_FILES.some((name) => fileExists(cwd, name));
}

function readPackageJson(
  cwd: string,
): {
  name?: string;
  scripts?: Record<string, string>;
  bin?: string | Record<string, string>;
} | null {
  const path = join(cwd, "package.json");
  if (!existsSync(path)) {
    return null;
  }

  try {
    return JSON.parse(readFileSync(path, "utf8")) as {
      name?: string;
      scripts?: Record<string, string>;
      bin?: string | Record<string, string>;
    };
  } catch {
    return null;
  }
}

function isRunnyPackage(pkg: {
  name?: string;
  bin?: string | Record<string, string>;
}): boolean {
  if (pkg.name === "runny") {
    return true;
  }

  return typeof pkg.bin === "object" && "runny" in pkg.bin;
}

function isStaticSite(
  cwd: string,
  pkg: { scripts?: Record<string, string> } | null,
  vite: boolean,
): boolean {
  if (vite || fileExists(cwd, "app.py")) {
    return false;
  }

  if (pkg?.scripts?.dev) {
    return false;
  }

  if (fileExists(cwd, "index.html")) {
    return true;
  }

  const entries = readdirSync(cwd, { withFileTypes: true });
  const hasHtml = entries.some(
    (entry) => entry.isFile() && entry.name.endsWith(".html"),
  );
  const hasBackendMarkers = entries.some((entry) =>
    [".py", ".ts", ".tsx", ".jsx"].some((ext) => entry.name.endsWith(ext)),
  );

  return hasHtml && !hasBackendMarkers;
}

export async function inferLaunchPlan(cwd: string): Promise<LaunchPlan | null> {
  const pkg = readPackageJson(cwd);
  const vite = hasViteConfig(cwd);

  if (pkg && isRunnyPackage(pkg)) {
    return null;
  }

  if (pkg?.scripts?.dev) {
    return {
      kind: vite ? "vite" : "node-dev",
      command: "npm run dev",
      argv: ["npm", "run", "dev"],
      reason: vite
        ? "package.json has a dev script and Vite config was found"
        : "package.json has a dev script",
    };
  }

  if (vite) {
    return {
      kind: "vite",
      command: "npm run dev",
      argv: ["npm", "run", "dev"],
      reason: "Vite config found (expects a dev script in package.json)",
    };
  }

  const hasAppPy = fileExists(cwd, "app.py");
  const hasRequirements = fileExists(cwd, "requirements.txt");

  if (hasAppPy && hasRequirements) {
    return {
      kind: "python-app",
      command: "python app.py",
      argv: ["python", "app.py"],
      reason: "requirements.txt and app.py found",
    };
  }

  if (hasAppPy) {
    return {
      kind: "python-app",
      command: "python app.py",
      argv: ["python", "app.py"],
      reason: "app.py found",
    };
  }

  if (isStaticSite(cwd, pkg, vite)) {
    const port = await findAvailablePort({
      rangeStart: STATIC_PORT_RANGE_START,
      rangeEnd: STATIC_PORT_RANGE_END,
    });
    const notices =
      STATIC_PORT_RANGE_START !== port
        ? [`port ${STATIC_PORT_RANGE_START} is occupied; using ${port}`]
        : undefined;

    return {
      kind: "static-site",
      command: `python3 -m http.server ${port}`,
      argv: ["python3", "-m", "http.server", String(port)],
      reason: pkg
        ? "static HTML site with no meaningful package.json dev script"
        : "static HTML site with no package.json or app.py",
      ports: [port],
      notices,
    };
  }

  return null;
}

export function packageJsonName(cwd: string): string | undefined {
  return readPackageJson(cwd)?.name;
}
