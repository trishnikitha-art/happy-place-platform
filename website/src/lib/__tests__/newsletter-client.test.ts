import { newsletterEndpoint, newsletterSucceeded, subscribeToNewsletter } from "@/services/newsletter";

describe("Newsletter browser adapter uses the existing endpoint truthfully", () => {
  const originalFetch = global.fetch;

  beforeEach(() => { global.fetch = jest.fn(); });
  afterEach(() => { global.fetch = originalFetch; });

  function response(status: number, body: unknown) {
    return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
  }

  it("validates without submitting invalid contact details", async () => {
    const result = await subscribeToNewsletter({ email: "not an email", source: "newsletter" });
    expect(result.kind).toBe("invalid");
    expect(global.fetch).not.toHaveBeenCalled();
    expect(newsletterSucceeded(result)).toBe(false);
  });

  it("passes only endpoint-supported fields and allowlisted attribution", async () => {
    jest.mocked(global.fetch).mockResolvedValue(response(200, {
      success: true, subscriber: { id: 4, state: "active" }, kit: { created: true },
    }));
    const result = await subscribeToNewsletter(
      { email: " Reader@Example.com ", firstName: " Reader ", source: "homepage" },
      "?utm_source=project&utm_campaign=fence&email=private@example.com&authorization=secret",
    );
    expect(result.kind).toBe("subscribed");
    expect(global.fetch).toHaveBeenCalledWith("/api/newsletter/subscribe?utm_source=project&utm_campaign=fence", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "reader@example.com", firstName: "Reader", source: "homepage" }),
    });
    expect(result.message).not.toMatch(/email (sent|delivered)|check your inbox/i);
  });

  it("only identifies an existing subscriber from the actual active response", async () => {
    jest.mocked(global.fetch).mockResolvedValue(response(200, {
      success: true, subscriber: { id: 4, state: "active" }, kit: { created: false },
    }));
    const result = await subscribeToNewsletter({ email: "reader@example.com" });
    expect(result.kind).toBe("existing");
    expect(newsletterSucceeded(result)).toBe(true);
  });

  it("distinguishes a returned pending state from an active subscriber", async () => {
    jest.mocked(global.fetch).mockResolvedValue(response(200, {
      success: true, subscriber: { id: 4, state: "unconfirmed" }, kit: { created: true },
    }));
    const result = await subscribeToNewsletter({ email: "reader@example.com" });
    expect(result.kind).toBe("pending");
    expect(result.message).not.toMatch(/you’re on the list|confirmation email (was|has been) sent/i);
  });

  it("never invents active membership when the successful response omits its state", async () => {
    jest.mocked(global.fetch).mockResolvedValue(response(200, { success: true }));
    const result = await subscribeToNewsletter({ email: "reader@example.com" });
    expect(result.kind).toBe("accepted");
    expect(result.message).not.toContain("You’re on the list");
  });

  it.each([
    [400, { error: "Invalid email address" }, "invalid"],
    [409, { error: "subscription_suppressed" }, "suppressed"],
    [429, { error: "rate_limited" }, "rate-limited"],
    [503, { error: "kit_sync_failed", failure: "validation", message: "Private provider detail" }, "unavailable"],
    [502, { error: "kit_sync_failed", operation: "sequence" }, "failed"],
    [200, { success: false }, "failed"],
  ] as const)("does not report successful subscription for %s / %s", async (status, body, kind) => {
    jest.mocked(global.fetch).mockResolvedValue(response(status, body));
    const result = await subscribeToNewsletter({ email: "reader@example.com" });
    expect(result.kind).toBe(kind);
    expect(newsletterSucceeded(result)).toBe(false);
    expect(result.message).not.toContain("Private provider detail");
  });

  it("retains uncertainty when a response is lost or is not JSON", async () => {
    jest.mocked(global.fetch).mockRejectedValueOnce(new TypeError("network failure"));
    expect((await subscribeToNewsletter({ email: "reader@example.com" })).kind).toBe("unknown");
    jest.mocked(global.fetch).mockResolvedValueOnce({ ok: true, status: 200, json: async () => { throw new SyntaxError(); } } as Response);
    expect((await subscribeToNewsletter({ email: "reader@example.com" })).kind).toBe("failed");
  });

  it("does not append an empty query or transfer unrelated page query data", () => {
    expect(newsletterEndpoint("?email=private@example.com&project=one")).toBe("/api/newsletter/subscribe");
    expect(newsletterEndpoint()).toBe("/api/newsletter/subscribe");
  });
});
