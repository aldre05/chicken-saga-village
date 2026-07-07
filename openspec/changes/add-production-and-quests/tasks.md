# Tasks: Resource Production + Quest System

## 1. Resource Production
- [ ] 1.1 Create resources.js: timestamp-based accumulation, cap logic,
      collect() function
- [ ] 1.2 Wire Old Coop's interact to call collect() instead of
      showing static dialogue
- [ ] 1.3 Add HUD egg counter (persistent, outside canvas)
- [ ] 1.4 Add floating "+N" popup on collect (reuse pattern from
      chicken-idle-tycoon)

## 2. Quest System
- [ ] 2.1 Create quests.js: quest data, state, progress-check logic
- [ ] 2.2 Implement collect_total quest type (tracks cumulative eggs
      collected)
- [ ] 2.3 Implement deliver quest type (checks/subtracts carried eggs
      on turn-in)
- [ ] 2.4 Wire Farmer Joe's dialogue to be state-aware (not started /
      in progress / ready / done)
- [ ] 2.5 Wire Market Stall's dialogue to handle the delivery turn-in
      when that quest is active

## 3. Persistence
- [ ] 3.1 Implement localStorage save (carried eggs, total collected,
      coop timestamp, quest state)
- [ ] 3.2 Implement load-on-boot, matching the schema above
- [ ] 3.3 Save on interval + beforeunload, same pattern as
      chicken-idle-tycoon

## 4. Verification
- [ ] 4.1 Playtest full loop: collect from coop → track quest progress
      → deliver at market stall → confirm completion state persists
      after refresh
- [ ] 4.2 Confirm coop's cap logic is correct after a long real-world
      wait (not just short test intervals)

## Explicitly deferred to future proposals
- Building upgrades, multiple resource types
- Repeatable/daily quests
- Supabase accounts (still localStorage-only after this change)
