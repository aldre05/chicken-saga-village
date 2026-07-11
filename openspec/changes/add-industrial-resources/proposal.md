# Proposal: Industrial Resources (Rice/Wood/Stone/Ore → Refined Goods)

## Why
The village currently has 4 flat resources with no raw→refined tier.
This adds that depth (rice→feed, wood→plank, stone→brick, ore→ingot),
introduces 2 brand-new raw resources (stone, ore), and gives egg and
feathers distinct, non-redundant roles instead of just becoming a 5th
and 6th version of the same industrial pattern.

## What Changes
- **Rename**: `grain` → `rice` (same building/mechanics, reflavored —
  this is the existing Grain Store, renamed "Rice Paddy").
- **2 new raw resources**: Stone (new "Quarry" building) and Ore (new
  "Mine" building) — same production pattern as every existing
  resource building (worker-assigned, levelable, Town Hall-gated
  unlock).
- **4 new refined goods**: Chicken Feed, Plank, Brick, Ingot. These
  are **crafted, not produced** — made at the Workbench via simple
  1-ingredient recipes (5 rice → 1 Feed, etc.), reusing the crafting
  panel we already built rather than adding 4 more production
  buildings. They live in inventory alongside Nest Charm/Basket, not
  in the main resource HUD.
- **Retire the old "Feed Mix" recipe** — its role is now filled by the
  real Chicken Feed conversion; keeping both would be redundant and
  confusing.
- **Egg gets a new job: worker upkeep.** Each assigned worker slowly
  consumes egg over time (small drain, not per-building — a village-
  wide population cost). For this change, running out of egg has NO
  penalty yet — that consequence design is explicitly deferred (see
  Non-Goals). This change just adds the consumption itself.
- **Feathers' new role is reserved, not built yet.** Since NFT heroes
  don't exist as a system yet, this change only documents the intent
  (feathers → future hero-related crafting) without inventing a fake
  hero system to justify it prematurely.

## Non-Goals (this change)
- DON'T add any penalty/consequence for insufficient egg upkeep yet —
  that needs its own design pass (production slowdown? a "happiness"
  stat? something else?) once the base consumption mechanic has been
  played with.
- DON'T build the hero/dungeon system yet — that's a separate future
  proposal (see the accompanying design discussion), and stays behind
  the same NFT/monetization legal-review gate as everything else in
  that category.
- DON'T give refined goods (Feed/Plank/Brick/Ingot) any use yet beyond
  sitting in inventory — what they're *for* (building upgrades? hero
  gear? something else) is a follow-up decision once they exist to
  actually design around.
- DON'T change HUD to show refined goods — they stay inventory-only,
  same as existing crafted items.

## Impact
- Affected specs: resource-production (rice rename, 2 new resources),
  crafting-system (4 new recipes, 1 retired)
- New specs: worker-upkeep
- Affected code: resources.js (rename + 2 new entries), map.js (2 new
  buildings: Quarry, Mine), buildingUnlocks.js, buildingLevels.js,
  crafting.js (recipe changes), new upkeep.js, gameState.js
  (migration from grain→rice, new upkeep state)
