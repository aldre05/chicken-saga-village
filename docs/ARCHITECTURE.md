# Architecture

This doc is for anyone (human or agent) picking up development on
Chicken Saga Village for the first time. It covers how the pieces fit
together; for *what's currently built and what's next*, see
`memory.md` and `openspec/specs/`.

## High-level shape

No framework, no build step, no bundler. `index.html` loads
`js/main.js` as an ES module; every other `js/` file is imported from
there (directly or transitively) via native `import`/`export`. There
is no server — everything runs client-side, and persistence is a
single `localStorage` key.

The codebase splits cleanly into two kinds of files:

1. **Pure logic modules** (`resources.js`, `buildingLevels.js`,
   `buildingUnlocks.js`, `townHall.js`, `workers.js`, `upkeep.js`,
   `crafting.js`, `questBoard.js`, `luckyWheel.js`, `heroes.js`,
   `dungeons.js`, `interactions.js`, `interactionHandlers.js`,
   `camera.js`, `gameState.js`, `map.js`, `tileConfig.js`). These have
   no DOM/Canvas dependency (aside from `gameState.js`'s two
   `localStorage` calls) — they take state objects in and return
   values or mutate the state in place. This is what `test/` covers,
   and it's why the test suite can run under plain Node with no
   browser or jsdom.
2. **Presentation glue** (`main.js`, `render.js`, `player.js`,
   `sprites.js`, `spriteRenderer.js`). `main.js` is the only file that
   touches `document`/DOM elements; `render.js` + `spriteRenderer.js`
   draw to the `<canvas>`. These aren't unit-tested — verify changes
   here by playtesting in a browser.

Keeping that split intact is the main architectural rule worth
protecting: if new gameplay logic needs a test, it belongs in a pure
module, not inline in `main.js`.

## Game state shape

`gameState.js`'s `createGameState()` is the single source of truth for
what a "game state" object looks like:

```
{
  resources:        { carried, totalCollected, buildingLastCollectedAt }  // resources.js
  townHall:          { level }                                            // townHall.js
  inventory:         { [recipeId]: count }                                // crafting.js
  workers:           { assignments: { [resourceId]: count } }             // workers.js
  buildingUnlocks:   { [buildingId]: true }                                // buildingUnlocks.js
  buildingLevels:    { [buildingId]: level }                               // buildingLevels.js
  questBoard:        { claimedQuestIds: [] }                              // questBoard.js
  luckyWheel:        { tickets, lastGeneratedAt, totalSpins }             // luckyWheel.js
  upkeep:            { lastCheckedAt }                                    // upkeep.js
  heroes:            { roster: [heroObj, ...] }                          // heroes.js (dungeons.js reads/writes hero fields directly, no separate dungeon state)
  popularity:        number
}
```

Every subsystem owns its own slice and its own `createXState()`
factory; `gameState.js` just assembles them and handles
localStorage persistence + migration. If you add a new subsystem,
follow that pattern: a `createXState()` export, plumbed into
`createGameState()`, plus a merge line in `loadGameState()`.

## The game loop (`main.js`)

`requestAnimationFrame`-driven, no fixed timestep — `dt` is
wall-clock delta capped at 0.05s (so a stuttering tab doesn't cause a
huge simulated jump). Each frame, in order:

1. `updatePlayer()` — reads currently-held keys, moves the player,
   resolves collision (skipped while a dialogue box is open).
2. `applyUpkeep()` — egg upkeep for assigned workers.
3. `camera.follow()` — recenter on the player, clamped to map bounds.
4. `findNearestInteractable()` — for the "press E" prompt.
5. HUD/UI refresh functions (prompt, dialogue, resource HUD, Lucky
   Wheel widget).
6. `renderFrame()` — draws the frame to canvas.

Player movement is resolved per-axis (move X, revert if blocked; then
move Y, revert if blocked) rather than as one diagonal step — this is
what lets the player slide along a wall instead of fully stopping on
a corner clip. See `player.js`'s `updatePlayer()`.

## The "offline-safe timestamp checkpoint" pattern

This pattern shows up in four places and is worth understanding once
rather than re-deriving per-module: **resource production**
(`resources.js`), **egg upkeep** (`upkeep.js`), and **Lucky Wheel
ticket generation** (`luckyWheel.js`) all avoid a `setInterval`
tick-accumulator in favor of storing a `lastX` timestamp and computing
elapsed real time against `Date.now()` on demand. This means:

