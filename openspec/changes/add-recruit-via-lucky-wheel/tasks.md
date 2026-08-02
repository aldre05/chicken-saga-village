# Tasks: Recruit Heroes via Lucky Wheel Only

## Backend Engineer
- [x] 1.1 Split hero-creation out of `recruitHero()` into a
      cost-free `createRolledHero()` per design.md, without breaking
      anything that still calls `recruitHero()` directly (check for
      other callers first — don't assume Barracks is the only one)
      (Grepped js/ and test/ first: recruitHero() is called from
      main.js's Barracks button AND directly from heroes.test.js and
      dungeons.test.js. Kept recruitHero()'s exact existing signature
      and behavior — it's now a thin wrapper: cost check + spend +
      createRolledHero() + push. Verified identical object shape via
      simulation, and that recruitHero() still charges/rejects exactly
      as before.)
- [x] 1.2 Add the "hero" reward-table entry to `luckyWheel.js` and the
      resource-vs-hero branch `spinWheel()` needs (same shape of
      change as add-dungeon-keys' key-reward branch if that ships
      first — coordinate rather than duplicating the branching logic
      twice if both land close together)
      (Both branches (item, hero) live in the same conditional chain
      inside spinWheel(), not two parallel implementations. Required
      a new `rosterState` param on spinWheel() — updated its one real
      call site in main.js. This also creates a circular import
      (heroes.js already imports pickWeighted from luckyWheel.js;
      luckyWheel.js now imports createRolledHero from heroes.js) —
      verified empirically at runtime, not just via syntax check, that
      it resolves correctly, since both sides only use the import
      inside function bodies rather than at top-level evaluation.)
- [x] 1.3 Confirm whether `RECRUIT_COST`/`canRecruitHero` become fully
      dead code once the Barracks button is removed; if so, flag for
      Documentation & Testing to clean up rather than deleting
      unilaterally mid-Backend-pass
      (Not literally dead code even after Frontend removes the
      Barracks button: recruitHero() — which still has real callers in
      heroes.test.js/dungeons.test.js — internally depends on both.
      What DOES go away is their *production-UI* reachability: once
      the Barracks recruit button is gone, RECRUIT_COST/canRecruitHero
      are only reachable via recruitHero()'s internals and their own
      dedicated tests, not any player-facing path. Flagging for
      Documentation & Testing to decide whether to (a) leave
      recruitHero()/RECRUIT_COST/canRecruitHero as supported legacy
      internals purely for test convenience, or (b) refactor
      heroes.test.js/dungeons.test.js to call createRolledHero()
      directly and then actually remove recruitHero()/RECRUIT_COST/
      canRecruitHero as truly dead. Deliberately not deciding this
      unilaterally, per the task's own instruction.)

## Frontend Engineer
- [x] 2.1 Remove the Barracks recruit button + `RECRUIT_COST` display
- [x] 2.2 Add a short static line pointing players to the Lucky Wheel
      instead (per design.md — don't leave an unexplained gap)
- [x] 2.3 Lucky Wheel spin result: distinct visual/popup treatment for
      landing on a hero vs. a resource reward (this is the biggest
      possible spin outcome, should read as a genuinely different
      moment, not just different text — same principle already
      applied to dungeon success vs. failure popups)

## Code Reviewer
- [ ] 3.1 Verify a hero-reward spin actually adds a correctly-shaped
      hero to the roster (all fields present, matches what
      `recruitHero()` used to produce)
- [ ] 3.2 Verify no resources are spent on a hero-reward spin beyond
      the ticket itself (no accidental double-charge from leftover
      `recruitHero()` call paths)
- [ ] 3.3 Verify removing the Barracks recruit button doesn't break
      anything else that referenced it (equip/heal UI, roster panel)
- [ ] 3.4 Standard verification: syntax, full import-graph trace,
      `node --test`

## Documentation & Testing
- [ ] 4.1 `test/heroes.test.js`: `createRolledHero()` shape/rarity
      distribution coverage (can likely adapt existing `recruitHero()`
      tests rather than writing from scratch)
- [ ] 4.2 `test/luckyWheel.test.js`: hero-reward entry, correct roster
      push, no resource spend
- [ ] 4.3 Update `openspec/specs/hero-system/spec.md` and
      `lucky-wheel/spec.md` — hero-system's recruitment section needs
      the most substantial rewrite here
- [ ] 4.4 Confirm and remove dead `RECRUIT_COST`/`canRecruitHero`
      code if Backend flagged it as unused (1.3)
- [ ] 4.5 Update `memory.md`
