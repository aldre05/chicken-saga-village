# Tasks: Dungeon Failure Consequences

## Backend Engineer
- [x] 1.1 Add `currentHp` to hero creation (heroes.js) — initialize
      to rarity's max HP
- [x] 1.2 Add `getHealCost(hero)` and `healHero(hero, resourceState)`
      to heroes.js (checks affordability, spends, restores currentHp)
- [x] 1.3 Add `isDowned(hero)` helper
- [x] 1.4 Update `resolveDungeon()` in dungeons.js: failure sets
      currentHp to 0, removes the old 50%-partial-credit branch
      entirely
- [x] 1.5 Add heal action to the Barracks handler in
      interactionHandlers.js
      (Note: this breaks 2 pre-existing partial-credit tests in
      dungeons.test.js as expected fallout — updating/removing them
      is Documentation & Testing's 4.2, deliberately left for that
      role.)

## Frontend Engineer
- [ ] 2.1 Hero roster panel: visually mark downed heroes (greyed
      out or similar), disable "send to dungeon" for them, add a
      "Heal" button showing cost (reuse `formatCostHTML` for
      insufficient-resource red-highlighting)
- [ ] 2.2 Dungeon panel: show potential full reward + XP before
      sending, alongside existing entry cost
- [ ] 2.3 Floating popup / distinct visual feedback for a dungeon
      failure result vs. success (should read as clearly different
      outcomes, not just different text)

## Code Reviewer
- [ ] 3.1 Verify a downed hero genuinely cannot be sent to a dungeon
      (test the button-disabled state AND the underlying function,
      not just the UI)
- [ ] 3.2 Verify heal cost scales correctly per rarity (test all 3
      tiers)
- [ ] 3.3 Verify success path is completely unaffected by this change
      (full reward + XP, no regression)
- [ ] 3.4 Standard verification: syntax, full import-graph trace,
      `npm test`

## Documentation & Testing
- [ ] 4.1 `test/heroes.test.js`: heal cost, downed state, heal
      restoring to full HP
- [ ] 4.2 `test/dungeons.test.js`: failure sets currentHp to 0,
      verify old 50%-partial-credit test cases are removed/updated
- [ ] 4.3 Update `openspec/specs/hero-system/spec.md` and
      `dungeon-system/spec.md` to reflect the reversal — explicitly
      note *why* (this is a confirmed reversal of an earlier
      decision, not an oversight)
- [ ] 4.4 Update `memory.md` Decisions: record the reversal and the
      reasoning, per project convention of documenting decision
      changes rather than silently overwriting
