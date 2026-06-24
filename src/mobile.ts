import { networkInterfaces } from "node:os";
import type { LaunchPlan } from "./inference.js";

export function applyMobileLaunchOptions(plan: LaunchPlan): LaunchPlan {
  if (plan.kind !== "vite") {
    return {
      ...plan,
      notices: [
        ...(plan.notices ?? []),
        "mobile mode currently only changes Vite launches",
      ],
    };
  }

  return {
    ...plan,
    command: `${plan.command} -- --host 0.0.0.0`,
    argv: [...plan.argv, "--", "--host", "0.0.0.0"],
    notices: [
      ...(plan.notices ?? []),
      "mobile mode: serving Vite on the LAN with --host 0.0.0.0",
    ],
  };
}

export function mobileUrlForPort(port: number): string | null {
  const host = getLanIpAddress();
  return host ? `http://${host}:${port}/` : null;
}

function getLanIpAddress(): string | null {
  const addresses = Object.values(networkInterfaces())
    .flatMap((interfaces) => interfaces ?? [])
    .filter(
      (address) => address.family === "IPv4" && !address.internal,
    )
    .map((address) => address.address);

  return (
    addresses.find((address) => address.startsWith("192.168.")) ??
    addresses.find((address) => address.startsWith("10.")) ??
    addresses.find((address) => {
      const [first, second] = address.split(".").map(Number);
      return first === 172 && second >= 16 && second <= 31;
    }) ??
    addresses[0] ??
    null
  );
}
