# Tasks: Click-to-Open Building Panels

## Backend Engineer
- [ ] 1.1 No backend logic changes expected — this is purely an
      interaction-trigger change. Confirm with Frontend once their
      work lands; pick up only if a data-layer gap surfaces.

## Frontend Engineer
- [ ] 2.1 Add canvas click listener + world-coordinate translation +
      hit-testing (per design.md)
- [ ] 2.2 Add `selectedBuildingId` state variable
- [ ] 2.3 Convert every panel-update function from `nearest`-driven
      to `selectedBuildingId`-driven: `updateBuildingPanel`,
      `updateCraftingPanel`, `updateDungeonPanel`, `updateHeroPanel`,
      the locked-building requirements panel
- [ ] 2.4 Update E-press handler to toggle `selectedBuildingId`
      instead of directly opening dialogue for panel-driven buildings
- [ ] 2.5 Update the "Press E to interact" prompt text to also
      mention clicking (e.g. "Press E or click to interact")
- [ ] 2.6 Verify Farmer Joe / Town Hall dialogue paths are unaffected

## Code Reviewer
- [ ] 3.1 Manually verify (or script) every single building type
      still opens its correct panel on click AND on E-press — this
      touches every building, easy to miss one
- [ ] 3.2 Verify walking out of range while a panel is open correctly
      closes it (no orphaned open panel for a building no longer in
      reach)
- [ ] 3.3 Verify clicking a building, then clicking a *different*
      building, correctly switches panels (not just toggles)
- [ ] 3.4 Standard verification: syntax, full import-graph trace,
      `npm test`

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
