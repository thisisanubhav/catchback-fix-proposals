# CatchBack fix proposals

A React/TypeScript prototype using sample data. I don’t have CatchBack’s source code; these changes demonstrate proposed fixes and have not been deployed to its website.

## What’s broken

- **Conflicting win rates:** QA recorded 70% on the homepage and 67% in the Rags to Riches pack selector.
- **Misleading demo result:** After Open Demo → Skip, the page says a card was added to the vault while another panel says no purchase was made.
- **Inaccessible custom odds:** Percentage and slider controls cannot be reached or edited with a keyboard.
- **Obscured pagination:** At 1366 × 768, Sort covers the custom builder’s top Next page control. Clicking it opens Sort and leaves the catalog on page 1. Bottom pagination works.

## Why it matters

- Conflicting odds make it harder to understand a pack’s chances and trust its promotion.
- The demo confirmation can make users believe they own a card they haven’t received.
- Inaccessible controls prevent keyboard users from configuring a pack.
- Overlapping controls break a browsing path at laptop widths. This is a P2 / Medium issue; it does not establish a checkout failure or block all pack creation.

## How I fixed it in this prototype

- **Consistent odds:** One versioned configuration drives the promotion, badge, odds, and accessible text. Rates are calculated rather than hardcoded; numeric claims disappear during loading, errors, expiry, or version mismatches. Promotional artwork contains no embedded rate. The example defines a win as reference value at least equal to pack price, before fees—not guaranteed cash profit. CatchBack would need to approve the definition.
- **Clear demo results:** Added “Demo — no card awarded” above the card, hypothetical value language, and “Explore Packs.” A separate paid view retains the vault confirmation. URL flags cannot select paid success; real integration requires authenticated server verification of payment and the award.
- **Accessible editing:** Added labelled native number inputs and sliders, keyboard navigation, lock controls, validation, and change announcements. Recalculation preserves locked values and an exact 100% total using an illustrative allocation policy.
- **Reliable pagination:** Put filters and pagination in separate rows, let filters wrap, and allow the card column to shrink. Both pagers share one page state; selections persist by card ID across paging, sorting, and filtering. The catalog uses sample data and needs integration with CatchBack’s real selection model.

## Validation

Checks cover odds, results, accessibility, and pagination. Pager tests use 1280 × 720, 1366 × 768, 1440 × 900, and mobile-sized 390 × 844 Chromium, with pointer hit testing, normal clicks/taps, keyboard activation, synchronized pages, and selection persistence. Real-service integration and manual screen-reader checks remain necessary.

## Run locally

Node 22.18+:

```sh
npm ci
npm run dev
```

Checks: `npm run build`, `npm test`, and `npm run test:e2e`. Browser tests use installed Chrome on macOS, or Playwright Chromium (`npx playwright install chromium`).
