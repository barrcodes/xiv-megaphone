const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const asar = require("@electron/asar");
const { FuseV1Options, getCurrentFuseWire } = require("@electron/fuses");
const {
  APPIMAGE_NAME,
  verifyLinuxAppImage,
  verifyLinuxUpdateConfig,
  verifyGeneratedAssetReferences,
  verifyPackagedVersion,
  verifySquirrelAssets,
} = require("./package-verification.cjs");

const mode = process.argv[2];
const root = process.argv[3] ? path.resolve(process.argv[3]) : path.resolve(".");
const expectedFuses = {
  [FuseV1Options.RunAsNode]: 48,
  [FuseV1Options.EnableCookieEncryption]: 49,
  [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: 48,
  [FuseV1Options.EnableNodeCliInspectArguments]: 48,
  [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: 49,
  [FuseV1Options.OnlyLoadAppFromAsar]: 49,
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function findApp(rootPath) {
  const candidates =
    mode === "win"
      ? [
          path.join(rootPath, "out", "xiv-megaphone-win32-x64"),
          path.join(rootPath, "xiv-megaphone-win32-x64"),
        ]
      : [
          path.join(rootPath, "dist", "linux", "linux-unpacked"),
          path.join(rootPath, "linux-unpacked"),
          rootPath,
        ];
  return candidates.find((candidate) =>
    fs.existsSync(path.join(candidate, "resources", "app.asar")),
  );
}

function findAppResources(directory) {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  if (entries.some((entry) => entry.isFile() && entry.name === "app.asar")) return directory;
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name === "node_modules") continue;
    const found = findAppResources(path.join(directory, entry.name));
    if (found) return found;
  }
  return null;
}

async function verifyAssembledApp(resourcesDir, mode, sourceVersion) {
  const archive = path.join(resourcesDir, "app.asar");
  assert(fs.existsSync(archive), `Missing assembled app archive ${archive}`);
  const entries = new Set(
    asar.listPackage(archive, { isPack: false }).map((entry) => entry.replaceAll("\\", "/")),
  );
  for (const required of [
    "/build/main/index.js",
    "/build/preload/index.js",
    "/build/renderer/index.html",
    "/package.json",
  ]) {
    assert(entries.has(required), `app.asar is missing ${required}`);
  }
  for (const runtimeDependency of [
    "/node_modules/ws/package.json",
    "/node_modules/electron-updater/package.json",
    "/node_modules/update-electron-app/package.json",
  ]) {
    assert(
      entries.has(runtimeDependency),
      `app.asar is missing external runtime dependency ${runtimeDependency}`,
    );
  }
  const packageJson = JSON.parse(asar.extractFile(archive, "package.json").toString("utf8"));
  assert(
    packageJson.main === "./build/main/index.js",
    `Unexpected packaged main entry: ${packageJson.main}`,
  );
  assert(packageJson.version, "Packaged application version is missing");
  verifyPackagedVersion(packageJson.version, sourceVersion);
  verifyGeneratedAssetReferences(
    asar.extractFile(archive, path.join("build", "main", "index.js")).toString("utf8"),
    asar.extractFile(archive, path.join("build", "renderer", "index.html")).toString("utf8"),
    (entry) => entries.has(entry),
  );
  const requiredResources =
    mode === "linux"
      ? ["icon-wake-256.png", "icon-sleep-256.png"]
      : ["connected.ico", "disconnected.ico"];
  for (const resource of requiredResources) {
    assert(
      fs.existsSync(path.join(resourcesDir, resource)),
      `Missing direct app resource ${resource} next to app.asar`,
    );
  }

  const appDir = path.dirname(resourcesDir);
  const executable = path.join(appDir, mode === "win" ? "xiv-megaphone.exe" : "xiv-megaphone");
  assert(fs.existsSync(executable), `Missing ${mode} application executable ${executable}`);
  const executableData = fs.readFileSync(executable);
  const architecture =
    mode === "win"
      ? executableData.readUInt16LE(executableData.readUInt32LE(0x3c) + 4) === 0x8664
      : executableData.subarray(0, 4).toString("hex") === "7f454c46" &&
        executableData.readUInt16LE(18) === 62;
  assert(architecture, `Packaged executable is not x64 ${mode === "win" ? "PE" : "ELF"}`);
  const fuseWire = await getCurrentFuseWire(executable);
  for (const [fuse, expected] of Object.entries(expectedFuses)) {
    assert(fuseWire[fuse] === expected, `Unexpected Electron fuse ${fuse}: ${fuseWire[fuse]}`);
  }
  return packageJson;
}

function verifyLinuxUnpackedMetadata(rootPath, version) {
  const metadataPath = path.join(rootPath, "dist", "linux", "latest-linux.yml");
  assert(fs.existsSync(metadataPath), `Missing electron-updater metadata ${metadataPath}`);
  const image = path.join(rootPath, "dist", "linux", APPIMAGE_NAME);
  const metadata = verifyLinuxAppImage(fs.readFileSync(metadataPath, "utf8"), version, image);
  const updateConfigPath = path.join(
    rootPath,
    "dist",
    "linux",
    "linux-unpacked",
    "resources",
    "app-update.yml",
  );
  assert(fs.existsSync(updateConfigPath), `Missing app-update.yml ${updateConfigPath}`);
  verifyLinuxUpdateConfig(fs.readFileSync(updateConfigPath, "utf8"));
  return metadata;
}

function extractAppImage(imagePath) {
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "xiv-megaphone-appimage-"));
  const result = spawnSync(imagePath, ["--appimage-extract"], {
    cwd: temporaryDirectory,
    encoding: "utf8",
    timeout: 180_000,
    maxBuffer: 10 * 1024 * 1024,
  });
  assert(
    result.status === 0,
    `AppImage extraction failed (${result.status}): ${result.stderr || result.stdout || result.error}`,
  );
  const extractedRoot = path.join(temporaryDirectory, "squashfs-root");
  assert(fs.existsSync(extractedRoot), "AppImage extraction did not produce squashfs-root");
  return { temporaryDirectory, extractedRoot };
}

