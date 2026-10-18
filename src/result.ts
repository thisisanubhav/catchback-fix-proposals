export type Card = { name: string; referenceValueCents: number };
export type OpeningResult =
  | { kind: "demo"; card: Card }
  | { kind: "paid"; card: Card; openingId: string; awardId: string }
  | { kind: "pending" }
  | { kind: "unavailable" };

/** Only an authenticated server may return awarded, after checking the current
 * user, payment settlement, and a persisted vault award. A TS type is not proof. */
export type VerifiedOpening =
  | { status: "awarded"; openingId: string; awardId: string; card: Card }
  | { status: "pending" }
  | { status: "unavailable" };

export interface ResultGateway {
  demo(): Promise<Card>;
  verifyOpening(openingId: string): Promise<VerifiedOpening>;
}

export async function resolveOpening(
  query: URLSearchParams,
  gateway: ResultGateway,
): Promise<OpeningResult> {
  try {
    // URL intent can select a demo. It can never select paid success.
    if (query.get("demo") === "true") return { kind: "demo", card: await gateway.demo() };
    const openingId = query.get("opening_id");
    if (!openingId) return { kind: "unavailable" };
    const verified = await gateway.verifyOpening(openingId);
    if (verified.status === "pending") return { kind: "pending" };
    if (verified.status !== "awarded" || verified.openingId !== openingId || !verified.awardId) {
      return { kind: "unavailable" };
    }
    return { kind: "paid", card: verified.card, openingId, awardId: verified.awardId };
  } catch {
    return { kind: "unavailable" };
  }
}
