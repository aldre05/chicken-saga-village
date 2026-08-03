# Proposal: Gems (Premium Currency)

## Why
Developer decision: add a Gems currency purchasable with real money,
spendable on speeding up building upgrades (once a timed-upgrade
system exists), buying heroes (rarity/chance-based), dungeon keys,
resources, and a future VIP system. This proposal scopes the part
that's actually buildable right now — see Non-Goals for what isn't.

## Important — Architecture Gap, Read Before Scoping Work
This game currently has **no backend, no server, no user accounts —
just a client-side save in `localStorage`**
(`package.json`: "no build step, no backend"). Real-money purchases
cannot be safely implemented against that architecture: a
client-side "if paid, add gems" call is fully visible and editable in
DevTools — anyone can just run
`localStorage.setItem('chickenVillageSave', ...)` with extra gems
added, the same way this project's own `max-everything.js` dev tool
already does deliberately for testing. Actually selling Gems for real
money needs, at minimum: a real backend to verify payment
webhooks server-side, a payment processor integration (Stripe/Apple
IAP/Google Play Billing, platform-dependent), and almost certainly
real user accounts instead of a local save (so a purchase survives a
cleared cache/new device). **That's a separate, much larger
infrastructure decision** — which platform this ships on
(web/mobile/Steam) affects which payment processor is even an option,
and needs its own scoping pass, not a line item inside this proposal.

**This proposal therefore covers only:** Gems as an in-game currency
— the data model, the spending use-cases that are buildable today,
and a placeholder free-earn path (Lucky Wheel/quests) so the currency
is testable and usable now. The real-money purchase path is
explicitly a Non-Goal here, flagged for its own future proposal once
the platform/backend question is answered.

## What Changes
- New currency `gems` on `gameState` (separate from `resources` and
  `inventory` — not a raw resource, not a crafted item; its own
  top-level field, since neither existing bucket's semantics fit: not
  produced by buildings, not crafted at a workbench).
- Spendable on, in this proposal specifically:
  - `add-dungeon-keys`' `dungeon_key` item (buy directly with gems,
    alternative to crafting/winning one)
  - Heroes, chance-based rarity roll (same `RARITY_TABLE` as
    `add-recruit-via-lucky-wheel`'s wheel-based recruitment — gems
    buy a roll, not a guaranteed specific hero)
  - Raw resources (egg/feathers/wood/rice/stone/ore) at some
    gems-to-resource exchange rate
- Free-earn placeholder: small gem rewards added to the Lucky Wheel's
  `REWARD_TABLE` (low weight) and/or Farmer Joe's quest rewards, so
  the currency has a working loop before any real-money purchase path
  exists.

## Non-Goals
- **DON'T implement real-money purchase of Gems.** Needs its own
  proposal once platform/backend/payment-processor questions are
  answered — see the Architecture Gap section above. Nothing in this
  proposal should reference Stripe/IAP/webhooks/etc.
- DON'T implement speeding up building upgrades — there's no
  timed-upgrade system yet (upgrades are currently instant on
  affording the cost); this is explicitly a future dependency per the
  developer's own framing ("when we implement this").
- DON'T implement a VIP system — also explicitly future
  ("not yet implemented, will implement this soon").
- DON'T decide the gems-to-resource or gems-to-hero-roll exchange
  rates here — flagged as an open question for design.md.

## Impact
- Affected specs: new gems-currency spec, plus touches to
  dungeon-system (buy keys), hero-system (buy hero roll),
  lucky-wheel (gem rewards), resources (gem-to-resource exchange)
- Affected code: `gameState.js` (new `gems` field + save/load),
  `main.js` (HUD display, new spend UI), `dungeons.js`/`heroes.js`/
  `resources.js` (spend hooks), `luckyWheel.js` (gem reward entry)
