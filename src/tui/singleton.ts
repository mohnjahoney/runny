import {
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { isProcessAlive } from "../process-tree.js";

const RUNNY_DIR = join(homedir(), ".runny");
const TUI_LOCK_PATH = join(RUNNY_DIR, "tui.lock");
const TUI_NOTIFY_PATH = join(RUNNY_DIR, "tui.notify");

interface TuiLock {
  pid: number;
  startedAt: string;
}

function ensureRunnyDir(): void {
  mkdirSync(RUNNY_DIR, { recursive: true });
}

function readLock(): TuiLock | null {
  if (!existsSync(TUI_LOCK_PATH)) {
    return null;
  }

  try {
    return JSON.parse(readFileSync(TUI_LOCK_PATH, "utf8")) as TuiLock;
  } catch {
    return null;
  }
}

function clearStaleLock(): void {
  const lock = readLock();
  if (!lock) {
    return;
  }

  if (!isProcessAlive(lock.pid)) {
    try {
      unlinkSync(TUI_LOCK_PATH);
    } catch {
      // ignore
    }
  }
}

export function isTuiRunning(): boolean {
  clearStaleLock();
  const lock = readLock();
  return lock !== null && isProcessAlive(lock.pid);
}

export function tryAcquireTuiLock(): boolean {
  clearStaleLock();

  if (isTuiRunning()) {
    return false;
  }

  ensureRunnyDir();
  const lock: TuiLock = {
    pid: process.pid,
    startedAt: new Date().toISOString(),
  };
  writeFileSync(TUI_LOCK_PATH, `${JSON.stringify(lock)}\n`, "utf8");
  return true;
}

export function releaseTuiLock(): void {
  const lock = readLock();
  if (!lock || lock.pid !== process.pid) {
    return;
  }

  try {
    unlinkSync(TUI_LOCK_PATH);
  } catch {
    // ignore
  }
}

export function notifyTuiRefresh(): void {
  ensureRunnyDir();
  writeFileSync(TUI_NOTIFY_PATH, String(Date.now()), "utf8");
}

export function readNotifyToken(): number {
  try {
    return Number(readFileSync(TUI_NOTIFY_PATH, "utf8"));
  } catch {
    return 0;
  }
}
