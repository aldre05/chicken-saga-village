# Design: Resource Production + Quest System

## Context
Builds directly on the village MVP. The interaction system was
already designed as a thin seam for exactly this kind of extension —
this change proves that out.

## Goals
- A satisfying "wander off, come back, collect" loop
- A short quest chain that teaches the collect → deliver pattern
  (mirrors Pixiland's progress-quest genre convention, in our own
  words/numbers)
- Keep buildings/quests data-driven so adding more of each later is
  additive, not a rewrite

## Non-Goals
- No building upgrades, no multiple resource types, no repeatable
  daily quests yet — all future proposals

## Resource Production

### Old Coop
- Produces eggs at a fixed rate: 0.5 eggs/sec
- Stored eggs cap at 30 (fills in ~60 seconds) — a cap exists so
  players can't infinitely AFK-stack; encourages return visits
  without punishing short absences
- On interact: if stored > 0, transfer all stored eggs to the
  player's carried total, reset stored to 0, reset the coop's
  accumulation timer
- Accumulation is timestamp-based (like chicken-idle-tycoon's offline
  progress), not tied to frame ticks, so it's correct even if the tab
  was closed: `stored = min(cap, rate * secondsSinceLastCollected)`

### HUD
- A fixed-position egg counter, outside the canvas, always visible
- Small "+N" popup animation on collect (reuse the floating-text
  pattern from chicken-idle-tycoon for visual consistency)

## Quest System

### Data model
```js
{
  id: 'collect_eggs_1',
  description: 'Collect 10 eggs from the Old Coop',
  type: 'collect_total',      // vs 'deliver'
  target: 10,
  trackedValue: 'totalEggsCollected', // cumulative, not carried
  reward: null                 // no reward system yet, just progression
}
```
- `collect_total` quests track a cumulative stat (so partial progress
  isn't lost by spending eggs)
- `deliver` quests check the player's *carried* eggs at turn-in time
  and subtract `target` from carried on completion
- Quest state: `{ activeQuestId, completedQuestIds: [] }` — a simple
  linear chain for now, not a quest graph

### Farmer Joe's dialogue states
- No active quest yet → offer the next quest in the chain
- Active, not yet met → show current objective + progress
  ("3 / 10 eggs collected")
- Active, requirement met, is a `deliver` type → "Turn in?" confirm
- All quests completed → a closing/thank-you message

### Market Stall's dialogue states
- Only relevant once the delivery quest is active — otherwise keeps
  its current "closed" placeholder message
- When the delivery quest is active and player has enough carried
  eggs → interacting there completes the quest directly (this is the
  "turn-in" location, not Farmer Joe)

## Persistence (localStorage)
```js
{
  carriedEggs: 0,
  totalEggsCollected: 0,
  coopStoredAt: 0,        // eggs stored at last check
  coopLastCollectedAt: <timestamp>,
  activeQuestId: 'collect_eggs_1',
  completedQuestIds: []
}
```
Save on interval + on page unload, same pattern as chicken-idle-tycoon.

## Risks / Open Questions
- Only one production building for now (Old Coop) — Market Stall and
  any future buildings don't produce yet, they're quest/economy hooks
  only. Fine for this scope, flag if that reads as inconsistent to
  players once we add more buildings.