- Production/upkeep/tickets keep accruing correctly even if the tab
  was closed, backgrounded, or the frame rate stuttered — there's no
  "missed ticks" problem, because nothing is counted in ticks.
- Whenever something is collected/spent/consumed, the checkpoint
  timestamp advances by *exactly* the amount of time that was
  "spent" producing the collected amount — not reset to `now`
  outright — so fractional leftover progress (half an egg, a
  partial Lucky Wheel ticket) isn't discarded. See
  `flushAndResetCheckpoint()` in `resources.js` and the fractional-
  remainder handling in `upkeep.js`'s `applyUpkeep()` for the
  clearest examples.
- Worker assignment changes call `flushAndResetCheckpoint()` *before*
  changing the assigned count, specifically to avoid "backfilling"
  production at the new rate for time that elapsed under the old
  (possibly zero) worker count. This was a real bug in an earlier
  version — see `test/resources.test.js` and `test/workers.test.js`
  for the regression tests guarding it.

If you add a new time-based accrual system, follow this pattern
rather than `setInterval` + tick counting.

## Save data & migration chain

`gameState.js`'s `loadGameState()` reads one `localStorage` key
(`chickenVillageSave`), and has to handle *every* save shape the game
has ever produced, oldest first:

1. Flat `carriedEggs`/`totalEggsCollected` numbers (pre multi-resource
   economy) → converted into the `carried.egg`/`totalCollected.egg`
   dict shape.
2. `grain` resource key → renamed to `rice` (in both `carried` and
   `totalCollected`, plus `buildingLastCollectedAt`) — the old key is
   explicitly deleted after copying, not just left dangling.
3. No `buildingUnlocks` at all (pre-unlock-system saves) → inferred
   from production evidence (e.g. `totalCollected.wood > 0` implies
   the Woodshed must have been unlocked).
4. `grain_store` building id → renamed to `rice_paddy` (unlock state
   and level both carried over).
5. Flat `workers.houses` count → expanded into individual
   `house_1..house_5` unlock flags.
6. Worker assignments above the current level-based per-building cap
   (from when the cap was a flat, higher number) → clamped down via
   `clampAssignmentsToCaps()`.

**If you change any state shape, add a migration step here and a test
in `test/gameState.test.js`** — the whole point of this chain is that
a returning player never loses progress across an update. Corrupted
or unparseable save JSON falls back to a fresh game state rather than
throwing (wrapped in try/catch).

## Where to look for what

| I want to... | Look at |
|---|---|
| Change how much a resource produces, or add a new resource | `resources.js` (`RESOURCE_CONFIG`) |
| Change building leveling costs/curves | `buildingLevels.js` |
| Add/change a building's one-time unlock cost | `buildingUnlocks.js` (`UNLOCK_CONFIG`) |
| Change what pressing E on a building/NPC says or does | `interactionHandlers.js` |
| Add a new interactable to the map | `map.js` (`interactables`) — remember to also add a `HANDLERS` entry |
| Change Town Hall progression | `townHall.js` |
| Add a crafting recipe | `crafting.js` (`RECIPES`) |
| Add a quest | `questBoard.js` (`QUEST_LIST`) — needs a `check(gameState)` predicate and a `reward` dict |
| Change Lucky Wheel odds/payouts | `luckyWheel.js` (`REWARD_TABLE`, `getRewardScale`) |
| Change hero rarity stats/weights or leveling curve | `heroes.js` (`RARITY_TABLE`, `effectivePower`, `xpForNextLevel`) |
| Change dungeon tiers/difficulty/rewards | `dungeons.js` (`DUNGEON_TIERS`) |
| Change player movement/collision | `player.js` |
| Change camera behavior | `camera.js` |
| Change visuals/rendering | `render.js`, `sprites.js`, `spriteRenderer.js`, `styles.css` |
| Wire up new UI / DOM elements | `main.js` + `index.html` (keep element ids in sync between the two) |

## Testing philosophy

See the root `README.md` "Testing" section for how to run the suite.
Architecturally: every pure logic module gets a `test/<module>.test.js`
with the same name, using Node's built-in `node:test` runner (no
dependencies). `gameState.test.js` additionally imports
`test/helpers/localStorage-mock.js` first (a tiny in-memory
`localStorage` polyfill) so save/load can be tested without a real
browser. Tests favor exercising the actual exported functions with
realistic state shapes over mocking internals, and several tests are
explicit regression guards for bugs that were previously found and
fixed (documented inline with what they're guarding against) — check
`memory.md`'s history before deleting or "simplifying" a test that
looks redundant; it likely exists because of a specific past bug.
