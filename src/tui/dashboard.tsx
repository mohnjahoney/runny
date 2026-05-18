import React, { useEffect, useState } from "react";
import { Box, Text, useApp, useInput } from "ink";
import { formatUptime } from "../format.js";
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

  return (
    <Text color={selected ? "cyan" : undefined}>
      {marker} {truncate(entry.name, 14)} {truncate(entry.kind, 11)}{" "}
      {String(entry.pid).padEnd(6)} {truncate(ports, 14)}{" "}
      {formatUptime(entry.startedAt).padEnd(8)} running
    </Text>
  );
}

export function Dashboard(): React.ReactElement {
  const { exit } = useApp();
  const [projects, setProjects] = useState<RegistryEntry[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [tick, setTick] = useState(0);

  const refresh = (): void => {
    const running = getRunningProjects();
    setProjects(running);
    setSelectedIndex((index) =>
      running.length === 0 ? 0 : Math.min(index, running.length - 1),
    );
    setTick((value) => value + 1);
  };

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, REFRESH_MS);

    return () => clearInterval(interval);
  }, []);

  useInput((input, key) => {
    if (input === "q" || (key.ctrl && input === "c")) {
      exit();
      return;
    }

    if (input === "r") {
      refresh();
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
    }
  });

  const selected = projects[selectedIndex];

  return (
    <Box flexDirection="column">
      <Text bold>runny dashboard</Text>
      <Text dimColor>q quit · r refresh · ↑↓/jk navigate · auto-refresh {REFRESH_MS / 1000}s</Text>
      <Text> </Text>
      <Text bold>
        {"  "}
        {truncate("NAME", 14)} {truncate("KIND", 11)} {"PID".padEnd(6)}{" "}
        {truncate("PORTS", 14)} {"UPTIME".padEnd(8)} STATUS
      </Text>

      {projects.length === 0 ? (
        <Text dimColor>no active projects — run `runny` in a project directory</Text>
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
        </Box>
      ) : (
        <Text dimColor>tick: {tick}</Text>
      )}
    </Box>
  );
}
