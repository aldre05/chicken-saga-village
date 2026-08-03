# Design: Fix Panel Click Reliability + House 9/10 Placement

## Context
This is a render-loop bug, not a logic bug — confirmed by reading
`crafting.js`/`dungeons.js` directly and simulating affordability with
maxed resources; the underlying affordability/gating logic returns
correct results. The bug is in how often/how the DOM gets rebuilt
around that correct logic.

## Root Cause (traced, not fixed)
```js
// main.js loop(now) — runs every requestAnimationFrame
function loop(now) {
  ...
  const selected = getSelectedInteractable(center);
  updatePromptUI(nearest, selected);   // <-- every frame
  ...
  requestAnimationFrame(loop);
}

// updatePromptUI calls all 4 panel updaters every time it runs:
updateBuildingPanel(panelTarget);
updateCraftingPanel(panelTarget);
updateHeroPanel(panelTarget);
updateDungeonPanel(panelTarget);

// updateCraftingPanel (representative of all 3 affected panels):
function updateCraftingPanel(target) {
  ...
  craftingRecipeListEl.innerHTML = '';   // <-- wipes all rows/buttons
  for (const recipe of RECIPES) {
    ...
    const btn = document.createElement('button');   // <-- new element, every frame
    btn.addEventListener('click', () => { ... });
    ...
  }
}
```
Every frame: existing buttons are destroyed (`innerHTML = ''`) and
brand-new ones created and re-listened. A user's mousedown lands on
frame N's button; by the time mouseup fires (even a fast click spans
multiple 16ms frames), that element no longer exists — a new one from
frame N+1 (or N+40) occupies the same pixels but is a different DOM
node with its own separate listener that also never got its matching
mousedown. No click ever completes. `updateDungeonPanel`'s tier
buttons and `updateHeroPanel`'s champion buttons follow the identical
pattern — same root cause, same fix.

## Fix Options (Backend to choose/refine — not decided here)
1. **Gate the rebuild behind a change check.** Track a small
   "signature" per panel (e.g. `target?.id + JSON.stringify(relevant
   state)`) and only rebuild `innerHTML` when it changes since the
   last call. Simplest to reason about, smallest diff.
2. **Move panel updates out of the per-frame loop entirely** — only
   call `updatePromptUI` when something that could change panel state
   actually happens (interact keypress, resource collection, worker
   assignment, craft/recruit/send actions, tick-based resource
   accrual). More invasive — touches more call sites — but removes
   the per-frame cost entirely, not just the click bug.
3. **Keep the per-frame loop, stop rebuilding unconditionally** — diff
   and patch only the rows that actually changed (e.g. an
   affordability flip) instead of nuking `innerHTML`. Most correct
   long-term, most work.
Recommend option 1 as the smallest fix that solves the reported bug
without a larger refactor — but this is a real design choice, not a
formality; whoever picks this up should sanity-check against how
often panel state genuinely changes in practice before committing to
an approach.

## House 9/10 Placement
`map.js` currently places House 9/10 "east of the Town Hall" by
original deliberate design (see the comment block near their
coordinates — this was intentional, not an oversight, but confirmed
confusing in actual play now that it's been tested). Reposition to
sit in House 1-8's shared grid/column instead. Straightforward
coordinate change — check for any other code that assumes their
current position (e.g. `tileConfig.js`, any decorative-object
placement that was deliberately routed around their old spot per the
`map.js` comment about clearing tree spots) before moving them, so
nothing else silently overlaps.

## Risks / Open Questions
- Confirm the root-cause theory against the actual browser before
  starting the fix — this was traced from static code reading, not
  reproduced in a live browser session. Should take under a minute to
  confirm (open DevTools, watch the Craft button's DOM node identity
  change every frame via the Elements panel, or just add a
  `console.log` inside `updateCraftingPanel` and watch it fire
  continuously even while standing still).
- If option 2 or 3 above is chosen, double check the
  `resolvePendingDungeons()`/`applyUpkeep()` per-frame calls aren't
  relying on `updatePromptUI` running every frame for some
  side-effect unrelated to panels — skim `loop(now)` fully before
  changing its call pattern.
