import { randomBytes } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { homedir } from "node:os";
import { basename, dirname, resolve, join } from "node:path";
import {
  adoptProject,
  killProject,
  launchProject,
  openProjectInBrowser,
  restartProject,
} from "../actions/project-actions.js";
import { openUrl } from "../browser.js";
import { inferLaunchPlan, type LaunchPlan } from "../inference.js";
import { isProcessAlive } from "../process-tree.js";
import {
  applyLaunchTreatment,
  inspectLaunchReadiness,
  type LaunchFinding,
} from "../readiness.js";
import {
  getProject,
  getProjects,
  renameProject,
  type RegistryEntry,
} from "../registry.js";
import { DASHBOARD_HTML } from "./ui.js";

const WEB_HOST = "127.0.0.1";
const configuredPort = Number(process.env.RUNNY_WEB_PORT ?? "4789");
const WEB_PORT =
  Number.isInteger(configuredPort) && configuredPort > 0 && configuredPort <= 65_535
    ? configuredPort
    : 4789;
const RUNNY_DIR = join(homedir(), ".runny");
const SESSION_PATH = join(RUNNY_DIR, "web-session.json");
const DEFAULT_DISCOVER_ROOT = process.cwd();

interface WebSession {
  pid: number;
  token: string;
  url: string;
}

const treatmentLaunches = new Map<string, Promise<string>>();

function readSession(): WebSession | null {
  try {
    return JSON.parse(readFileSync(SESSION_PATH, "utf8")) as WebSession;
  } catch {
    return null;
  }
}

function clearSession(): void {
  try {
    unlinkSync(SESSION_PATH);
  } catch {
    // No session file to remove.
  }
}

function writeSession(session: WebSession): void {
  mkdirSync(RUNNY_DIR, { recursive: true });
  writeFileSync(SESSION_PATH, `${JSON.stringify(session)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
}

function cookies(request: IncomingMessage): Record<string, string> {
  const result: Record<string, string> = {};
  for (const item of request.headers.cookie?.split(";") ?? []) {
    const [key, ...rest] = item.trim().split("=");
    if (key) result[key] = decodeURIComponent(rest.join("="));
  }
  return result;
}

function sendJson(
  response: ServerResponse,
  status: number,
  payload: unknown,
): void {
  response.writeHead(status, {
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
  });
  response.end(JSON.stringify(payload));
}

function sendHtml(response: ServerResponse): void {
  response.writeHead(200, {
    "Cache-Control": "no-store",
    "Content-Security-Policy":
      "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; frame-ancestors 'none'",
    "Content-Type": "text/html; charset=utf-8",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
  });
  response.end(DASHBOARD_HTML);
}

function isAuthorized(request: IncomingMessage, token: string): boolean {
  return cookies(request).runny_token === token;
}

function sessionCookie(token: string): string {
  return `runny_token=${encodeURIComponent(token)}; HttpOnly; SameSite=Strict; Path=/`;
}

function hasValidOrigin(request: IncomingMessage): boolean {
  return request.headers.origin === `http://${WEB_HOST}:${WEB_PORT}`;
}

async function readJson(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > 16_384) throw new Error("Request body is too large");
    chunks.push(buffer);
  }
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
}

function projectUrl(entry: RegistryEntry): string | null {
  const port = entry.ports[0];
  return port === undefined ? null : `http://localhost:${port}/`;
}

function projectPayload(entry: RegistryEntry): object {
  return {
    ...entry,
    displayName: entry.displayName ?? entry.name,
    url: projectUrl(entry),
  };
}

function findingPayload(finding: LaunchFinding): object {
  return {
    code: finding.code,
    confidence: finding.confidence,
    title: finding.title,
    detail: finding.detail,
    evidence: finding.evidence,
    treatment: finding.treatment
      ? {
          id: finding.treatment.id,
          label: finding.treatment.label,
        }
      : null,
  };
}

function launchPlanPayload(plan: LaunchPlan | null): object | null {
  if (!plan) return null;
  return {
    kind: plan.kind,
    command: plan.command,
    reason: plan.reason,
    ports: plan.ports ?? [],
  };
}

function safeDirectory(path: string): string {
  const directory = resolve(path || DEFAULT_DISCOVER_ROOT);
  const stat = statSync(directory);
  if (!stat.isDirectory()) {
    throw new Error(`${directory} is not a directory`);
  }
  return directory;
}

