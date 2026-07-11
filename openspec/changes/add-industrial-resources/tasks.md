# Tasks: Industrial Resources

## 1. Rename grain → rice
- [ ] 1.1 Update RESOURCE_CONFIG: grain → rice (same values)
- [ ] 1.2 Rename grain_store building → rice_paddy across map.js,
      buildingUnlocks.js, buildingLevels.js, interactionHandlers.js
- [ ] 1.3 Add migration in gameState.js: old carried.grain → carried.rice,
      old buildingUnlocks/buildingLevels.grain_store → rice_paddy

## 2. New Raw Resources
- [ ] 2.1 Add stone, ore to RESOURCE_CONFIG (verify emoji render
      cross-platform before committing to icons)
- [ ] 2.2 Add Quarry building (stone) — map.js, buildingUnlocks.js,
      buildingLevels.js, interactionHandlers.js handler
- [ ] 2.3 Add Mine building (ore) — same, gated behind Quarry (needs
      stone in its unlock cost)
- [ ] 2.4 Verify map placement via collision check (same process as
      every prior building), place in existing resource cluster

## 3. Refined Goods (Workbench recipes)
- [ ] 3.1 Add 4 new recipes to crafting.js: chicken_feed, plank,
      brick, ingot
- [ ] 3.2 Remove the old feed_mix recipe
- [ ] 3.3 Confirm crafting panel UI handles 6 recipes cleanly (was 3,
      check for layout/scroll issues)

## 4. Egg Upkeep
- [ ] 4.1 Create upkeep.js: applyUpkeep() function, timestamp-based
- [ ] 4.2 Wire into main.js's game loop (once per frame)
- [ ] 4.3 Add upkeep state to gameState.js (createUpkeepState, save/load)
- [ ] 4.4 Surface "egg upkeep active" somewhere in the HUD (tooltip or
      small indicator) so the drain isn't invisible

## 5. Verification
- [ ] 5.1 Playtest: unlock Quarry → Mine in sequence, confirm ore
      genuinely requires stone first
- [ ] 5.2 Craft all 4 new refined goods, confirm inventory tracks
      them correctly
- [ ] 5.3 Confirm egg upkeep drains at expected rate with varying
      population sizes (5 workers vs 40 workers)
- [ ] 5.4 Confirm old saves migrate grain→rice cleanly, no data loss
- [ ] 5.5 Re-run the full import-graph check (catches silent breakage
      like the getBuildingStored incident)

## Explicitly deferred
- Upkeep consequences (production penalty, etc.) — needs its own
  design pass
- Hero/dungeon system — separate future proposal, NFT-related pieces
  stay behind legal review same as before
- Any use for refined goods beyond inventory storage