async function verifySquirrel(rootPath, version) {
  verifySquirrelAssets(path.join(rootPath, "out", "make", "squirrel.windows", "x64"), version);
}

async function main() {
  assert(
    mode === "win" || mode === "linux",
    "Usage: node scripts/verify-package.cjs <win|linux> [output-root]",
  );
  const appDir = findApp(root);
  assert(appDir, `Could not locate the unpacked ${mode} application`);
  const sourcePackage = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  const packageJson = await verifyAssembledApp(
    path.join(appDir, "resources"),
    mode,
    sourcePackage.version,
  );

  if (mode === "win") {
    await verifySquirrel(root, packageJson.version);
  } else {
    const metadata = verifyLinuxUnpackedMetadata(root, packageJson.version);
    const imagePath = path.join(root, "dist", "linux", metadata.filename);
    const { temporaryDirectory, extractedRoot } = extractAppImage(imagePath);
    try {
      const resourcesDir = findAppResources(extractedRoot);
      assert(resourcesDir, "Extracted AppImage does not contain resources/app.asar");
      const extractedPackage = await verifyAssembledApp(
        resourcesDir,
        "linux",
        sourcePackage.version,
      );
      assert(
        extractedPackage.version === packageJson.version,
        "The AppImage embedded application version differs from linux-unpacked",
      );
      const configPath = path.join(resourcesDir, "app-update.yml");
      assert(fs.existsSync(configPath), "Extracted AppImage is missing resources/app-update.yml");
      verifyLinuxUpdateConfig(fs.readFileSync(configPath, "utf8"));
    } finally {
      fs.rmSync(temporaryDirectory, { recursive: true, force: true });
    }
  }
  console.log(`Verified ${mode} package ${packageJson.version} at ${appDir}`);
}

main().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
