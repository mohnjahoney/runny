import React, { useEffect, useMemo, useState } from "react";
import { Box, Text, useApp, useInput } from "ink";
import qrcode from "qrcode-terminal";
import {
  filterProjects,
  killProject,
  logsHint,
  nextSortMode,
  openProjectInBrowser,
  restartProjectMobile,
  restartProject,
  sortModeLabel,
  sortProjects,
  type SortMode,
} from "../actions/project-actions.js";
import { formatUptime } from "../format.js";
import { mobileUrlForPort } from "../mobile.js";
import { formatPorts } from "../ports.js";
import type { RegistryEntry } from "../registry.js";
import { getRunningProjects } from "../registry.js";

const REFRESH_MS = 1_500;

function truncate(value: string, max: number): string {
  if (value.length <= max) {
    return value.padEnd(max);
  }
  return `${value.slice(0, max - 1)}…`;
}

function ProjectRow({
  entry,
  selected,
}: {
  entry: RegistryEntry;
  selected: boolean;
}): React.ReactElement {
  const ports = formatPorts(entry.ports);
  const marker = selected ? "›" : " ";
  const kind = entry.mobile ? `${entry.kind}-mobile` : entry.kind;

  return (
    <Text color={selected ? "cyan" : undefined}>
      {marker} {truncate(entry.name, 14)} {truncate(kind, 11)}{" "}
      {String(entry.pid).padEnd(6)} {truncate(ports, 14)}{" "}
      {formatUptime(entry.startedAt).padEnd(8)} running
    </Text>
  );
}

function qrForUrl(url: string): string {
  let qr = "";
  qrcode.generate(url, { small: true }, (value) => {
    qr = value;
  });
  return qr;
}

export function Dashboard(): React.ReactElement {
  const { exit } = useApp();
  const [allProjects, setAllProjects] = useState<RegistryEntry[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [sortMode, setSortMode] = useState<SortMode>("uptime-desc");
  const [filterQuery, setFilterQuery] = useState("");
  const [filterMode, setFilterMode] = useState(false);
  const [status, setStatus] = useState("");

  const refresh = (): void => {
    setAllProjects(getRunningProjects());
  };

  const projects = useMemo(() => {
    const filtered = filterProjects(allProjects, filterQuery);
    return sortProjects(filtered, sortMode);
  }, [allProjects, filterQuery, sortMode]);

  useEffect(() => {
    setSelectedIndex((index) =>
      projects.length === 0 ? 0 : Math.min(index, projects.length - 1),
    );
  }, [projects.length, filterQuery, sortMode]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, REFRESH_MS);
    return () => clearInterval(interval);
  }, []);

  const runAction = (action: () => Promise<string> | string): void => {
    void (async () => {
      try {
        const message = await action();
        setStatus(message);
        refresh();
      } catch (error: unknown) {
        const text = error instanceof Error ? error.message : String(error);
        setStatus(`error: ${text}`);
      }
    })();
  };

  useInput((input, key) => {
    if (filterMode) {
      if (key.return || key.escape) {
        setFilterMode(false);
        return;
      }
      if (key.backspace || key.delete) {
        setFilterQuery((value) => value.slice(0, -1));
        return;
      }
      if (input && input.length === 1 && !key.ctrl && !key.meta) {
        setFilterQuery((value) => value + input);
      }
      return;
    }

    if (input === "q" || (key.ctrl && input === "c")) {
      exit();
      return;
    }

    if (input === "r") {
      refresh();
      setStatus("refreshed");
      return;
    }

    if (input === "s") {
      setSortMode((mode) => {
        const next = nextSortMode(mode);
        setStatus(`sort: ${sortModeLabel(next)}`);
        return next;
      });
      return;
    }

    if (input === "f") {
      setFilterMode(true);
      setStatus("filter: type to search, enter to apply");
      return;
    }

    if (input === "/") {
      setFilterQuery("");
      setStatus("filter cleared");
      return;
    }

    if (key.upArrow || input === "k") {
      setSelectedIndex((index) => Math.max(0, index - 1));
      return;
    }

    if (key.downArrow || input === "j") {
      setSelectedIndex((index) =>
        projects.length === 0 ? 0 : Math.min(projects.length - 1, index + 1),
      );
      return;
    }

    const selected = projects[selectedIndex];
    if (!selected) {
      return;
    }

    if (input === "x") {
      runAction(() => killProject(selected));
      return;
    }

    if (input === "R") {
      runAction(() => restartProject(selected));
      return;
    }

    if (input === "m") {
      runAction(() => restartProjectMobile(selected));
      return;
    }

    if (input === "o") {
      runAction(() => openProjectInBrowser(selected));
      return;
    }

    if (input === "l") {
      setStatus(logsHint(selected));
    }
  });

  const selected = projects[selectedIndex];
  const filterLabel = filterQuery ? `filter: "${filterQuery}"` : "filter: off";
  const selectedMobileUrl = selected?.mobile
    ? mobileUrlForPort(selected.ports[0])
    : null;
  const selectedQr = selectedMobileUrl ? qrForUrl(selectedMobileUrl) : null;

  return (
    <Box flexDirection="column">
      <Text bold>runny dashboard</Text>
      <Text dimColor>
        q quit · r refresh · x kill · R restart · m mobile · o open · l logs
        · s sort · f filter · / clear
      </Text>
      <Text dimColor>
        ↑↓/jk navigate · sort: {sortModeLabel(sortMode)} · {filterLabel}
      </Text>
      <Text> </Text>
      <Text bold>
        {"  "}
        {truncate("NAME", 14)} {truncate("KIND", 11)} {"PID".padEnd(6)}{" "}
        {truncate("PORTS", 14)} {"UPTIME".padEnd(8)} STATUS
      </Text>

      {projects.length === 0 ? (
        <Text dimColor>
          no matching projects — run `runny` in a project directory
        </Text>
      ) : (
        projects.map((entry, index) => (
          <ProjectRow
            key={entry.id}
            entry={entry}
            selected={index === selectedIndex}
          />
        ))
      )}

      <Text> </Text>
      {selected ? (
        <Box flexDirection="column">
          <Text dimColor>selected: {selected.name}</Text>
          <Text dimColor>cwd: {selected.cwd}</Text>
          <Text dimColor>command: {selected.command}</Text>
          {selected.mobile ? (
            selectedMobileUrl && selectedQr ? (
              <Box flexDirection="column" marginTop={1}>
                <Text color="green">mobile: {selectedMobileUrl}</Text>
                <Text>{selectedQr}</Text>
              </Box>
            ) : (
              <Text color="yellow">
                mobile: waiting for a port and LAN address
              </Text>
            )
          ) : null}
        </Box>
      ) : null}
      {status ? <Text color="yellow">{status}</Text> : null}
      {filterMode ? (
        <Text color="magenta">filter&gt; {filterQuery}_</Text>
      ) : null}
    </Box>
  );
}
