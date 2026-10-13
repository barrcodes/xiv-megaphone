import { app, dialog } from "electron";
import {
  AsyncDialogGate,
  installAfterReleasingSingleInstanceLock,
  type LinuxUpdaterState,
  reacquireSingleInstanceLock,
  transitionLinuxUpdaterState,
} from "./linux-updater-state";

export interface LinuxUpdaterController {
  isDownloaded(): boolean;
  restart(): Promise<void>;
  beforeQuitForUpdate(): void;
  stop(): void;
}

interface LinuxUpdaterOptions {
  ownsSingleInstanceLock: () => boolean;
  setOwnsSingleInstanceLock: (ownsLock: boolean) => void;
  setQuitting: (quitting: boolean) => void;
  refreshUpdateActions: () => void;
  translate: (key: string) => string;
}

export async function initializeLinuxUpdater(
  options: LinuxUpdaterOptions,
): Promise<LinuxUpdaterController | null> {
  if (process.platform !== "linux" || !app.isPackaged || !process.env.APPIMAGE) return null;

  const { autoUpdater } = await import("electron-updater");
  const dialogGate = new AsyncDialogGate();
  const listeners: Array<() => void> = [];
  let state: LinuxUpdaterState = "idle";
  let timer: NodeJS.Timeout | undefined;
  let installInProgress = false;
  let installLockReleased = false;
  const currentState = () => state;

  const updateState = (event: Parameters<typeof transitionLinuxUpdaterState>[1]) => {
    state = transitionLinuxUpdaterState(state, event);
    options.refreshUpdateActions();
  };
  const showDialog = (message: Electron.MessageBoxOptions) =>
    dialogGate.show(() => dialog.showMessageBox(message));
  const listen = <E extends Parameters<typeof autoUpdater.on>[0]>(
    event: E,
    listener: Parameters<typeof autoUpdater.on<E>>[1],
  ) => {
    autoUpdater.on(event, listener);
    listeners.push(() => autoUpdater.removeListener(event, listener));
  };

  async function restoreAfterInstallError(error: unknown) {
    if (!installLockReleased) return;
    installLockReleased = false;
    installInProgress = false;
    const ownsLock = reacquireSingleInstanceLock(
      () => app.requestSingleInstanceLock(),
      () => {
        options.setOwnsSingleInstanceLock(true);
        options.setQuitting(false);
      },
      () => {
        options.setOwnsSingleInstanceLock(false);
        options.setQuitting(true);
        app.quit();
      },
    );
    if (!ownsLock) return;
    updateState("install-error");
    console.error("Linux update installation failed", error);
    try {
      await showDialog({
        type: "error",
        title: options.translate("settings.updateErrorTitle"),
        message: options.translate("settings.updateInstallError"),
      });
    } catch (dialogError) {
      console.error("Could not show update installation error dialog", dialogError);
    }
  }

  async function restart() {
    if (state !== "downloaded" || installInProgress || !options.ownsSingleInstanceLock()) return;
    installInProgress = true;
    try {
      // AppImageUpdater starts the replacement before electron-updater schedules app.quit().
      installAfterReleasingSingleInstanceLock(
        () => {
          app.releaseSingleInstanceLock();
          installLockReleased = true;
          options.setOwnsSingleInstanceLock(false);
          options.setQuitting(true);
        },
        () => autoUpdater.quitAndInstall(false, true),
        (error) => void restoreAfterInstallError(error),
      );
    } catch (error) {
      await restoreAfterInstallError(error);
    }
  }

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;

  listen("checking-for-update", () => updateState("checking"));
  listen("update-available", () => {
    if (state !== "checking") return;
    updateState("available");
    void (async () => {
      try {
        const result = await showDialog({
          type: "info",
          title: options.translate("settings.updateAvailableTitle"),
          message: options.translate("settings.updateAvailableMessage"),
          buttons: [
            options.translate("settings.downloadUpdate"),
            options.translate("settings.later"),
          ],
          defaultId: 0,
          cancelId: 1,
        });
        if (currentState() !== "available") return;
        if (result?.response !== 0) {
          updateState("defer");
          return;
        }
        updateState("download");
        await autoUpdater.downloadUpdate();
      } catch (error) {
        const wasDownloading = currentState() === "downloading";
        updateState("error");
        console.error("Linux update download failed", error);
        if (wasDownloading) {
          try {
            await showDialog({
              type: "error",
              title: options.translate("settings.updateErrorTitle"),
              message: options.translate("settings.updateDownloadError"),
            });
          } catch (dialogError) {
            console.error("Could not show update download error dialog", dialogError);
          }
        }
      }
    })();
  });
  listen("update-not-available", () => updateState("not-available"));
  listen("update-downloaded", () => {
    updateState("downloaded");
    void (async () => {
      try {
        const result = await showDialog({
          type: "info",
          title: options.translate("settings.updateReadyTitle"),
          message: options.translate("settings.updateReadyMessage"),
          buttons: [
            options.translate("settings.restartToUpdate"),
            options.translate("common.close"),
          ],
          defaultId: 0,
          cancelId: 1,
        });
        if (result?.response === 0) await restart();
      } catch (error) {
        console.error("Could not show downloaded update dialog", error);
      }
    })();
  });
  listen("error", (error) => {
    if (installLockReleased) {
      void restoreAfterInstallError(error);
      return;
    }
    const wasDownloading = currentState() === "downloading";
    updateState("error");
    console.error("Linux update check failed", error);
    if (wasDownloading) {
      void showDialog({
        type: "error",
        title: options.translate("settings.updateErrorTitle"),
        message: options.translate("settings.updateDownloadError"),
      }).catch((dialogError) => console.error("Could not show update error dialog", dialogError));
    }
  });

  const checkForUpdates = () => {
    if (state !== "idle") return;
    updateState("check");
    void autoUpdater.checkForUpdates().catch((error) => {
      updateState("error");
      console.error("Linux update check failed", error);
    });
  };
  options.refreshUpdateActions();
  checkForUpdates();
  timer = setInterval(checkForUpdates, 6 * 60 * 60 * 1000);

  return {
    isDownloaded: () => state === "downloaded",
    restart,
    beforeQuitForUpdate() {
      if (installLockReleased) {
        installLockReleased = false;
        installInProgress = false;
      }
    },
    stop() {
      if (timer) clearInterval(timer);
      for (const removeListener of listeners) removeListener();
    },
  };
}
