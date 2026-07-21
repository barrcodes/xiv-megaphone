#!/usr/bin/env bun

type Options = {
  owner: string;
  repo: string;
  target: string;
  current: string;
  platform: "darwin" | "win32";
  arch: "x64" | "arm64" | "ia32" | "universal";
  intervalMs: number;
  timeoutMs?: number;
  once: boolean;
};

function usage(): never {
  console.error(`
Wait until update.electronjs.org advertises an Electron release.

Usage:
  bun wait-for-electron-update.ts OWNER REPO TARGET_VERSION [options]

Examples:
  bun wait-for-electron-update.ts my-org my-app 1.4.0
  bun wait-for-electron-update.ts my-org my-app 1.4.0 --current 1.3.2
  bun wait-for-electron-update.ts my-org my-app 1.4.0 --platform win32 --arch x64
  bun wait-for-electron-update.ts my-org my-app 1.4.0 --interval 15 --timeout 900
  bun wait-for-electron-update.ts my-org my-app 1.4.0 --once

Options:
  --current VERSION   Version the updater should pretend is installed.
                      Defaults to the previous patch version.
  --platform VALUE    darwin or win32. Default: current OS.
  --arch VALUE        x64, arm64, ia32, or universal. Default: current arch.
  --interval SECONDS  Poll interval. Default: 10.
  --timeout SECONDS   Stop waiting after this many seconds.
  --once              Check once instead of polling.
`);
  process.exit(2);
}

function normalizeVersion(version: string): string {
  return version.trim().replace(/^v/, "");
}

function previousPatch(version: string): string {
  const normalized = normalizeVersion(version);
  const match = normalized.match(/^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/);

  if (!match) {
    throw new Error(
      `Cannot infer the previous version from "${version}". ` +
        `Pass it explicitly with --current.`,
    );
  }

  const [, majorText, minorText, patchText] = match;
  const major = Number(majorText);
  const minor = Number(minorText);
  const patch = Number(patchText);

  if (patch > 0) return `${major}.${minor}.${patch - 1}`;
  if (minor > 0) return `${major}.${minor - 1}.0`;
  if (major > 0) return `${major - 1}.0.0`;

  return "0.0.0";
}

function parseArgs(argv: string[]): Options {
  const positional: string[] = [];
  const flags = new Map<string, string | true>();

  for (let index = 0; index < argv.length; index++) {
    const value = argv[index];

    if (!value.startsWith("--")) {
      positional.push(value);
      continue;
    }

    if (value === "--once") {
      flags.set("once", true);
      continue;
    }

    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      throw new Error(`Missing value for ${value}`);
    }

    flags.set(value.slice(2), next);
    index++;
  }

  const [owner, repo, targetInput] = positional;
  if (!owner || !repo || !targetInput) usage();

  const target = normalizeVersion(targetInput);

  const detectedPlatform =
    process.platform === "win32"
      ? "win32"
      : process.platform === "darwin"
        ? "darwin"
        : undefined;

  const platform = (flags.get("platform") ?? detectedPlatform) as
    | Options["platform"]
    | undefined;

  if (!platform || !["darwin", "win32"].includes(platform)) {
    throw new Error(
      "Electron's public update service supports darwin and win32. " +
        "Pass --platform darwin or --platform win32.",
    );
  }

  const arch = (flags.get("arch") ?? process.arch) as Options["arch"];

  if (!["x64", "arm64", "ia32", "universal"].includes(arch)) {
    throw new Error(`Unsupported architecture: ${arch}`);
  }

  const intervalSeconds = Number(flags.get("interval") ?? 60);
  const timeoutValue = flags.get("timeout");
  const timeoutSeconds =
    typeof timeoutValue === "string" ? Number(timeoutValue) : undefined;

  if (!Number.isFinite(intervalSeconds) || intervalSeconds <= 0) {
    throw new Error("--interval must be a positive number.");
  }

  if (
    timeoutSeconds !== undefined &&
    (!Number.isFinite(timeoutSeconds) || timeoutSeconds <= 0)
  ) {
    throw new Error("--timeout must be a positive number.");
  }

  const currentValue = flags.get("current");
  const current =
    typeof currentValue === "string"
      ? normalizeVersion(currentValue)
      : previousPatch(target);

  return {
    owner,
    repo,
    target,
    current,
    platform,
    arch,
    intervalMs: intervalSeconds * 1_000,
    timeoutMs:
      timeoutSeconds === undefined ? undefined : timeoutSeconds * 1_000,
    once: flags.get("once") === true,
  };
}

