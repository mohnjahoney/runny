export const DASHBOARD_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="dark">
    <title>Runny</title>
    <style>
      :root {
        --bg: #0d0f12;
        --panel: rgba(28, 31, 36, 0.78);
        --panel-strong: #20242a;
        --line: rgba(255, 255, 255, 0.09);
        --muted: #9299a5;
        --text: #f4f6f8;
        --green: #68d391;
        --yellow: #f6c85f;
        --red: #ff7b7b;
        --accent: #9ce6cf;
      }

      * { box-sizing: border-box; }

      body {
        margin: 0;
        min-height: 100vh;
        color: var(--text);
        background:
          radial-gradient(circle at 18% 0%, rgba(76, 130, 116, 0.18), transparent 32rem),
          radial-gradient(circle at 95% 10%, rgba(85, 96, 138, 0.14), transparent 28rem),
          var(--bg);
        font: 14px/1.45 ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      button { font: inherit; }

      .shell {
        width: min(1040px, calc(100% - 40px));
        margin: 0 auto;
        padding: 46px 0 80px;
      }

      header {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 24px;
        margin-bottom: 34px;
      }

      h1 {
        margin: 0;
        font-size: clamp(34px, 6vw, 58px);
        letter-spacing: -0.065em;
        line-height: 0.95;
      }

      .tagline {
        margin: 12px 0 0;
        color: var(--muted);
        font-size: 15px;
      }

      .connection {
        display: flex;
        align-items: center;
        gap: 8px;
        color: var(--muted);
        white-space: nowrap;
      }

      .connection::before {
        content: "";
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--yellow);
        box-shadow: 0 0 16px currentColor;
      }

      .connection.ready::before { background: var(--green); }
      .connection.offline::before { background: var(--red); }

      .toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 20px;
        margin-bottom: 14px;
      }

      .summary { color: var(--muted); }
      .summary strong { color: var(--text); font-weight: 650; }

      .refresh-note {
        color: var(--muted);
        font-size: 12px;
      }

      .refresh-note.ready { color: var(--accent); }

      .tabs {
        display: inline-flex;
        gap: 4px;
        margin-bottom: 18px;
        padding: 4px;
        border: 1px solid var(--line);
        border-radius: 10px;
        background: rgba(255, 255, 255, 0.035);
      }

      .tab {
        min-width: 106px;
        min-height: 34px;
        padding: 7px 13px;
        color: var(--muted);
        border: 0;
        border-radius: 7px;
        background: transparent;
        cursor: pointer;
      }

      .tab.active {
        color: #10201c;
        background: var(--accent);
        font-weight: 700;
      }

      .view[hidden] { display: none; }

      .grid {
        display: grid;
        gap: 12px;
      }

      .card {
        overflow: hidden;
        border: 1px solid var(--line);
        border-radius: 17px;
        background: var(--panel);
        box-shadow: 0 14px 38px rgba(0, 0, 0, 0.16);
        backdrop-filter: blur(18px);
      }

      .card.selected {
        border-color: rgba(156, 230, 207, 0.5);
        box-shadow: 0 14px 38px rgba(0, 0, 0, 0.16), 0 0 0 1px rgba(156, 230, 207, 0.12);
      }

      .card-main {
        display: grid;
        grid-template-columns: minmax(210px, 1fr) auto;
        align-items: center;
        gap: 24px;
        padding: 19px 20px;
      }

      .identity {
        display: flex;
        align-items: center;
        min-width: 0;
        gap: 13px;
      }

      .status-dot {
        width: 10px;
        height: 10px;
        flex: 0 0 auto;
        border-radius: 50%;
        background: var(--muted);
      }

      .running .status-dot {
        background: var(--green);
        box-shadow: 0 0 18px rgba(104, 211, 145, 0.65);
      }

      .project-name {
        overflow: hidden;
        margin: 0;
        font-size: 17px;
        font-weight: 680;
        letter-spacing: -0.015em;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .meta {
        margin-top: 3px;
        color: var(--muted);
        font-size: 12px;
      }

      .actions {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
        gap: 7px;
      }

      .action {
        min-height: 34px;
        padding: 7px 11px;
        color: var(--text);
        border: 1px solid var(--line);
        border-radius: 9px;
        background: rgba(255, 255, 255, 0.045);
        cursor: pointer;
        transition: background 120ms ease, border-color 120ms ease, transform 120ms ease;
      }

      .action:hover:not(:disabled) {
        border-color: rgba(255, 255, 255, 0.19);
        background: rgba(255, 255, 255, 0.09);
        transform: translateY(-1px);
      }

      .action.primary {
        color: #10201c;
        border-color: transparent;
        background: var(--accent);
        font-weight: 700;
      }

      .action.danger:hover:not(:disabled) {
        color: var(--red);
        border-color: rgba(255, 123, 123, 0.28);
      }

      .action:disabled { cursor: not-allowed; opacity: 0.36; }

      details { border-top: 1px solid var(--line); }

      summary {
        padding: 10px 20px;
        color: var(--muted);
        cursor: pointer;
        font-size: 12px;
        user-select: none;
      }

      .details-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 15px 28px;
        padding: 8px 20px 20px;
      }

      .detail-label {
        margin-bottom: 3px;
        color: var(--muted);
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.1em;
        text-transform: uppercase;
      }

      .detail-value {
        overflow-wrap: anywhere;
        color: #dce0e5;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 12px;
      }

      .empty {
        padding: 72px 24px;
        color: var(--muted);
        border: 1px dashed var(--line);
        border-radius: 17px;
        text-align: center;
      }

      .empty strong {
        display: block;
        margin-bottom: 5px;
        color: var(--text);
        font-size: 16px;
      }

      .discover-path {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px;
        min-width: 0;
        color: var(--muted);
      }

      .path-value {
        overflow-wrap: anywhere;
        color: var(--text);
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 12px;
      }

      .folder-row {
        display: grid;
        grid-template-columns: minmax(220px, 1fr) auto;
        align-items: center;
        gap: 18px;
        padding: 15px 16px;
        border: 1px solid var(--line);
        border-radius: 11px;
        background: rgba(255, 255, 255, 0.035);
      }

      .folder-row.launchable {
        border-color: rgba(156, 230, 207, 0.22);
      }

      .folder-name {
        margin: 0;
        font-size: 15px;
        font-weight: 680;
      }

      .folder-meta {
        margin-top: 2px;
        color: var(--muted);
        font-size: 12px;
      }

      .toast {
        position: fixed;
        right: 22px;
        bottom: 22px;
        max-width: min(420px, calc(100% - 44px));
        padding: 12px 15px;
        color: var(--text);
        border: 1px solid var(--line);
        border-radius: 11px;
        background: var(--panel-strong);
        box-shadow: 0 18px 50px rgba(0, 0, 0, 0.38);
        opacity: 0;
        pointer-events: none;
        transform: translateY(8px);
        transition: opacity 150ms ease, transform 150ms ease;
      }

      .toast.visible { opacity: 1; transform: translateY(0); }
      .toast.error { color: var(--red); }

      @media (max-width: 720px) {
        .shell { width: min(100% - 24px, 1040px); padding-top: 28px; }
        header { align-items: flex-start; flex-direction: column; }
        .toolbar { align-items: flex-start; flex-direction: column; }
        .card-main { grid-template-columns: 1fr; gap: 16px; }
        .folder-row { grid-template-columns: 1fr; }
        .actions { justify-content: flex-start; }
        .details-grid { grid-template-columns: 1fr; }
        .refresh-note { display: none; }
      }
    </style>
  </head>
  <body>
    <main class="shell">
      <header>
        <div>
          <h1>runny</h1>
          <p class="tagline">Your local projects, ready when you are.</p>
        </div>
        <div id="connection" class="connection">Connecting</div>
      </header>

      <nav class="tabs" aria-label="Runny views">
        <button id="dashboard-tab" class="tab active" data-view="dashboard">Dashboard</button>
        <button id="discover-tab" class="tab" data-view="discover">Discover</button>
      </nav>

      <section id="dashboard-view" class="view">
        <section class="toolbar">
          <div id="summary" class="summary">Loading projects…</div>
          <div id="extension-status" class="refresh-note">Checking browser controls…</div>
        </section>

        <section id="projects" class="grid"></section>
      </section>

      <section id="discover-view" class="view" hidden>
        <section class="toolbar">
          <div class="discover-path">
            <span>Browsing</span>
            <span id="discover-path" class="path-value">Loading…</span>
          </div>
          <div class="actions">
            <button class="action" id="discover-home">Home</button>
            <button class="action" id="discover-parent">Parent</button>
            <button class="action" id="discover-refresh">Refresh</button>
          </div>
        </section>

        <section id="discover-list" class="grid"></section>
      </section>
    </main>
    <div id="toast" class="toast" role="status" aria-live="polite"></div>

    <script>
      const projectsElement = document.querySelector("#projects");
      const discoverElement = document.querySelector("#discover-list");
      const discoverPathElement = document.querySelector("#discover-path");
      const dashboardView = document.querySelector("#dashboard-view");
      const discoverView = document.querySelector("#discover-view");
      const dashboardTab = document.querySelector("#dashboard-tab");
      const discoverTab = document.querySelector("#discover-tab");
      const discoverHomeButton = document.querySelector("#discover-home");
      const discoverParentButton = document.querySelector("#discover-parent");
      const discoverRefreshButton = document.querySelector("#discover-refresh");
      const summaryElement = document.querySelector("#summary");
      const connectionElement = document.querySelector("#connection");
      const extensionElement = document.querySelector("#extension-status");
      const toastElement = document.querySelector("#toast");
      let projects = [];
      let projectTabs = {};
      let activeView = sessionStorage.getItem("runny-view") || "dashboard";
      let discoverState = null;
      let discoverCwd = sessionStorage.getItem("runny-discover-cwd") || "";
      const busyProjects = new Map();
      const busyDiscoverItems = new Map();
      let selectedProjectId = sessionStorage.getItem("runny-selected-project");
      let selectedProjectOpenedAt = Number(
        sessionStorage.getItem("runny-selected-project-opened-at") || "0"
      );
      let toastTimer;

      const kindLabels = {
        "node-dev": "Node app",
        "vite": "Vite app",
        "python-app": "Python app",
        "static-site": "Static site",
        "unknown": "Local project"
      };

      function escapeHtml(value) {
        return String(value ?? "")
          .replaceAll("&", "&amp;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;")
          .replaceAll('"', "&quot;")
          .replaceAll("'", "&#039;");
      }

      function relativeTime(iso) {
        const seconds = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 1000));
        if (seconds < 60) return seconds + "s";
        if (seconds < 3600) return Math.floor(seconds / 60) + "m";
        if (seconds < 86400) return Math.floor(seconds / 3600) + "h";
        return Math.floor(seconds / 86400) + "d";
      }

      function showToast(message, error = false) {
        clearTimeout(toastTimer);
        toastElement.textContent = message;
        toastElement.className = "toast visible" + (error ? " error" : "");
        toastTimer = setTimeout(() => {
          toastElement.className = "toast";
        }, 3200);
      }

      function hasExtension() {
        return document.documentElement.dataset.runnyExtension === "ready";
      }

      function markProjectOpened(projectId) {
        selectedProjectId = projectId;
        selectedProjectOpenedAt = Date.now();
        sessionStorage.setItem("runny-selected-project", projectId);
        sessionStorage.setItem(
          "runny-selected-project-opened-at",
          String(selectedProjectOpenedAt),
        );
        render();
      }

      function setView(view) {
        activeView = view;
        sessionStorage.setItem("runny-view", view);
        dashboardView.hidden = view !== "dashboard";
        discoverView.hidden = view !== "discover";
        dashboardTab.className = "tab" + (view === "dashboard" ? " active" : "");
        discoverTab.className = "tab" + (view === "discover" ? " active" : "");
        if (view === "discover" && !discoverState) {
          loadDiscover();
        }
      }

      function discoverKind(item) {
        if (item.known && item.project) {
          return kindLabels[item.project.kind] || item.project.kind;
        }
        if (item.plan) {
          return kindLabels[item.plan.kind] || item.plan.kind;
        }
        return "Folder";
      }

      function discoverStatus(item) {
        if (item.known && item.status === "running") return "Known · running";
        if (item.known) return "Known";
        if (item.plan) return "Launchable";
        return "Folder";
      }

      function renderDiscover() {
        if (!discoverState) {
          discoverPathElement.textContent = "Loading…";
          discoverElement.innerHTML = '<div class="empty"><strong>Loading</strong>Scanning folders…</div>';
          return;
        }

        discoverPathElement.textContent = discoverState.cwd;
        discoverParentButton.disabled = !discoverState.parent;

        const self = discoverState.self;
        const selfActions =
          self.known && self.project
            ? self.status === "running"
              ? '<button class="action primary" data-discover-action="focus-self">Focus</button>'
              : '<button class="action primary" data-discover-action="launch-self">Launch</button>'
            : self.plan
              ? '<button class="action" data-discover-action="adopt-self">Adopt</button>' +
                '<button class="action primary" data-discover-action="launch-self">Launch</button>'
              : "";
        const selfRow = selfActions
          ? '<article class="folder-row launchable" data-cwd="' + escapeHtml(discoverState.cwd) + '">' +
              '<div><h2 class="folder-name">This folder</h2>' +
              '<div class="folder-meta">' + escapeHtml(self.known ? discoverStatus(self) : "Launchable") +
              (self.plan ? " · " + escapeHtml(self.plan.command) : "") + '</div></div>' +
              '<div class="actions">' + selfActions + '</div>' +
            '</article>'
          : "";

        if (discoverState.children.length === 0 && !selfRow) {
          discoverElement.innerHTML =
            '<div class="empty"><strong>No folders here</strong>Use Parent or Home to keep browsing.</div>';
          return;
        }

        discoverElement.innerHTML = selfRow + discoverState.children.map((item) => {
          const isBusy = busyDiscoverItems.has(item.cwd);
          const canLaunch = item.plan || item.known;
          const classes = "folder-row" + (canLaunch ? " launchable" : "");
          const detail = discoverKind(item) + " · " + (busyDiscoverItems.get(item.cwd) || discoverStatus(item));
          const actions = item.known && item.project
            ? item.status === "running"
              ? '<button class="action primary" data-discover-action="focus">Focus</button>'
              : '<button class="action primary" data-discover-action="launch"' + (isBusy ? " disabled" : "") + '>Launch</button>'
            : item.plan
              ? '<button class="action" data-discover-action="adopt"' + (isBusy ? " disabled" : "") + '>Adopt</button>' +
                '<button class="action primary" data-discover-action="launch"' + (isBusy ? " disabled" : "") + '>Launch</button>'
              : '<button class="action" data-discover-action="browse">Browse</button>';

          return \
            '<article class="' + classes + '" data-cwd="' + escapeHtml(item.cwd) + '">' +
              '<div><h2 class="folder-name">' + escapeHtml(item.name) + '</h2>' +
              '<div class="folder-meta">' + escapeHtml(detail) + '</div></div>' +
              '<div class="actions">' + actions + '</div>' +
            '</article>';
        }).join("");
      }

      function render() {
        const running = projects.filter((project) => project.status === "running");
        const recent = projects.filter((project) => project.status !== "running");
        summaryElement.innerHTML =
          "<strong>" + running.length + " running</strong> · sorted by name · " + recent.length + " recent";

        extensionElement.textContent = hasExtension()
          ? "Browser controls connected"
          : "Extension needed for refresh";
        extensionElement.className = "refresh-note" + (hasExtension() ? " ready" : "");

        if (projects.length === 0) {
          projectsElement.innerHTML =
            '<div class="empty"><strong>No projects yet</strong>Run <code>runny</code> inside a project to add it here.</div>';
          return;
        }

        projectsElement.innerHTML = [...running, ...recent].map((project) => {
          const isRunning = project.status === "running";
          const busyMessage = busyProjects.get(project.id);
          const isBusy = Boolean(busyMessage);
          const isSelected = project.id === selectedProjectId;
          const hasProjectTab = projectTabs[project.id] === true;
          const browserActionLabel = hasProjectTab ? "Focus" : "Open";
          const browserActionName = hasProjectTab ? "focus" : "open";
          const refreshDisabled = !isRunning || !project.url || !hasExtension();
          const statusText = isRunning
            ? "Running for " + relativeTime(project.startedAt)
            : "Last used " + relativeTime(project.updatedAt) + " ago";
          const ports = project.ports.length ? project.ports.join(", ") : "—";
          const url = project.url || "—";
          const folder = project.cwd.split(/[\\/]/).filter(Boolean).pop() || project.cwd;
          const openedAge = selectedProjectOpenedAt
            ? Math.max(0, Math.round((Date.now() - selectedProjectOpenedAt) / 1000))
            : 0;
          const openedLabel = isSelected
            ? openedAge < 60
              ? " · Opened just now"
              : " · Opened " + relativeTime(new Date(selectedProjectOpenedAt).toISOString()) + " ago"
            : "";

          return \
            '<article class="card ' + (isRunning ? "running" : "stopped") + (isSelected ? " selected" : "") + '" data-project-id="' + escapeHtml(project.id) + '">' +
              '<div class="card-main">' +
                '<div class="identity">' +
                  '<span class="status-dot"></span>' +
                  '<div style="min-width:0">' +
                    '<h2 class="project-name">' + escapeHtml(project.displayName) + '</h2>' +
                    '<div class="meta">' + escapeHtml(folder) + ' · ' + escapeHtml(kindLabels[project.kind] || project.kind) + ' · ' + escapeHtml(busyMessage || statusText) + escapeHtml(openedLabel) + '</div>' +
                  '</div>' +
                '</div>' +
                '<div class="actions">' +
                  (isRunning
                    ? '<button class="action primary" data-action="' + browserActionName + '"' + (!project.url || isBusy ? " disabled" : "") + '>' + browserActionLabel + '</button>' +
                      '<button class="action" data-action="refresh"' + (refreshDisabled || isBusy ? " disabled" : "") + '>Refresh</button>' +
                      '<button class="action" data-action="hard-refresh"' + (refreshDisabled || isBusy ? " disabled" : "") + '>Hard refresh</button>' +
                      '<button class="action" data-action="restart"' + (isBusy ? " disabled" : "") + '>Restart</button>' +
                      '<button class="action danger" data-action="stop"' + (isBusy ? " disabled" : "") + '>Stop</button>'
                    : '<button class="action primary" data-action="launch"' + (isBusy ? " disabled" : "") + '>' + (isBusy ? "Working…" : "Launch") + '</button>') +
                  '<button class="action" data-action="rename" aria-label="Rename project"' + (isBusy ? " disabled" : "") + '>Rename</button>' +
                '</div>' +
              '</div>' +
              '<details>' +
                '<summary>Technical details</summary>' +
                '<div class="details-grid">' +
                  '<div><div class="detail-label">URL</div><div class="detail-value">' + escapeHtml(url) + '</div></div>' +
                  '<div><div class="detail-label">Ports</div><div class="detail-value">' + escapeHtml(ports) + '</div></div>' +
                  '<div><div class="detail-label">Command</div><div class="detail-value">' + escapeHtml(project.command) + '</div></div>' +
                  '<div><div class="detail-label">PID</div><div class="detail-value">' + escapeHtml(project.pid || "—") + '</div></div>' +
                  '<div style="grid-column:1/-1"><div class="detail-label">Directory</div><div class="detail-value">' + escapeHtml(project.cwd) + '</div></div>' +
                '</div>' +
              '</details>' +
            '</article>';
        }).join("");
      }

      async function loadProjects() {
        try {
          const response = await fetch("/api/projects", { credentials: "same-origin" });
          if (!response.ok) throw new Error("Runny API returned " + response.status);
          const payload = await response.json();
          projects = payload.projects;
          connectionElement.textContent = "Local engine connected";
          connectionElement.className = "connection ready";
          render();
          updateProjectTabStatuses();
        } catch (error) {
          connectionElement.textContent = "Engine unavailable";
          connectionElement.className = "connection offline";
        }
      }

      async function loadDiscover(cwd = discoverCwd) {
        renderDiscover();
        try {
          const path = cwd ? "?cwd=" + encodeURIComponent(cwd) : "";
          const response = await fetch("/api/discover" + path, {
            credentials: "same-origin"
          });
          if (!response.ok) throw new Error("Discover returned " + response.status);
          discoverState = await response.json();
          discoverCwd = discoverState.cwd;
          sessionStorage.setItem("runny-discover-cwd", discoverCwd);
          renderDiscover();
        } catch (error) {
          discoverElement.innerHTML =
            '<div class="empty"><strong>Could not browse there</strong>' +
            escapeHtml(error.message || String(error)) + '</div>';
        }
      }

      function updateProjectTabStatuses() {
        if (!hasExtension()) return;
        for (const project of projects) {
          if (project.status !== "running" || !project.url) {
            if (projectTabs[project.id]) {
              delete projectTabs[project.id];
              render();
            }
            continue;
          }
          browserAction(project, "tab-status", { silent: true });
        }
      }

      async function apiAction(projectId, action, body) {
        const response = await fetch("/api/projects/" + encodeURIComponent(projectId) + "/" + action, {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: body ? JSON.stringify(body) : "{}"
        });
        const payload = await response.json();
        if (response.status === 409 && payload.error === "treatment-required") {
          const finding = payload.finding;
          if (!finding.treatment) {
            showToast(finding.detail, true);
            return { completed: false };
          }
          const evidence = finding.evidence.map((item) => "• " + item).join("\\n");
          const approved = window.confirm(
            finding.title + " (" + finding.confidence + " confidence)\\n\\n" +
            evidence + "\\n\\n" + finding.detail
          );
          if (!approved) {
            showToast("Launch cancelled; no changes were made.");
            return { completed: false };
          }
          busyProjects.set(projectId, finding.treatment.label + "…");
          render();
          try {
            return await apiAction(projectId, "treat-and-launch");
          } finally {
            busyProjects.delete(projectId);
            render();
          }
        }
        if (!response.ok) throw new Error(payload.error || "Action failed");
        showToast(payload.message);
        await loadProjects();
        return { completed: true, payload };
      }

      async function createProject(cwd, launch = false) {
        const response = await fetch("/api/projects", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cwd, launch })
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Action failed");
        showToast(payload.message);
        await loadProjects();
        await loadDiscover(discoverCwd);
        return payload.project;
      }

      async function waitForProjectUrl(projectId, timeoutMs = 30_000) {
        const deadline = Date.now() + timeoutMs;
        while (Date.now() < deadline) {
          const response = await fetch("/api/projects", { credentials: "same-origin" });
          if (response.ok) {
            const payload = await response.json();
            projects = payload.projects;
            render();
            const project = projects.find(
              (item) => item.id === projectId && item.status === "running" && item.url,
            );
            if (project) return project;
          }
          await new Promise((resolve) => setTimeout(resolve, 400));
        }
        throw new Error("Project launched, but no browser URL appeared yet");
      }

      async function openLaunchedProject(projectId) {
        const project = await waitForProjectUrl(projectId);
        markProjectOpened(project.id);
        if (hasExtension()) {
          browserAction(project, "open");
        } else {
          await apiAction(project.id, "open");
        }
      }

      function browserAction(project, action, options = {}) {
        if (!hasExtension()) {
          if (!options.silent) {
            showToast("Install the Runny extension to control project tabs.", true);
          }
          return;
        }
        window.postMessage({
          source: "runny-dashboard",
          type: action,
          projectId: project.id,
          url: project.url
        }, window.location.origin);
      }

      projectsElement.addEventListener("click", async (event) => {
        const button = event.target.closest("button[data-action]");
        if (!button || button.disabled) return;
        const card = button.closest("[data-project-id]");
        const project = projects.find((item) => item.id === card.dataset.projectId);
        if (!project) return;
        const action = button.dataset.action;

        try {
          if (action === "open" || action === "focus") {
            markProjectOpened(project.id);
          }
          if ((action === "open" || action === "focus") && !hasExtension()) {
            await apiAction(project.id, "focus");
            return;
          }
          if (["open", "focus", "refresh", "hard-refresh"].includes(action)) {
            browserAction(project, action);
            return;
          }
          if (action === "rename") {
            const name = window.prompt("Project name", project.displayName);
            if (name !== null) await apiAction(project.id, "rename", { name });
            return;
          }
          button.disabled = true;
          busyProjects.set(
            project.id,
            action === "launch"
              ? "Preparing to launch…"
              : action === "stop"
                ? "Stopping…"
                : "Restarting…",
          );
          render();
          try {
            const result = await apiAction(project.id, action);
            if (action === "launch" && result?.completed) {
              busyProjects.set(project.id, "Opening in this browser…");
              render();
              await openLaunchedProject(project.id);
            }
          } finally {
            busyProjects.delete(project.id);
            render();
          }
        } catch (error) {
          showToast(error.message || String(error), true);
          button.disabled = false;
        }
      });

      dashboardTab.addEventListener("click", () => setView("dashboard"));
      discoverTab.addEventListener("click", () => setView("discover"));
      discoverRefreshButton.addEventListener("click", () => loadDiscover(discoverCwd));
      discoverHomeButton.addEventListener("click", () => {
        if (discoverState?.home) loadDiscover(discoverState.home);
      });
      discoverParentButton.addEventListener("click", () => {
        if (discoverState?.parent) loadDiscover(discoverState.parent);
      });

      function discoverItemFor(cwd) {
        if (!discoverState) return null;
        if (cwd === discoverState.cwd) {
          return {
            cwd,
            known: discoverState.self.known,
            status: discoverState.self.status,
            project: discoverState.self.project,
            plan: discoverState.self.plan,
          };
        }
        return discoverState.children.find((item) => item.cwd === cwd) || null;
      }

      discoverElement.addEventListener("click", async (event) => {
        const button = event.target.closest("button[data-discover-action]");
        if (!button || button.disabled) return;
        const row = button.closest("[data-cwd]");
        const cwd = row?.dataset.cwd;
        const item = cwd ? discoverItemFor(cwd) : null;
        if (!item) return;
        const action = button.dataset.discoverAction.replace("-self", "");

        try {
          if (action === "browse") {
            await loadDiscover(item.cwd);
            return;
          }

          if (action === "adopt") {
            busyDiscoverItems.set(item.cwd, "Adopting…");
            renderDiscover();
            await createProject(item.cwd, false);
            return;
          }

          if (action === "launch") {
            busyDiscoverItems.set(item.cwd, "Launching…");
            renderDiscover();
            const project = item.known && item.project
              ? item.project
              : await createProject(item.cwd, true);
            if (item.known && item.project) {
              await apiAction(project.id, "launch");
            }
            await loadDiscover(discoverCwd);
            await openLaunchedProject(project.id);
            return;
          }

          if (action === "focus" && item.project) {
            markProjectOpened(item.project.id);
            if (hasExtension()) {
              browserAction(item.project, "focus");
            } else {
              await apiAction(item.project.id, "focus");
            }
          }
        } catch (error) {
          showToast(error.message || String(error), true);
        } finally {
          busyDiscoverItems.delete(item.cwd);
          renderDiscover();
        }
      });

      window.addEventListener("message", (event) => {
        if (event.origin !== window.location.origin || event.data?.source !== "runny-extension") return;
        if (event.data.type === "ready") {
          document.documentElement.dataset.runnyExtension = "ready";
          render();
          updateProjectTabStatuses();
          return;
        }
        if (event.data.type === "result") {
          if (event.data.requestType === "tab-status") {
            if (event.data.ok) {
              projectTabs[event.data.projectId] = event.data.hasTab === true;
              render();
            }
            return;
          }
          if (event.data.ok && ["open", "focus"].includes(event.data.requestType)) {
            projectTabs[event.data.projectId] = true;
            render();
          }
          showToast(event.data.message, !event.data.ok);
        }
      });

      window.postMessage({ source: "runny-dashboard", type: "hello" }, window.location.origin);
      setView(activeView === "discover" ? "discover" : "dashboard");
      loadProjects();
      setInterval(loadProjects, 1500);
    </script>
  </body>
</html>`;
