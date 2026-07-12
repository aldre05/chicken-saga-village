# Tasks: Building Unlock/Upgrade Rework + Onboarding + QoL

## 1. Building Unlocking
- [ ] 1.1 Create buildingUnlocks.js: unlock config table, cost check,
      unlock action, per-building TH requirement
- [ ] 1.2 Update interactionHandlers.js: every resource building
      handler checks unlock status first, shows cost/requirement if
      locked, unlocks on interact if affordable
- [ ] 1.3 Update render.js/map rendering: locked-but-visible buildings
      show a distinct "not yet built" visual state (dimmer, or a
      generic silhouette) vs. fully locked-by-TH-level buildings

## 2. Building Leveling
- [ ] 2.1 Create buildingLevels.js: level state, upgrade cost formula,
      maxWorkers/rateMultiplier formulas
- [ ] 2.2 Update resources.js's rate calculation to factor in building
      level, not just worker count
- [ ] 2.3 Update workers.js: replace flat MAX_WORKERS_PER_BUILDING
      with a per-building lookup from buildingLevels.js
- [ ] 2.4 Add an upgrade action to each resource building's handler
      (separate key or same E-press when collect yields 0 — decide
      during implementation which feels better)
- [ ] 2.5 Handle existing saves with worker assignments above the new
      level-1 cap — clamp down gracefully, don't crash

## 3. Auto-Claim
- [ ] 3.1 Add an auto-claim function that loops all unlocked resource
      buildings and collects from each
- [ ] 3.2 Add a HUD button, wire to the function, show a single
      summary popup

## 4. Rate + Time Display
- [ ] 4.1 Add rate/min calculation + display to each resource
      building's prompt/dialogue
- [ ] 4.2 Extend the House construction live prompt to show seconds
      remaining alongside percentage

## 5. Market Stall Removal
- [ ] 5.1 Remove market_stall from map.js
- [ ] 5.2 Remove its handler from interactionHandlers.js

## 6. Farmer Joe Onboarding
- [ ] 6.1 Create tutorial.js: TUTORIAL_STEPS array + step-check logic
- [ ] 6.2 Rewrite farmer_npc handler to show first incomplete step
- [ ] 6.3 Remove quests.js usage from interactionHandlers.js (leave
      the file in place, just unused, per design.md's no-migration
      call)

## 7. House Slot Gating
- [ ] 7.1 Add per-house-slot Town Hall requirement table to workers.js
- [ ] 7.2 Update startHouseConstruction to check the new slot's TH
      requirement before cost

## 8. Persistence & Verification
- [ ] 8.1 Extend gameState.js schema: buildingUnlocks, buildingLevels
- [ ] 8.2 Playtest full loop: unlock every building in order, level
      up Old Coop a few times and confirm rate/worker-cap increase,
      auto-claim with multiple buildings active, verify Farmer Joe's
      guidance advances correctly as each step is completed
- [ ] 8.3 Confirm old saves load without crashing (worker clamp-down,
      unused quests field)

## Explicitly deferred
- Everything already deferred in prior proposals (NFTs, land,
  monetization, multiplayer, marketplace)
