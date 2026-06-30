#!/usr/bin/env bun
import { $ } from "bun";

const usage = "Usage: bun run scripts/release.ts {patch|minor|major|<semver>}";
const arg = process.argv[2];
if (!arg) {
  console.error(usage);
  process.exit(1);
}

const pkgPath = import.meta.dir + "/../frontend/package.json";
const pkg = await Bun.file(pkgPath).json();
const [major, minor, patch] = pkg.version.split(".").map(Number);

const bumps: Record<string, [number, number, number]> = {
  major: [major + 1, 0, 0],
  minor: [major, minor + 1, 0],
  patch: [major, minor, patch + 1],
};

const next = bumps[arg] ?? arg.split(".").map(Number);
if (next.length !== 3 || next.some(isNaN)) {
  console.error(usage);
  process.exit(1);
}

const version = next.join(".");
pkg.version = version;
await Bun.write(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

$.cwd(import.meta.dir + "/..");
await $`git add frontend/package.json`;
await $`git commit -m ${"bump: v" + version}`;
await $`git tag ${"v" + version}`;
await $`git push origin ${"v" + version}`;
