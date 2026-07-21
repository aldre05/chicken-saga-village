# Chicken Saga Village

A free, fan-made village builder for the Chicken Saga community —
inspired by the Pixiland genre (not an IP copy of any specific game).
Vanilla JavaScript + HTML5 Canvas, no build step, no framework, no
backend. Progress is saved locally in your browser.

🐔 **Unofficial fan project.** Not affiliated with or endorsed by any
other game. This is a passion project with no real-world
monetization: no NFTs, no tokens, no purchases. All art is
placeholder (solid-color rectangles) pending a real tileset.

## Playing it

Grow a village of chickens: unlock and upgrade buildings, assign
workers to produce resources, craft items at the Workbench, complete
quests from Farmer Joe, and spin the free Lucky Wheel.

**Controls**
- `WASD` / Arrow keys — move
- `E` — interact with the nearest building or NPC
- `+` / `-` buttons (or `F` / `G`) — assign or unassign a worker at
  the currently open building panel

## Running it locally

This is a static site — no build step, no bundler, no `npm install`
required to play it. Because it uses ES module `<script type="module">`
imports, it needs to be served over `http://` rather than opened
directly as a `file://` URL (browsers block module imports from the
filesystem).

Pick any static file server. For example, with Node installed:

```bash
npx http-server -c-1 .
```

or with Python:

```bash
python3 -m http.server 8080
```

Then open the printed local URL (e.g. `http://localhost:8080`) in
your browser.

## Project structure

```
index.html          Page shell — canvas, HUD, panels, modals
styles.css           All styling
js/
  main.js            Entry point: game loop, input handling, DOM wiring,
                      autosave, Lucky Wheel UI
  gameState.js        Combines every subsystem's state; localStorage
                      save/load, including migration of old save formats
  map.js              Tile grid layout + interactable building/NPC placement
  tileConfig.js       Tile size/scale/color constants
  player.js           Player entity, movement, collision
  camera.js           Viewport follow-and-clamp logic
  interactions.js     Nearest-interactable lookup, dialogue box state
  interactionHandlers.js   Per-building/NPC "press E" behavior
  resources.js         Resource config (egg, feathers, wood, rice,
                      stone, ore), production accrual, afford/spend
  buildingLevels.js    Per-building leveling: worker slots, rate/cap
                      growth curves, upgrade costs
  buildingUnlocks.js   One-time unlock costs, gated by Town Hall level
  townHall.js         Town Hall level + upgrade costs (gates which
                      resources/buildings are available)
  workers.js           Worker population and per-building assignment
  upkeep.js             Egg upkeep consumed by assigned workers over time
  crafting.js           Workbench recipes and inventory
  questBoard.js         Farmer Joe's quest list and rewards
  luckyWheel.js         Free spin mechanic: ticket accrual, weighted
                      rewards, Town-Hall-scaled payouts
  heroes.js              Hero roster: weighted-rarity recruitment,
                      leveling/XP, power calculation
  dungeons.js            Dungeon Gate: timed missions, deterministic
                      power-vs-difficulty resolution (lazy, not a timer)
  render.js / sprites.js / spriteRenderer.js   Canvas drawing
openspec/
  specs/               Current-state feature specs, one per system
  changes/             Proposals for past/planned changes (design docs,
                      task breakdowns) — see openspec's own conventions
test/                  Automated test suite (see below)
memory.md              Running project log/handoff notes between work
                      sessions — read this first for current status
```

Most of the `js/` modules (everything except `main.js`, `render.js`,
`sprites.js`, and `spriteRenderer.js`) are plain, framework-free logic
with no DOM or Canvas dependency — they take in a state object and
return a new value or mutate it in place. `main.js` is the only file
that touches the DOM directly; it wires the pure logic modules up to
button clicks, keyboard input, and the HUD.

### Save data & migrations

All progress lives in a single `localStorage` key
(`chickenVillageSave`). `gameState.js` has migrated the save format
several times as the game evolved (flat egg counter → multi-resource
dict, `grain` → `rice` rename, a single `houses` count → five
individual house buildings, etc.) — see the comments in
`loadGameState()` / `migrateOldResourceShape()` for the full history.
Returning players should never lose progress across an update; any
change to the save shape needs a corresponding migration step and
test coverage (see `test/gameState.test.js`).

## Testing

The test suite uses Node's built-in test runner — no dependencies to
install.

```bash
npm test
# or directly:
node --test
```

It covers every pure-logic module in `js/` (resource production math,
building/Town Hall leveling and costs, worker assignment, upkeep,
crafting, quests, the Lucky Wheel, camera clamping, interaction
distance checks, map layout integrity, and save/load including every
legacy-format migration) with an in-memory `localStorage` polyfill
(`test/helpers/localStorage-mock.js`) so save/load logic can run
without a browser.

`main.js`, `render.js`, `sprites.js`, and `spriteRenderer.js` are not
unit-tested — they're DOM/Canvas glue and visual output, best verified
by playtesting in an actual browser rather than headlessly. When
changing anything in those files (or anything with a visual/UX
component), playtest manually after making the change.

Before committing any change to `js/`, at minimum:

```bash
node --check js/<file-you-changed>.js   # syntax
node --test                              # full suite
```

## Contributing / development notes

- This project follows an [openspec](openspec/)-style workflow:
  planned changes get a `proposal.md` + `tasks.md` + `design.md` under
  `openspec/changes/<change-name>/`, and the current state of each
  system is documented under `openspec/specs/`.
- `memory.md` is the running handoff log between work sessions/agents
  — check it first for current status, open tasks, and past decisions
  before starting new work.
- No NFT/land ownership/monetization work is in scope; it's
  deliberately deferred pending legal review (see `memory.md` →
  Decisions).
