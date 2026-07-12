# Spec: Quest Board

## Current State (implemented)
Farmer Joe is a real quest board, not a linear tutorial hint anymore
(that was the original design, replaced entirely). Talking to him:
1. Auto-claims any quest whose completion condition is already met
   (grants the reward immediately, no separate confirm step)
2. Shows the remaining not-yet-claimed quest list with descriptions
   and rewards
3. Claimed quests never reappear (tracked via `claimedQuestIds`)

9 quests currently defined in `questBoard.js`, covering the early-game
loop end to end: assign a worker, collect eggs, unlock each secondary
building (Nest Bundle, Woodshed, Rice Paddy, Quarry, Mine), upgrade
Town Hall, spin the Lucky Wheel, craft an item. Each quest's `check()`
function reads existing game state directly — no separate progress
tracker to keep in sync or drift from reality.

## Constraints for future changes
- New quests just need a `check(gameState)` function and a
  `reward` dict — the claim/list/dialogue logic is fully generic and
  doesn't need touching for ordinary new quests.
- If quest *ordering* or prerequisites ever matter (vs. today's "show
  everything not yet claimed" model), that's a real design change,
  not a drop-in addition.
