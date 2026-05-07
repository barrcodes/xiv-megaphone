const { FusesPlugin } = require("@electron-forge/plugin-fuses");
const { FuseV1Options, FuseVersion } = require("@electron/fuses");
const path = require("node:path");

module.exports = {
  packagerConfig: {
    asar: true,
    icon: path.resolve(__dirname, "resources/app.ico"),
    extraResource: ["resources/connected.ico", "resources/disconnected.ico"],
    ignore: (path) => {
      // Don't ignore empty path (root)
      if (!path) return false;
      // Keep build output, package.json, and node_modules
      if (path.startsWith("/build")) return false;
      if (path === "/package.json") return false;
      if (path.startsWith("/node_modules")) return false;
      // Ignore everything else (src, config files, etc.)
      return true;
    },
  },
  rebuildConfig: {},
  makers: [
    {
      name: "@electron-forge/maker-squirrel",
      config: {
        name: "xiv-megaphone",
        setupIcon: path.resolve(__dirname, "resources/app.ico"),
      },
    },
    {
      name: "@electron-forge/maker-zip",
      platforms: ["darwin"],
    },
    {
      name: "@electron-forge/maker-deb",
      config: {},
    },
    {
      name: "@electron-forge/maker-rpm",
      config: {},
    },
  ],
  publishers: [
    {
      name: "@electron-forge/publisher-github",
      config: {
        repository: {
          owner: "barrcodes",
          name: "xiv-megaphone",
        },
      },
    },
  ],
  plugins: [
    {
      name: "@electron-forge/plugin-auto-unpack-natives",
      config: {},
    },
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};
