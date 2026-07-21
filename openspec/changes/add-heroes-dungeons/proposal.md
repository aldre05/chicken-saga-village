# Proposal: Heroes + Dungeons (non-NFT)

## Why
The village has a full economy loop but nothing to *do* with a
mature village beyond producing more resources. Heroes + dungeons add
a second loop (recruit → send on timed missions → earn rewards +
hero XP) using the same "build it free first, prove the loop is fun,
NFT/ownership conversation happens later and separately" approach
already validated by the Lucky Wheel. This also gives Feathers the
functional role it's been reserved for since the industrial-resources
change.

## What Changes
- **Barracks** (new building): recruit heroes using Feathers + Egg.
  Gacha-style weighted rarity table (Common/Rare/Epic), same pattern
  as the Lucky Wheel's reward table — reuses a proven mechanic rather
  than inventing a new one.
- **Heroes**: simple stat block (attack, defense, hp), rarity, level.
  Gain XP and level up by completing dungeons. No merge/fusion system
  in this change (see Non-Goals) — kept simple for v1.
- **Dungeon Gate** (new building): 3 difficulty tiers (Easy/Medium/
  Hard). Send one hero at a time on a timed mission (real-world
  minutes, same timestamp-based pattern as everything else in this
  codebase). Auto-resolves on completion — no combat mini-game, just
  a stat-vs-difficulty check, transparent to the player.
- Rewards: resources (scaled by difficulty) + hero XP. A busy hero
  can't be sent on a second mission until the first resolves.

## Non-Goals (this change)
- DON'T make heroes NFTs, ownable, or tradeable. Free in-game data
  only — same boundary as every prior change in this category.
- DON'T build a marketplace/buy-sell system for heroes or anything
  else. Stays behind legal review regardless of how this system
  turns out.
- DON'T build PvP or land battles — explicitly called out as a
  separate, later concept when this was first discussed, and still
  not this change.
- DON'T build hero merging/fusion yet — leveling via dungeon XP only
  for v1. Merge mechanics are a natural follow-up once the base loop
  is proven fun.
- DON'T let refined goods (Chicken Feed/Plank/Brick/Ingot) factor into
  this change — their hero-related use (gear crafting, etc.) is a
  separate future decision, not bundled in here.
- DON'T touch multiplayer — dungeons resolve against a fixed
  difficulty number, not other players.

## Impact
- New specs: hero-system, dungeon-system
- New code: heroes.js, dungeons.js, new Barracks + Dungeon Gate
  buildings (map.js, buildingUnlocks.js, interactionHandlers.js), a
  hero-roster/dungeon-selection panel in main.js
- Affected: gameState.js (new hero roster + dungeon state), HUD
  (possibly a hero-count indicator)
