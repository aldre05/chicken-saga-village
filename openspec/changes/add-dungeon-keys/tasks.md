# Tasks: Dungeon Keys (Consumable Run Gate)

## Backend Engineer
- [x] 1.1 Add `dungeon_key` recipe to `crafting.js`'s `RECIPES` per
      design.md's cost exactly
      (DEVIATED from design.md's suggested cost on explicit developer
      instruction: cost is `{egg:40, feathers:40, wood:30, rice:30,
      stone:30, ore:20}` — high, spanning all 6 resources, not just
      the industrial wood/stone/ore lane design.md proposed. Developer
      wanted every resource to have crafting utility. Side effect
      worth knowing: since rice/ore don't unlock until Town Hall 5 but
      Dungeon Gate unlocks at TH4, a player can't craft any key — and
      therefore can't send any hero to any tier — until TH5. Not a
      bug, a direct consequence of the requested cost; flagging for
      awareness, not fixed unilaterally.)
- [x] 1.2 Add the Lucky Wheel key-reward entry to `luckyWheel.js`'s
      `REWARD_TABLE`, and add the resource-vs-item branch
      `spinWheel()` needs to actually award an inventory item instead
      of a raw resource (currently assumes every reward is a raw
      resource — verify, don't assume, per design.md's note)
      (Confirmed the assumption was real — `spinWheel()` unconditionally
      wrote to `resourceState.carried`. Fixed with a resource-vs-item
      branch using the same RESOURCE_IDS-membership test as
      crafting.js's splitCost(). Also exempted item rewards from the
      Town Hall level-scaling multiplier — a key reward is a discrete
      count, not a quantity that should scale into fractional-then-
      rounded amounts at higher TH.)
- [x] 1.3 Update `dungeons.js`'s `canSendHeroToDungeon`/
      `sendHeroToDungeon` per design.md's signature change
      (`inventoryState` param + key check/spend)
- [x] 1.4 Update every existing call site of `sendHeroToDungeon`/
      `canSendHeroToDungeon` for the new signature — grep the whole
      repo, don't rely on memory of where they are
      (Grepped js/ and test/ both. 2 real call sites in main.js
      updated; spinWheel's 1 call site in main.js also updated for its
      own new inventoryState param. test/dungeons.test.js and
      test/luckyWheel.test.js have ~17 call sites now failing with the
      old positional args — expected, Documentation & Testing's 4.1/
      4.2, deliberately not touched here.)
- [x] 1.5 Decide + implement starting key supply for new saves (see
      design.md's Open Question) — confirm with the developer rather
      than guessing
      (Developer confirmed: 0 keys, first key must be crafted or won.
      No code change needed beyond what 1.1-1.3 already provide —
      `inventoryState[DUNGEON_KEY_ITEM_ID] || 0` already defaults to 0
      for both new and legacy saves.)

## Frontend Engineer
- [x] 2.1 Dungeon panel: show current `dungeon_key` count near the
      entry cost, reuse `formatCostHTML`'s insufficient-highlighting
      pattern
- [x] 2.2 Send button: disabled state already flows from
      `canSendHeroToDungeon` returning false — verify the 0-key case
      specifically shows a clear reason (not just a mysteriously
      disabled button)
- [x] 2.3 Workbench: add the new `dungeon_key` recipe row (reuses
      existing recipe-row pattern, don't rebuild it)

## Code Reviewer
- [x] 3.1 Verify a 0-key hero genuinely cannot be sent (function AND
      UI), matching every other gated-action verification standard in
      this project
      (2026-08-02: scripted — `canSendHeroToDungeon`/`sendHeroToDungeon`
      both correctly reject with 0 keys even given an unlimited-
      resource, high-power hero; hero state and `entryCost` resources
      both untouched by the rejected attempt. UI: `main.js` sets
      `dungeonSendReasonEl.textContent` to "No Dungeon Key — craft one
      at the Workbench or win one on the Lucky Wheel." when the gate
      fails, confirmed by direct code read. Also confirmed
      `dungeon_key`'s crafting recipe cost matches the actual,
      documented value in crafting.js — which is a DELIBERATE
      DEVIATION from design.md's original suggestion
      `{wood:20,stone:20,ore:10}`, per crafting.js's own comment: the
      developer explicitly asked for a cost spanning all 6 resources,
      roughly TH4→5-upgrade scale. Verified against the actual,
      attributed value, not design.md's superseded suggestion — this
      is documented intentional drift, not a bug.)
- [x] 3.2 Verify the key is consumed exactly once per send, on both
      success and failure paths
      (2026-08-02: scripted — confirmed exactly 1 key deducted at send
      time regardless of eventual outcome; NOT refunded on failure
      [deliberate per design.md's Resolution section]; NOT spent again
      or refunded on success either [already spent at send, resolution
      doesn't touch inventory]; a second hero genuinely can't be sent
      once the only key is gone.)
- [x] 3.3 Verify the existing `entryCost` resource spend is completely
      unaffected (still spent, still gated) — this proposal adds a
      gate, it shouldn't touch the old one
      (2026-08-02: scripted — both gates apply independently: having a
      key doesn't bypass an unaffordable `entryCost` [and the key
      isn't consumed when that's what blocks the send]; having enough
      resources doesn't bypass a missing key. All 3 tiers' `entryCost`
      deduction amounts cross-checked as byte-for-byte unchanged from
      pre-key-system values. Also spot-checked that `resolveDungeon`'s
      actual resolution math — the exact power==difficulty boundary
      case from `add-heroes-dungeons`'s original regression test — is
      completely untouched by this change, as design.md claims.)
- [x] 3.4 Standard verification: syntax, full import-graph trace,
      `node --test`
      (2026-08-02: `node --check` on all 22 `js/*.js` files — clean.
      Import-graph trace via `import()` on every file individually —
      no stale-import regressions. Full suite: 195/212 passing.
      **The 17 failures are entirely expected, documented fallout from
      this proposal's (and add-recruit-via-lucky-wheel's) own
      signature changes** — `sendHeroToDungeon`/`canSendHeroToDungeon`
      gained a required `inventoryState` param, and old test call
      sites in `test/dungeons.test.js` don't pass it, so what used to
      be the `now` argument silently lands in the wrong parameter slot.
      design.md itself explicitly flags this as expected: "Every
      existing call site... needs updating, same precedent as
      `getCraftableRecipes`'s signature change in add-hero-classes."
      Confirmed this is NOT a new regression by checking memory.md's
      prior session note that the full suite was a clean 212/212
      immediately before this proposal's Backend/Frontend work landed
      — all 17 failures trace directly to the signature change, none
      are unrelated breakage. This is explicitly Documentation &
      Testing's task 4.1/4.2 to fix (update the test call sites), not
      Code Reviewer's — noting the precise count and cause here so
      it's not mistaken for an unexplained regression later.)

## Documentation & Testing
- [ ] 4.1 `test/dungeons.test.js`: 0-key rejection, key consumption on
      send (both outcomes), signature-change coverage
- [ ] 4.2 `test/luckyWheel.test.js` and `test/crafting.test.js`: new
      reward entry and recipe
- [ ] 4.3 Update `openspec/specs/dungeon-system/spec.md` and
      `crafting-system/spec.md`
- [ ] 4.4 Update `memory.md`
