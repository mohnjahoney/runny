import { spawn, type ChildProcess } from "node:child_process";
import type { LaunchPlan } from "./inference.js";

export interface LaunchResult {
  exitCode: number;
  pid?: number;
}

export interface LaunchHandle {
  pid: number;
  wait: Promise<LaunchResult>;
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

export function launchPlan(plan: LaunchPlan, cwd: string): LaunchHandle {
  const [command, ...args] = plan.argv;
  const child = spawn(command, args, {
    cwd,
    stdio: "inherit",
    env: process.env,
  });

  const pid = child.pid;
  if (pid === undefined) {
    throw new Error("Failed to obtain child process PID");
  }

  const detachHandlers = attachShutdownHandlers(child);

  const wait = new Promise<LaunchResult>((resolve) => {
    child.on("error", (error) => {
      detachHandlers();
      console.error(`runny: failed to start process: ${error.message}`);
      resolve({ exitCode: 1, pid });
    });

    child.on("exit", (code, signal) => {
      detachHandlers();

      if (signal === "SIGINT" || signal === "SIGTERM") {
        resolve({ exitCode: 130, pid });
        return;
      }

      resolve({ exitCode: code ?? 1, pid });
    });
  });

  return { pid, wait };
}
