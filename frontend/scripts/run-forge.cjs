const { execSync, spawnSync } = require("node:child_process");
const path = require("node:path");

const forgeCli = path.join(
  path.dirname(require.resolve("@electron-forge/cli/package.json")),
  "dist",
  "electron-forge.js",
);
const env = { ...process.env };
try {
  const npmVersion = execSync("npm --version", { encoding: "utf8" }).trim();
  env.npm_config_user_agent = `npm/${npmVersion}`;
} catch (error) {
  console.error("Electron Forge requires npm to be available for its package-manager check.");
  process.exit(error.status || 1);
}

const result = spawnSync(process.execPath, [forgeCli, ...process.argv.slice(2)], {
  stdio: "inherit",
  env,
});
process.exit(result.status ?? 1);
