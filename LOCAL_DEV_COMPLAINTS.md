# Local-Development Complaints and Runny Opportunities

Status reflects the current implementation: **Addressed**, **Partial**, or **Future**.

- **I keep reopening terminals, finding directories, and retyping commands.**
  - **Status:** Partial.
  - **Now:** `runny` infers and launches common project commands from the current directory.
  - **Next:** Relaunch recent projects and commands with one action.
  - **How:** Retain stopped launches as history instead of removing them from the registry.

- **I cannot remember what is currently running.**
  - **Status:** Addressed for Runny-launched projects.
  - **Now:** The registry and live TUI list active projects, PIDs, ports, and uptime.
  - **Next:** Show richer states such as starting, healthy, failed, and stopped.
  - **How:** Persist lifecycle events and add process and endpoint health checks.

- **A port is occupied, but I do not know by what.**
  - **Status:** Partial.
  - **Now:** Runny detects listeners belonging to processes it launched; static sites choose an available port.
  - **Next:** Explain any port conflict and identify its owner.
  - **How:** Inspect system listeners before launch and map their PIDs back to commands and projects.

- **Killing a dev server requires finding its PID and choosing the right kind of kill.**
  - **Status:** Addressed for Runny-launched projects.
  - **Now:** The user selects a project; Runny terminates its entire process tree gracefully, then force-kills anything that remains.
  - **Next:** Safely stop conflicting or orphaned processes that Runny did not originally launch.
  - **How:** Resolve a project or port to its process tree, explain what will be affected, and hide signal selection and escalation behind one Stop action.

- **Old or suspended processes survive and block a relaunch.**
  - **Status:** Partial.
  - **Now:** Runny prunes dead registry entries and can terminate a registered process tree.
  - **Next:** Detect live orphaned descendants and abandoned dev servers.
  - **How:** Reconcile the registry with system process trees and listening ports.

- **Relaunching accidentally creates a duplicate server.**
  - **Status:** Future.
  - **Now:** Registry entries are keyed by directory, but Runny does not prevent a second launch.
  - **Next:** Offer focus, restart, or reuse when a matching project is already running.
  - **How:** Perform a preflight match on directory, command, process, and listeners before spawning.

- **Frameworks silently move my app to another port.**
  - **Status:** Addressed.
  - **Now:** Runny watches the launched process tree and records the ports it actually opens.
  - **Next:** Keep the user-facing destination stable when the underlying port changes.
  - **How:** Route named local destinations through a lightweight proxy.

- **Port numbers are hard to associate with projects.**
  - **Status:** Partial.
  - **Now:** The TUI pairs ports with project names, but still gives ports top-level prominence.
  - **Next:** Lead with named actions and services; reveal raw ports only in details or warnings.
  - **How:** Add service labels and progressive disclosure in the browser UI.

- **A full-stack project requires several commands in several terminals.**
  - **Status:** Future.
  - **Now:** One Runny session manages one inferred launch command.
  - **Next:** Launch and manage groups such as app, API, worker, and database.
  - **How:** Support a small project manifest with named commands and dependencies.

- **Switching between several active projects becomes chaotic.**
  - **Status:** Partial.
  - **Now:** The TUI provides a cross-project list with navigation, search, and sorting.
  - **Next:** Add recent projects, favorites, grouping, and saved environments.
  - **How:** Expand the registry into persistent project and launch-history records.

- **Restarting a server opens another browser tab.**
  - **Status:** Future.
  - **Now:** Runny opens a URL through the operating system without tracking the resulting tab.
  - **Next:** Focus or reuse the project's existing tab.
  - **How:** Pair the local service with a browser extension or browser-control bridge.

- **The browser tab still points to an old port or dead process.**
  - **Status:** Future.
  - **Now:** Runny knows the current listener but has no persistent tab association.
  - **Next:** Preserve the project-to-tab relationship across restarts.
  - **How:** Store tab identity and navigate it to the current named destination after relaunch.

- **I pressed refresh, but I am not sure anything happened.**
  - **Status:** Future for browser refresh.
  - **Now:** `r` refreshes the TUI and reports `refreshed`; it does not reload the web page.
  - **Next:** Reload the managed tab and confirm when it finishes loading.
  - **How:** Observe browser navigation events through an extension or debugging protocol.

