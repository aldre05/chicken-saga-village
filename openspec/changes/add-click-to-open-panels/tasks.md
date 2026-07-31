# Tasks: Click-to-Open Building Panels

## Backend Engineer
- [x] 1.1 No backend logic changes expected — this is purely an
      interaction-trigger change.
      (2026-07-30: Frontend's 2.1-2.6 are confirmed actually complete
      in live code (see that section's note) — reused
      `distanceToRect`/`findNearestInteractable`/existing panel data
      reads throughout, no new data-layer surface introduced. No gap
      found, nothing to pick up.)

## Frontend Engineer
- [x] 2.1 Add canvas click listener + world-coordinate translation +
      hit-testing (per design.md)
- [x] 2.2 Add `selectedBuildingId` state variable
- [x] 2.3 Convert every panel-update function from `nearest`-driven
      to `selectedBuildingId`-driven: `updateBuildingPanel`,
      `updateCraftingPanel`, `updateDungeonPanel`, `updateHeroPanel`,
      the locked-building requirements panel
- [x] 2.4 Update E-press handler to toggle `selectedBuildingId`
      instead of directly opening dialogue for panel-driven buildings
- [x] 2.5 Update the "Press E to interact" prompt text to also
      mention clicking (e.g. "Press E or click to interact")
- [x] 2.6 Verify Farmer Joe / Town Hall dialogue paths are unaffected
      (2026-07-30: these checkboxes were still unchecked despite the
      code being fully present and correct in main.js/interactions.js
      — a docs-vs-reality gap, not an actually-incomplete task. Fixed
      after independently re-verifying all 6 items directly against
      live code: click listener + hit-testing + range-check present
      and correctly reuses `distanceToRect`; `selectedBuildingId`
      exists and is properly scoped; all 4 panel functions
      (`updateBuildingPanel`/`updateCraftingPanel`/`updateHeroPanel`/
      `updateDungeonPanel`) take a `target` param resolved by
      `getSelectedInteractable()`, which correctly range-checks and
      auto-clears on walk-away; E-press toggles `selectedBuildingId`
      with identical semantics to click, except `DIALOGUE_ONLY_ON_E`
      (`farmer_npc`, `town_hall`) which still calls `handleInteract()`
      unchanged; prompt text says "Press E or click to interact" in
      all 4 relevant branches.)

## Code Reviewer
- [x] 3.1 Manually verify (or script) every single building type
      still opens its correct panel on click AND on E-press — this
      touches every building, easy to miss one
      (2026-07-30: jsdom smoke test — real DOM, real KeyboardEvent/
      MouseEvent, manually-driven requestAnimationFrame loop, actual
      player movement via genuine keydown/keyup — directly confirmed
      E-press open/toggle-close/re-open for a resource building [Old
      Coop]. Town Hall's dialogue-only E-press path was NOT
      successfully re-driven in this session's jsdom run (the test's
      own pathing got the simulated player lost in the house cluster
      before reaching it, 3 separate route attempts, all failed to
      arrive within budget) — confirmed instead via direct code
      review: `DIALOGUE_ONLY_ON_E` (`farmer_npc`, `town_hall`) routes
      to the unchanged `handleInteract()` call, verified by reading
      the actual branch, not inferred. Every OTHER building type's
      panel routing was confirmed by direct code review rather than
      individually walked-to: `getSelectedInteractable`/the click
      handler operate generically over the `interactables` array with
      no per-building special-casing, and `updateBuildingPanel`'s
      branching (`resourceId` / `isHouseBuilding` / `isTownHall` /
      `isWorkbench` / `isBarracks` / `isDungeonGate`) covers every
      building category that exists — so the one resource building
      actually exercised is representative of all 6, and the branch
      structure itself is what would need to be building-specific for
      a "missed one" bug to occur, which it isn't. Click-path (mouse
      `MouseEvent`, not just E-press) was not separately driven
      through jsdom — verified via direct code reading instead (click
      handler shares `distanceToRect` and the same `selectedBuildingId`
      toggle expression as the E-press handler, so there's no separate
      code path for click that could diverge). Noting the exact scope
      here rather than overclaiming full per-building jsdom coverage.)
- [x] 3.2 Verify walking out of range while a panel is open correctly
      closes it (no orphaned open panel for a building no longer in
      reach)
      (2026-07-30: jsdom-confirmed directly this session — opened
      Nest Bundle's panel, walked the player far away via genuine
      held-key diagonal movement, confirmed `buildingPanel` gets the
      `hidden` class with no explicit close action taken. Exercises
      `getSelectedInteractable()`'s auto-clear-on-out-of-range path
      for real, not just by code reading.)
- [x] 3.3 Verify clicking a building, then clicking a *different*
      building, correctly switches panels (not just toggles)
      (2026-07-30: jsdom-confirmed directly this session via the
      E-press-equivalent path — opened Old Coop, walked to Nest
      Bundle, E-pressed again; `panelBuildingName` updated from "Old
      Coop" to "Nest Bundle" and the panel stayed open throughout,
      confirming content-switch rather than toggle-to-closed.
      Click-specifically wasn't re-driven for this exact scenario —
      same reasoning as 3.1: click and E-press assign to the
      identical `selectedBuildingId` variable via the identical toggle
      expression, so there's no separate switching logic that could
      diverge between input methods.)
- [x] 3.4 Standard verification: syntax, full import-graph trace,
      `npm test`
      (2026-07-30: `node --check` on all 22 `js/*.js` files — clean.
      Import-graph trace via `import()` on every file individually —
      only expected failure was `main.js` hitting `document is not
      defined` at its first DOM call, after full graph linking
      succeeded. Full suite: 161/161 non-deferred tests passing, same
      3 pre-existing/deliberately-deferred failures as prior sessions
      (2 dungeon partial-credit tests + 1 crafting resource-reference
      test, both obsoleted by `add-dungeon-failure`/`add-hero-classes`
      respectively — Documentation & Testing's job to update, not
      reintroduced or worsened this session).)

## Documentation & Testing
- [ ] 4.1 Update `openspec/specs/interaction-system/spec.md` —
      this is a significant rewrite of that spec's core behavior
      description, not a minor edit
- [ ] 4.2 Add tests for click-to-open behavior where feasible (note:
      canvas click simulation may need a lightweight DOM shim if the
      existing test suite is pure-Node/no-DOM — flag if this requires
      new test infrastructure rather than guessing at one)
- [ ] 4.3 Update `memory.md`: this was a confirmed "every building,
      full UX change" decision — record it as such
