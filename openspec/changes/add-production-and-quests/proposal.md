# Proposal: Resource Production + Quest System

## Why
The village currently has walkable buildings with static dialogue but
no actual gameplay loop. This proposal adds the first real loop:
buildings that produce a resource over time (collected by visiting
them), and a simple quest line that gives the player something to do
with that resource. Together these turn "a world you can walk around"
into "a world with a reason to walk around."

## What Changes
- **Resource production**: Old Coop passively produces eggs over time,
  stored up to a cap. Player must walk up and interact to collect —
  this replaces static dialogue with a real mechanic.
- **HUD**: a persistent egg counter (carried eggs) always visible,
  independent of the canvas world.
- **Quest system**: Farmer Joe becomes a quest giver with a short
  linear quest chain:
  1. "Collect 10 eggs from the Old Coop" (collection quest)
  2. "Deliver 10 eggs to the Market Stall" (delivery/turn-in quest —
     consumes carried eggs on completion)
- **Dynamic dialogue**: interactable dialogue now depends on state
  (quest not started / in progress / ready to turn in / completed)
  instead of being a fixed string.
- **Persistence**: localStorage save/load for carried eggs, coop's
  stored amount + last-collected timestamp (for offline-style
  accumulation, same pattern as chicken-idle-tycoon), and quest
  progress.

## Non-Goals (this change)
- DON'T add a full building-upgrade system yet — production rate/cap
  are fixed constants for now.
- DON'T add more than this one quest chain — daily/repeatable quests
  are a future proposal.
- DON'T add Supabase/accounts yet — localStorage only, consistent
  with chicken-idle-tycoon's own MVP phase.
- DON'T touch player movement or the tile map system — this only
  extends the interaction seam.

## Impact
- Affected specs: interaction-system (dialogue becomes dynamic),
  new specs: resource-production, quest-system
- Affected code: new resources.js, quests.js; map.js interactables
  gain state-aware dialogue; main.js wires HUD + persistence
