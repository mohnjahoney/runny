# Runny Feature Upgrade: Watch Vite Ports Without Reimplementing Vite

We are adding a Vite-specific improvement to `runny`, but the design goal is important: do not reimplement Vite's dev server behavior. Vite is already a mature tool that handles HMR, config loading, default ports, and port fallback. `runny` should mostly observe Vite, report what actually happened, and warn about confusing cross-project situations.

## Context

`runny` currently infers Vite projects and launches:

```bash
npm run dev
```

That is good. However, when multiple Vite projects are running, users can still get confused by port and host behavior. For example, two projects may both appear to be on port `5173` if one binds to IPv6 localhost:

```txt
::1:5173
```

and another binds to IPv4 localhost:

```txt
127.0.0.1:5173
```

The operating system allows this because these are different network addresses, but a browser URL like `localhost:5173` can become ambiguous to a human.

## Goal

For Vite projects, `runny` should:

1. Launch the project's existing dev script without forcing a port by default.
2. Watch which host/port Vite actually opens.
3. Display the actual usable URL clearly.
4. Detect and warn about ambiguous numeric-port collisions across different hosts/interfaces.
5. Keep explicit runny-managed Vite ports as a future or opt-in behavior, not the default.

## Non-goals

Do not replace Vite's port fallback system.

Do not always inject `--port` or `--strictPort` into Vite commands.

Do not require Vite projects to change their `package.json` scripts.

Do not silently kill another dev server to free a port.

Do not introduce a large configuration system.

## Desired Behavior

When runny starts a Vite project, it should still launch:

```bash
npm run dev
```

Then it should detect the listening ports for the launched process tree, as it already does.

Improve this detection/reporting so it can distinguish listener addresses when possible:

```txt
brilliant-portfolio-page   [::1]:5173
academic-portfolio-page    127.0.0.1:5173
```

The terminal output should be clearer than only:

```txt
ports: 5173
```

Prefer output like:

```txt
Local: http://localhost:5173/
Listening: [::1]:5173
```

or, when the listener is IPv4:

```txt
Local: http://127.0.0.1:5173/
Listening: 127.0.0.1:5173
```

## Ambiguity Warning

If a newly launched project is listening on a numeric port already used by another running project, but on a different host/interface, warn clearly.

Example:

```txt
runny: warning: port 5173 is already used by brilliant-portfolio-page on [::1].
runny: academic-portfolio-page is listening on 127.0.0.1:5173.
runny: localhost:5173 may be ambiguous; use the exact URL shown above.
```

This warning should not stop the process. It should only explain the situation.

## Registry Improvements

The registry currently stores ports as numbers. Consider whether it should also store listener addresses.

Possible shape:

```ts
interface Listener {
  host: string;
  port: number;
}
```

Then registry entries could eventually include:

```ts
listeners: Listener[];
```

For compatibility, keep existing `ports` behavior for now if needed. Prefer an incremental migration rather than a disruptive schema rewrite.

## Implementation Notes

Look at:

- `src/ports.ts`
- `src/run-session.ts`
- `src/registry.ts`
- `src/list.ts`
- `src/tui/dashboard.tsx`
- `src/actions/project-actions.ts`

The current `lsof` parsing probably extracts only the numeric port. Enhance it to preserve host/address information from lines like:

```txt
TCP [::1]:5173 (LISTEN)
TCP 127.0.0.1:5173 (LISTEN)
TCP *:5173 (LISTEN)
```

Keep the first implementation simple and macOS-focused.

## Tool Boundary

For static Python sites, it is reasonable for `runny` to choose a free port because `python3 -m http.server` does not do that ergonomically.

For Vite sites, default to observation. Vite owns its own dev-server behavior.

Later, if needed, add an explicit opt-in mode such as:

```json
{
  "managePort": true
}
```

or a command flag:

```bash
runny --managed-port
```

Only in that mode should runny pass something like:

```bash
npm run dev -- --host 127.0.0.1 --port <free-port> --strictPort
```

## Testing

Test with two Vite projects:

```bash
cd academic-portfolio-page
runny
```

and:

```bash
cd brilliant-portfolio-page
runny
```

Expected:

- both projects launch normally
- runny reports the actual listener host and port
- if both use numeric port `5173` on different hosts/interfaces, runny warns clearly
- browser-opening behavior uses the least ambiguous URL available
- existing static-site Python port behavior remains unchanged

Also test:

- one Vite project where Vite auto-increments to another port
- one Vite project bound to `127.0.0.1`
- one Vite project bound to `::1` or default localhost
- one static HTML project using the Python server path
