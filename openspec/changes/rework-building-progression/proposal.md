# Proposal: Building Unlock/Upgrade Rework + Onboarding + QoL

## Why
The current buildings are all free and auto-available from the start,
with a hard worker cap and no upgrade path — there's no real building
progression beyond Town Hall level. This proposal makes buildings
something the player actively unlocks and grows, adds the QoL tools
(auto-claim, rate/time visibility) that make managing more buildings
bearable, and turns Farmer Joe into a proper onboarding guide now that
there's enough going on to actually need one.

## What Changes
- **Building unlocking**: every building except the starting Old Coop
  must be unlocked by walking up and spending resources — no more
  auto-available buildings.
- **Infinite building upgrades**: each resource building has its own
  level (unbounded), upgradable for resources. Each level increases
  both production rate and that building's worker capacity.
- **Auto-claim**: a single button collects from every unlocked
  resource building at once, no need to walk to each one.
- **Rate + time visibility**: every resource building shows its
  current production rate (resource/min), and timers (like House
  construction) show actual seconds remaining, not just a percentage.
- **Market Stall removed**: its role (quest turn-in) folds into
  Farmer Joe directly — one less redundant location.
- **Farmer Joe becomes the onboarding guide**: a short guided sequence
  introducing collection, unlocking, workers, Town Hall upgrades, and
  crafting, replacing the old 2-step quest chain.
- **Houses gated like resource buildings**: up to 5 house slots (was
  6, adjusted — see design.md), each requiring a specific Town Hall
  level to unlock, same pattern as Wood/Grain.

## Non-Goals (this change)
- DON'T touch the NFT/land/monetization non-goals from earlier
  proposals — still deferred pending legal review.
- DON'T add new resource types or new buildings beyond what exists
  today (Old Coop, Nest Bundle, Woodshed, Grain Store, House,
  Workbench) — this is about depth, not breadth.
- DON'T rebalance Town Hall's own upgrade costs — only building-level
  costs and house-slot gating are new.

## Impact
- Affected specs: resource-production (per-building level now
  affects rate), interaction-system (Farmer Joe's dialogue becomes a
  guided sequence instead of 2 quests), land-popularity (unaffected)
- New specs: building-unlocking, building-leveling
- Removed: market_stall building and its handler
- Affected code: resources.js (per-building level factored into
  rate), workers.js (per-building worker caps, house TH-gating),
  new buildingUnlocks.js, new buildingLevels.js, main.js (auto-claim
  button, rate/time display), interactionHandlers.js (Farmer Joe
  rewrite, Market Stall removal), map.js (Market Stall removal)
