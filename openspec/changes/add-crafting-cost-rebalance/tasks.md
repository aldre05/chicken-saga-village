# Tasks: Crafting Cost + Use-Case Rebalance

## Backend Engineer
- [ ] 1.0 **Blocked until design.md's Open Questions are answered** —
      confirm with the developer which items and what shape (cost
      increase vs. new use-case vs. both) before writing any code
- [ ] 1.1 Update `crafting.js` `RECIPES` costs per the confirmed
      answer
- [ ] 1.2 If a new use-case was chosen: implement it in whichever
      module it touches (Town Hall upgrade cost, quest requirement,
      etc.)

## Frontend Engineer
- [ ] 2.1 Verify updated costs render correctly in the Workbench
      panel (reuses existing cost-display code, shouldn't need new
      UI unless a new use-case was added elsewhere)
- [ ] 2.2 If a new use-case touches another panel (Town Hall, Quest
      Board), update that panel's display accordingly

## Code Reviewer
- [ ] 3.1 Verify new costs don't make any recipe permanently
      unaffordable at low Town Hall/building levels (a new player
      should still be able to reach every recipe eventually without a
      dead end)
- [ ] 3.2 Standard verification: syntax, full import-graph trace,
      `node --test`

## Documentation & Testing
- [ ] 4.1 Update `test/crafting.test.js` for new cost values
- [ ] 4.2 Update `openspec/specs/crafting-system/spec.md`
- [ ] 4.3 Update `memory.md`
