# Spec: Gems Currency

## Current State (implemented)
A second, simpler currency layered on top of the resource economy —
shipped via `add-gems-currency` (its `openspec/changes/` folder has
been archived per this project's standard process). As of this
shipped pass, gems are free-to-earn only (Lucky Wheel) — **no
real-money purchase code exists yet**, though (unlike most of this
project's other "non-NFT/free" language) that's not a strategic
deferral, it's just unbuilt; see "Real-money purchases — not yet
built, but no longer 'deferred'" below for why that distinction
matters.

### Data model
`gameState.gems` — a single flat, non-negative integer. Not wrapped
in its own state object (`{gems: N}`), unlike most other subsystems
in this codebase, matching the precedent set by `popularity` (also a
flat top-level field). This was an explicit resolution of a
contradiction in `add-gems-currency/design.md` itself — its Data Model
section showed a flat field, but its Spend Use-Cases code snippet
wrote `gemsState.gems -=` as if gems lived inside a wrapper object;
resolved in favor of flat, matching task 1.1's literal wording.

**Every function that spends or checks gems takes a `gemsState`
parameter that's "any object exposing a mutable `.gems` number"** —
not hardcoded to expect `gameState` itself. In production this is
always `gameState` (passed directly, since gems lives flat on it),
but the functions themselves (`canBuyDungeonKeyWithGems`,
`buyDungeonKeyWithGems` in `dungeons.js`; `canBuyHeroRollWithGems`,
`buyHeroRollWithGems` in `heroes.js`; `canExchangeGemsForResource`,
`exchangeGemsForResource` in `resources.js`) don't import or assume
any particular shape beyond that one property — this is why a plain
`{gems: N}` object is a faithful, minimal test double in
`test/*.test.js` without needing a full `gameState`.

Save/load: `loadGameState()` defensively falls back to `0` if the
saved `gems` field is missing (a pre-`add-gems-currency` save) or a
corrupted non-number type — same defensive-parse pattern this project
already uses for other fields, not a new pattern invented for this.
No migration needed beyond that default, since gems didn't rename or
restructure anything that existed before it.

### Earning gems — Lucky Wheel only
The **only** way to earn gems is winning them as a Lucky Wheel reward
(see lucky-wheel spec's `REWARD_TABLE` — a dedicated `'gems'` entry,
amount 5 per win, never Town-Hall-level-scaled, same non-scaling
treatment as the `dungeon_key`/`hero` reward entries). There is no
separate "gems minigame," daily login bonus, or achievement-based
earn path — deliberately kept to one funnel for this first pass.

### Spending gems — three independent sinks
Gems can be spent in exactly three places, each a direct alternative
to an existing free/resource-gated path — gems don't unlock anything
that wasn't already obtainable for free, they just buy a shortcut:

1. **Buy a Dungeon Key** (`buyDungeonKeyWithGems`, `DUNGEON_KEY_GEM_COST`)
   — an alternative to crafting one at the Workbench or winning one on
   the wheel. See dungeon-system spec.
2. **Buy a hero roll** (`buyHeroRollWithGems`, `HERO_ROLL_GEM_COST`)
   — an alternative to winning one on the wheel (the *only* other
   hero source, since `add-recruit-via-lucky-wheel` removed the paid-
   in-resources Barracks recruit button). Returns the actual newly
   created hero object (not a bare `true`) — a **deliberate deviation
   from `design.md`'s own code snippet**, which returned a boolean;
   the real implementation matches every sibling "roll a hero" path
   in this codebase (`recruitHero()`, the wheel's `'hero'` branch),
   both of which return the hero so the UI can show what was actually
   rolled. See hero-system spec.
3. **Exchange gems for a raw resource** (`exchangeGemsForResource`,
   `GEM_TO_RESOURCE_RATE = 10`) — a flat rate across **all 6**
   resources, not scarcity-weighted (ore/stone costing more gems than
   egg/feathers, say). `design.md` explicitly flagged this as an open
   balance question but said not to block shipping on resolving it;
   flat is the deliberate starting point, not an oversight. The UI
   (`main.js`) exchanges in a fixed batch of 5 gems per click
   (`GEMS_PER_EXCHANGE`) rather than a numeric input, since a flat
   rate makes any batch size equally simple to reason about — this is
   a UI-layer constant, not part of `exchangeGemsForResource()`'s own
   contract, which accepts any `gemAmount`. Resources are credited to
   `carried` **uncapped**, same as every other resource-crediting path
   in this codebase (collection, dungeon rewards, wheel rewards, quest
   rewards) — `RESOURCE_CONFIG.cap` only ever bounds a building's
   *uncollected* buffer before collection, never `carried` itself, so
   this needed no special-case capping logic.

Each of the three sinks is independently gated (own cost, own
affordability check) — buying a dungeon key with gems doesn't touch
hero-roll or exchange logic and vice versa. All three follow the same
"amount deducted exactly matches cost, never negative, rejected
purchases mutate nothing" contract, mirroring this project's existing
resource-spend conventions (`canAfford`/`spendResources`).

### UI
A gems HUD element (💎 + count) sits alongside the main resource HUD
but isn't generated by the same `RESOURCE_CONFIG` loop — gems isn't a
raw resource, so it's handled as its own small, separate render
function (`updateGemsHud()`). The Gems Exchange is a dedicated modal
(same open/close pattern as the Lucky Wheel modal) with one row per
resource, each showing the fixed-batch cost/return and disabling
(red-highlighted cost, same `.cost-insufficient` convention used
everywhere else) when unaffordable. The Buy Hero Roll and Buy Dungeon
Key gems options are single static buttons inside their respective
existing panels (Barracks roster panel, Dungeon Gate panel) rather
than new standalone UI — presented as one more option alongside the
existing free paths, not a separate storefront.

### Real-money purchases — not yet built, but no longer "deferred" (corrected)
**No real-money purchase code exists anywhere in this codebase as of
this shipped pass.** `add-gems-currency/design.md` and `proposal.md`
say so explicitly — implementing an actual payment flow (Stripe, IAP,
or otherwise) was never part of this change. **This is simply not
built yet, not something strategically deferred pending legal
review** — this spec's own first draft said the latter, which was
already stale the moment it was written: the project's earlier
blanket "monetization stays deferred" stance was explicitly reversed
on 2026-08-01 (see memory.md's Decisions), in favor of a standard
Web2 paid-game-economy model (comparable to Dota 2/CS:GO/League of
Legends) where real-money purchases of in-game items/currency are an
accepted future direction by developer decision. Both `design.md` and
this proposal's economy-idea discussion predate/straddle that same-day
reversal, which is why the stale framing made it in here in the first
place — caught and corrected while writing this spec, not left to
propagate. Treat "gems, the currency" and "a real-money purchase flow
that sells gems" as two separate, sequenced pieces of work — shipping
the currency plumbing doesn't itself implement payments, but it also
isn't blocked on a legal review that no longer applies at the
blanket-policy level.

**One legally-relevant nuance worth carrying forward, not re-litigating
every time it comes up**: a real-money purchase of a *direct, known
item* ("$4.99 for this exact hero") and a real-money purchase of a
*random-reward spin* (loot box/gacha — which is what Lucky Wheel spins
structurally are) are legally different categories in several
jurisdictions (e.g. Belgium bans real-money loot boxes outright;
others require odds disclosure). If/when a real-money purchase path is
actually proposed for gems (or anything else), which shape it takes is
a real design decision worth being deliberate about — not something to
default into by accident because "gems already work like the wheel
does."

## Constraints for future changes
- Keep every gems-spending function's signature as "any object with a
  mutable `.gems` number," not hardcoded to `gameState` — this is
  what let `test/*.test.js` use lightweight `{gems: N}` stand-ins
  instead of constructing a full game state for every test.
- Keep gems earnable **only** via the Lucky Wheel unless a future
  proposal deliberately decides to add a second earn funnel — don't
  quietly add a side-door earn path (e.g. a quest reward) without
  that being an explicit design decision, since the whole balance
  model (wheel odds, ticket regen rate) currently assumes gems flow
  through exactly one funnel.
- When a real-money purchase path for gems is eventually proposed,
  treat the direct-item-vs-random-reward legal distinction above as a
  real design input, not boilerplate — the shape chosen has real
  jurisdiction-dependent consequences, unlike most other decisions in
  this project.
- Keep the flat `GEM_TO_RESOURCE_RATE` (not scarcity-weighted) unless
  a future session deliberately revisits that open question — don't
  silently differentiate rates per resource as a "balance fix" without
  it being its own discussed decision.
