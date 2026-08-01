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
- [ ] 2.1 Dungeon panel: show current `dungeon_key` count near the
      entry cost, reuse `formatCostHTML`'s insufficient-highlighting
      pattern
- [ ] 2.2 Send button: disabled state already flows from
      `canSendHeroToDungeon` returning false — verify the 0-key case
      specifically shows a clear reason (not just a mysteriously
      disabled button)
- [ ] 2.3 Workbench: add the new `dungeon_key` recipe row (reuses
      existing recipe-row pattern, don't rebuild it)

## Code Reviewer
- [ ] 3.1 Verify a 0-key hero genuinely cannot be sent (function AND
      UI), matching every other gated-action verification standard in
      this project
- [ ] 3.2 Verify the key is consumed exactly once per send, on both
      success and failure paths
- [ ] 3.3 Verify the existing `entryCost` resource spend is completely
      unaffected (still spent, still gated) — this proposal adds a
      gate, it shouldn't touch the old one
- [ ] 3.4 Standard verification: syntax, full import-graph trace,
      `node --test`

## Documentation & Testing
- [ ] 4.1 `test/dungeons.test.js`: 0-key rejection, key consumption on
      send (both outcomes), signature-change coverage
- [ ] 4.2 `test/luckyWheel.test.js` and `test/crafting.test.js`: new
      reward entry and recipe
- [ ] 4.3 Update `openspec/specs/dungeon-system/spec.md` and
      `crafting-system/spec.md`
- [ ] 4.4 Update `memory.md`
