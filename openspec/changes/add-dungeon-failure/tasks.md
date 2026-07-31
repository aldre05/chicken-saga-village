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
- [x] 2.1 Hero roster panel: visually mark downed heroes (greyed
      out or similar), disable "send to dungeon" for them, add a
      "Heal" button showing cost (reuse `formatCostHTML` for
      insufficient-resource red-highlighting)
- [x] 2.2 Dungeon panel: show potential full reward + XP before
      sending, alongside existing entry cost
- [x] 2.3 Floating popup / distinct visual feedback for a dungeon
      failure result vs. success (should read as clearly different
      outcomes, not just different text)

## Code Reviewer
- [x] 3.1 Verify a downed hero genuinely cannot be sent to a dungeon
      (test the button-disabled state AND the underlying function,
      not just the UI)
      (2026-07-30: scripted verification — `isDowned`,
      `canSendHeroToDungeon`, `sendHeroToDungeon` all correctly reject
      a downed hero even with unlimited resources; confirmed the
      rejection is independent of `isHeroIdle` (a hero can be
      simultaneously idle-and-downed, and downed still blocks). UI
      side: `updateDungeonPanel`'s hero picker filters on
      `isHeroIdle(h, now) && !isDowned(h)` — downed heroes are
      excluded from the picker entirely, not just shown with a
      disabled Send button, with a distinct empty-state message when
      that's why the list is empty.)
- [x] 3.2 Verify heal cost scales correctly per rarity (test all 3
      tiers)
      (2026-07-30: scripted — all 3 rarities' `getHealCost()` output
      matches `HEAL_COST_BASE * HEAL_COST_RARITY_MULTIPLIER` exactly
      [common 30/20, rare 60/40, epic 120/80]; `healHero()` actually
      deducts that exact cost and restores to `getMaxHp()` for each
      rarity; rejects a non-downed hero and rejects when unaffordable,
      leaving state untouched in both cases.)
- [x] 3.3 Verify success path is completely unaffected by this change
      (full reward + XP, no regression)
      (2026-07-30: scripted — for all 3 dungeon tiers, a high-power
      hero's success still grants exactly `tier.fullReward`/
      `tier.fullXp`, resources credited correctly, hero NOT downed.
      Also directly confirmed the failure path grants nothing at all
      — `{}` reward, `0` xp — not the old 50%, and sets `currentHp` to
      0.)
      **Also found and fixed a real bug beyond the assigned scope**:
      `useHealPotion()` in heroes.js set a hero's `currentHp` straight
      to max (a full heal) instead of the 25% design.md's own table
      explicitly specifies ("Heal Potion (25%)"), undermining the
      economic distinction design.md itself draws between the cheap
      potion and the rarity-scaled paid Barracks heal. Fixed to the
      additive `Math.min(max, current + ceil(max * 0.25))` formula —
      see heroes.js's inline code-review note and memory.md for full
      detail. Scripted regression test confirms: no-op at full HP,
      correct partial heal amount, capped (not overshooting) near max,
      and — flagging rather than additionally gating — a downed hero
      CAN be brought back above 0 HP via a potion for far less than
      the Barracks heal cost; design.md's own Risks section already
      flags potion-vs-paid-heal overlap as something to confirm during
      playtesting, so left as-is rather than inventing an extra rule.
- [x] 3.4 Standard verification: syntax, full import-graph trace,
      `npm test`
      (2026-07-30: same standard sweep as the other three proposals
      this session — see add-th10-houses's 3.3 note for full detail,
      identical results. `js/heroes.js`'s Heal Potion fix specifically
      re-checked: `node --check` clean, full suite still 161/161
      non-deferred passing after the change.)

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
