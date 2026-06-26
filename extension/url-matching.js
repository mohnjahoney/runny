const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

function parsedUrl(value) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function effectivePort(url) {
  if (url.port) return url.port;
  if (url.protocol === "http:") return "80";
  if (url.protocol === "https:") return "443";
  return "";
}

function isLoopbackHost(hostname) {
  return (
    LOOPBACK_HOSTS.has(hostname) ||
    hostname.endsWith(".localhost") ||
    hostname.startsWith("127.")
  );
}

export function sameProjectTarget(candidateValue, expectedValue) {
  const candidate = parsedUrl(candidateValue);
  const expected = parsedUrl(expectedValue);
  if (!candidate || !expected) return false;

  if (candidate.origin === expected.origin) return true;

  return (
    candidate.protocol === expected.protocol &&
    effectivePort(candidate) === effectivePort(expected) &&
    isLoopbackHost(candidate.hostname) &&
    isLoopbackHost(expected.hostname)
  );
}
