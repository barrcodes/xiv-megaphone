export type LinuxUpdaterState = "idle" | "checking" | "available" | "downloading" | "downloaded";
export type LinuxUpdaterEvent =
  | "check"
  | "checking"
  | "available"
  | "download"
  | "defer"
  | "not-available"
  | "downloaded"
  | "error"
  | "install-error";

export type DeepLinkChannel = "authCallback" | "checkoutComplete";

export class DeepLinkQueue {
  private readonly ready = new Set<DeepLinkChannel>();
  private readonly pending = new Map<DeepLinkChannel, unknown[]>();
  private authenticated: boolean | null = null;

  enqueue(channel: DeepLinkChannel, payload: unknown): unknown[] {
    if (channel === "authCallback" && this.authenticated === true) return [];
    if (channel === "authCallback" && this.authenticated === null) {
      this.queue(channel, payload);
      return [];
    }
    if (this.ready.has(channel)) return [payload];
    this.queue(channel, payload);
    return [];
  }

  private queue(channel: DeepLinkChannel, payload: unknown) {
    const queued = this.pending.get(channel) ?? [];
    queued.push(payload);
    this.pending.set(channel, queued);
  }

  setAuthenticated(authenticated: boolean): unknown[] {
    // Keep cold-start callbacks until the initial session is known, but never
    // carry authentication payloads into or out of an established session.
    if (authenticated || this.authenticated === true) this.pending.delete("authCallback");
    this.authenticated = authenticated;
    return !authenticated && this.ready.has("authCallback")
      ? this.setReady("authCallback", true)
      : [];
  }

  setReady(channel: DeepLinkChannel, isReady: boolean): unknown[] {
    if (!isReady) {
      this.ready.delete(channel);
      return [];
    }
    this.ready.add(channel);
    if (channel === "authCallback" && this.authenticated !== false) return [];
    const queued = this.pending.get(channel) ?? [];
    this.pending.delete(channel);
    return queued;
  }

  resetForReload() {
    this.ready.clear();
  }
}

export class AsyncDialogGate {
  private active = false;

  async show<T>(showDialog: () => Promise<T>): Promise<T | undefined> {
    if (this.active) return undefined;
    this.active = true;
    try {
      return await showDialog();
    } finally {
      this.active = false;
    }
  }
}

export function installAfterReleasingSingleInstanceLock(
  releaseLock: () => void,
  install: () => void,
  onInstallError: (error: unknown) => void,
): boolean {
  releaseLock();
  try {
    install();
    return true;
  } catch (error) {
    onInstallError(error);
    return false;
  }
}

export function reacquireSingleInstanceLock(
  requestLock: () => boolean,
  onReacquired: () => void,
  onUnavailable: () => void,
): boolean {
  if (requestLock()) {
    onReacquired();
    return true;
  }
  onUnavailable();
  return false;
}

export function transitionLinuxUpdaterState(
  state: LinuxUpdaterState,
  event: LinuxUpdaterEvent,
): LinuxUpdaterState {
  switch (event) {
    case "check":
    case "checking":
      return state === "idle" ? "checking" : state;
    case "available":
      return state === "checking" ? "available" : state;
    case "download":
      return state === "available" ? "downloading" : state;
    case "defer":
    case "not-available":
      return state === "checking" || state === "available" ? "idle" : state;
    case "downloaded":
      return state === "downloading" ? "downloaded" : state;
    case "error":
      return state === "checking" || state === "downloading" || state === "available"
        ? "idle"
        : state;
    case "install-error":
      return state === "downloaded" ? "downloaded" : state;
  }
}
