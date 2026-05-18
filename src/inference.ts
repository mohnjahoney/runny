import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

export type ProjectKind =
  | "node-dev"
  | "vite"
  | "python-app"
  | "static-server"
  | "unknown";

export interface LaunchPlan {
  kind: ProjectKind;
  command: string;
  argv: string[];
  reason: string;
}

const VITE_CONFIG_FILES = [
  "vite.config.ts",
  "vite.config.js",
  "vite.config.mjs",
  "vite.config.cjs",
];

function fileExists(cwd: string, name: string): boolean {
  return existsSync(join(cwd, name));
}

function hasViteConfig(cwd: string): boolean {
  return VITE_CONFIG_FILES.some((name) => fileExists(cwd, name));
}

function readPackageJson(
  cwd: string,
): { name?: string; scripts?: Record<string, string> } | null {
  const path = join(cwd, "package.json");
  if (!existsSync(path)) {
    return null;
  }

  try {
    return JSON.parse(readFileSync(path, "utf8")) as {
      name?: string;
      scripts?: Record<string, string>;
    };
  } catch {
    return null;
  }
}

function isStaticSite(cwd: string): boolean {
  if (fileExists(cwd, "package.json") || fileExists(cwd, "app.py")) {
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

export function inferLaunchPlan(cwd: string): LaunchPlan | null {
  const pkg = readPackageJson(cwd);
  const vite = hasViteConfig(cwd);

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

  if (isStaticSite(cwd)) {
    return {
      kind: "static-server",
      command: "python -m http.server",
      argv: ["python", "-m", "http.server"],
      reason: "static HTML site with no package.json or app.py",
    };
  }

  return null;
}

export function packageJsonName(cwd: string): string | undefined {
  return readPackageJson(cwd)?.name;
}
