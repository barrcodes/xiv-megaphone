import { describe, expect, it } from "vitest";
import {
  AsyncDialogGate,
  DeepLinkQueue,
  installAfterReleasingSingleInstanceLock,
  reacquireSingleInstanceLock,
  transitionLinuxUpdaterState,
} from "./linux-updater-state";

describe("Linux updater state transitions", () => {
  it("allows only one in-flight check or download", () => {
    expect(transitionLinuxUpdaterState("idle", "check")).toBe("checking");
    expect(transitionLinuxUpdaterState("checking", "check")).toBe("checking");
    expect(transitionLinuxUpdaterState("downloading", "check")).toBe("downloading");
  });

  it("requires explicit consent before downloading and a completed download before install", () => {
    expect(transitionLinuxUpdaterState("checking", "available")).toBe("available");
    expect(transitionLinuxUpdaterState("available", "download")).toBe("downloading");
    expect(transitionLinuxUpdaterState("checking", "downloaded")).toBe("checking");
    expect(transitionLinuxUpdaterState("downloading", "downloaded")).toBe("downloaded");
    expect(transitionLinuxUpdaterState("downloaded", "install-error")).toBe("downloaded");
  });

  it("defers cleanly and recovers from update errors so another check can run", () => {
    expect(transitionLinuxUpdaterState("available", "defer")).toBe("idle");
    expect(transitionLinuxUpdaterState("checking", "not-available")).toBe("idle");
    expect(transitionLinuxUpdaterState("checking", "error")).toBe("idle");
    expect(transitionLinuxUpdaterState("downloading", "error")).toBe("idle");
    expect(transitionLinuxUpdaterState("idle", "check")).toBe("checking");
  });
});

describe("deep-link readiness", () => {
  it("queues each channel independently and flushes only after that channel subscribes", () => {
    const queue = new DeepLinkQueue();
    queue.setAuthenticated(false);
    queue.enqueue("authCallback", { code: "auth" });
    queue.enqueue("checkoutComplete", { status: "success" });
    expect(queue.setReady("authCallback", true)).toEqual([{ code: "auth" }]);
    expect(queue.enqueue("authCallback", { code: "next" })).toEqual([{ code: "next" }]);
    expect(queue.setReady("checkoutComplete", true)).toEqual([{ status: "success" }]);
  });

  it("stops direct delivery after listener cleanup or renderer reload", () => {
    const queue = new DeepLinkQueue();
    queue.setAuthenticated(false);
    queue.setReady("authCallback", true);
    expect(queue.enqueue("authCallback", { code: "first" })).toEqual([{ code: "first" }]);
    queue.setReady("authCallback", false);
    expect(queue.enqueue("authCallback", { code: "deferred" })).toEqual([]);
    queue.resetForReload();
    expect(queue.enqueue("checkoutComplete", { status: "cancel" })).toEqual([]);
    expect(queue.setReady("authCallback", true)).toEqual([{ code: "deferred" }]);
  });

  it("holds cold-start callbacks until both the listener and initial session are ready", () => {
    const queue = new DeepLinkQueue();
    queue.enqueue("authCallback", { code: "cold-start" });
    expect(queue.setReady("authCallback", true)).toEqual([]);
    expect(queue.setAuthenticated(false)).toEqual([{ code: "cold-start" }]);
  });

  it("discards cold-start auth callbacks when an existing session is restored", () => {
    const queue = new DeepLinkQueue();
    queue.enqueue("authCallback", { access_token: "old", refresh_token: "old-refresh" });
    queue.setAuthenticated(true);
    queue.setAuthenticated(false);
    expect(queue.setReady("authCallback", true)).toEqual([]);
  });

  it("does not replay callbacks received during a session after logout or reload", () => {
    const queue = new DeepLinkQueue();
    queue.setAuthenticated(false);
    queue.setReady("authCallback", true);
    queue.setAuthenticated(true);
    expect(queue.enqueue("authCallback", { code: "stale" })).toEqual([]);
    queue.resetForReload();
    queue.enqueue("authCallback", { access_token: "old", refresh_token: "old-refresh" });
    queue.setAuthenticated(false);
    expect(queue.setReady("authCallback", true)).toEqual([]);
    expect(queue.enqueue("authCallback", { code: "fresh-login" })).toEqual([
      { code: "fresh-login" },
    ]);
  });

  it("clears pending login callbacks when authentication succeeds through another method", () => {
    const queue = new DeepLinkQueue();
    queue.setAuthenticated(false);
    queue.enqueue("authCallback", { code: "abandoned-login" });
    queue.setAuthenticated(true);
    queue.setAuthenticated(false);
    expect(queue.setReady("authCallback", true)).toEqual([]);
  });
});

describe("update dialog gate", () => {
  it("prevents overlapping dialogs and releases the guard after resolution", async () => {
    const gate = new AsyncDialogGate();
    let resolveFirst: ((value: string) => void) | undefined;
    const first = gate.show(() => new Promise<string>((resolve) => (resolveFirst = resolve)));
    expect(await gate.show(async () => "overlapping")).toBeUndefined();
    resolveFirst?.("first");
    expect(await first).toBe("first");
    expect(await gate.show(async () => "next")).toBe("next");
  });

  it("releases the guard when the native dialog rejects", async () => {
    const gate = new AsyncDialogGate();
    await expect(gate.show(async () => Promise.reject(new Error("dialog failed")))).rejects.toThrow(
      "dialog failed",
    );
    expect(await gate.show(async () => "recovered")).toBe("recovered");
  });
});

describe("single-instance update handoff", () => {
  it("releases the lock before AppImageUpdater starts the replacement", () => {
    const order: string[] = [];
    const installed = installAfterReleasingSingleInstanceLock(
      () => order.push("release"),
      () => order.push("install"),
      () => order.push("error"),
    );
    expect(installed).toBe(true);
    expect(order).toEqual(["release", "install"]);
  });

  it("routes synchronous install errors into lock recovery", () => {
    const error = new Error("install failed");
    const errors: unknown[] = [];
    const installed = installAfterReleasingSingleInstanceLock(
      () => undefined,
      () => {
        throw error;
      },
      (caught) => errors.push(caught),
    );
    expect(installed).toBe(false);
    expect(errors).toEqual([error]);
  });

  it("only resets quitting when the old process re-acquires the lock", () => {
    const actions: string[] = [];
    expect(
      reacquireSingleInstanceLock(
        () => true,
        () => actions.push("reset-quitting"),
        () => actions.push("quit"),
      ),
    ).toBe(true);
    expect(
      reacquireSingleInstanceLock(
        () => false,
        () => actions.push("reset-quitting"),
        () => actions.push("quit"),
      ),
    ).toBe(false);
    expect(actions).toEqual(["reset-quitting", "quit"]);
  });
});
