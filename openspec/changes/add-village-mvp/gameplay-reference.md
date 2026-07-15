# Gameplay Reference: Genre Patterns (Pixiland-style)

Summarized in our own words for internal design reference only —
not copied from any source, no specific assets/text/branding reused.
This documents genre conventions, not anything IP-specific.

## Core loop pattern
- Central hub building gates progression/rank
- Population buildings (houses) unlock worker slots
- Resource buildings (food/wood/stone/iron equivalents) produce
  per-minute, scaled by building level + assigned workers
- Two currency layers: a "soft" currency (skip timers, common) and a
  "hard/prestige" currency (rarer, ties to rank/leaderboard)

## Collectible unit layer
- Units obtained via randomized packs, rarity tiers
- Duplicate units can merge/combine to level up, capped at a max tier

## Timed content
- Repeatable timed missions (auto-resolved or auto-battle), entry
  costs resources, rewards scale with unit power + difficulty tier,
  cooldown gated (paid currency can skip)

## Retention hooks
- Daily quest line (small, repeatable, resets daily)
- Progress quest line (core loop milestones)
- Daily gacha-style spin mechanic, ad-gated bonus, paid tier removes ads

## Asymmetric PvP
- Players can raid/steal resources from other players' towns
- A defensive item/mechanic can shield against being raided

## Monetization layer (NOT part of this project's MVP)
- NFT ownership tied to land/buildings/units
- A project token with dedicated reward pools
- Flag: gacha/spin mechanics with real-value rewards are the area
  most likely to draw loot-box/gambling regulatory scrutiny —
  handle with real legal review before ever building this layer.

## How this maps to Chicken Village
- Hub → Farm/Coop center
- Houses → Coops (population/worker slots)
- Resource buildings → existing chicken-idle-tycoon building tiers
  (eggs, feed, etc.) — reusable concept, not reused code
- Units → collectible chickens (future proposal)
- Dungeons → timed "adventures" (future proposal)
- PvP raiding, gacha wheel, tokens → explicitly deferred, own future
  proposals, monetization ones need legal review first
