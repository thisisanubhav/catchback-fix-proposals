import assert from "node:assert/strict";
import { test } from "node:test";
import { sampleGateway, sampleSnapshot } from "../src/fixtures.ts";
import { rateLabel, validateSnapshot, winRatePercent } from "../src/pack.ts";
import { resolveOpening, type ResultGateway } from "../src/result.ts";

const now = 1_800_000_000_000;

test("the approved value definition includes equality and excludes the booster", () => {
  const snapshot = sampleSnapshot("current", now);
  assert.equal(validateSnapshot(snapshot, now).status, "ready");
  assert.equal(winRatePercent(snapshot.pack), 67);
  snapshot.pack.outcomes[1].referenceValueCents = 2499;
  assert.equal(winRatePercent(snapshot.pack), 2);
});

test("rates change with versioned odds rather than remaining fixed at 67%", () => {
  assert.equal(rateLabel(sampleSnapshot("current", now).pack), "67%");
  assert.equal(rateLabel(sampleSnapshot("updated", now).pack), "60%");
});

for (const scenario of ["expired", "mismatch"] as const) {
  test(`${scenario} data cannot expose a current claim`, () => {
    assert.equal(validateSnapshot(sampleSnapshot(scenario, now), now).status, "unavailable");
  });
}

test("future, invalid, and exactly expired timestamps are rejected", () => {
  for (const change of [
    { effectiveAt: now + 1 }, { effectiveAt: Number.NaN },
    { expiresAt: now }, { expiresAt: Number.POSITIVE_INFINITY },
  ]) {
    const snapshot = sampleSnapshot("current", now);
    Object.assign(snapshot.pack, change);
    assert.equal(validateSnapshot(snapshot, now).status, "unavailable");
  }
});

test("reject incomplete, rounded, negative, and duplicated probability data", () => {
  for (const weight of [3299, 3301, -1, 3300.1, Number.NaN]) {
    const snapshot = sampleSnapshot("current", now);
    snapshot.pack.outcomes[0].weightBps = weight;
    assert.equal(validateSnapshot(snapshot, now).status, "unavailable");
  }
  const snapshot = sampleSnapshot("current", now);
  snapshot.pack.outcomes[1].id = snapshot.pack.outcomes[0].id;
  assert.equal(validateSnapshot(snapshot, now).status, "unavailable");
});

test("demo cannot call the paid verification path even with paid query flags", async () => {
  const gateway: ResultGateway = {
    demo: async () => ({ name: "Demo", referenceValueCents: 2900 }),
    verifyOpening: async () => { throw new Error("Demo must not request an award"); },
  };
  const result = await resolveOpening(new URLSearchParams("demo=true&paid=true&opening_id=123"), gateway);
  assert.equal(result.kind, "demo");
});

test("URL flags and arbitrary opening IDs never establish ownership", async () => {
  for (const query of ["", "demo=false", "paid=true&award_id=forged", "demo=false&opening_id=forged", "payment_status=paid&vault=true"]) {
    const result = await resolveOpening(new URLSearchParams(query), sampleGateway());
    assert.equal(result.kind, "unavailable");
  }
});

test("paid success requires an awarded response for the requested opening", async () => {
  const result = await resolveOpening(new URLSearchParams("opening_id=123"), sampleGateway("awarded"));
  assert.equal(result.kind, "paid");
  if (result.kind === "paid") assert.equal(result.openingId, "123");
});

test("payment pending and unavailable states never display an award", async () => {
  for (const status of ["pending", "unavailable"] as const) {
    const result = await resolveOpening(new URLSearchParams("opening_id=123"), sampleGateway(status));
    assert.equal(result.kind, status);
  }
});

test("verification failures, mismatched IDs, and missing award IDs fail closed", async () => {
  const card = { name: "Card", referenceValueCents: 2900 };
  const gateways: ResultGateway[] = [
    { ...sampleGateway(), verifyOpening: async () => { throw new Error("Offline"); } },
    { ...sampleGateway(), verifyOpening: async () => ({ status: "awarded", openingId: "other", awardId: "x", card }) },
    { ...sampleGateway(), verifyOpening: async () => ({ status: "awarded", openingId: "123", awardId: "", card }) },
  ];
  for (const gateway of gateways) {
    assert.equal((await resolveOpening(new URLSearchParams("opening_id=123"), gateway)).kind, "unavailable");
  }
});
