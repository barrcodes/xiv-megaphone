const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const YAML = require("yaml");

const APPIMAGE_NAME = "xiv-megaphone-linux-x64.AppImage";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function verifyPackagedVersion(packagedVersion, sourceVersion) {
  assert(
    packagedVersion === sourceVersion,
    `Packaged app version ${packagedVersion} does not match frontend/package.json version ${sourceVersion}`,
  );
}

function verifyGeneratedAssetReferences(mainEntry, rendererHtml, hasArchiveEntry) {
  const mainChunks = [...mainEntry.matchAll(/["'](?:\.\/)?chunks\/([^"']+)["']/g)].map(
    (match) => match[1],
  );
  assert(mainChunks.length > 0, "Main entry has no generated chunk or asset references");
  for (const chunk of mainChunks) {
    assert(
      hasArchiveEntry(`/build/main/chunks/${chunk}`),
      `Main entry references missing generated file build/main/chunks/${chunk}`,
    );
  }

  const rendererAssets = [...rendererHtml.matchAll(/\b(?:src|href)=["']([^"']+)["']/g)]
    .map((match) => match[1].split(/[?#]/, 1)[0])
    .filter((reference) => /\.(?:js|css)$/i.test(reference));
  assert(
    rendererAssets.some((reference) => /\.js$/i.test(reference)),
    "Renderer HTML does not reference a generated JavaScript asset",
  );
  assert(
    rendererAssets.some((reference) => /\.css$/i.test(reference)),
    "Renderer HTML does not reference a generated CSS asset",
  );
  for (const reference of rendererAssets) {
    const relativePath = reference.replace(/^\.\//, "");
    const archivePath = path.posix.normalize(`/build/renderer/${relativePath}`);
    assert(
      archivePath.startsWith("/build/renderer/assets/") && hasArchiveEntry(archivePath),
      `Renderer HTML references missing generated asset ${reference}`,
    );
  }
}

function parseLinuxUpdateMetadata(text, expectedVersion) {
  const metadata = YAML.parse(text);
  assert(metadata && typeof metadata === "object", "Linux update metadata must be a YAML mapping");
  assert(
    metadata.version === expectedVersion,
    `Linux metadata version must equal ${expectedVersion}`,
  );
  assert(Array.isArray(metadata.files), "Linux update metadata is missing its files array");
  const appImages = metadata.files.filter((file) => String(file?.url ?? "").endsWith(".AppImage"));
  assert(appImages.length === 1, "Linux update metadata must describe exactly one AppImage");
  const image = appImages[0];
  assert(image.url === APPIMAGE_NAME, `Unexpected AppImage URL: ${image.url}`);
  assert(metadata.path === APPIMAGE_NAME, `Linux metadata path must equal ${APPIMAGE_NAME}`);
  assert(
    typeof image.sha512 === "string" && image.sha512.length > 0,
    "AppImage metadata is missing sha512",
  );
  assert(metadata.sha512 === image.sha512, "Top-level and file AppImage SHA-512 values differ");
  assert(
    Number.isSafeInteger(image.size) && image.size > 0,
    "AppImage metadata has an invalid size",
  );
  return { version: metadata.version, filename: image.url, sha512: image.sha512, size: image.size };
}

function verifyLinuxAppImage(metadataText, expectedVersion, appImagePath) {
  const metadata = parseLinuxUpdateMetadata(metadataText, expectedVersion);
  assert(fs.existsSync(appImagePath), `Missing AppImage ${appImagePath}`);
  const data = fs.readFileSync(appImagePath);
  assert(data.length === metadata.size, "AppImage size does not match latest-linux.yml");
  const sha512 = crypto.createHash("sha512").update(data).digest("base64");
  assert(sha512 === metadata.sha512, "AppImage SHA-512 does not match latest-linux.yml");
  return metadata;
}

function verifySquirrelAssets(directory, expectedVersion) {
  const releasesPath = path.join(directory, "RELEASES");
  assert(fs.existsSync(releasesPath), `Missing Squirrel RELEASES: ${releasesPath}`);
  const lines = fs.readFileSync(releasesPath, "utf8").trim().split(/\r?\n/).filter(Boolean);
  assert(lines.length > 0, "Squirrel RELEASES has no package entries");
  const expectedPackage = `xiv-megaphone-${expectedVersion}-full.nupkg`;
  const referencedFiles = new Set();
  for (const line of lines) {
    const match = line.match(/^([0-9a-f]{40})\s+(\S+)\s+(\d+)$/i);
    assert(match, `Invalid Squirrel RELEASES line: ${line}`);
    const [, expectedSha1, filename, expectedSize] = match;
    assert(!referencedFiles.has(filename), `Duplicate Squirrel RELEASES entry: ${filename}`);
    referencedFiles.add(filename);
    const filePath = path.join(directory, filename);
    assert(fs.existsSync(filePath), `RELEASES references missing file ${filename}`);
    const content = fs.readFileSync(filePath);
    assert(
      content.length === Number(expectedSize),
      `Squirrel package size mismatch for ${filename}`,
    );
    const sha1 = crypto.createHash("sha1").update(content).digest("hex");
    assert(sha1 === expectedSha1.toLowerCase(), `Squirrel SHA-1 mismatch for ${filename}`);
  }
  assert(
    referencedFiles.has(expectedPackage),
    `RELEASES is missing exact package ${expectedPackage}`,
  );
  const setup = `xiv-megaphone-${expectedVersion} Setup.exe`;
  assert(fs.existsSync(path.join(directory, setup)), `Missing Squirrel setup executable ${setup}`);
  return { setup, releases: releasesPath, package: expectedPackage };
}

function verifyLinuxUpdateConfig(text) {
  const config = YAML.parse(text);
  assert(
    config?.provider === "github" &&
      config.owner === "barrcodes" &&
      config.repo === "xiv-megaphone",
    "Linux app-update.yml is not configured for barrcodes/xiv-megaphone GitHub releases",
  );
}

module.exports = {
  APPIMAGE_NAME,
  parseLinuxUpdateMetadata,
  verifyGeneratedAssetReferences,
  verifyLinuxAppImage,
  verifyLinuxUpdateConfig,
  verifyPackagedVersion,
  verifySquirrelAssets,
};
