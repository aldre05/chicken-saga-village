# Tasks: Crafting Cost + Use-Case Rebalance

## Backend Engineer
- [x] 1.0 **Blocked until design.md's Open Questions are answered** —
      confirm with the developer which items and what shape (cost
      increase vs. new use-case vs. both) before writing any code
      (Developer confirmed: both refined goods AND equipment;
      cost-increase-only, no new use-case; target multiple given as
      an illustrative example, not a literal figure to calibrate
      against — see memory.md 2026-08-03 entry for the exact numbers
      chosen and reasoning.)
- [x] 1.1 Update `crafting.js` `RECIPES` costs per the confirmed
      answer
      (Also found design.md's own "Context" baseline is stale — it
      doesn't match the live file, describing a refined-goods supply
      chain (sword costing ingot, staff costing chicken_feed, etc.)
      that was never actually implemented. Verified and rebalanced
      against the REAL live costs instead. Side finding: brick/ingot
      have zero consumers anywhere even after this change — worse
      than design.md's own "thin use-case" framing assumed. Not
      fixed, since developer chose cost-increase-only this pass; see
      memory.md.)
- [x] 1.2 If a new use-case was chosen: implement it in whichever
      module it touches (Town Hall upgrade cost, quest requirement,
      etc.)
      (N/A — developer explicitly chose cost-increase-only.)

## Frontend Engineer
- [x] 2.1 Verify updated costs render correctly in the Workbench
      panel (reuses existing cost-display code, shouldn't need new
      UI unless a new use-case was added elsewhere)
      (Confirmed: all 13 recipes' cost ids are covered by
      `RESOURCE_CONFIG` or `ITEM_CONFIG` — no crash risk, same
      generic `formatCostHTML`/`RECIPES`-loop rendering already
      proven working for every prior recipe addition this project.
      No code changes needed.)
- [x] 2.2 If a new use-case touches another panel (Town Hall, Quest
      Board), update that panel's display accordingly
      (N/A — developer explicitly chose cost-increase-only, no new
      use-case, per Backend's task 1.2 confirmation.)

## Code Reviewer
- [x] 3.1 Verify new costs don't make any recipe permanently
      unaffordable at low Town Hall/building levels (a new player
      should still be able to reach every recipe eventually without a
      dead end)
      (2026-08-05: scripted — every recipe's cost, resource-by-resource,
      checked against `RESOURCE_CONFIG`'s base caps (all costs land
      well under even the un-scaled base cap, before any level-scaling
      even applies); `boots`' item-based `plank` cost confirmed to
      reference a real, craftable recipe, not a dead reference.
      Simulated crafting ALL 13 recipes end-to-end from a
      fully-resourced state, in dependency order (raw-resource recipes
      first, then `boots` after enough `plank` exists) — every single
      one actually succeeds, not just cost-inspected. Confirmed every
      raw resource referenced across all 13 recipes unlocks by TH10 at
      the latest (max is TH5 for rice/ore), so nothing is gated behind
      an unreachable Town Hall level either. No recipe is a dead end
      at any point in progression.)
- [x] 3.2 Standard verification: syntax, full import-graph trace,
      `node --test`
      (2026-08-05: `node --check` on all 22 `js/*.js` files — clean.
      Import-graph trace via `import()` on every file individually —
      no stale-import regressions. Full suite: 225/232 passing. The 7
      failures split across `buildingLevels.js` (1, from
      `add-tiered-production-scaling`), `crafting.js` (4, this
      proposal's own cost/shape changes), and `luckyWheel.js` (2, from
      `add-crafting-cost-rebalance`/`add-gems-currency`'s REWARD_TABLE
      changes) — all traced to specific, already-known-and-assigned
      causes (Documentation & Testing's 4.1 for each proposal), none
      unexplained or newly introduced by this review.)

## Documentation & Testing
- [ ] 4.1 Update `test/crafting.test.js` for new cost values
- [ ] 4.2 Update `openspec/specs/crafting-system/spec.md`
- [ ] 4.3 Update `memory.md`
