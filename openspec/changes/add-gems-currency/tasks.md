# Tasks: Gems (Premium Currency)

## Backend Engineer
- [x] 1.1 Add `gems` field to `gameState.js` (default 0, included in
      save/load)
- [x] 1.2 Implement `canBuyDungeonKeyWithGems`/spend-and-grant pair in
      `dungeons.js` per design.md (requires `add-dungeon-keys` to have
      landed first — sequence accordingly)
      (add-dungeon-keys had already landed, confirmed. Found
      design.md's Data Model section (`gems: 0` flat field) disagrees
      with its own Spend Use-Cases snippet (`gemsState.gems -=`,
      implying a wrapper object) — resolved in favor of the flat
      field per task 1.1's literal wording; buy functions take
      whatever object gems actually lives on (in practice, gameState
      itself). See memory.md for the full note.)
- [x] 1.3 Implement `buyHeroRollWithGems` in `heroes.js` per design.md
      (requires `add-recruit-via-lucky-wheel`'s `createRolledHero()`
      to exist — sequence accordingly)
      (Already existed, confirmed. DELIBERATE DEVIATION from
      design.md's snippet: returns the actual hero object, not a bare
      `true` — matches every sibling "roll a hero" path in this
      codebase, so a gem-purchase button can show what was rolled.)
- [x] 1.4 Implement gems-to-resource exchange in `resources.js`
- [x] 1.5 Add the gems Lucky Wheel reward entry + the resource-vs-gems
      branch `spinWheel()` needs (same shape of change as the
      dungeon-key and hero reward branches if those shipped first —
      coordinate rather than tripling the same branching logic)
      (Caught a real bug before it shipped: without an explicit
      'gems' check, a gems reward would have silently fallen into the
      existing generic item catch-all branch and written into
      `inventoryState.gems` instead of the actual currency. Added a
      dedicated branch ahead of the catch-all; verified via
      simulation that gems never appear in inventoryState.)

## Frontend Engineer
- [x] 2.1 Gems balance in the resource HUD
      (New static `gemsHudEl` chip, magenta-accented to distinguish
      premium currency at a glance. Verified via jsdom: shows correct
      balance on load.)
- [x] 2.2 Buy-with-gems buttons: Dungeon Gate (alongside the existing
      key display), Barracks/wherever heroes are shown, and a
      resource-exchange UI (new small panel, or folded into an
      existing one — Frontend's call)
      (Built a new Gems Exchange modal (💎 Exchange button in the
      header, matching the Lucky Wheel modal's open/close pattern) —
      6 static resource rows, fixed "spend 5 gems, get 50" per click
      rather than a numeric input, matching this project's existing
      button-based UI style. Added a Buy Hero Roll button to the
      Barracks panel and a Buy Key button to the Dungeon Gate panel,
      both static single buttons gated purely on gems balance (same
      established pattern as `sendHeroBtn` — no signature-gating
      needed since there's no list to rebuild). Verified via jsdom:
      exchanging gems for egg correctly deducts gems and grants the
      resource (checked in both the modal and the HUD, and confirmed
      the resource actually appears in the resource HUD); Buy Hero
      Roll correctly spends 100 gems and adds a hero to the roster
      end-to-end via real simulated player movement + click. Buy Key
      not independently live-tested (same jsdom pathing difficulty as
      `fix-panel-click-reliability`'s Dungeon Gate tests) but uses the
      identical proven pattern.)
- [x] 2.3 Explicitly NOT building any purchase-gems-with-$ UI — no
      "Buy Gems" storefront screen in this pass, per proposal.md's
      Non-Goals
      (Confirmed via a repo-wide search for $/USD/IAP/payment/
      checkout-related strings — none found in any of this session's
      changes.)

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
