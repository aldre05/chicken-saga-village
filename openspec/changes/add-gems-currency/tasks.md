# Tasks: Gems (Premium Currency)

## Backend Engineer
- [ ] 1.1 Add `gems` field to `gameState.js` (default 0, included in
      save/load)
- [ ] 1.2 Implement `canBuyDungeonKeyWithGems`/spend-and-grant pair in
      `dungeons.js` per design.md (requires `add-dungeon-keys` to have
      landed first — sequence accordingly)
- [ ] 1.3 Implement `buyHeroRollWithGems` in `heroes.js` per design.md
      (requires `add-recruit-via-lucky-wheel`'s `createRolledHero()`
      to exist — sequence accordingly)
- [ ] 1.4 Implement gems-to-resource exchange in `resources.js`
- [ ] 1.5 Add the gems Lucky Wheel reward entry + the resource-vs-gems
      branch `spinWheel()` needs (same shape of change as the
      dungeon-key and hero reward branches if those shipped first —
      coordinate rather than tripling the same branching logic)

## Frontend Engineer
- [ ] 2.1 Gems balance in the resource HUD
- [ ] 2.2 Buy-with-gems buttons: Dungeon Gate (alongside the existing
      key display), Barracks/wherever heroes are shown, and a
      resource-exchange UI (new small panel, or folded into an
      existing one — Frontend's call)
- [ ] 2.3 Explicitly NOT building any purchase-gems-with-$ UI — no
      "Buy Gems" storefront screen in this pass, per proposal.md's
      Non-Goals

## Code Reviewer
- [ ] 3.1 Verify every gems spend actually checks balance before
      committing (no negative-gems bugs)
- [ ] 3.2 Verify no code anywhere in this proposal's diff touches
      payment processing, external requests, or anything that could
      be mistaken for real-money purchase plumbing — flag immediately
      if found, this proposal is explicitly gems-as-virtual-currency
      only
- [ ] 3.3 Standard verification: syntax, full import-graph trace,
      `node --test`

## Documentation & Testing
- [ ] 4.1 `test/gameState.test.js`: gems save/load coverage
- [ ] 4.2 `test/dungeons.test.js`/`heroes.test.js`/`resources.test.js`:
      each new buy-with-gems function
- [ ] 4.3 `test/luckyWheel.test.js`: gems reward entry
- [ ] 4.4 New `openspec/specs/gems-currency/spec.md`; update
      dungeon-system/hero-system/lucky-wheel specs for the new spend
      hooks
- [ ] 4.5 Update `memory.md` — explicitly note the real-money purchase
      path is still unscoped/future, so it doesn't get assumed done
