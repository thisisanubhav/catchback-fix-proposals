/** Proposed public contract; integrate with the real publishing service. */
export type PackConfig = {
  id: string;
  version: string;
  effectiveAt: number;
  expiresAt: number;
  priceCents: number;
  currency: "USD";
  winDefinition: "reference-value-at-least-price";
  valuationVersion: string;
  outcomes: { id: string; name: string; referenceValueCents: number; weightBps: number }[];
};

export type PublishedSnapshot = { activeVersion: string; pack: PackConfig };
export type PackState =
  | { status: "loading" }
  | { status: "unavailable"; reason: string }
  | { status: "ready"; pack: PackConfig };

export const winDefinitionText =
  "A win means the card’s reference value is at least the pack price, before fees or shipping. Reference value is an estimate, not a guaranteed resale price or cash profit.";

export function validateSnapshot(snapshot: PublishedSnapshot, now: number): PackState {
  const pack = snapshot.pack;
  const fail = (reason: string): PackState => ({ status: "unavailable", reason });
  if (!pack.version || snapshot.activeVersion !== pack.version) return fail("Version mismatch");
  if (!Number.isFinite(pack.effectiveAt) || !Number.isFinite(pack.expiresAt) ||
      pack.effectiveAt > now || pack.expiresAt <= now || pack.expiresAt <= pack.effectiveAt) {
    return fail("Configuration is not current");
  }
  if (!pack.id || !pack.valuationVersion || pack.currency !== "USD" ||
      !Number.isSafeInteger(pack.priceCents) || pack.priceCents <= 0 ||
      pack.winDefinition !== "reference-value-at-least-price") return fail("Unsupported configuration");
  const ids = new Set(pack.outcomes.map(outcome => outcome.id));
  if (!pack.outcomes.length || ids.size !== pack.outcomes.length || pack.outcomes.some(outcome =>
    !outcome.id || !outcome.name ||
    !Number.isSafeInteger(outcome.weightBps) || outcome.weightBps < 0 ||
    !Number.isSafeInteger(outcome.referenceValueCents) || outcome.referenceValueCents < 0
  )) return fail("Invalid outcomes");
  if (pack.outcomes.reduce((total, outcome) => total + outcome.weightBps, 0) !== 10_000) {
    return fail("Incomplete probability distribution");
  }
  return { status: "ready", pack };
}

// Derive from unrounded weights, never from a rounded badge or observed bands.
export function winRatePercent(pack: PackConfig): number {
  return pack.outcomes.reduce((total, outcome) =>
    total + (outcome.referenceValueCents >= pack.priceCents ? outcome.weightBps : 0), 0) / 100;
}

export function rateLabel(pack: PackConfig): string {
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(winRatePercent(pack))}%`;
}

export function money(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}
