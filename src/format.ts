export function formatUptime(startedAt: string): string {
  const started = Date.parse(startedAt);
  if (Number.isNaN(started)) {
    return "unknown";
  }

  const seconds = Math.max(0, Math.floor((Date.now() - started) / 1000));
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}
