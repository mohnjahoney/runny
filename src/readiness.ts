import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, parse } from "node:path";

export type FindingConfidence = "high" | "medium" | "low";

export interface LaunchTreatment {
  id: "install-node-dependencies";
  label: string;
  command: string;
  argv: string[];
  cwd: string;
}

export interface LaunchFinding {
  code: "node-dependencies-missing";
  confidence: FindingConfidence;
  title: string;
  detail: string;
  evidence: string[];
  treatment?: LaunchTreatment;
}

interface PackageMetadata {
  packageManager?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
}

interface InstallContext {
  manager: "npm" | "pnpm" | "yarn" | "bun";
  root: string;
  evidence: string;
  confidence: FindingConfidence;
}

const LOCKFILES: Array<{
  filename: string;
  manager: InstallContext["manager"];
}> = [
  { filename: "pnpm-lock.yaml", manager: "pnpm" },
  { filename: "yarn.lock", manager: "yarn" },
  { filename: "bun.lock", manager: "bun" },
  { filename: "bun.lockb", manager: "bun" },
  { filename: "package-lock.json", manager: "npm" },
  { filename: "npm-shrinkwrap.json", manager: "npm" },
];

function readPackageJson(cwd: string): PackageMetadata | null {
  try {
    return JSON.parse(readFileSync(join(cwd, "package.json"), "utf8")) as PackageMetadata;
  } catch {
    return null;
  }
}

function hasDependencies(pkg: PackageMetadata): boolean {
  return [pkg.dependencies, pkg.devDependencies, pkg.optionalDependencies].some(
    (group) => group !== undefined && Object.keys(group).length > 0,
  );
}

function managerFromPackageField(
  value: string | undefined,
): InstallContext["manager"] | null {
  const name = value?.split("@")[0];
  return name === "npm" || name === "pnpm" || name === "yarn" || name === "bun"
    ? name
    : null;
}

function dependenciesExist(cwd: string): boolean {
  return (
    existsSync(join(cwd, "node_modules")) ||
    existsSync(join(cwd, ".pnp.cjs")) ||
    existsSync(join(cwd, ".pnp.js"))
  );
}

function findInstallContext(cwd: string, pkg: PackageMetadata): InstallContext {
  let current = cwd;
  const filesystemRoot = parse(cwd).root;

  while (true) {
    const currentPackage = readPackageJson(current);
    const declaredManager = managerFromPackageField(
      currentPackage?.packageManager ?? (current === cwd ? pkg.packageManager : undefined),
    );
    if (declaredManager) {
      return {
        manager: declaredManager,
        root: current,
        evidence: `packageManager specifies ${declaredManager}`,
        confidence: "high",
      };
    }

    for (const lockfile of LOCKFILES) {
      if (existsSync(join(current, lockfile.filename))) {
        return {
          manager: lockfile.manager,
          root: current,
          evidence: `${lockfile.filename} was found`,
          confidence: "high",
        };
      }
    }

    if (current === filesystemRoot || existsSync(join(current, ".git"))) {
      break;
    }
    current = dirname(current);
  }

  return {
    manager: "npm",
    root: cwd,
    evidence: "no package-manager metadata was found; npm is the fallback",
    confidence: "medium",
  };
}

function commandExists(command: string): boolean {
  const result = spawnSync("sh", ["-lc", `command -v ${command}`], {
    stdio: "ignore",
  });
  return result.status === 0;
}

export function inspectLaunchReadiness(cwd: string): LaunchFinding | null {
  const pkg = readPackageJson(cwd);
  if (!pkg || !hasDependencies(pkg)) return null;

  const context = findInstallContext(cwd, pkg);
  if (dependenciesExist(cwd) || dependenciesExist(context.root)) return null;

  const command = context.manager;
  if (!commandExists(command)) {
    return {
      code: "node-dependencies-missing",
      confidence: context.confidence,
      title: "Node dependencies appear to be missing",
      detail: `${context.evidence}, but ${command} is not installed. Install ${command}, or install this project's dependencies manually, then run Runny again.`,
      evidence: [
        "the project declares Node dependencies",
        "no node_modules or Yarn Plug'n'Play manifest was found",
        context.evidence,
        `${command} is not installed`,
      ],
    };
  }

  return {
    code: "node-dependencies-missing",
    confidence: context.confidence,
    title: "Node dependencies appear to be missing",
    detail: `Run \`${command} install\` in ${context.root}, then continue launching?`,
    evidence: [
      "the project declares Node dependencies",
      "no node_modules or Yarn Plug'n'Play manifest was found",
      context.evidence,
    ],
    treatment: {
      id: "install-node-dependencies",
      label: `Install with ${command}`,
      command,
      argv: ["install"],
      cwd: context.root,
    },
  };
}

export async function applyLaunchTreatment(
  treatment: LaunchTreatment,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(treatment.command, treatment.argv, {
      cwd: treatment.cwd,
      env: process.env,
      stdio: "inherit",
    });

    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      const outcome = signal ? `signal ${signal}` : `exit code ${code ?? 1}`;
      reject(new Error(`${treatment.command} install failed with ${outcome}`));
    });
  });
}
