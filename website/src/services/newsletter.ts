/** Browser adapter for the existing newsletter endpoint. Never imports Kit credentials. */
export type NewsletterResult =
  | { kind: "subscribed" | "existing" | "pending" | "accepted"; message: string }
  | { kind: "invalid" | "suppressed" | "unavailable" | "rate-limited" | "failed" | "unknown"; message: string };

export interface NewsletterInput {
  email: string;
  firstName?: string;
  source?: string;
}

const ATTRIBUTION_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;

export function newsletterEndpoint(search = ""): string {
  const incoming = new URLSearchParams(search);
  const attribution = new URLSearchParams();
  for (const key of ATTRIBUTION_KEYS) {
    const value = incoming.get(key);
    if (value) attribution.set(key, value.slice(0, 200));
  }
  const query = attribution.toString();
  return `/api/newsletter/subscribe${query ? `?${query}` : ""}`;
}

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

/** A success result means the endpoint accepted it, never that an email arrived. */
export async function subscribeToNewsletter(input: NewsletterInput, search = ""): Promise<NewsletterResult> {
  const email = input.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { kind: "invalid", message: "Enter a valid email address so we can add you to the list." };
  }

  try {
    const response = await fetch(newsletterEndpoint(search), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, firstName: input.firstName?.trim() || undefined, source: input.source || "website" }),
    });
    const data = record(await response.json().catch(() => null));

    if (response.status === 400) {
      return { kind: "invalid", message: "Check your email address and try again." };
    }
    if (response.status === 409 && data?.error === "subscription_suppressed") {
      return { kind: "suppressed", message: "This address can’t be added through this form. Contact us if you’d like help with your subscription." };
    }
    if (response.status === 429) {
      return { kind: "rate-limited", message: "There have been too many attempts. Please wait a little before trying again." };
    }
    if (response.status === 503) {
      return { kind: "unavailable", message: "Newsletter signup is unavailable right now. Please try later, or contact us directly." };
    }
    if (!response.ok || data?.success !== true) {
      return { kind: "failed", message: "We couldn’t confirm your signup. Your details are still here. You can try again or contact us." };
    }

    const subscriber = record(data.subscriber);
    const kit = record(data.kit);
    if (subscriber?.state === "active") {
      return kit?.created === false
        ? { kind: "existing", message: "You’re already on the list. Your signup details are up to date." }
        : { kind: "subscribed", message: "You’re on the list. Thanks for staying in touch." };
    }
    if (subscriber?.state === "unconfirmed") {
      return { kind: "pending", message: "Your signup is awaiting confirmation. If you receive a confirmation email, follow its instructions to finish." };
    }
    return { kind: "accepted", message: "Your signup request was accepted. Thanks for staying in touch." };
  } catch {
    return { kind: "unknown", message: "We couldn’t confirm the result. Your details are still here. Check your connection and try again, or contact us." };
  }
}

export function newsletterSucceeded(result: NewsletterResult): boolean {
  return ["subscribed", "existing", "pending", "accepted"].includes(result.kind);
}
