# Tasks: Town Hall Progression + 4-Resource Economy + Crafting

## 1. Generalize Resource System
- [ ] 1.1 Create RESOURCE_CONFIG (egg, feathers, wood, grain) in
      resources.js
- [ ] 1.2 Refactor resources.js from single-coop logic to
      per-resource-id accumulation (collectFromBuilding)
- [ ] 1.3 Update gameState.js schema for dict-shaped resource state
- [ ] 1.4 Update quests.js to read carried.egg / totalCollected.egg
      instead of the old flat fields
- [ ] 1.5 Re-verify the existing quest chain still works end-to-end
      after the schema change

## 2. Town Hall
- [ ] 2.1 Create townHall.js: level state, upgrade cost table,
      affordability check, upgrade action
- [ ] 2.2 Add Town Hall building to map.js
- [ ] 2.3 Add Town Hall interaction handler (show level/progress,
      trigger upgrade)

## 3. New Production Buildings
- [ ] 3.1 Add Nest Bundle (feathers) to map.js — available from start
- [ ] 3.2 Add Woodshed (wood) to map.js — locked until Town Hall 4
- [ ] 3.3 Add Grain Store (grain) to map.js — locked until Town Hall 5
- [ ] 3.4 Interaction handlers for all three, reusing the Old Coop
      collect pattern generalized to any resource id
- [ ] 3.5 Locked buildings show a "requires Town Hall N" message
      instead of collecting

## 4. Crafting
- [ ] 4.1 Create crafting.js: recipe list, craft() function
      (check resources, subtract, add item to inventory)
- [ ] 4.2 Add Workbench interactable to map.js
- [ ] 4.3 Workbench interaction: show craftable recipes based on
      current resources + Town Hall level, craft on selection
- [ ] 4.4 Increment Land Popularity on successful craft

## 5. Land Popularity
- [ ] 5.1 Add popularity stat to game state
- [ ] 5.2 Show popularity in Town Hall dialogue

## 6. HUD Updates
- [ ] 6.1 Extend HUD to show all 4 resources (not just eggs)
- [ ] 6.2 Extend floating popup system to work for any resource type

## 7. Persistence & Verification
- [ ] 7.1 Update save/load for new schema fields
- [ ] 7.2 Playtest full loop: produce all 4 resources → upgrade Town
      Hall through all 5 levels → craft all 3 items → confirm
      popularity increments → confirm existing quest chain unaffected
- [ ] 7.3 Confirm save/load round-trips correctly with the new schema

## Explicitly deferred to future proposals
- NFTs, land ownership as purchasable asset, revenue-share/tax
  between players (needs legal review first)
- Multiplayer / other players' visible lands
- Marketplace / item selling
- Any bonus effects tied to Land Popularity
