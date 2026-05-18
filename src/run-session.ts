import { inferLaunchPlan } from "./inference.js";
import { launchPlan } from "./launcher.js";
import { formatPorts, watchPorts } from "./ports.js";
import { detectProjectContext } from "./project.js";
import {
  markEntryStopped,
  updateEntry,
  upsertRunningEntry,
} from "./registry.js";
import { notifyTuiRefresh } from "./tui/singleton.js";

export async function runProjectSession(cwd: string = process.cwd()): Promise<number> {
  const project = detectProjectContext(cwd);
  const plan = inferLaunchPlan(cwd);

  if (!plan) {
    return 1;
  }

  const handle = launchPlan(plan, project.cwd);
  const entry = upsertRunningEntry({
    name: project.name,
    cwd: project.cwd,
    command: plan.command,
    kind: plan.kind,
    pid: handle.pid,
  });

  notifyTuiRefresh();
  console.log(`pid: ${handle.pid}`);

  const portWatcher = watchPorts({
    rootPid: handle.pid,
    onUpdate: (ports) => {
      updateEntry(entry.id, { ports });
      console.log(`ports: ${formatPorts(ports)}`);
      notifyTuiRefresh();
    },
  });

  const result = await handle.wait;
  portWatcher.stop();
  markEntryStopped(entry.id);
  notifyTuiRefresh();

  return result.exitCode;
}
