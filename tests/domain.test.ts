import assert from "node:assert/strict";
import { test } from "node:test";
import { sampleGateway, sampleSnapshot } from "../src/fixtures.ts";
import { rateLabel, validateSnapshot, winRatePercent } from "../src/pack.ts";
import { resolveOpening, type ResultGateway } from "../src/result.ts";
import { maximumOdds, rebalanceOdds, sampleCustomOdds } from "../src/customOdds.ts";

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

test("custom odds reproduce the observed 20% to 30% redistribution without mutating input", () => {
  const original = sampleCustomOdds();
  const result = rebalanceOdds(original, "example-1", 3000);
  assert.deepEqual(result.map(row => row.weightBps), [3000, 1750, 1750, 1750, 1750]);
  assert.deepEqual(original.map(row => row.weightBps), [2000, 2000, 2000, 2000, 2000]);
});

test("custom odds preserve locks and distribute fractional remainders exactly", () => {
  const rows = sampleCustomOdds();
  rows[1].locked = true;
  const result = rebalanceOdds(rows, "example-1", 3000);
  assert.equal(result[1].weightBps, 2000);
  assert.deepEqual(result.map(row => row.weightBps), [3000, 2000, 1667, 1667, 1666]);
  assert.equal(maximumOdds(rows, "example-1"), 8000);
  assert.throws(() => rebalanceOdds(rows, "example-1", 8001));
  assert.throws(() => rebalanceOdds(rows, "example-2", 3000));
});

test("zero-weight peers recover equally after a 100% allocation", () => {
  const all = rebalanceOdds(sampleCustomOdds(), "example-1", 10_000);
  assert.deepEqual(all.map(row => row.weightBps), [10000, 0, 0, 0, 0]);
  const reset = rebalanceOdds(all, "example-1", 2000);
  assert.deepEqual(reset.map(row => row.weightBps), [2000, 2000, 2000, 2000, 2000]);
});

test("custom odds reject impossible edits and invalid distributions", () => {
  for (const value of [-1, 10001, 0.1, NaN, Infinity]) {
    assert.throws(() => rebalanceOdds(sampleCustomOdds(), "example-1", value));
  }
  const locked = sampleCustomOdds().map((row, index) => ({ ...row, locked: index !== 0 }));
  assert.equal(maximumOdds(locked, "example-1"), 2000);
  assert.throws(() => rebalanceOdds(locked, "example-1", 1900));
  assert.deepEqual(rebalanceOdds(locked, "example-1", 2000), locked);
  assert.throws(() => rebalanceOdds([], "missing", 0));
  const incomplete = sampleCustomOdds();
  incomplete[0].weightBps = 1999;
  assert.throws(() => rebalanceOdds(incomplete, "example-1", 2000));
});

test("repeated fractional custom edits keep exact totals and nonnegative integer weights", () => {
  let rows = sampleCustomOdds();
  for (let index = 0; index < 100; index++) {
    const id = rows[index % rows.length].id;
    rows = rebalanceOdds(rows, id, (index * 997) % 10001);
    assert.equal(rows.reduce((sum, row) => sum + row.weightBps, 0), 10000);
    assert.ok(rows.every(row => Number.isInteger(row.weightBps) && row.weightBps >= 0));
  }
});
