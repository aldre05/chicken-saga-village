# Tasks: Fix Panel Click Reliability + House 9/10 Placement

## Backend Engineer
- [ ] 1.1 Confirm the per-frame-rebuild root cause against a live
      browser session (see design.md's Open Questions) before writing
      any fix — this was traced from static reading, not reproduced
- [ ] 1.2 Pick and implement one of design.md's 3 fix options (or a
      better one) for `updateCraftingPanel`/`updateDungeonPanel`/
      `updateHeroPanel`
- [ ] 1.3 Confirm `updateBuildingPanel` (the 4th panel updater) either
      shares this bug and needs the same fix, or doesn't and should
      stay as-is — don't assume either way
- [ ] 1.4 Move House 9/10 to sit in House 1-8's grid in `map.js`;
      check `tileConfig.js` and any decorative-object placement for
      assumptions about their old position first

## Frontend Engineer
- [ ] 2.1 Manually verify in a live browser: Workbench craft button
      clickable and actually crafts; Dungeon Gate Medium/Hard tier
      buttons clickable and actually select; Dungeon Gate champion
      picker clickable and actually changes `selectedHeroId`
- [ ] 2.2 Verify House 9/10 render in their new position without
      overlapping any other sprite/tile

## Code Reviewer
- [ ] 3.1 Verify the fix doesn't reintroduce stale panel content
      (e.g. craft button staying "affordable" after a purchase drops
      resources below cost, tier button staying "selected" after
      target changes) — the original per-frame rebuild was
      accidentally correct about *freshness*, only wrong about *click
      reliability*; the fix must preserve freshness
- [ ] 3.2 Verify `resolvePendingDungeons()`/`applyUpkeep()` still run
      exactly as before if the fix touches `loop(now)`'s call pattern
- [ ] 3.3 Standard verification: syntax, full import-graph trace,
      `node --test`

## Documentation & Testing
- [ ] 4.1 Add regression coverage if feasible given this project's
      existing test approach (this is a DOM-timing bug — check
      whether it's realistically unit-testable with this project's
      current no-jsdom setup, or whether it's better covered by a
      manual playtest checklist item; don't force a test that doesn't
      fit rather than skip coverage)
- [ ] 4.2 Update `openspec/specs/` for crafting-system/dungeon-system/
      hero-system/world-map if the fix changes any documented behavior
      (it shouldn't — this is a bug fix, not a behavior change — but
      confirm)
- [ ] 4.3 Update `memory.md`
