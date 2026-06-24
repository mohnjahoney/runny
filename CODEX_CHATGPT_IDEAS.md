# Runny with Codex and ChatGPT

## Product idea

Runny should provide deterministic local-development operations while Codex and ChatGPT provide conversational diagnosis and intent. The assistant handles unusual situations; Runny makes recurring actions fast, visible, and reliable.

## Observe the workflow first

A lightweight Runny observer could record what happens during normal Codex-assisted development:

- Commands, launches, exits, restarts, and kills
- Port and process checks
- Browser opens, refreshes, and manual retries
- Failures, recoveries, and user interventions

Repeated sequences become product evidence: if Codex performs the same five-step recovery regularly, Runny should consider turning it into one named action.

## Codex connection

- **CLI first:** Give Codex small composable commands such as `runny inspect`, `runny restart`, and `runny refresh`.
- **Structured tools later:** Expose operations through MCP so Codex can inspect and act without constructing shell commands.
- **Shared evidence:** Return process ownership, health, actions taken, and verification—not merely success or failure.
- **Optional instrumentation:** Use supported Codex hooks or plugin integration where useful, while keeping Runny's own system observations authoritative.

## ChatGPT connection

- Offer conversational questions such as “Why is my app stale?” or “What is using this port?”
- Allow reviewable actions such as restarting a project, clearing cache, or stopping an orphaned process.
- Present a compact Runny control UI inside a ChatGPT app where that surface is appropriate.
- Keep local-machine access behind an explicit local bridge; a remote ChatGPT conversation should not implicitly gain control of local processes.

## Shared tool vocabulary

- `list_projects`
- `inspect_project`
- `find_port_owner`
- `launch_project`
- `restart_project`
- `stop_project`
- `focus_project_tab`
- `refresh_project_tab`
- `diagnose_stale_page`

## Principles

- Local-first and transparent
- Prefer structured operations over arbitrary shell execution
- Confirm destructive or ambiguous actions
- Keep an audit trail of observations and treatments
- Separate live process state from saved launch recipes
- Let Runny handle routine mechanics; let the assistant explain and reason

## Suggested sequence

1. Add an opt-in workflow observer.
2. Turn repeated patterns into stable Runny CLI operations.
3. Expose the same operations through MCP for Codex.
4. Explore a ChatGPT app after local authorization and security boundaries are clear.

## References

- [Codex use cases](https://developers.openai.com/codex/explore)
- [OpenAI developer resources](https://developers.openai.com/resources)
