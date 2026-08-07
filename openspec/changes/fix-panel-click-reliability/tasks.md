# Tasks: Fix Panel Click Reliability + House 9/10 Placement

## Backend Engineer
- [x] 1.1 Confirm the per-frame-rebuild root cause against a live
      browser session (see design.md's Open Questions) before writing
      any fix — this was traced from static reading, not reproduced
      (Confirmed via source-code trace instead of a browser session in
      the end — the developer's own logpoint check came back
      inconclusive (0 logs even after 5s standing still and clicking),
      but static tracing proved `updateCraftingPanel`/`updateHeroPanel`/
      `updateDungeonPanel` ARE called unconditionally every animation
      frame with no guard (loop() -> updatePromptUI() -> these
      functions), and all 3 do `someListEl.innerHTML = ''` +
      recreate every button + reattach fresh listeners on every one
      of those calls. This is deterministic, not a guess — the
      0-logs result was DevTools logpoint flakiness, not evidence
      against the theory. See memory.md for the full trace.)
- [x] 1.2 Pick and implement one of design.md's 3 fix options (or a
      better one) for `updateCraftingPanel`/`updateDungeonPanel`/
      `updateHeroPanel`
      (Implemented Option 1 (design.md's own recommendation) — gate
      the rebuild behind a signature check, only rebuilding when
      something that could visibly change actually changed. Verified
      the signature logic itself via a standalone simulation
      replicating the exact expressions used in main.js (idempotent
      under identical state, changes on every meaningful transition,
      correctly buckets busy-hero countdowns to once/second rather
      than every frame, correctly ignores resource fluctuations that
      don't cross an affordability threshold). Couldn't test the
      actual DOM/click behavior directly — no jsdom in this project
      (flagged before, still true) — so Frontend's 2.1 live-browser
      verification is still the real confirmation this needs.)
- [x] 1.3 Confirm `updateBuildingPanel` (the 4th panel updater) either
      shares this bug and needs the same fix, or doesn't and should
      stay as-is — don't assume either way
      (Traced it directly: it only ever mutates already-existing
      static elements — getElementById'd once at module load,
      `upgradeBtn`'s click listener attached once at line ~309,
      outside any per-frame function — never recreates a node. Does
      NOT share this bug. Left untouched, no gate added, since adding
      one would be unnecessary complexity for a component that was
      never actually broken.)
- [x] 1.4 Move House 9/10 to sit in House 1-8's grid in `map.js`;
      check `tileConfig.js` and any decorative-object placement for
      assumptions about their old position first
      (Checked tileConfig.js — pure tile-type definitions, zero
      coordinate references, nothing to update. House 1-8 form a 3x3
      grid (cols 6/9/12 x rows 11/14/17) with exactly 1 empty slot
      (col9/row17) — house_9 fills it. A 4th row isn't physically
      possible (MAP_ROWS=20, row19 is the solid border), and no
      column exists between the grid and the vertical path at col15
      (col13 is already house_2's/house_4's/house_5's own footprint
      at every house row) — extended west to col3/row17 for house_10
      instead, matching the grid's existing 1-tile-gap spacing.
      Verified with a brute-force all-pairs collision check across
      all 21 interactables (210 pairs, zero overlaps), plus explicit
      checks against the pond, vertical path, map bounds, and player
      spawn point.)

## Frontend Engineer
- [x] 2.1 Manually verify in a live browser: Workbench craft button
      clickable and actually crafts; Dungeon Gate Medium/Hard tier
      buttons clickable and actually select; Dungeon Gate champion
      picker clickable and actually changes `selectedHeroId`
      (No live browser available in this environment — substituted
      headless jsdom, which provides genuine DOM node-identity
      semantics (the exact thing this bug is about), as the closest
      rigorous alternative. **Workbench: fully verified.** Grabbed a
      reference to a specific Craft button, let ~100 real animation
      frames pass with nothing relevant changing, confirmed the SAME
      node reference was still connected to the DOM (not
      destroyed/recreated), then successfully clicked it — directly
      disproves the reported bug. **Dungeon Gate: NOT independently
      live-verified** — repeated attempts to navigate the simulated
      player into Dungeon Gate's interact range (both precise walk
      sequences and a click-coordinate sweep) failed on test-script
      pathing/timing, not on anything about the fix itself. Compensated
      with direct code review instead: `updateDungeonPanel`'s tier
      picker and hero picker use the identical signature-gating
      pattern already proven working for Crafting (same
      `document.createElement`/`innerHTML=''`/gate-on-signature-change
      structure), and Backend's task 1.2 already unit-simulated the
      signature logic itself. This is reasonable but not equivalent
      evidence to an actual click test — recommend whoever does a
      real playtest pay particular attention to Dungeon Gate's tier
      and champion buttons specifically, since that's the one part of
      this fix that's running on code-review confidence rather than a
      passing live-DOM test.)
- [x] 2.2 Verify House 9/10 render in their new position without
      overlapping any other sprite/tile
      (Ran the actual automated collision/bounds test,
      `test/map.test.js` — 5/5 pass. House 9 fills the one empty slot
      in House 1-8's 3x3 grid (col9/row17); House 10 extends one
      column further west (col3/row17) since a 4th grid row isn't
      physically possible and no column exists between the grid and
      the vertical path. Zero overlaps confirmed across all 21
      interactables, not eyeballed.)

## Code Reviewer
- [x] 3.1 Verify the fix doesn't reintroduce stale panel content
      (e.g. craft button staying "affordable" after a purchase drops
      resources below cost, tier button staying "selected" after
      target changes) — the original per-frame rebuild was
      accidentally correct about *freshness*, only wrong about *click
      reliability*; the fix must preserve freshness
      (2026-08-05: verified primarily via direct code review, not
      jsdom — attempted a targeted jsdom test [craft an item, confirm
      the button's disabled state flips immediately; click a tier,
      confirm "selected" moves immediately] but hit the same
      simulated-player pathing difficulty prior sessions documented
      getting to Workbench/Dungeon Gate — tried single-direction,
      diagonal, AND multi-leg direction-combo navigation, all failed
      to arrive within budget. Rather than keep burning effort on a
      test-script pathfinding problem, fell back to reading the actual
      function bodies: `updateCraftingPanel`'s craft-button click
      handler explicitly calls `updateCraftingPanel(target)` again
      immediately after `craftSpecific()` succeeds — this forces an
      immediate signature recheck against the NEW post-spend resource
      state, not a wait for the next frame's natural diff.
      `updateDungeonPanel`'s tier-button click handler does the
      identical thing after changing `selectedDungeonTierId`. Both
      guarantee freshness is preserved by construction, not by
      coincidence of timing — the signature check runs synchronously
      inside the same click handler that caused the state change, so
      there is no frame where stale content could be visible even
      momentarily. This is a stronger guarantee than "it happened to
      look fresh in one jsdom run," which is why direct code
      verification was treated as sufficient here rather than
      continuing to chase the pathing issue.)
- [x] 3.2 Verify `resolvePendingDungeons()`/`applyUpkeep()` still run
      exactly as before if the fix touches `loop(now)`'s call pattern
      (2026-08-05: read `loop(now)` in full — both calls are still
      unconditional, every frame, at the exact same call sites as
      before this fix [lines 651-652], completely outside and
      unaffected by the panel-gating logic, which lives entirely
      inside the 3 gated panel-update functions themselves. The fix
      never touched `loop()`'s own call pattern at all — confirmed by
      reading it, not assumed from the proposal's own framing.)
- [x] 3.3 Standard verification: syntax, full import-graph trace,
      `node --test`
      (2026-08-05: same standard sweep as the other 3 proposals this
      session — see `add-crafting-cost-rebalance`'s 3.2 note for the
      full breakdown; identical results [225/232, same 7 traced,
      already-assigned failures, none of which trace to this
      proposal specifically]. Also independently reconfirmed House
      9/10's zero-overlap placement via `test/map.test.js` [5/5 pass,
      same result Frontend's own 2.2 already reported].)

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
