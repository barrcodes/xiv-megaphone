const fs = require("node:fs");
const path = require("node:path");
const {
  APPIMAGE_NAME,
  verifyLinuxAppImage,
  verifySquirrelAssets,
} = require("./package-verification.cjs");

const directory = process.argv[2] ? path.resolve(process.argv[2]) : null;
const version = process.argv[3];

try {
  if (!directory || !version)
    throw new Error("Usage: node scripts/verify-release-assets.cjs <assets-dir> <version>");
  verifySquirrelAssets(directory, version);
  const metadataPath = path.join(directory, "latest-linux.yml");
  const imagePath = path.join(directory, APPIMAGE_NAME);
  if (!fs.existsSync(metadataPath)) throw new Error(`Missing release asset ${metadataPath}`);
  const metadata = verifyLinuxAppImage(fs.readFileSync(metadataPath, "utf8"), version, imagePath);
  console.log(
    `Verified release assets for ${version}: ${metadata.filename}, Squirrel Setup/RELEASES/nupkg`,
  );
} catch (error) {
  console.error(error.stack || error);
  process.exitCode = 1;
}
