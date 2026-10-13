const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { after, test } = require("node:test");
const {
  APPIMAGE_NAME,
  parseLinuxUpdateMetadata,
  verifyGeneratedAssetReferences,
  verifyLinuxAppImage,
  verifyPackagedVersion,
  verifySquirrelAssets,
} = require("./package-verification.cjs");

const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "xiv-megaphone-validation-test-"));
after(() => fs.rmSync(temporaryDirectory, { recursive: true, force: true }));

function metadataFor(version, filename = APPIMAGE_NAME, data = Buffer.from("image")) {
  const sha512 = crypto.createHash("sha512").update(data).digest("base64");
  return {
    text: [
      `version: ${version}`,
      "files:",
      `  - url: ${filename}`,
      `    sha512: ${sha512}`,
      `    size: ${data.length}`,
      `path: ${filename}`,
      `sha512: ${sha512}`,
      "",
    ].join("\n"),
    data,
    sha512,
  };
}

test("accepts exact Linux version, URL, path, size, and SHA-512 metadata", () => {
  const valid = metadataFor("2.0.0");
  assert.deepEqual(parseLinuxUpdateMetadata(valid.text, "2.0.0"), {
    version: "2.0.0",
    filename: APPIMAGE_NAME,
    sha512: valid.sha512,
    size: valid.data.length,
  });
  const image = path.join(temporaryDirectory, APPIMAGE_NAME);
  fs.writeFileSync(image, valid.data);
  assert.equal(verifyLinuxAppImage(valid.text, "2.0.0", image).filename, APPIMAGE_NAME);
});

test("rejects a metadata version mismatch", () => {
  const valid = metadataFor("2.0.0");
  assert.throws(() => parseLinuxUpdateMetadata(valid.text, "2.0.1"), /version must equal/);
});

test("rejects an unexpected AppImage URL or metadata path", () => {
  const wrongUrl = metadataFor("2.0.0", "other-linux-x64.AppImage");
  assert.throws(() => parseLinuxUpdateMetadata(wrongUrl.text, "2.0.0"), /Unexpected AppImage URL/);
  const valid = metadataFor("2.0.0");
  assert.throws(
    () =>
      parseLinuxUpdateMetadata(
        valid.text.replace(`path: ${APPIMAGE_NAME}`, "path: other.AppImage"),
        "2.0.0",
      ),
    /metadata path must equal/,
  );
});

test("rejects an AppImage with a corrupted digest or size", () => {
  const valid = metadataFor("2.0.0");
  const image = path.join(temporaryDirectory, "corrupted.AppImage");
  fs.writeFileSync(image, Buffer.from("tampered"));
  assert.throws(() => verifyLinuxAppImage(valid.text, "2.0.0", image), /size does not match/);
  fs.writeFileSync(image, Buffer.from("image"));
  const corruptedDigest = valid.text.replaceAll(
    valid.sha512,
    Buffer.alloc(64, 7).toString("base64"),
  );
  assert.throws(
    () => verifyLinuxAppImage(corruptedDigest, "2.0.0", image),
    /AppImage SHA-512 does not match/,
  );
});

test("validates Squirrel SHA-1, size, local and GitHub Setup names, and full package version", () => {
  const directory = path.join(temporaryDirectory, "squirrel");
  fs.mkdirSync(directory, { recursive: true });
  const packageName = "xiv-megaphone-2.0.0-full.nupkg";
  const packageData = Buffer.from("nupkg fixture");
  fs.writeFileSync(path.join(directory, packageName), packageData);
  fs.writeFileSync(path.join(directory, "xiv-megaphone-2.0.0 Setup.exe"), "setup");
  const sha1 = crypto.createHash("sha1").update(packageData).digest("hex");
  fs.writeFileSync(
    path.join(directory, "RELEASES"),
    `${sha1} ${packageName} ${packageData.length}\n`,
  );
  assert.equal(verifySquirrelAssets(directory, "2.0.0").package, packageName);
  fs.rmSync(path.join(directory, "xiv-megaphone-2.0.0 Setup.exe"));
  fs.writeFileSync(path.join(directory, "xiv-megaphone-2.0.0.Setup.exe"), "setup");
  assert.equal(verifySquirrelAssets(directory, "2.0.0").package, packageName);
  assert.throws(() => verifySquirrelAssets(directory, "2.0.00"), /missing exact package/);
  fs.writeFileSync(path.join(directory, packageName), "corrupted");
  assert.throws(() => verifySquirrelAssets(directory, "2.0.0"), /size mismatch/);
});

test("requires generated main chunks and renderer JavaScript/CSS references in ASAR", () => {
  const mainEntry = 'require("./chunks/main-abc.js"); path.join(__dirname, "./chunks/icon.png");';
  const rendererHtml =
    '<script type="module" src="./assets/renderer-abc.js"></script><link href="./assets/renderer-abc.css">';
  const entries = new Set([
    "/build/main/chunks/main-abc.js",
    "/build/main/chunks/icon.png",
    "/build/renderer/assets/renderer-abc.js",
    "/build/renderer/assets/renderer-abc.css",
  ]);
  assert.doesNotThrow(() =>
    verifyGeneratedAssetReferences(mainEntry, rendererHtml, (item) => entries.has(item)),
  );
  assert.throws(
    () =>
      verifyGeneratedAssetReferences(
        mainEntry,
        rendererHtml,
        (item) => item !== "/build/main/chunks/icon.png" && entries.has(item),
      ),
    /missing generated file build\/main\/chunks\/icon\.png/,
  );
  assert.throws(
    () =>
      verifyGeneratedAssetReferences(
        mainEntry,
        rendererHtml,
        (item) => item !== "/build/renderer/assets/renderer-abc.css" && entries.has(item),
      ),
    /missing generated asset \.\/assets\/renderer-abc\.css/,
  );
});

test("rejects packaged app versions that differ from the source manifest", () => {
  assert.doesNotThrow(() => verifyPackagedVersion("2.0.0", "2.0.0"));
  assert.throws(
    () => verifyPackagedVersion("1.9.9", "2.0.0"),
    /does not match frontend\/package.json/,
  );
});
