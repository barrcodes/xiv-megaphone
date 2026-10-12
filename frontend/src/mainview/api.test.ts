import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./lib/supabase", () => ({
  supabase: { auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) } },
}));

vi.mock("./telemetry", () => ({
  context: { active: vi.fn() },
  propagation: { inject: vi.fn() },
  tracer: {
    startActiveSpan: vi.fn((_name, _options, callback) =>
      callback({
        setAttributes: vi.fn(),
        setAttribute: vi.fn(),
        setStatus: vi.fn(),
        recordException: vi.fn(),
        end: vi.fn(),
      }),
    ),
  },
}));

describe("policy API", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("gets a policy at the language and policy ID path", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({ content: "Terms", version: "1", versionId: "v1", language: "en" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );
    const { getPolicy } = await import("./api");

    await getPolicy("en", "privacy-policy");

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/policies\/en\/privacy-policy$/),
    );
  });

  it("accepts both policy version IDs in the request body", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 204 }));
    const { acceptPolicies } = await import("./api");

    await acceptPolicies("tos-v1", "privacy-v2");

    const [, init] = fetchMock.mock.calls[0];
    expect(init).toMatchObject({
      method: "POST",
      body: JSON.stringify({ tosVersionId: "tos-v1", privacyPolicyVersionId: "privacy-v2" }),
    });
    expect(new Headers(init?.headers).get("Content-Type")).toBe("application/json");
  });
});

describe("plan portal action API", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns a typed error for the known stale scheduled-plan response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({ code: "SCHEDULED_PLAN_CHANGE_STALE", error: "refresh account" }),
        {
          status: 409,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );
    const { createPlanPortalAction, StaleScheduledPlanChangeError } = await import("./api");

    await expect(createPlanPortalAction("cancel")).rejects.toBeInstanceOf(
      StaleScheduledPlanChangeError,
    );
  });

  it("does not expose arbitrary server errors for other portal-action failures", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ code: "INTERNAL_ERROR", error: "private server detail" }), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const { createPlanPortalAction } = await import("./api");

    await expect(createPlanPortalAction("cancel")).rejects.toThrow(
      "Failed to open plan confirmation: 409",
    );
    await expect(createPlanPortalAction("cancel")).rejects.not.toThrow("private server detail");
  });
});
