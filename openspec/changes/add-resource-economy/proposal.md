# Proposal: Town Hall Progression + 4-Resource Economy + Crafting

## Why
The village currently has one resource (eggs) and one linear quest
chain. This proposal adds real progression depth: a Town Hall that
gates resource unlocks, three more resources, buildings to produce
them, and a basic crafting system — the "engine room" of the
Pixiland-style loop, built entirely as free in-game systems.

A non-monetary "Land Popularity" mechanic is also included, to
prototype the community/marketing dynamic that makes land ownership
interesting in Pixiland — without any real money or NFTs attached.
This lets us validate whether that loop is actually fun before any
monetization work is considered.

## What Changes
- **Town Hall building**: new central structure, upgradable levels
  1–5. Each upgrade costs resources + requires a minimum stockpile.
- **4 resources**: Egg (existing), Feathers, Wood, Grain.
  - Levels 1–3: Egg + Feathers producible
  - Level 4: Wood unlocked
  - Level 5: Grain unlocked
- **New production buildings**: Nest Bundle (feathers), Woodshed
  (wood), Grain Store (grain) — same timestamp-based accumulation
  pattern as the existing Old Coop.
- **Crafting system**: combine 2 resources into a basic item (e.g.
  Egg + Wood → Basket). Items sit in inventory. No selling, no
  minting, no NFTs — purely an in-game inventory system.
- **Land Popularity (non-monetary)**: a visible "visitor count" or
  popularity stat tracked per land plot (starting with just the
  player's own plot, since there's no multiplayer yet — see Risks).
  No real revenue attached; this is a prototype of the social/
  competitive dynamic only.

## Non-Goals (this change)
- DON'T implement NFT minting, land ownership as a purchasable asset,
  or any revenue-share/tax mechanic between players — still deferred
  pending legal review, per the earlier proposal's non-goals.
- DON'T implement multiplayer/other players' lands yet — Land
  Popularity is built as a single-player stat for now; making it
  meaningful (visiting other real players' land) requires
  multiplayer infrastructure, which is its own future proposal.
- DON'T build a marketplace or item-selling system.
- DON'T touch the existing quest chain — it continues to work as-is
  alongside these new systems.

## Impact
- Affected specs: resource-production (extended to multiple
  resources), new specs: town-hall-progression, crafting-system,
  land-popularity
- Affected code: townHall.js, resources.js (extended), crafting.js,
  landPopularity.js, map.js (new buildings), interactionHandlers.js
  (new handlers)
