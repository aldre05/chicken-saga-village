# Proposal: Chicken Village MVP (explorable world)

## Why
Chicken Saga has no explorable/village-style game. This proposal starts
a new, separate project inspired by the addictive gameplay loop of
top-down village/hero games (e.g. Pixiland's genre — explorable world,
buildings, NPCs) using original branding and CC0 assets, not copied
IP. It replaces the earlier idle-tycoon direction, which is paused.

This is explicitly a genre/gameplay-style homage, not a clone of any
specific game's assets, UI, text, or branding.

## What Changes
- New standalone repo: a top-down, tile-based explorable village,
  built with HTML5 Canvas + vanilla JS.
- Player character (chicken/farmer hero) walks around a single village
  map using keyboard input, with collision against solid objects.
- A small number of interactive buildings/NPCs the player can walk up
  to and interact with (placeholder dialogue/info for now — no quest
  logic yet).
- Camera that follows the player if the map is larger than the
  viewport.
- Uses Kenney.nl CC0 tileset assets (e.g. "RPG Base") — free, no
  attribution required, safe for a public repo.
- No monetization, tokens, or wallet integration in this change.
  Real-money/earnings features are explicitly deferred to a future
  proposal, after legal review — not part of this MVP.

## Non-Goals (this change)
- DON'T copy Pixiland's (or any other game's) actual art, UI layout,
  quest text, or branding — genre/loop inspiration only.
- DON'T implement any token, NFT, or wallet-based earnings yet — this
  requires legal review first and is out of scope here.
- DON'T build multiplayer, quests, inventory, or combat yet — MVP is
  movement + interaction only. These are natural follow-up changes.
- DON'T reuse chicken-idle-tycoon's code directly — different
  rendering approach (canvas world vs. DOM/scene strip), but the same
  spec-driven workflow applies.

## Impact
- Affected specs (new): world-map, player-movement, interaction-system
- Affected code (new repo): HTML5 Canvas renderer, tile map loader,
  player controller, interaction/dialogue system
