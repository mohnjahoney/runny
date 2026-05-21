# Runny Feature Upgrade: Flexible Ports for Static Python Servers

We are adding a practical feature to `runny`: when run inside a plain static site, `runny` should launch a Python static server on an available port instead of requiring each project to hardcode an arbitrary port.

## Context

`runny` is a lightweight local development orchestrator for personal projects. Its purpose is to infer how a project should run, launch it, detect ports, register active processes, and make local development less cluttered.

Some projects are plain static sites with no Vite, no build step, and no `package.json` dev server. These should not need Vite just to get a better local server experience.

Examples:

```txt
index.html
styles.css
script.js
assets/
```

Current common command:

```bash
python3 -m http.server 4173
```

The problem is that hardcoding static-site ports does not scale well across many small projects.

## Goal

When `runny` detects a plain static site, it should launch:

```bash
python3 -m http.server <available-port>
```

where `<available-port>` is selected automatically.

## Desired Behavior

1. Detect plain static sites.
   A plain static site may have:
   - `index.html`
   - CSS/JS/assets files
   - no `vite.config.*`
   - no meaningful `package.json` dev script

2. Choose an available port.
   Suggested default range:

   ```txt
   8000-8999
   ```

   Start with port 8000

3. Launch the server with the chosen port:

   ```bash
   python3 -m http.server <port>
   ```

4. Print clear output:

   ```txt
   Project: dads-music-website
   Type: static-site
   Command: python3 -m http.server 8000
   Local: http://localhost:8124/
   PID: 12345
   ```

5. Register the process and port in runny's registry.

6. If the preferred/remembered port is occupied, choose another available port and say so clearly.

   Choose a next port by incrementing by 1. For example if port 8000 is occupied, try port 8001

## Port Policy

Use this priority order:

1. Explicit project config, if present later:

   ```json
   {
     "preferredPort": 8123
   }
   ```

2. Existing dev command with a hardcoded port.
   If a project already has:

   ```json
   "dev": "python3 -m http.server 4173"
   ```

   respect it for now.

3. First available port in the static-site range.

## Non-goals

Do not add Vite to static sites.

Do not introduce Docker, Foreman, tmux, or a large orchestration system.

Do not require every static site to have a config file.

Do not silently kill another process to free a port.

## Implementation Notes

Look for existing modules:

- `src/inference.ts`
- `src/ports.ts`
- `src/launcher.ts`
- `src/registry.ts`
- `src/run-session.ts`

Prefer small, readable changes.

The port utility should expose something like:

```ts
findAvailablePort({
  preferred?: number;
  rangeStart: number;
  rangeEnd: number;
}): Promise<number>
```

or an equivalent simple API.

Static-site inference should return a launch command that includes the selected port.

## Testing

After implementation, test manually with a static site directory:

```bash
cd /path/to/static-site
runny
```

Expected:

- server starts
- printed URL works
- port is registered
- repeated launches do not collide silently
- occupied preferred ports are handled gracefully

Also test existing Vite projects to make sure their behavior is unchanged.
