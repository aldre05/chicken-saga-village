# Tasks: Heroes + Dungeons

## Backend Engineer

- [x] 1.1 Create `heroes.js`: hero data model, rarity table, weighted
      recruit roll (reuse `luckyWheel.js`'s weighted-pick pattern —
      don't reimplement), `effectivePower()`, XP/leveling logic
- [x] 1.2 Create `dungeons.js`: tier config (table in design.md),
      `sendHeroToDungeon()`, `resolveDungeon()` (lazy resolution
      pattern, same as Lucky Wheel ticket accrual)
- [x] 1.3 Add Barracks + Dungeon Gate to `buildingUnlocks.js`
      (`UNLOCK_CONFIG` entries per design.md costs)
- [x] 1.4 Add hero roster state (`gameState.heroes.roster`) to
      `gameState.js` — `createGameState()`, `loadGameState()`
      (new saves only, no migration needed since this is new state)
- [x] 1.5 Add Barracks + Dungeon Gate handlers to
      `interactionHandlers.js` (unlock flow matches every other
      building — locked shows requirements, E-press shows info only,
      actual recruit/send actions are button-driven per the
      established pattern)

## Frontend Engineer

- [x] 2.1 Add Barracks + Dungeon Gate to `map.js`, collision-verify
      (same script pattern used for every prior building — zero
      overlaps, nothing on solid tiles)
- [x] 2.2 Build a hero-roster panel (Barracks): shows recruit cost +
      button, lists owned heroes with rarity/level/power/busy-status
- [x] 2.3 Build a dungeon-selection panel (Dungeon Gate): pick an idle
      hero + a tier, shows entry cost (red-highlighted if
      unaffordable, reuse `formatCostHTML`), Send button
- [x] 2.4 Show dungeon countdown (Xm Ys remaining) for a busy hero,
      same countdown-formatting pattern as the Lucky Wheel widget
- [x] 2.5 Floating popup + result display on dungeon resolution
      (full-success vs partial-credit should look/read differently)

## Code Reviewer

- [ ] 3.1 Verify recruit weighted-roll matches the rarity table
      exactly (write/extend tests — this project keeps persistent
      tests in `test/`, not throwaway scripts, per standing decision)
- [ ] 3.2 Verify dungeon resolution math: full reward at power ≥
      difficulty, exactly 50% (floored) below it — test boundary case
      (power == difficulty exactly)
- [ ] 3.3 Verify a busy hero genuinely can't be double-sent, including
      an edge case: sending right as `busyUntil` passes
- [ ] 3.4 Full project verification standard: syntax check, full
      import-graph trace, `npm test` all passing before sign-off
- [ ] 3.5 Confirm this change didn't touch anything in the
      NFT/monetization non-goals list — flag immediately if it did

## Documentation & Testing

- [ ] 4.1 Write `test/heroes.test.js`, `test/dungeons.test.js`
      (persistent, per standing decision — not temp scripts)
- [ ] 4.2 New specs: `openspec/specs/hero-system/spec.md`,
      `openspec/specs/dungeon-system/spec.md`, reflecting actual
      shipped behavior (not the proposal — specs describe what's
      real, per this project's established convention)
- [ ] 4.3 Update `openspec/specs/world-map/spec.md` for the 2 new
      buildings (building count, cluster placement)
- [ ] 4.4 Delete `openspec/changes/` folder for this proposal once
      merged into specs (standard archive step)
- [ ] 4.5 Update `memory.md`: Completed Tasks, Next Recommended Task,
      Session Log

## Explicitly deferred (do not build in this batch)
- Hero NFTs, ownership, trading/marketplace
- PvP, land battles
- Hero merge/fusion system
- Refined goods (Chicken Feed/Plank/Brick/Ingot) as hero materials
- Multi-hero parties per dungeon run