async function handleDiscover(
  url: URL,
  response: ServerResponse,
): Promise<void> {
  const cwd = safeDirectory(url.searchParams.get("cwd") ?? DEFAULT_DISCOVER_ROOT);
  const registry = getProjects();
  const byCwd = new Map(registry.map((entry) => [entry.cwd, entry]));
  const entries = readdirSync(cwd, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 150);

  const children = await Promise.all(
    entries.map(async (entry) => {
      const childCwd = join(cwd, entry.name);
      const known = byCwd.get(childCwd);
      let plan: LaunchPlan | null = null;
      if (!known) {
        try {
          plan = await inferLaunchPlan(childCwd);
        } catch {
          plan = null;
        }
      }

      return {
        name: entry.name,
        cwd: childCwd,
        known: Boolean(known),
        status: known?.status ?? "unknown",
        project: known ? projectPayload(known) : null,
        plan: launchPlanPayload(known ? null : plan),
      };
    }),
  );

  const self = byCwd.get(cwd);
  const selfPlan = self ? null : await inferLaunchPlan(cwd).catch(() => null);

  sendJson(response, 200, {
    cwd,
    name: basename(cwd) || cwd,
    parent: dirname(cwd) === cwd ? null : dirname(cwd),
    home: homedir(),
    self: {
      known: Boolean(self),
      status: self?.status ?? "unknown",
      project: self ? projectPayload(self) : null,
      plan: launchPlanPayload(self ? null : selfPlan),
    },
    children,
  });
}

async function treatAndLaunch(entry: RegistryEntry): Promise<string> {
  const existing = treatmentLaunches.get(entry.id);
  if (existing) return existing;

  const operation = (async () => {
    const finding = inspectLaunchReadiness(entry.cwd);
    let treatmentLabel: string | null = null;
    if (finding) {
      if (!finding.treatment) {
        throw new Error(finding.detail);
      }
      treatmentLabel = finding.treatment.label;
      await applyLaunchTreatment(finding.treatment);
      if (inspectLaunchReadiness(entry.cwd)) {
        throw new Error(
          "dependency installation finished, but the project still appears unprepared",
        );
      }
    }
    const launchMessage = await launchProject(entry, { openBrowser: false });
    return treatmentLabel
      ? `${treatmentLabel} completed; ${launchMessage}`
      : launchMessage;
  })();

  treatmentLaunches.set(entry.id, operation);
  try {
    return await operation;
  } finally {
    treatmentLaunches.delete(entry.id);
  }
}

async function handleProjectCreate(
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  const body = (await readJson(request)) as {
    cwd?: unknown;
    launch?: unknown;
  };
  if (typeof body.cwd !== "string" || !body.cwd.trim()) {
    sendJson(response, 400, { error: "A project directory is required" });
    return;
  }

  const entry = await adoptProject(body.cwd);
  if (body.launch === true) {
    const message = await launchProject(entry, { openBrowser: false });
    const updated = getProject(entry.id) ?? entry;
    sendJson(response, 200, {
      message: `adopted ${entry.displayName ?? entry.name}; ${message}`,
      project: projectPayload(updated),
    });
    return;
  }

  sendJson(response, 200, {
    message: `adopted ${entry.displayName ?? entry.name}`,
    project: projectPayload(entry),
  });
}

async function handleProjectAction(
  request: IncomingMessage,
  response: ServerResponse,
  id: string,
  action: string,
): Promise<void> {
  const entry = getProject(id);
  if (!entry) {
    sendJson(response, 404, { error: "Project not found" });
    return;
  }

  let message: string;
  switch (action) {
    case "launch": {
      const finding = inspectLaunchReadiness(entry.cwd);
      if (finding) {
        sendJson(response, 409, {
          error: "treatment-required",
          finding: findingPayload(finding),
        });
        return;
      }
      message = await launchProject(entry, { openBrowser: false });
      break;
    }
    case "treat-and-launch":
      message = await treatAndLaunch(entry);
      break;
    case "restart":
      message = await restartProject(entry, { openBrowser: false });
      break;
    case "stop":
      message = await killProject(entry);
      break;
    case "open":
    case "focus":
      message = await openProjectInBrowser(entry);
      break;
    case "rename": {
      const body = (await readJson(request)) as { name?: unknown };
      if (typeof body.name !== "string") {
        sendJson(response, 400, { error: "A project name is required" });
        return;
      }
      renameProject(entry.id, body.name);
      message = body.name.trim()
        ? `renamed project to ${body.name.trim()}`
        : "restored inferred project name";
      break;
    }
    default:
      sendJson(response, 404, { error: "Unknown action" });
      return;
  }

  sendJson(response, 200, { message });
}

