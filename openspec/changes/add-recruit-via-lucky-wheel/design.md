# Design: Recruit Heroes via Lucky Wheel Only

## Context
Extends hero-system (recruitment path) and lucky-wheel (reward
table). Doesn't touch leveling, equipment, dungeons, or healing at
all — purely changes *how a hero enters the roster*.

## Goals
- A hero win should feel like the same kind of moment as any other
  good Lucky Wheel spin, not a separate system bolted on.
- Reuse the existing rarity roll unchanged — no new balance surface
  to tune.
- Keep the Barracks useful for its other jobs (roster management,
  healing, equipping) even with recruiting removed from it.

## Non-Goals
See proposal.md — most importantly, no real-money purchase path.

## Reward Table Entry
```js
// luckyWheel.js REWARD_TABLE — new entry
{ resource: 'hero', amount: 1, weight: 4, color: '#c94fae' }
```
Weight 4 — lower than the proposed `dungeon_key` entry (weight 5, see
add-dungeon-keys) since a hero is a bigger prize than a single key.
Exact number is a first guess for playtesting, same spirit as every
other weight/multiplier in this codebase's design docs.

## Recruit-Without-Cost Function
`recruitHero()` currently spends `RECRUIT_COST` itself
(`canRecruitHero`/`spendResources`) — that's wrong once the wheel is
the only entry point, since the wheel spin already consumed a ticket
to get here; spending resources on top would double-charge. Recommend
splitting the hero-creation logic out from the resource-spending
logic:
```js
// heroes.js
function createRolledHero() {
  const picked = pickWeighted(RARITY_TABLE);
  return {
    id: makeHeroId(),
    name: pickRandomName(picked.rarity),
    rarity: picked.rarity,
    class: pickRandomClass(),
    level: 1,
    xp: 0,
    busyUntil: null,
    dungeonTier: null,
    currentHp: RARITY_BY_ID[picked.rarity].hp,
    equipment: { weapon: null, armor: null, boots: null }
  };
}

// Old recruitHero() becomes a thin wrapper kept ONLY if some other
// path still needs a resource-paid recruit (none currently planned —
// flag for removal entirely if truly dead code once this ships).
```
`spinWheel()`'s hero-branch calls `createRolledHero()` directly and
pushes onto `rosterState.roster` — no resource spend, no
`RECRUIT_COST` involved at all.

## Barracks UI
The recruit button/cost display is removed. Recommend replacing it
with a short static line ("Recruit heroes at the Lucky Wheel") rather
than leaving an empty gap — small UI change, but shouldn't look like
a removed feature nobody noticed.

## Risks / Open Questions
- Roster has no stated size cap anywhere in the current code — a
  wheel spin landing on "hero" when the roster is already large has
  no special handling need, same as recruiting has never had a cap.
  Not treating this as a gap unless the developer wants a cap added
  (separate decision, not assumed here).
- Existing `RECRUIT_COST`/`canRecruitHero` exports may become fully
  dead code once this ships — Documentation & Testing should confirm
  nothing else references them before removing, rather than leaving
  unused exports behind silently.
