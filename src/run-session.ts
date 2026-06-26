import { chooseBrowserUrl, openUrl } from "./browser.js";
import { inferLaunchPlan, type LaunchPlan } from "./inference.js";
import { launchPlan } from "./launcher.js";
import { formatPorts, watchPorts } from "./ports.js";
import { detectProjectContext } from "./project.js";
import {
  markEntryStopped,
  updateEntry,
  upsertRunningEntry,
} from "./registry.js";
import { ensureDashboardTerminal } from "./tui/launcher.js";
import { notifyTuiRefresh } from "./tui/singleton.js";

export async function runProjectSession(
  cwd: string = process.cwd(),
  inferredPlan?: LaunchPlan,
  options: { skipNotices?: boolean; mobile?: boolean; openBrowser?: boolean } = {},
): Promise<number> {
  const project = detectProjectContext(cwd);
  const plan = inferredPlan ?? (await inferLaunchPlan(cwd));

  if (!plan) {
    return 1;
  }

  if (!options.skipNotices) {
    for (const notice of plan.notices ?? []) {
      console.log(`runny: ${notice}`);
    }
  }

  const handle = launchPlan(plan, project.cwd);
  const entry = upsertRunningEntry({
    name: project.name,
    cwd: project.cwd,
    command: plan.command,
    kind: plan.kind,
    pid: handle.pid,
    ports: plan.ports,
    mobile: options.mobile && plan.kind === "vite",
  });

  notifyTuiRefresh();
  console.log(`Project: ${project.name}`);
  console.log(`Type: ${plan.kind}`);
  console.log(`Command: ${plan.command}`);
  for (const port of plan.ports ?? []) {
    console.log(`Local: http://localhost:${port}/`);
  }
  console.log(`PID: ${handle.pid}`);

  ensureDashboardTerminal(project.cwd).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`runny: could not open dashboard terminal: ${message}`);
  });

  const shouldOpenBrowser =
    options.openBrowser ?? process.env.RUNNY_SKIP_BROWSER_OPEN !== "1";
  let openedBrowser = !shouldOpenBrowser;
  const portWatcher = watchPorts({
    rootPid: handle.pid,
    onUpdate: (ports) => {
      updateEntry(entry.id, { ports });
      console.log(`ports: ${formatPorts(ports)}`);
      notifyTuiRefresh();
    },
    onListenersUpdate: (listeners) => {
      if (openedBrowser) {
        return;
      }

      const decision = chooseBrowserUrl(listeners);

      if (decision.type === "pending") {
        return;
      }

      if (decision.type === "ambiguous") {
        openedBrowser = true;
        console.warn(`runny: ${decision.reason}; not opening browser`);
        return;
      }

      openedBrowser = true;
      openUrl(decision.url).catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`runny: could not open browser: ${message}`);
      });
    },
  });

  const result = await handle.wait;
  portWatcher.stop();
  markEntryStopped(entry.id);
  notifyTuiRefresh();

  return result.exitCode;
}
