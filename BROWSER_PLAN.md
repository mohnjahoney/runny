# Runny Browser Plan

## Goal

Make the browser Runny's primary visual control center for local web development.

The first useful version should make it easy to understand, open, refresh, restart, and stop local projects without exposing unnecessary process details. It should remain lightweight and use the same engine as the CLI and TUI.

## Product principles

- Show human-readable projects and services, not collections of ports and PIDs.
- Make common actions available with one click or keypress.
- Keep technical details nearby but out of the top-level view.
- Confirm actions so the user knows they happened.
- Prefer one authoritative project tab over opening duplicates.
- Let the initiating dashboard choose the browser instead of allowing a detached
  process to open the system default independently.
- Keep the engine independent of every interface.
- Remain local-first, transparent, and safe.

## Diagnosis, treatment, and resumed intent

Runny should turn familiar local-development failures into a fluid recovery
sequence:

1. **Identify** a specific condition and report the evidence and confidence.
2. **Offer treatment** as a named, reviewable action rather than an opaque fix.
3. **Apply with consent** when the treatment changes files, installs software, or
   affects an unowned process.
4. **Verify** that the condition was resolved.
5. **Continue the original intent** automatically, such as launching the project
   after installing dependencies.

The engine should return structured findings and known treatments. Individual
views decide how to present them: a terminal prompt in the CLI, an in-place card
or confirmation in the browser, and structured tool results for future agent
integrations. Diagnostic rules and treatments must not live inside a view.

The design should make the continuity visible without making recovery feel
heavy: **Dependencies missing → Installing with npm → Installed → Launching →
Running**. Confidence and evidence should remain available, while the recommended
next action stays obvious.

## Architecture

```text
Runny engine
  registry · launch recipes · processes · ports · actions

Local Runny API
  project state · lifecycle actions · browser coordination

Interfaces
  CLI · TUI · browser dashboard · browser extension
```

The CLI, TUI, HTTP API, and extension should call the same application-level operations. Process management and project state must not live inside a view.

The local server should bind only to `127.0.0.1`. State-changing requests should require a local session token and validate their origin.

## Browser MVP

### Project list

Show **Running** and **Recent** projects with:

- Human-readable project name
- Service or framework label
- Running, starting, stopped, or failed state
- Uptime or last-used time
- Open or Launch
- Refresh
- Hard Refresh
- Restart
- Stop
- Expandable details

Raw ports, PIDs, working directories, and commands belong in the expanded details view rather than the primary card.

### Project identity

Choose labels in this order:

1. Explicit Runny configuration
2. A user-edited name remembered by Runny
3. Project metadata such as `package.json`
4. Directory name
5. An inferred framework or command description

Runny should distinguish:

- **Project:** Personal Website
- **Service:** Vite web app
- **Instance:** Main branch or a particular worktree

Inferred names should be transparent and easy to edit.

### Recent launches

Stopped launches should remain available as reusable launch recipes. A recent project should be relaunchable without navigating to its directory or retyping its command.

Live process state and saved launch recipes should be stored separately.

## Required browser extension

Refresh is part of the browser MVP, so a small Chromium extension is required for the first credible release.

The initial extension should:

- Associate a project with its browser tab
- Find and focus an existing tab
- Avoid opening duplicate tabs
- Perform a normal refresh
- Perform a cache-bypassing refresh
- Report when navigation finishes or fails
- Communicate only with the authenticated local Runny service

The extension does not manage operating-system processes. Restart and Stop requests go to the local Runny engine, which owns process discovery, signaling, escalation, and verification.

### Browser selection policy

- When the dashboard has the Runny extension, Open and post-launch navigation
  use that browser and reuse its matching project tab.
- Without the extension, Runny falls back to the operating system's default
  browser.
- Dashboard-initiated launches and restarts suppress the detached CLI's automatic
  browser opening so Safari or another default browser cannot race the initiating
  view and create a duplicate.
- Explicit browser selection or per-project browser preferences may be added later.

### Deferred extension capabilities

- HMR connection monitoring
- Service-worker inspection
- Stale-resource diagnosis
- Cache/configuration recommendations
- Injected dock or persistent side panel
- Cross-browser support

## End-of-day confidence

Add a **Stop for the day** action that:

1. Gracefully stops every Runny-managed project.
2. Escalates and stops remaining descendants when necessary.
3. Verifies that managed listeners and ports have closed.
4. Reports likely development processes that Runny did not launch.
5. Finishes with either **All clear** or a small review list.

Runny should distinguish managed processes from merely suspected personal-development processes. It should not stop an unowned process without confirmation.

## Launch support

Preserve the current lightweight inference for npm dev scripts, Vite, `app.py`, and static sites.

Next priorities:

- Other Node package managers and package scripts
- Python project metadata and common Flask, Django, and FastAPI launch patterns
- User-entered commands that Runny remembers
- Optional Runny project configuration
- Multi-service launch groups
- Docker Compose and Procfile-style projects

Prefer a remembered successful launch recipe over an ever-growing collection of fragile guesses.

## Plan of attack

### Phase 1: Strengthen the engine model

- Separate saved projects/launch recipes from live process records.
- Preserve stopped and recent projects.
- Add editable project and service labels.
- Expose reusable list, launch, restart, stop, and open operations.

### Phase 2: Add the local API

- Serve project state over loopback HTTP.
- Add authenticated endpoints for lifecycle actions.
- Start with polling; consider server-sent events later.
- Keep the TUI working against the same engine behavior.

### Phase 3: Build the browser dashboard

- Create attractive Running and Recent project cards.
- Add Open, Launch, Restart, and Stop.
- Hide ports and PIDs inside expandable details.
- Add clear action progress, success, and failure feedback.

### Phase 4: Add the minimal Chromium extension

- Register and locate project tabs.
- Focus instead of duplicating tabs.
- Add Refresh and Hard Refresh.
- Confirm completed navigation in the dashboard.

The browser MVP is not complete until Phase 4 works.

### Phase 5: Add confidence features

- Add Stop for the day and post-stop verification.
- Detect duplicate Runny launches before spawning.
- Surface likely orphaned development processes for review.
- Broaden remembered and inferred launch support.

### Later exploration

- Stale-code and HMR diagnosis
- Local-dev doctor recommendations
- Directory browsing and project discovery
- Saved multi-service environments
- Persistent translucent dock or browser side panel
- VS Code and Cursor companions
- Codex, ChatGPT, and MCP integration

## Explicitly out of scope for the first version

- Editing source code in Runny
- Replacing the terminal or code editor
- Automatic configuration changes
- Automatic killing of unowned processes
- Comprehensive framework detection
- Firefox and Safari extension parity
- Intelligent cache diagnosis

## Success criteria

The first browser release succeeds if a user can:

- Open Runny and immediately recognize every managed project.
- Relaunch a recent project without opening a terminal.
- Open or focus the correct browser tab without creating a duplicate.
- Refresh or hard-refresh that tab and receive clear confirmation.
- Restart or stop the project without knowing its PID or port.
- Inspect ports, commands, and directories only when needed.
- Trust that the CLI, TUI, and browser show the same underlying state.
