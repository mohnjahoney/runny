import React from "react";
import { render } from "ink";
import { Dashboard } from "./dashboard.js";
import {
  isTuiRunning,
  notifyTuiRefresh,
  releaseTuiLock,
  tryAcquireTuiLock,
} from "./singleton.js";

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

  const { waitUntilExit } = render(<Dashboard />);

  try {
    await waitUntilExit();
    return 0;
  } finally {
    releaseTuiLock();
  }
}
