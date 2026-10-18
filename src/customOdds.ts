export type CustomOutcome = { id: string; name: string; weightBps: number; locked: boolean };

export function sampleCustomOdds(): CustomOutcome[] {
  return Array.from({ length: 5 }, (_, index) => ({
    id: `example-${index + 1}`, name: `Example card ${index + 1}`, weightBps: 2000, locked: false,
  }));
}

export function maximumOdds(rows: CustomOutcome[], id: string): number {
  const target = rows.find(row => row.id === id);
  if (!target) throw new Error("Card not found.");
  if (!rows.some(row => row.id !== id && !row.locked)) return target.weightBps;
  return 10_000 - rows.filter(row => row.id !== id && row.locked).reduce((sum, row) => sum + row.weightBps, 0);
}

/** Example redistribution policy, requiring agreement with the real product:
 * retain locked odds; distribute the remainder proportionally among unlocked
 * cards, using equal shares when their previous weights are all zero. */
export function rebalanceOdds(rows: CustomOutcome[], id: string, nextBps: number): CustomOutcome[] {
  if (new Set(rows.map(row => row.id)).size !== rows.length ||
      rows.some(row => !Number.isSafeInteger(row.weightBps) || row.weightBps < 0) ||
      rows.reduce((sum, row) => sum + row.weightBps, 0) !== 10_000) {
    throw new Error("The current odds must total 100%.");
  }
  const target = rows.find(row => row.id === id);
  if (!target) throw new Error("Card not found.");
  if (target.locked) throw new Error("Unlock this card before changing its odds.");
  const peers = rows.filter(row => row.id !== id && !row.locked);
  if (!Number.isSafeInteger(nextBps) || nextBps < 0 || nextBps > maximumOdds(rows, id)) {
    throw new Error(`Enter odds between 0 and ${(maximumOdds(rows, id) / 100).toFixed(2)}%.`);
  }
  if (!peers.length) {
    if (nextBps !== target.weightBps) throw new Error("Unlock another card to redistribute the odds.");
    return rows.map(row => ({ ...row }));
  }
  const lockedTotal = rows.filter(row => row.id !== id && row.locked).reduce((sum, row) => sum + row.weightBps, 0);
  const remaining = 10_000 - lockedTotal - nextBps;
  const peerTotal = peers.reduce((sum, row) => sum + row.weightBps, 0);
  const denominator = peerTotal || peers.length;
  const shares = peers.map((row, index) => {
    const numerator = remaining * (peerTotal ? row.weightBps : 1);
    return { id: row.id, value: Math.floor(numerator / denominator), remainder: numerator % denominator, index };
  });
  // Assign fractional basis points deterministically without losing the total.
  const leftover = remaining - shares.reduce((sum, share) => sum + share.value, 0);
  const ordered = [...shares].sort((a, b) => b.remainder - a.remainder || a.index - b.index);
  for (let index = 0; index < leftover; index++) ordered[index].value += 1;
  const weights = new Map(shares.map(share => [share.id, share.value]));
  return rows.map(row => ({ ...row, weightBps: row.id === id ? nextBps : weights.get(row.id) ?? row.weightBps }));
}