function extractAdvertisedVersion(
  responseBody: string,
  contentType: string | null,
): string | undefined {
  if (contentType?.includes("application/json")) {
    try {
      const data = JSON.parse(responseBody) as {
        name?: unknown;
        version?: unknown;
        url?: unknown;
      };

      for (const candidate of [data.version, data.name]) {
        if (typeof candidate === "string") {
          const match = candidate.match(
            /v?(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)/,
          );
          if (match) return normalizeVersion(match[1]);
        }
      }

      if (typeof data.url === "string") {
        const match = data.url.match(
          /(?:^|[-_/])v?(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)(?:[-_/]|$)/,
        );
        if (match) return normalizeVersion(match[1]);
      }
    } catch {
      // Fall through and inspect the raw body.
    }
  }

  const match = responseBody.match(
    /(?:^|[-_/])v?(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)(?:[-_/.\s]|$)/m,
  );

  return match ? normalizeVersion(match[1]) : undefined;
}

async function check(options: Options): Promise<boolean> {
  const endpoint =
    `https://update.electronjs.org/` +
    `${encodeURIComponent(options.owner)}/` +
    `${encodeURIComponent(options.repo)}/` +
    `${options.platform}-${options.arch}/` +
    `${encodeURIComponent(options.current)}`;

  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Checking ${endpoint}`);

  let response: Response;

  try {
    response = await fetch(endpoint, {
      headers: {
        Accept: "application/json, text/plain, */*",
        "User-Agent": `${options.owner}/${options.repo}-release-waiter`,
        // Avoid receiving a cached "no update" response while polling.
        "Cache-Control": "no-cache",
      },
      redirect: "follow",
    });
  } catch (error) {
    console.warn(
      `Request failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    return false;
  }

  if (response.status === 204) {
    console.log(
      `Not available yet: feed reports no update after ${options.current}.`,
    );
    return false;
  }

  const body = await response.text();

  if (!response.ok) {
    console.warn(
      `Feed returned HTTP ${response.status} ${response.statusText}` +
        (body ? `\n${body.slice(0, 500)}` : ""),
    );
    return false;
  }

  const advertisedVersion = extractAdvertisedVersion(
    body,
    response.headers.get("content-type"),
  );

  if (!advertisedVersion) {
    console.warn(
      "Feed returned an update, but its version could not be parsed.",
    );
    console.warn(body.slice(0, 1_000));
    return false;
  }

  console.log(`Feed advertises version ${advertisedVersion}.`);

  if (advertisedVersion === options.target) {
    console.log(`✅ Electron update ${options.target} is available.`);
    return true;
  }

  console.log(
    `Waiting for ${options.target}; feed currently advertises ${advertisedVersion}.`,
  );

  return false;
}

async function main(): Promise<void> {
  let options: Options;

  try {
    options = parseArgs(Bun.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(2);
  }

  console.log(
    `Waiting for ${options.owner}/${options.repo} ${options.target} ` +
      `on ${options.platform}-${options.arch}, checking from ${options.current}.`,
  );

  const startedAt = Date.now();

  while (true) {
    if (await check(options)) {
      process.exit(0);
    }

    if (options.once) {
      process.exit(1);
    }

    if (
      options.timeoutMs !== undefined &&
      Date.now() - startedAt >= options.timeoutMs
    ) {
      console.error(`❌ Timed out waiting for version ${options.target}.`);
      process.exit(1);
    }

    await Bun.sleep(options.intervalMs);
  }
}

await main();
