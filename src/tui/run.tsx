import React from "react";
import { render } from "ink";
import { Dashboard } from "./dashboard.js";
import {
  isTuiRunning,
  notifyTuiRefresh,
  releaseTuiLock,
  tryAcquireTuiLock,
} from "./singleton.js";

function clearTerminal(): void {
  process.stdout.write("\x1b[3J\x1b[2J\x1b[H");
}

export async function runDashboard(): Promise<number> {
  if (isTuiRunning()) {
    notifyTuiRefresh();
    console.log("runny: dashboard already running — sent refresh");
    return 0;
  }

  if (!tryAcquireTuiLock()) {
    notifyTuiRefresh();
    console.log("runny: dashboard already running — sent refresh");
    return 0;
  }

  clearTerminal();
  const { waitUntilExit } = render(<Dashboard />);

  try {
    await waitUntilExit();
    return 0;
  } finally {
    releaseTuiLock();
  }
}
