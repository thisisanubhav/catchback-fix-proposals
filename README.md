# CatchBack fix proposals

A React/TypeScript prototype using sample data. I don’t have CatchBack’s source code; these changes demonstrate proposed fixes and have not been deployed to its website.

## What’s broken

- **Conflicting win rates:** QA recorded 70% on the homepage and 67% in the Rags to Riches pack selector.
- **Misleading demo result:** After Open Demo → Skip, the page says a card was added to the vault while another panel says no purchase was made.
- **Inaccessible custom odds:** Percentage and slider controls cannot be reached or edited with a keyboard.

## Why it matters

- Conflicting odds make it harder to understand a pack’s chances and trust its promotion.
- The demo confirmation can make users believe they own a card they haven’t received.
- Inaccessible controls prevent keyboard users from configuring a pack.

## How I fixed it in this prototype

- **Consistent odds:** One versioned configuration drives the promotion, badge, odds, and accessible text. Rates are calculated rather than hardcoded; numeric claims disappear during loading, errors, expiry, or version mismatches. Promotional artwork contains no embedded rate. The example defines a win as reference value at least equal to pack price, before fees—not guaranteed cash profit. CatchBack would need to approve the definition.
- **Clear demo results:** Added “Demo — no card awarded” above the card, hypothetical value language, and “Explore Packs.” A separate paid view retains the vault confirmation. URL flags cannot select paid success; real integration requires authenticated server verification of payment and the award.
- **Accessible editing:** Added labelled native number inputs and sliders, keyboard navigation, lock controls, validation, and change announcements. Recalculation preserves locked values and an exact 100% total using an illustrative allocation policy.

## Validation

Build passes, with **16 logic tests and 30 browser tests** across desktop and mobile-sized Chromium. Real-service integration and manual screen-reader checks remain necessary.

## Run locally

Node 22.18+:

```sh
npm ci
npm run dev
```

Checks: `npm run build`, `npm test`, and `npm run test:e2e`. Browser tests use installed Chrome on macOS, or Playwright Chromium (`npx playwright install chromium`).
