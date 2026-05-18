import { spawn, type ChildProcess } from "node:child_process";
import type { LaunchPlan } from "./inference.js";

export interface LaunchResult {
  exitCode: number;
  pid?: number;
}

function attachShutdownHandlers(child: ChildProcess): () => void {
  let shuttingDown = false;

  const shutdown = (): void => {
    if (shuttingDown || child.killed) {
      return;
    }
    shuttingDown = true;
    child.kill("SIGTERM");

    setTimeout(() => {
      if (!child.killed) {
        child.kill("SIGKILL");
      }
    }, 5_000).unref();
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  return () => {
    process.off("SIGINT", shutdown);
    process.off("SIGTERM", shutdown);
  };
}

export function launchPlan(plan: LaunchPlan, cwd: string): Promise<LaunchResult> {
  return new Promise((resolve) => {
    const [command, ...args] = plan.argv;
    const child = spawn(command, args, {
      cwd,
      stdio: "inherit",
      env: process.env,
    });

    const detachHandlers = attachShutdownHandlers(child);

    child.on("error", (error) => {
      detachHandlers();
      console.error(`runny: failed to start process: ${error.message}`);
      resolve({ exitCode: 1 });
    });

    child.on("exit", (code, signal) => {
      detachHandlers();

      if (signal === "SIGINT" || signal === "SIGTERM") {
        resolve({ exitCode: 130, pid: child.pid });
        return;
      }

      resolve({ exitCode: code ?? 1, pid: child.pid });
    });
  });
}
