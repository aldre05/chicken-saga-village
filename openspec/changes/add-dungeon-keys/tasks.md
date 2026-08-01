# Tasks: Dungeon Keys (Consumable Run Gate)

## Backend Engineer
- [ ] 1.1 Add `dungeon_key` recipe to `crafting.js`'s `RECIPES` per
      design.md's cost exactly
- [ ] 1.2 Add the Lucky Wheel key-reward entry to `luckyWheel.js`'s
      `REWARD_TABLE`, and add the resource-vs-item branch
      `spinWheel()` needs to actually award an inventory item instead
      of a raw resource (currently assumes every reward is a raw
      resource — verify, don't assume, per design.md's note)
- [ ] 1.3 Update `dungeons.js`'s `canSendHeroToDungeon`/
      `sendHeroToDungeon` per design.md's signature change
      (`inventoryState` param + key check/spend)
- [ ] 1.4 Update every existing call site of `sendHeroToDungeon`/
      `canSendHeroToDungeon` for the new signature — grep the whole
      repo, don't rely on memory of where they are
- [ ] 1.5 Decide + implement starting key supply for new saves (see
      design.md's Open Question) — confirm with the developer rather
      than guessing

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