- **The browser is showing stale code.**
  - **Status:** Future.
  - **Now:** Runny does not inspect resources loaded by the browser.
  - **Next:** Detect disagreement between the current build and the loaded page, then offer cache-busting refresh.
  - **How:** Compare build/resource fingerprints and reload with cache disabled when evidence is strong.

- **I do not know whether the cache, service worker, HMR, or server is stale.**
  - **Status:** Future.
  - **Now:** Process and listener state are visible, but browser runtime state is not.
  - **Next:** Diagnose the likely stale layer and propose the safest treatment.
  - **How:** Combine process, HTTP headers, service-worker, resource, console, and HMR signals.

- **Hard refresh fixes the symptom, but the problem keeps returning.**
  - **Status:** Future.
  - **Now:** Runny does not analyze project cache configuration.
  - **Next:** Recommend a durable, framework-aware code or configuration change.
  - **How:** Trace the stale resource to its server/config source and generate a targeted suggestion.

- **Hot reload disconnects or quietly stops updating the page.**
  - **Status:** Future.
  - **Now:** Runny observes ports, not HMR connections.
  - **Next:** Detect HMR failure and offer reconnect, refresh, or restart as appropriate.
  - **How:** Monitor the page's HMR client/WebSocket and correlate failures with process events.

- **Logs are scattered across terminal windows.**
  - **Status:** Partial.
  - **Now:** Child output remains in its launch terminal, and the TUI points the user there.
  - **Next:** Show live and recent logs per project or service.
  - **How:** Capture stdout/stderr into bounded per-launch buffers and stream them to clients.

- **When something fails, I cannot tell which layer failed.**
  - **Status:** Partial.
  - **Now:** Runny tracks process liveness and listeners but does not interpret them as a diagnosis.
  - **Next:** Summarize process, endpoint, browser, HMR, and dependency health.
  - **How:** Build a small diagnostic rules engine over shared runtime observations.

- **I lose my working setup after a reboot or context switch.**
  - **Status:** Future.
  - **Now:** Stale and stopped registry entries are removed; Runny does not restore them.
  - **Next:** Restore recent or saved project environments.
  - **How:** Persist launch recipes separately from live process records and replay them on request.

- **Different projects require commands and setup details I cannot remember.**
  - **Status:** Partial.
  - **Now:** Runny recognizes npm dev scripts, Vite, `app.py`, and simple static sites.
  - **Next:** Remember successful overrides and support less conventional projects.
  - **How:** Combine broader inference with an optional lightweight project configuration file.

- **Docker or other orchestration feels too heavy for small local projects.**
  - **Status:** Addressed in the current direction.
  - **Now:** Runny manages ordinary local processes without requiring containers or project configuration.
  - **Next:** Preserve that lightweight path as grouped services and diagnostics are added.
  - **How:** Keep integrations optional and treat native commands as first-class.

- **Editors only understand the currently open workspace.**
  - **Status:** Partial.
  - **Now:** The singleton TUI shows Runny projects across terminal and editor sessions.
  - **Next:** Add a browser control plane and optional VS Code/Cursor companion.
  - **How:** Expose one local service/API used by the CLI, TUI, browser, and editor extension.

- **Coding agents start rogue servers and collide over ports.**
  - **Status:** Future.
  - **Now:** Runny has no agent identity or launch-ownership protocol.
  - **Next:** Give humans and agents a shared registry with deduplication and conflict prevention.
  - **How:** Expose structured launch, claim, status, and shutdown operations through an API or MCP server.

- **Multiple worktrees run indistinguishable copies of the same app.**
  - **Status:** Partial.
  - **Now:** Different worktree paths can produce separate registry entries, but repo and branch identity are not shown.
  - **Next:** Label and isolate launches by repository, branch, and worktree.
  - **How:** Read Git metadata and assign stable destinations per worktree.

- **Local-development failures require memorizing operating-system commands.**
  - **Status:** Partial.
  - **Now:** Runny already discovers listeners, watches processes, and kills process trees for common actions.
  - **Next:** Behave like a local-dev doctor: identify symptoms, explain causes, and offer one-action treatments.
  - **How:** Turn existing observations plus browser signals into diagnoses, recovery actions, and prevention advice.
