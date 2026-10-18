# CatchBack fix proposals

A runnable React/TypeScript proposal for two observed UX issues. This workspace started empty; it contains no CatchBack source code. All data and paid-success responses are local fixtures. Nothing here buys a pack, creates an account, adds a card to a real vault, or calls CatchBack services. Nothing has been deployed.

## Run

Use Node 22.18+ (verified locally with Node 25):

```sh
npm ci
npm run dev
npm run build
npm test
npm run test:e2e
```

Open the local URL printed by Vite. Review controls simulate fresh, updated, loading, failed, expired, and mismatched pack data, plus demo, paid, pending, and unverified results. They belong to this proposal harness and should not be copied into the customer experience. The paid fixture is explicitly labelled; its `/vault` link is an integration placeholder.

Browser tests use installed Chrome on macOS when available, otherwise Playwright Chromium (`npx playwright install chromium`). Desktop is 1440×900; mobile is Chromium at 390×844 with touch emulation. This is not a claim of real iOS Safari or Android testing. Screenshots are written under the ignored `test-results/` directory.

## 1. Consistent win rates

**Problem:** QA on October 18, 2026 recorded 70% on the homepage promotion and 67% in the pack selector. Displayed odds were 33.00% for a $12.50 booster in a $25 pack, followed by 65.48%, 0.16%, and 1.37% in higher value bands. The displayed probabilities total 100.01%; rounded UI figures must not become authoritative probability inputs. The supplied homepage screenshot does not visibly capture the 70% promotion, although the report and JSON record it.

**Proposal:** Publish one immutable pack version containing price, complete unrounded odds, valuation snapshot, validity window, and the product-approved definition of a win. Derive the banner, badge, and odds from the same snapshot. This example uses “reference value at least pack price, before fees or shipping”; this is a proposed definition requiring product approval, not a statement of CatchBack's existing policy. It includes equality and explicitly does not mean cash profit.

- `src/pack.ts` validates the version, validity window, metric, values, and complete distribution; it derives the rate from integer weights.
- `src/usePublishedPack.ts` shares one loaded snapshot and hides claims during loading, failures, version mismatches, and expiry. It cancels superseded requests and clears expired claims even if the page stays open.
- `src/PackViews.tsx` uses the same rate and definition for visible and accessible text. Promotional artwork is decorative and contains no numeric claim. The same formatting applies everywhere.
- `src/fixtures.ts` uses deliberately synthetic distributions (67% and 60%) to demonstrate change. They do not reconstruct actual CatchBack odds or lock the product to 67%. Basis points are an example precision; use the real service's exact probability representation if it needs greater precision.

### Integration requirements

Replace the fixture loader with the real source of truth. Decode untrusted API responses with runtime schema validation before passing them to this typed contract. Publish the configuration and any promotional assets atomically under one version. Revalidate the active version according to an agreed freshness policy, including cache/CDN invalidation and resume/focus behavior; never combine a new banner with old odds. This prototype's fixture lifetime is five minutes, not a proposed production policy.

If existing artwork contains “70%” or another rate, replace it with rate-free art and an HTML overlay. If image text must remain, regenerate the image for each version, use a versioned asset URL and matching accessible text, and withhold it until the asset and configuration versions agree. Updating alt text alone leaves the visible contradiction intact.

The server must independently enforce the applicable pack version and odds when a real opening occurs. The display validity window is not transaction authorization. The product must also specify the valuation source/time, price basis (including discounts), treatment of fees, and metric rounding. This sample metric supports reference-value comparison only; a different approved definition needs an explicit implementation and tests.

## 2. Unambiguous demo results

**Problem:** Open Demo → Skip displayed “Your pull has been added to your vault” alongside a separate panel saying no purchase was made. QA recorded Tapu Bulu ($29.10) on mobile and Greninja-Gold Star ($29.00) on desktop.

**Proposal:** `src/ResultView.tsx` puts “Demo — no card awarded” above the card, calls it a simulated pull, uses hypothetical reference-value language, and replaces the vault CTA with “Explore Packs.” Skip and completing the demo reveal reach the same result. Paid presentation retains the award confirmation and vault CTA. Pending and unverified states cannot render success.

`src/result.ts` treats `demo=true` only as demo intent. Other URL flags cannot produce paid success. A paid view requires the verification adapter to return a persisted award for the requested opening. A TypeScript type, browser state, query string, or fixture is not payment evidence and cannot secure a real backend.

### Integration requirements

Implement the adapter against the real authenticated service, whose response must confirm the current user's access, settled payment, and persisted vault award. A settlement without an award remains pending. Unauthorized, missing, refunded/invalid as applicable, or mismatched records must not return an awarded response. Keep actual awarding in the existing authoritative, idempotent backend flow; rendering or refreshing a success page must not create an award. This proposal does not assume any specific API route, database, payment provider, or existing architecture.

## Acceptance coverage

| Check | Coverage |
| --- | --- |
| Banner, selector, odds, and accessible definition use the same version | Browser tests on desktop and mobile |
| New configuration changes every rate; 67% is not fixed | Domain and browser tests |
| Loading, fetch failure, expiry, and version mismatch hide rates and odds | Domain and browser tests, including expiry of an open page |
| Probability totals and win boundary are correct | Domain tests; equality counts under this example definition |
| Demo Skip and completed reveal show no-award heading above the card | Browser tests on desktop and mobile |
| Demo uses hypothetical language and Explore Packs, without a vault CTA | Browser tests on desktop and mobile |
| Paid fixture preserves award confirmation and vault link | Browser tests on desktop and mobile |
| Pending, rejected, mismatched, and failed verification cannot show success | Domain and browser tests |
| URL flags and arbitrary opening IDs cannot grant paid presentation | Domain and browser tests against the fixture adapter |
| No horizontal overflow at tested widths | Browser layout assertion and screenshots |

Before real integration can be accepted, add backend tests for current-user ownership, settled payment plus persisted award, pending award, unauthorized opening IDs, replay/refresh idempotency, and demo flows producing no payment or vault writes. Add integration checks for publication/cache/asset version consistency and keyboard/screen-reader checks in the real app. Those real-service checks cannot run in this independent proposal.

## Outreach draft

Hey! I found two small inconsistencies while trying CatchBack: Rags to Riches says 70% win rate on the homepage and 67% in the selector, and the demo result says a card was added to the vault even though no purchase happened. I built a small React/TypeScript prototype showing how I'd keep the odds consistent and make demo results clearer, with desktop/mobile tests. It uses sample data since I don't have your source. Happy to walk you through it and implement it in the real app if useful.
