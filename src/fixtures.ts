import type { PublishedSnapshot } from "./pack.ts";
import type { ResultGateway, VerifiedOpening } from "./result.ts";

export type PackScenario = "current" | "updated" | "loading" | "error" | "expired" | "mismatch";

/** Synthetic weights, NOT a reconstruction of CatchBack's published odds. */
export function sampleSnapshot(scenario: PackScenario = "current", now = Date.now()): PublishedSnapshot {
  const updated = scenario === "updated";
  const version = updated ? "example-v2" : "example-v1";
  return {
    activeVersion: scenario === "mismatch" ? "example-v2" : version,
    pack: {
      id: "rags_to_riches",
      version,
      effectiveAt: now - 60_000,
      expiresAt: scenario === "expired" ? now - 1 : now + 300_000,
      priceCents: 2500,
      currency: "USD",
      winDefinition: "reference-value-at-least-price",
      valuationVersion: "illustrative-values-v1",
      outcomes: [
        { id: "booster", name: "Example booster", referenceValueCents: 1250, weightBps: updated ? 4000 : 3300 },
        { id: "standard", name: "Example standard card", referenceValueCents: 2500, weightBps: updated ? 5800 : 6500 },
        { id: "rare", name: "Example rare card", referenceValueCents: 4000, weightBps: 100 },
        { id: "chase", name: "Example chase card", referenceValueCents: 7500, weightBps: 100 },
      ],
    },
  };
}

export function loadSample(scenario: PackScenario, signal: AbortSignal): Promise<PublishedSnapshot> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      if (scenario === "error") reject(new Error("Sample fetch failure"));
      else resolve(sampleSnapshot(scenario));
    }, scenario === "loading" ? 60_000 : 180);
    signal.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    }, { once: true });
  });
}

export const demoCard = { name: "Example Greninja card", referenceValueCents: 2900 };

// These adapters are deliberately fixtures. Neither talks to CatchBack or
// establishes real payment/ownership. The review controls explicitly opt in.
export function sampleGateway(status: VerifiedOpening["status"] = "unavailable"): ResultGateway {
  return {
    demo: async () => demoCard,
    verifyOpening: async openingId => status === "awarded"
      ? { status, openingId, awardId: "illustrative-award", card: demoCard }
      : { status },
  };
}
