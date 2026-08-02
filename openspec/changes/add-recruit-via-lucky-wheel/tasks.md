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
- [x] 3.1 Verify a hero-reward spin actually adds a correctly-shaped
      hero to the roster (all fields present, matches what
      `recruitHero()` used to produce)
      (2026-08-02: scripted — forced `Math.random()` to land exactly
      inside the `hero` reward's cumulative-weight range, confirmed
      `spinWheel()`'s result includes the hero object, the SAME object
      is pushed onto `rosterState.roster`, and the roster grows by
      exactly 1. Checked every field individually [id, name, rarity,
      class, level 1, xp 0, busyUntil null, dungeonTier null,
      currentHp > 0, empty equipment] rather than just object-shape
      equality. Also directly compared `createRolledHero()`'s field
      set against `recruitHero()`'s output field-by-field with
      `Math.random` pinned to the same value for both — identical, so
      the roster genuinely never sees two different hero shapes
      depending on which path a hero came from.)
- [x] 3.2 Verify no resources are spent on a hero-reward spin beyond
      the ticket itself (no accidental double-charge from leftover
      `recruitHero()` call paths)
      (2026-08-02: scripted — same forced-roll setup as 3.1: confirmed
      exactly 1 ticket consumed [same as any other spin], every raw
      resource in `resourceState.carried` completely unchanged, and no
      new/changed keys in `inventoryState` either. Directly confirms
      `spinWheel()`'s hero branch does NOT call `recruitHero()`
      internally [which would double-charge `RECRUIT_COST` on top of
      the ticket] — it calls `createRolledHero()` and pushes directly,
      per design.md.)
- [x] 3.3 Verify removing the Barracks recruit button doesn't break
      anything else that referenced it (equip/heal UI, roster panel)
      (2026-08-02: grepped `main.js` for `recruitHero`/`RECRUIT_COST`/
      `canRecruitHero` — zero references left, confirming the button
      was actually removed, not just hidden, and nothing else in
      `main.js` depended on those calls. Directly confirmed the heal
      button, Heal Potion button, and roster panel's other rendering
      are all still present and correctly wired [`healBtn`/`potionBtn`
      construction unchanged, still reference `canHealHero`/
      `healHero`/`useHealPotion` correctly] — the removal only touched
      the recruit button's own code, nothing else in the panel.
      Confirmed the replacement static line exists: "No heroes yet —
      win one on the Lucky Wheel." Also confirmed `recruitHero`/
      `RECRUIT_COST`/`canRecruitHero` themselves are NOT dead — still
      exported and functioning correctly as standalone functions
      [scripted test], matching heroes.js's own comment that
      `heroes.test.js`/`dungeons.test.js` still call `recruitHero()`
      directly.)
- [x] 3.4 Standard verification: syntax, full import-graph trace,
      `node --test`
      (2026-08-02: same standard sweep as add-dungeon-keys — see that
      proposal's 3.4 note for the full breakdown; identical results
      [195/212 passing, same 17 expected-fallout failures from the
      shared `spinWheel()`/`sendHeroToDungeon()` signature changes
      that both this proposal and add-dungeon-keys made together in
      one coordinated change, not two separate breaking changes
      stacked on each other]. This proposal's own contribution to
      those 17: `test/luckyWheel.test.js`'s old `spinWheel()` call
      sites are missing the new required `inventoryState`/
      `rosterState` params. Documentation & Testing's task 4.2 to fix.)

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