function createWebServer(token: string) {
  return createServer((request, response) => {
    void (async () => {
      const url = new URL(
        request.url ?? "/",
        `http://${request.headers.host ?? `${WEB_HOST}:${WEB_PORT}`}`,
      );

      if (request.method === "GET" && url.pathname === "/") {
        if (url.searchParams.get("token") === token) {
          response.writeHead(302, {
            Location: "/",
            "Set-Cookie": sessionCookie(token),
          });
          response.end();
          return;
        }
        if (!isAuthorized(request, token)) {
          // Each browser profile needs its own cookie. Because the service is
          // loopback-only, establish that session when the dashboard is opened
          // directly instead of tying authorization to the default browser.
          response.writeHead(302, {
            Location: "/",
            "Set-Cookie": sessionCookie(token),
          });
          response.end();
          return;
        }
        sendHtml(response);
        return;
      }

      if (!url.pathname.startsWith("/api/") || !isAuthorized(request, token)) {
        sendJson(response, 401, { error: "Unauthorized" });
        return;
      }

      if (request.method === "GET" && url.pathname === "/api/projects") {
        const projects = getProjects().sort((a, b) => {
          if (a.status !== b.status) return a.status === "running" ? -1 : 1;
          if (a.status === "running") {
            return (
              (a.displayName ?? a.name).localeCompare(b.displayName ?? b.name) ||
              a.id.localeCompare(b.id)
            );
          }
          return (
            Date.parse(b.updatedAt) - Date.parse(a.updatedAt) ||
            (a.displayName ?? a.name).localeCompare(b.displayName ?? b.name)
          );
        });
        sendJson(response, 200, { projects: projects.map(projectPayload) });
        return;
      }

      if (request.method === "GET" && url.pathname === "/api/discover") {
        await handleDiscover(url, response);
        return;
      }

      if (request.method !== "POST" || !hasValidOrigin(request)) {
        sendJson(response, 403, { error: "Invalid request origin" });
        return;
      }

      if (url.pathname === "/api/projects") {
        await handleProjectCreate(request, response);
        return;
      }

      const match = url.pathname.match(/^\/api\/projects\/([^/]+)\/([^/]+)$/);
      if (!match) {
        sendJson(response, 404, { error: "Not found" });
        return;
      }

      await handleProjectAction(
        request,
        response,
        decodeURIComponent(match[1]),
        match[2],
      );
    })().catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      if (!response.headersSent) sendJson(response, 500, { error: message });
      else response.end();
    });
  });
}

export async function runWebDashboard(): Promise<number> {
  const existing = existsSync(SESSION_PATH) ? readSession() : null;
  if (existing && isProcessAlive(existing.pid)) {
    if (process.env.RUNNY_NO_OPEN !== "1") {
      await openUrl(existing.url);
    }
    console.log(`runny: browser dashboard already running at ${existing.url.split("?")[0]}`);
    return 0;
  }
  clearSession();

  const token = randomBytes(24).toString("base64url");
  const url = `http://${WEB_HOST}:${WEB_PORT}/?token=${encodeURIComponent(token)}`;
  const server = createWebServer(token);

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(WEB_PORT, WEB_HOST, resolve);
  });

  writeSession({ pid: process.pid, token, url });
  console.log(`runny browser dashboard: http://${WEB_HOST}:${WEB_PORT}/`);
  console.log("press Ctrl+C to stop the dashboard");
  if (process.env.RUNNY_NO_OPEN !== "1") {
    try {
      await openUrl(url);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`runny: could not open browser: ${message}`);
    }
  }

  return new Promise<number>((resolve) => {
    let closing = false;
    const close = (): void => {
      if (closing) return;
      closing = true;
      clearSession();
      server.close(() => resolve(0));
    };
    process.once("SIGINT", close);
    process.once("SIGTERM", close);
  });
}
