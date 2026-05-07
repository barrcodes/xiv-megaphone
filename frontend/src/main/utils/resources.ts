import { join } from "node:path";
import { app, nativeImage } from "electron";

export function getResource(resourceName: string): string {
  return app.isPackaged
    ? join(process.resourcesPath, resourceName)
    : join(__dirname, "..", "..", "resources", resourceName);
}

export function getNativeImage(resourceName: string) {
  return nativeImage.createFromPath(getResource(resourceName));
}