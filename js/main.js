import { MAP_COLS, MAP_ROWS, mapGrid, interactables } from './map.js';
import { RENDERED_TILE_SIZE } from './tileConfig.js';
import { createCamera } from './camera.js';
import { createPlayer, updatePlayer, getPlayerCenter, PLAYER_SPRITE_SIZE } from './player.js';
import { findNearestInteractable, distanceToRect, createDialogueState, closeDialogue } from './interactions.js';
import { renderFrame } from './render.js';
import { loadGameState, saveGameState } from './gameState.js';
import { HANDLERS, BUILDING_RESOURCE } from './interactionHandlers.js';
import { RESOURCE_CONFIG, isResourceUnlocked, collectFromBuilding, getEffectiveRatePerSecond, getBuildingStored, canAfford, GEM_TO_RESOURCE_RATE, canExchangeGemsForResource, exchangeGemsForResource } from './resources.js';
import { assignWorker, unassignWorker, getIdleWorkers } from './workers.js';
import { isBuildingUnlocked, UNLOCK_CONFIG, unlockBuilding } from './buildingUnlocks.js';
import { applyUpkeep } from './upkeep.js';
import {
  getMaxWorkers, getRateMultiplier, getCapMultiplier, rateMultiplierForLevel, getUpgradeCost, canUpgradeBuilding, upgradeBuilding,
  isHouse, getHouseCapacity, isHouseMaxed, HOUSE_IDS
} from './buildingLevels.js';
import { canUpgrade as canUpgradeTownHall, getUpgradeCost as getTownHallUpgradeCost, upgradeTownHall, MAX_TOWN_HALL_LEVEL } from './townHall.js';
import { RECIPES, getCraftableRecipes, craftSpecific } from './crafting.js';
import {
  isLuckyWheelUnlocked, getTicketCap, syncTickets, spinWheel, getMsUntilNextTicket, REWARD_TABLE
} from './luckyWheel.js';
import {
  effectivePower, isHeroBusy, isHeroIdle, getHeroById,
  EQUIPMENT_SLOTS, EQUIPMENT_ITEMS, canEquipItem, equipHero, unequipHero,
  isDowned, getMaxHp, getHealCost, canHealHero, healHero, useHealPotion, canUseHealPotion, HEAL_POTION_ITEM_ID,
  HERO_ROLL_GEM_COST, canBuyHeroRollWithGems, buyHeroRollWithGems
} from './heroes.js';
import {
  DUNGEON_TIERS, DUNGEON_TIER_IDS, getDungeonTier, canSendHeroToDungeon, sendHeroToDungeon, resolveReadyDungeons,
  DUNGEON_KEY_ITEM_ID, DUNGEON_KEY_GEM_COST, canBuyDungeonKeyWithGems, buyDungeonKeyWithGems
} from './dungeons.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const canvasFrame = document.querySelector('.canvas-frame');

const promptEl = document.getElementById('interactPrompt');
const dialogueBox = document.getElementById('dialogueBox');
const dialogueTitle = document.getElementById('dialogueTitle');
const dialogueText = document.getElementById('dialogueText');
const hudEl = document.getElementById('resourceHud');
const workerHudEl = document.getElementById('workerHud');
const autoClaimBtn = document.getElementById('autoClaimBtn');

const panelEl = document.getElementById('buildingPanel');
const panelNameEl = document.getElementById('panelBuildingName');
const panelLevelEl = document.getElementById('panelBuildingLevel');
const panelRateEl = document.getElementById('panelRate');
const workerCountEl = document.getElementById('workerPanelCount');
const workerRowEl = workerCountEl.closest('.building-panel-row');
const workerMinusBtn = document.getElementById('workerMinusBtn');
const workerPlusBtn = document.getElementById('workerPlusBtn');
const upgradeBtn = document.getElementById('upgradeBtn');
const upgradePreviewEl = document.getElementById('upgradePreview');

const craftingPanelEl = document.getElementById('craftingPanel');
const craftingRecipeListEl = document.getElementById('craftingRecipeList');

const heroPanelEl = document.getElementById('heroPanel');
const heroRosterListEl = document.getElementById('heroRosterList');
const buyHeroRollBtn = document.getElementById('buyHeroRollBtn');
const buyHeroRollCostEl = document.getElementById('buyHeroRollCost');

const dungeonPanelEl = document.getElementById('dungeonPanel');
const dungeonTierListEl = document.getElementById('dungeonTierList');
const dungeonRewardPreviewEl = document.getElementById('dungeonRewardPreview');
const dungeonHeroListEl = document.getElementById('dungeonHeroList');
const sendHeroBtn = document.getElementById('sendHeroBtn');
const dungeonEntryCostEl = document.getElementById('dungeonEntryCost');
const dungeonKeyCountEl = document.getElementById('dungeonKeyCount');
const dungeonSendReasonEl = document.getElementById('dungeonSendReason');
const buyKeyBtn = document.getElementById('buyKeyBtn');
const buyKeyCostEl = document.getElementById('buyKeyCost');

const gemsHudEl = document.getElementById('gemsHud');
const exchangeGemsBtn = document.getElementById('exchangeGemsBtn');
const gemsExchangeModalEl = document.getElementById('gemsExchangeModal');
const gemsExchangeCloseBtn = document.getElementById('gemsExchangeCloseBtn');
const gemsExchangeBalanceEl = document.getElementById('gemsExchangeBalance');
const gemsExchangeRows = Array.from(document.querySelectorAll('.gems-exchange-row'));

// Static refs to the Barracks/Dungeon Gate world objects, used as the
// anchor point for floating popups (recruit results, mission results).
const barracksObj = interactables.find(o => o.id === 'barracks');
const dungeonGateObj = interactables.find(o => o.id === 'dungeon_gate');

const luckyWheelWidgetEl = document.getElementById('luckyWheelWidget');
const luckyWheelTicketsEl = document.getElementById('luckyWheelTickets');
const luckyWheelCountdownEl = document.getElementById('luckyWheelCountdown');
const luckyWheelModalEl = document.getElementById('luckyWheelModal');
const luckyWheelCloseBtn = document.getElementById('luckyWheelCloseBtn');
const wheelDialEl = document.getElementById('wheelDial');
const wheelResultTextEl = document.getElementById('wheelResultText');
const wheelTicketInfoEl = document.getElementById('wheelTicketInfo');
const wheelSpinBtn = document.getElementById('wheelSpinBtn');

// Updated each frame by updateBuildingPanel() — buttons read this at
// click time rather than needing to be recreated every frame.
let currentTarget = null; // { kind: 'resource'|'house', resourceId?, buildingId, buildingObj }

// Which building's panel is open — set by clicking its sprite or
// pressing E while in range (both toggle: same building again closes
// it). Replaces "walk into range" as the panel-visibility trigger
// (add-click-to-open-panels). `nearest`/`findNearestInteractable`
// still run every frame, but only drive the "Press E / click to
// interact" prompt text now, not panel visibility — see
// getSelectedInteractable() and updatePromptUI().
let selectedBuildingId = null;

// Dungeon Gate panel picker state — which tier and which idle hero
// are currently selected. Reset to a safe default each render if the
// prior selection is no longer valid (hero got sent, tier unchanged).
let selectedDungeonTierId = DUNGEON_TIER_IDS[0];
let selectedHeroId = null;

const AUTOSAVE_MS = 20000;

const worldWidth = MAP_COLS * RENDERED_TILE_SIZE;
const worldHeight = MAP_ROWS * RENDERED_TILE_SIZE;

function resizeCanvas() {
  canvas.width = Math.min(window.innerWidth - 32, 960);
  canvas.height = Math.min(window.innerHeight - 220, 640);
}
resizeCanvas();

const camera = createCamera(worldWidth, worldHeight, canvas.width, canvas.height);

// Keep the camera's clamp bounds in sync with the canvas whenever it's
// resized. Previously the resize listener only resized the <canvas>
// element itself — the camera's viewportWidth/viewportHeight (used to
// clamp panning to the map edges) were captured once at load and never
// updated, so resizing the browser window left the camera clamping
// against stale dimensions, which could show past the map edge or
// stop it from correctly following the player near boundaries.
window.addEventListener('resize', () => {
  resizeCanvas();
  camera.viewportWidth = canvas.width;
  camera.viewportHeight = canvas.height;
});

// Start the player near the crossroads, clear of both building clusters.
const player = createPlayer(14 * RENDERED_TILE_SIZE, 9 * RENDERED_TILE_SIZE);

const dialogueState = createDialogueState();
const gameState = loadGameState();

// Renders a cost dict as HTML, highlighting any resource the player
// can't currently afford in red — makes shortfalls obvious at a glance
// instead of requiring mental math against the HUD.
// Icons for crafted inventory items that aren't raw resources
// (RESOURCE_CONFIG only covers egg/feathers/wood/rice/stone/ore).
// formatCostHTML below needs this fallback for any recipe whose cost
// references an item id instead of a raw resource — e.g. Boots costs
// plank, not a raw resource. Without this fallback,
// `RESOURCE_CONFIG['plank'].icon` throws (RESOURCE_CONFIG['plank'] is
// undefined), which would crash the crafting panel outright the
// moment it tried to render Boots' recipe row.
const ITEM_CONFIG = {
  nest_charm: { icon: '🧿' }, basket: { icon: '🧺' }, chicken_feed: { icon: '🌰' },
  plank: { icon: '🪵' }, brick: { icon: '🧱' }, ingot: { icon: '🔩' },
  sword: { icon: '⚔️' }, bow: { icon: '🏹' }, staff: { icon: '🪄' },
  armor: { icon: '🛡️' }, boots: { icon: '👢' }, heal_potion: { icon: '🧪' },
  dungeon_key: { icon: '🗝️' },
  // 'gems' isn't a crafted inventory item (it lives on gameState.gems,
  // not gameState.inventory) but is looked up through this same
  // iconFor()/nameFor() map by the Lucky Wheel's reward-branch code
  // (wheel segment label AND win popup), the same way 'hero'/
  // dungeon_key/etc. already are. Without an entry here, iconFor('gems')
  // silently fell through to the '❔' fallback — a real, always-visible
  // bug (the gems wheel segment showed a question mark on every page
  // load, not just an edge case), found while cross-checking this
  // exact code path for the gems-currency spec write-up.
  gems: { icon: '💎' }
};

function iconFor(id) {
  return RESOURCE_CONFIG[id]?.icon || ITEM_CONFIG[id]?.icon || '❔';
}

// Display name for any reward/cost id — raw resources have one in
// RESOURCE_CONFIG; crafted items (dungeon_key, sword, ...) don't, so
// derive a readable name from the id itself (snake_case -> Title Case)
// rather than hardcoding a name per item.
function nameFor(id) {
  if (RESOURCE_CONFIG[id]) return RESOURCE_CONFIG[id].name;
  return id.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// Renders a cost dict as HTML, highlighting any resource/item the
// player can't currently afford in red — makes shortfalls obvious at
// a glance instead of requiring mental math against the HUD. A cost
// id might be a raw resource (checked against gameState.resources) OR
// a crafted inventory item like Boots' plank cost (checked against
// gameState.inventory instead) — mirrors crafting.js's own
// splitCost() logic for the same resource-vs-item distinction.
function formatCostHTML(costDict) {
  return Object.entries(costDict).map(([id, amt]) => {
    const have = RESOURCE_CONFIG[id] ? gameState.resources.carried[id] : (gameState.inventory[id] || 0);
    const short = have < amt;
    const cls = short ? 'cost-insufficient' : '';
    return `<span class="${cls}">${amt}${iconFor(id)}</span>`;
  }).join(' ');
}

// Plain-text version for floating popups (which use textContent, not
// innerHTML) — e.g. dungeon mission rewards.
function formatRewardText(rewardDict) {
  return Object.entries(rewardDict).map(([id, amt]) => `+${amt}${RESOURCE_CONFIG[id].icon}`).join(' ');
}

updateResourceHud();

// Buildings whose E-press has always opened a flavor-text dialogue
// box rather than (or in addition to) a panel — that behavior is
// explicitly unaffected by click-to-open-panels (design.md's
// non-goals). Every other interactable's E-press now toggles
// selectedBuildingId, same semantics as clicking it.
const DIALOGUE_ONLY_ON_E = new Set(['farmer_npc', 'town_hall']);

const keys = new Set();
window.addEventListener('keydown', (e) => {
  keys.add(e.code);

  if (e.code === 'KeyE') {
    if (dialogueState.open) {
      closeDialogue(dialogueState);
    } else {
      const center = getPlayerCenter(player);
      const nearest = findNearestInteractable(center, interactables);
      if (nearest) {
        if (DIALOGUE_ONLY_ON_E.has(nearest.id)) {
          handleInteract(nearest);
        } else {
          selectedBuildingId = (selectedBuildingId === nearest.id) ? null : nearest.id;
        }
      }
    }
  }
  if (e.code === 'Escape' && dialogueState.open) {
    closeDialogue(dialogueState);
  }

  if ((e.code === 'KeyF' || e.code === 'KeyG') && !dialogueState.open && currentTarget && currentTarget.kind === 'resource') {
    if (e.code === 'KeyF') doAssign();
    else doUnassign();
  }
});
window.addEventListener('keyup', (e) => keys.delete(e.code));

// Click-to-open panels: clicking a building's on-screen sprite opens
// its panel (still gated by interactRadius — a click doesn't bypass
// the "must be in range" rule, it just replaces walking-into-range as
// the trigger). Clicking the same selected building again, or
// clicking empty ground, closes the panel. Same toggle semantics as
// the E-press handler above, and shares distanceToRect with it/with
// findNearestInteractable rather than reimplementing range-checking.
canvas.addEventListener('click', (e) => {
  if (dialogueState.open) return; // dialogue box doesn't cover the whole canvas, so guard explicitly

  const rect = canvas.getBoundingClientRect();
  const worldX = e.clientX - rect.left + camera.x;
  const worldY = e.clientY - rect.top + camera.y;

  const clicked = interactables.find(obj =>
    worldX >= obj.x && worldX <= obj.x + obj.width &&
    worldY >= obj.y && worldY <= obj.y + obj.height
  );
  if (!clicked) {
    selectedBuildingId = null;
    return;
  }

  const center = getPlayerCenter(player);
  const distance = distanceToRect(center.x, center.y, clicked);
  if (distance > clicked.interactRadius) return; // out of range — ignore the click, don't deselect either

  selectedBuildingId = (selectedBuildingId === clicked.id) ? null : clicked.id;
});

autoClaimBtn.addEventListener('click', () => {
  const now = Date.now();
  const totals = {};
  let anyCollected = false;

  for (const [buildingId, resourceId] of Object.entries(BUILDING_RESOURCE)) {
    if (!isBuildingUnlocked(gameState.buildingUnlocks, buildingId)) continue;
    if (!isResourceUnlocked(resourceId, gameState.townHall.level)) continue;

    const assigned = gameState.workers.assignments[resourceId];
    const rateMultiplier = getRateMultiplier(buildingId, gameState.buildingLevels);
    const capMultiplier = getCapMultiplier(buildingId, gameState.buildingLevels);
    const collected = collectFromBuilding(gameState.resources, resourceId, now, gameState.townHall.level, assigned, rateMultiplier, capMultiplier);
    if (collected > 0) {
      totals[resourceId] = collected;
      anyCollected = true;
    }
  }

  if (anyCollected) {
    const summary = Object.entries(totals).map(([id, amt]) => `+${amt}${RESOURCE_CONFIG[id].icon}`).join(' ');
    spawnFloatingPopup(summary, player.x + PLAYER_SPRITE_SIZE / 2, player.y);
  } else {
    spawnFloatingPopup('Nothing to claim', player.x + PLAYER_SPRITE_SIZE / 2, player.y);
  }
  updateResourceHud();
});

function doAssign() {
  const { resourceId, buildingId, buildingObj } = currentTarget;
  const maxWorkers = getMaxWorkers(buildingId, gameState.buildingLevels);
  const rateMultiplier = getRateMultiplier(buildingId, gameState.buildingLevels);
  const capMultiplier = getCapMultiplier(buildingId, gameState.buildingLevels);
  const ok = assignWorker(gameState.workers, gameState.resources, resourceId, Date.now(), maxWorkers, rateMultiplier, capMultiplier, gameState.buildingUnlocks, gameState.buildingLevels);
  spawnFloatingPopup(ok ? '+1 worker 👷' : 'No idle workers', buildingObj.x + buildingObj.width / 2, buildingObj.y);
  updateResourceHud();
}

function doUnassign() {
  const { resourceId, buildingId, buildingObj } = currentTarget;
  const rateMultiplier = getRateMultiplier(buildingId, gameState.buildingLevels);
  const capMultiplier = getCapMultiplier(buildingId, gameState.buildingLevels);
  const ok = unassignWorker(gameState.workers, gameState.resources, resourceId, Date.now(), rateMultiplier, capMultiplier);
  spawnFloatingPopup(ok ? '-1 worker 👷' : 'None to remove', buildingObj.x + buildingObj.width / 2, buildingObj.y);
  updateResourceHud();
}

workerMinusBtn.addEventListener('click', () => { if (currentTarget && currentTarget.kind === 'resource') doUnassign(); });
workerPlusBtn.addEventListener('click', () => { if (currentTarget && currentTarget.kind === 'resource') doAssign(); });

upgradeBtn.addEventListener('click', () => {
  if (!currentTarget) return;
  const { kind, buildingId, buildingObj } = currentTarget;

  let ok, resultText;
  if (kind === 'locked') {
    ok = unlockBuilding(gameState.buildingUnlocks, buildingId, gameState.townHall.level, gameState.resources);
    resultText = 'Unlocked! 🔓';
  } else if (kind === 'townhall') {
    ok = canUpgradeTownHall(gameState.townHall, gameState.resources) && upgradeTownHall(gameState.townHall, gameState.resources);
    resultText = `Upgraded! Lv.${gameState.townHall.level} ⬆️`;
  } else {
    ok = upgradeBuilding(buildingId, gameState.buildingLevels, gameState.resources);
    resultText = `Upgraded! Lv.${gameState.buildingLevels[buildingId]} ⬆️`;
  }

  if (ok) {
    spawnFloatingPopup(resultText, buildingObj.x + buildingObj.width / 2, buildingObj.y);
  } else {
    spawnFloatingPopup("Can't afford it", buildingObj.x + buildingObj.width / 2, buildingObj.y);
  }
  updateResourceHud();
});

function handleInteract(obj) {
  const handler = HANDLERS[obj.id];
  const result = handler
    ? handler.interact(gameState)
    : { title: obj.name, text: obj.dialogue };

  dialogueState.open = true;
  dialogueState.title = result.title;
  dialogueState.text = result.text;

  if (result.floatingAmount) {
    spawnFloatingPopup(`+${result.floatingAmount} ${result.floatingIcon || ''}`, obj.x + obj.width / 2, obj.y);
  }
  updateResourceHud();
}

function spawnFloatingPopup(text, worldX, worldY, extraClass) {
  const screenX = worldX - camera.x;
  const screenY = worldY - camera.y;

  const popup = document.createElement('div');
  popup.className = extraClass ? `floating-popup ${extraClass}` : 'floating-popup';
  popup.textContent = text;
  popup.style.left = screenX + 'px';
  popup.style.top = screenY + 'px';
  canvasFrame.appendChild(popup);
  popup.addEventListener('animationend', () => popup.remove());
}

function updateResourceHud() {
  hudEl.innerHTML = '';
  for (const [id, cfg] of Object.entries(RESOURCE_CONFIG)) {
    const chip = document.createElement('div');
    chip.className = 'hud-chip';
    chip.innerHTML = `<span class="hud-icon">${cfg.icon}</span><span>${gameState.resources.carried[id]}</span>`;
    if (id === 'egg') {
      const totalAssigned = Object.values(gameState.workers.assignments).reduce((a, b) => a + b, 0);
      chip.title = totalAssigned > 0
        ? `Egg also feeds your ${totalAssigned} assigned worker${totalAssigned === 1 ? '' : 's'} over time (upkeep).`
        : 'Egg feeds assigned workers over time once you have any (upkeep).';
      if (gameState.resources.carried.egg <= 0 && totalAssigned > 0) {
        chip.classList.add('hud-chip-warning');
      }
    }
    hudEl.appendChild(chip);
  }
  updateWorkerHud();
  updateGemsHud();
}

// Gems is a separate static element (not part of the RESOURCE_CONFIG
// loop above, since gems isn't a raw resource) — just text content,
// no buttons inside it, so no click-reliability concern rebuilding
// it every frame (same reasoning as updateWorkerHud()).
function updateGemsHud() {
  gemsHudEl.innerHTML = `<span class="hud-icon">💎</span><span>${gameState.gems}</span>`;
}

function updateWorkerHud() {
  const idle = getIdleWorkers(gameState.workers, gameState.buildingUnlocks, gameState.buildingLevels);
  const total = HOUSE_IDS.reduce((sum, id) => sum + (gameState.buildingUnlocks[id] ? getHouseCapacity(id, gameState.buildingLevels) : 0), 0);
  workerHudEl.innerHTML = `<span class="hud-icon">👷</span><span>${idle} idle / ${total} total</span>`;
}

setInterval(() => saveGameState(gameState), AUTOSAVE_MS);
window.addEventListener('beforeunload', () => saveGameState(gameState));
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') saveGameState(gameState);
});

// ---------- Lucky Wheel (fixed widget, not a walkable building) ----------

const wheelSegments = buildWheelSegments();
buildWheelDialVisual();
let wheelTotalRotation = 0;
let wheelSpinning = false;

function buildWheelSegments() {
  const totalWeight = REWARD_TABLE.reduce((sum, r) => sum + r.weight, 0);
  let cumulative = 0;
  return REWARD_TABLE.map(entry => {
    const startAngle = (cumulative / totalWeight) * 360;
    cumulative += entry.weight;
    const endAngle = (cumulative / totalWeight) * 360;
    return { ...entry, startAngle, endAngle, midAngle: (startAngle + endAngle) / 2 };
  });
}

function buildWheelDialVisual() {
  // Plain alternating colors — no thin gradient "divider bands" here.
  // A previous version tried 1.5deg-wide divider bands baked into the
  // conic-gradient itself, but thin angular bands like that can
  // anti-alias into near-invisibility depending on the browser/GPU.
  // Real DOM line elements (below) are far more reliable.
  const gradientStops = wheelSegments.map(s => `${s.color} ${s.startAngle}deg ${s.endAngle}deg`).join(', ');
  wheelDialEl.style.background = `conic-gradient(${gradientStops})`;

  wheelDialEl.innerHTML = '';
  const labelRadius = 90; // px from center to label position
  const dividerLength = 130; // px, half the wheel's diameter (260px)

  // Divider lines — one per segment boundary, as actual rotated line
  // elements rather than gradient bands.
  for (const seg of wheelSegments) {
    const divider = document.createElement('div');
    divider.className = 'wheel-divider-line';
    divider.style.height = dividerLength + 'px';
    divider.style.transform = `rotate(${seg.startAngle}deg)`;
    wheelDialEl.appendChild(divider);
  }

  // Segment labels. Bug fix: the offset that determines "how far
  // outward" a label sits must be the Y component of translate (since
  // rotate(0deg) = straight up, matching conic-gradient's 0deg
  // reference), not the X component — using translate(radius, -12px)
  // placed every label near the 90deg/3-o'clock position *before*
  // rotation was even applied, so after rotating by midAngle every
  // label landed roughly 90deg away from its actual segment. That's
  // what caused rewards to visually not match their wedge.
  const labelWidth = 60;
  for (const seg of wheelSegments) {
    const label = document.createElement('div');
    label.className = 'wheel-segment-label';
    label.style.width = labelWidth + 'px';
    label.style.transform = `rotate(${seg.midAngle}deg) translate(${-labelWidth / 2}px, -${labelRadius}px)`;
    // seg.resource can be a raw resource, an inventory item
    // (dungeon_key), or 'hero' — RESOURCE_CONFIG only covers raw
    // resources. This ran at module load time (every page load, not
    // just when the wheel is opened) via the buildWheelDialVisual()
    // call right below buildWheelSegments() — RESOURCE_CONFIG[seg.
    // resource] being undefined for the two new reward types crashed
    // unconditionally on load, before this fix.
    const segIcon = seg.resource === 'hero' ? '🦸' : iconFor(seg.resource);
    label.innerHTML = `<span class="seg-icon">${segIcon}</span>+${seg.amount}`;
    wheelDialEl.appendChild(label);
  }
}

function updateLuckyWheelWidget() {
  const unlocked = isLuckyWheelUnlocked(gameState.townHall.level);
  luckyWheelWidgetEl.classList.toggle('hidden', !unlocked);
  if (!unlocked) return;

  const now = Date.now();
  syncTickets(gameState.luckyWheel, now, gameState.townHall.level);
  const cap = getTicketCap(gameState.townHall.level);
  luckyWheelTicketsEl.textContent = `🎫 ${gameState.luckyWheel.tickets}/${cap}`;

  const { atCap, msRemaining } = getMsUntilNextTicket(gameState.luckyWheel, now, gameState.townHall.level);
  luckyWheelCountdownEl.textContent = atCap ? 'Full!' : formatCountdown(msRemaining);
}

function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
}

function formatCountdown(ms) {
  return `Next: ${formatDuration(ms)}`;
}

luckyWheelWidgetEl.addEventListener('click', () => {
  if (!isLuckyWheelUnlocked(gameState.townHall.level)) return;
  openWheelModal();
});

luckyWheelCloseBtn.addEventListener('click', closeWheelModal);
luckyWheelModalEl.addEventListener('click', (e) => {
  if (e.target === luckyWheelModalEl) closeWheelModal();
});

// Gems Exchange modal — same open/close pattern as the Lucky Wheel
// modal above. Fixed gem amount per click (GEMS_PER_EXCHANGE) rather
// than a numeric input: GEM_TO_RESOURCE_RATE is a flat rate, so a
// repeatable "spend 5, get 50" button matches this project's existing
// minimal-UI style (recipe rows, tier buttons) better than
// introducing this codebase's first numeric-input control for a
// single use-case.
const GEMS_PER_EXCHANGE = 5;

exchangeGemsBtn.addEventListener('click', () => {
  updateGemsExchangeModal();
  gemsExchangeModalEl.classList.remove('hidden');
});
gemsExchangeCloseBtn.addEventListener('click', closeGemsExchangeModal);
gemsExchangeModalEl.addEventListener('click', (e) => {
  if (e.target === gemsExchangeModalEl) closeGemsExchangeModal();
});

function closeGemsExchangeModal() {
  gemsExchangeModalEl.classList.add('hidden');
}

// The 6 resource rows are a fixed, never-changing set (declared once
// in index.html, not dynamically generated) — same reasoning as
// sendHeroBtn/dungeonEntryCostEl: a fixed number of static elements
// never needs the signature-gating pattern used for the tier/hero
// pickers, since there's no list to rebuild, just text/disabled state
// to update on an unchanging set of buttons.
for (const row of gemsExchangeRows) {
  const resourceId = row.dataset.resource;
  row.addEventListener('click', () => {
    const ok = exchangeGemsForResource(gameState, gameState.resources, resourceId, GEMS_PER_EXCHANGE);
    if (ok) {
      spawnFloatingPopup(`+${GEMS_PER_EXCHANGE * GEM_TO_RESOURCE_RATE} ${RESOURCE_CONFIG[resourceId].icon}`, player.x + PLAYER_SPRITE_SIZE / 2, player.y);
    }
    updateResourceHud();
    updateGemsExchangeModal();
  });
}

function updateGemsExchangeModal() {
  gemsExchangeBalanceEl.textContent = `You have ${gameState.gems} 💎`;
  for (const row of gemsExchangeRows) {
    const resourceId = row.dataset.resource;
    const cfg = RESOURCE_CONFIG[resourceId];
    const canExchange = canExchangeGemsForResource(gameState, GEMS_PER_EXCHANGE);
    row.disabled = !canExchange;
    row.querySelector('.gems-exchange-row-cost').innerHTML =
      `<span class="${canExchange ? '' : 'cost-insufficient'}">${GEMS_PER_EXCHANGE}💎</span> → ${GEMS_PER_EXCHANGE * GEM_TO_RESOURCE_RATE}${cfg.icon}`;
  }
}

function openWheelModal() {
  wheelResultTextEl.textContent = '';
  wheelResultTextEl.classList.remove('wheel-result-hero');
  updateWheelModalInfo();
  luckyWheelModalEl.classList.remove('hidden');
}

function closeWheelModal() {
  luckyWheelModalEl.classList.add('hidden');
}

function updateWheelModalInfo() {
  const now = Date.now();
  syncTickets(gameState.luckyWheel, now, gameState.townHall.level);
  const cap = getTicketCap(gameState.townHall.level);
  wheelTicketInfoEl.textContent = `Tickets: ${gameState.luckyWheel.tickets}/${cap}`;
  wheelSpinBtn.disabled = wheelSpinning || gameState.luckyWheel.tickets <= 0;
}

wheelSpinBtn.addEventListener('click', () => {
  if (wheelSpinning) return;
  const now = Date.now();
  const reward = spinWheel(gameState.luckyWheel, gameState.resources, gameState.inventory, gameState.heroes, gameState, now, gameState.townHall.level);

  if (!reward) {
    wheelResultTextEl.textContent = 'No tickets left!';
    updateWheelModalInfo();
    return;
  }

  wheelSpinning = true;
  wheelSpinBtn.disabled = true;
  wheelResultTextEl.textContent = 'Spinning...';

  const segmentIndex = REWARD_TABLE.indexOf(reward.baseEntry);
  const segment = wheelSegments[segmentIndex];
  spinDialToSegment(segment.midAngle);

  setTimeout(() => {
    // reward.resource can now be a raw resource, an inventory item
    // (dungeon_key), or 'hero' — RESOURCE_CONFIG only covers raw
    // resources, so looking it up directly for every reward type
    // would throw on the two new reward kinds. iconFor/nameFor handle
    // all three uniformly. A hero win gets genuinely distinct
    // treatment (task 2.3), not just different wording — same
    // principle already applied to dungeon success vs. failure
    // popups: the biggest possible spin outcome should read as a
    // different kind of moment.
    if (reward.hero) {
      const rarityLabel = reward.hero.rarity.charAt(0).toUpperCase() + reward.hero.rarity.slice(1);
      wheelResultTextEl.textContent = `🎉 You won a hero! ${rarityLabel} ${reward.hero.name} joined the roster!`;
      wheelResultTextEl.classList.add('wheel-result-hero');
    } else {
      wheelResultTextEl.textContent = `You won ${reward.amount} ${nameFor(reward.resource)}! ${iconFor(reward.resource)}`;
      wheelResultTextEl.classList.remove('wheel-result-hero');
    }
    wheelSpinning = false;
    updateResourceHud();
    updateWheelModalInfo();
  }, 4100); // slightly longer than the 4s CSS transition
});

function spinDialToSegment(midAngle) {
  const extraSpins = 4 + Math.floor(Math.random() * 2); // 4-5 full spins for effect
  const targetWithinCircle = (360 - midAngle) % 360; // rotate so midAngle lands under the top pointer
  const currentMod = ((wheelTotalRotation % 360) + 360) % 360;
  const delta = (targetWithinCircle - currentMod + 360) % 360;
  wheelTotalRotation += extraSpins * 360 + delta;
  wheelDialEl.style.transform = `rotate(${wheelTotalRotation}deg)`;
}

let lastTime = performance.now();

function loop(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;

  if (!dialogueState.open) {
    updatePlayer(player, keys, dt, now, mapGrid, interactables);
  }

  applyUpkeep(gameState.upkeep, gameState.resources, gameState.workers, now);
  resolvePendingDungeons();

  const center = getPlayerCenter(player);
  camera.follow(center.x, center.y);

  const nearest = findNearestInteractable(center, interactables);
  const selected = getSelectedInteractable(center);
  updatePromptUI(nearest, selected);
  updateDialogueUI();
  updateResourceHud();
  updateLuckyWheelWidget();

  renderFrame(ctx, canvas.width, canvas.height, camera, player, mapGrid, interactables, nearest, gameState.buildingLevels);

  requestAnimationFrame(loop);
}

// Resolves selectedBuildingId to its live interactable object each
// frame, range-checking against the player's current position and
// auto-clearing the selection if they've walked out of range (per
// design.md: "walked away ... hide panel, clear selectedBuildingId").
// Returns null if nothing is selected, the id no longer matches any
// interactable, or the player is out of range.
function getSelectedInteractable(playerCenter) {
  if (!selectedBuildingId) return null;
  const obj = interactables.find(o => o.id === selectedBuildingId);
  if (!obj) {
    selectedBuildingId = null;
    return null;
  }
  const distance = distanceToRect(playerCenter.x, playerCenter.y, obj);
  if (distance > obj.interactRadius) {
    selectedBuildingId = null;
    return null;
  }
  return obj;
}

function updatePromptUI(nearest, selected) {
  if (dialogueState.open) {
    promptEl.classList.add('hidden');
  } else if (nearest) {
    const resourceId = BUILDING_RESOURCE[nearest.id];
    if (resourceId) {
      if (!isBuildingUnlocked(gameState.buildingUnlocks, nearest.id)) {
        promptEl.textContent = `${nearest.name} — see requirements below`;
      } else if (!isResourceUnlocked(resourceId, gameState.townHall.level)) {
        promptEl.textContent = `${nearest.name} — requires Town Hall level ${RESOURCE_CONFIG[resourceId].unlockedAtTownHall}`;
      } else {
        const assigned = gameState.workers.assignments[resourceId];
        if (assigned <= 0) {
          promptEl.textContent = `${nearest.name} — no workers assigned, nothing producing`;
        } else {
          const rateMultiplier = getRateMultiplier(nearest.id, gameState.buildingLevels);
          const capMultiplier = getCapMultiplier(nearest.id, gameState.buildingLevels);
          const stored = Math.floor(getBuildingStored(gameState.resources, resourceId, Date.now(), assigned, rateMultiplier, capMultiplier));
          promptEl.textContent = stored > 0
            ? `Press E or click to collect ${stored} ${RESOURCE_CONFIG[resourceId].name.toLowerCase()}`
            : `Press E or click to interact with ${nearest.name}`;
        }
      }
    } else if (isHouse(nearest.id)) {
      if (!isBuildingUnlocked(gameState.buildingUnlocks, nearest.id)) {
        promptEl.textContent = `${nearest.name} — see requirements below`;
      } else {
        promptEl.textContent = `Press E or click to interact with ${nearest.name}`;
      }
    } else {
      promptEl.textContent = `Press E or click to interact with ${nearest.name}`;
    }
    promptEl.classList.remove('hidden');
  } else {
    promptEl.classList.add('hidden');
  }

  // Panels are selectedBuildingId-driven now, not proximity-driven —
  // `selected` is already range-checked/auto-cleared by
  // getSelectedInteractable(). Force null while a dialogue is open so
  // a panel can never be left visibly stuck open behind/alongside a
  // dialogue box (can genuinely happen here since Barracks/Dungeon
  // Gate sit close enough to Town Hall that a player could stay in
  // both interactRadius zones at once).
  const panelTarget = dialogueState.open ? null : selected;
  updateBuildingPanel(panelTarget);
  updateCraftingPanel(panelTarget);
  updateHeroPanel(panelTarget);
  updateDungeonPanel(panelTarget);
}

// Signature of the last DOM rebuild per gated panel — see
// fix-panel-click-reliability/design.md. Root cause (confirmed by
// tracing loop() -> updatePromptUI() -> these functions: called
// unconditionally every animation frame, ~60x/sec, no throttle):
// each of these did `someListEl.innerHTML = ''` then recreated every
// button with a fresh click listener, every single frame, even when
// nothing changed. A human click is a mousedown/mouseup pair
// spanning several real-world frames, so the button that received
// mousedown was frequently already destroyed and replaced by the
// time mouseup fired — per the DOM spec, click only fires when both
// land on the same node, so the click silently vanished. Fix (Option
// 1 of design.md's 3, the one it recommends as smallest-diff): only
// rebuild when a signature capturing everything that could visibly
// change actually changes, not every frame. `updateBuildingPanel`
// deliberately has NO such gate — traced separately and confirmed it
// only ever mutates already-existing static elements
// (getElementById'd once at module load, listener attached once at
// line ~309), never recreates nodes, so it was never affected by
// this bug and doesn't need this treatment.
let craftingPanelSignature = null;

function updateCraftingPanel(target) {
  const showPanel = target && target.id === 'workbench' && isBuildingUnlocked(gameState.buildingUnlocks, 'workbench');

  if (!showPanel) {
    craftingPanelEl.classList.add('hidden');
    craftingPanelSignature = null;
    return;
  }

  // Only the SET of currently-affordable recipe ids affects what's
  // visually different (each button's disabled state) — resource
  // amounts change continuously via passive collection, but the
  // button only needs to change when affordability actually flips
  // for some recipe, not on every tiny amount tick.
  const affordableIds = getCraftableRecipes(gameState.resources, gameState.inventory).map(r => r.id).join(',');
  const signature = `${target.id}|${affordableIds}`;

  if (signature !== craftingPanelSignature) {
    craftingPanelSignature = signature;
    craftingRecipeListEl.innerHTML = '';
    for (const recipe of RECIPES) {
      const row = document.createElement('div');
      row.className = 'crafting-recipe-row';

      const costText = formatCostHTML(recipe.cost);
      const info = document.createElement('div');
      info.className = 'crafting-recipe-info';
      info.innerHTML = `<span class="crafting-recipe-name">${recipe.name}</span><span class="crafting-recipe-cost">${costText}</span>`;

      const btn = document.createElement('button');
      btn.className = 'crafting-craft-btn';
      btn.textContent = 'Craft';
      const affordable = getCraftableRecipes(gameState.resources, gameState.inventory).some(r => r.id === recipe.id);
      btn.disabled = !affordable;
      btn.addEventListener('click', () => {
        const ok = craftSpecific(gameState.resources, gameState.inventory, recipe.id);
        if (ok) {
          gameState.popularity += 1;
          spawnFloatingPopup(`Crafted ${recipe.name}! 🔨`, player.x + PLAYER_SPRITE_SIZE / 2, player.y);
        }
        updateResourceHud();
        updateCraftingPanel(target);
      });

      row.appendChild(info);
      row.appendChild(btn);
      craftingRecipeListEl.appendChild(row);
    }
  }

  craftingPanelEl.classList.remove('hidden');
}

const HERO_RARITY_ICON = { common: '⚪', rare: '🔵', epic: '🟣' };
const HERO_CLASS_ICON = { warrior: '🗡️', archer: '🏹', scholar: '📖' };

// Which hero's row is expanded to show its management panel (heal /
// potion / equip / unequip) — null means none expanded. Click a row
// to toggle; only one at a time, same single-selection spirit as
// selectedDungeonTierId/selectedHeroId below.
let selectedRosterHeroId = null;

function buildHeroManagePanel(hero, target) {
  const panel = document.createElement('div');
  panel.className = 'hero-manage-panel';

  // --- Heal (downed only) ---
  if (isDowned(hero)) {
    const healRow = document.createElement('div');
    healRow.className = 'hero-manage-heal-row';
    const healCost = getHealCost(hero);
    const healBtn = document.createElement('button');
    healBtn.className = 'hero-manage-heal-btn';
    healBtn.textContent = 'Heal';
    healBtn.disabled = !canHealHero(hero, gameState.resources);
    healBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const ok = healHero(hero, gameState.resources);
      if (ok) spawnFloatingPopup(`${hero.name} healed! ❤️`, barracksObj.x + barracksObj.width / 2, barracksObj.y);
      updateResourceHud();
      updateHeroPanel(target);
    });
    const healCostEl = document.createElement('span');
    healCostEl.className = 'hero-manage-heal-cost';
    healCostEl.innerHTML = formatCostHTML(healCost);
    healRow.appendChild(healBtn);
    healRow.appendChild(healCostEl);
    panel.appendChild(healRow);
  } else if (canUseHealPotion(hero, gameState.inventory)) {
    // --- Heal Potion (any non-downed hero below max HP) ---
    const potionRow = document.createElement('div');
    potionRow.className = 'hero-manage-potion-row';
    const potionBtn = document.createElement('button');
    potionBtn.className = 'hero-manage-potion-btn';
    potionBtn.textContent = 'Use Heal Potion';
    potionBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const ok = useHealPotion(hero, gameState.inventory);
      if (ok) spawnFloatingPopup(`${hero.name} used a Heal Potion! 🧪`, barracksObj.x + barracksObj.width / 2, barracksObj.y);
      updateResourceHud();
      updateHeroPanel(target);
    });
    const potionCount = document.createElement('span');
    potionCount.className = 'hero-manage-potion-count';
    potionCount.textContent = `(${gameState.inventory[HEAL_POTION_ITEM_ID] || 0} in inventory)`;
    potionRow.appendChild(potionBtn);
    potionRow.appendChild(potionCount);
    panel.appendChild(potionRow);
  }

  // --- Equipment, per slot ---
  const equipSection = document.createElement('div');
  equipSection.className = 'hero-manage-equipment';
  for (const slot of EQUIPMENT_SLOTS) {
    const slotRow = document.createElement('div');
    slotRow.className = 'hero-manage-slot-row';

    const equippedId = hero.equipment[slot];
    const label = document.createElement('span');
    label.className = 'hero-manage-slot-label';
    label.textContent = equippedId ? `${slot}: ${iconFor(equippedId)} ${equippedId}` : `${slot}: Empty`;
    slotRow.appendChild(label);

    if (equippedId) {
      const unequipBtn = document.createElement('button');
      unequipBtn.className = 'hero-manage-slot-btn';
      unequipBtn.textContent = 'Unequip';
      unequipBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        unequipHero(hero, gameState.inventory, slot);
        updateHeroPanel(target);
      });
      slotRow.appendChild(unequipBtn);
    }

    // Offer every item in inventory that fits this slot + this hero's
    // class, not already equipped in this slot.
    for (const [itemId, itemCfg] of Object.entries(EQUIPMENT_ITEMS)) {
      if (itemCfg.slot !== slot) continue;
      if (itemId === equippedId) continue;
      if (!canEquipItem(hero, gameState.inventory, itemId)) continue;
      const equipBtn = document.createElement('button');
      equipBtn.className = 'hero-manage-slot-btn';
      equipBtn.textContent = `Equip ${iconFor(itemId)} ${itemId.charAt(0).toUpperCase()}${itemId.slice(1)}`;
      equipBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        equipHero(hero, gameState.inventory, itemId);
        updateHeroPanel(target);
      });
      slotRow.appendChild(equipBtn);
    }

    equipSection.appendChild(slotRow);
  }
  panel.appendChild(equipSection);

  return panel;
}

let heroPanelSignature = null;

function updateHeroPanel(target) {
  const showPanel = target && target.id === 'barracks' && isBuildingUnlocked(gameState.buildingUnlocks, 'barracks');

  if (!showPanel) {
    heroPanelEl.classList.add('hidden');
    heroPanelSignature = null;
    return;
  }

  const now = Date.now();

  // Buy Hero Roll with gems — static button, always enabled/disabled
  // purely based on gems balance, no list to rebuild, so no
  // signature-gating needed (same reasoning as sendHeroBtn).
  buyHeroRollCostEl.innerHTML = `<span class="${gameState.gems < HERO_ROLL_GEM_COST ? 'cost-insufficient' : ''}">${HERO_ROLL_GEM_COST}💎</span>`;
  buyHeroRollBtn.disabled = !canBuyHeroRollWithGems(gameState);

  // Signature captures every piece of state that could visibly change
  // a roster row or the expanded manage panel — see updateCraftingPanel's
  // comment above for the full root-cause/fix explanation (same
  // pattern here). Deliberately includes:
  // - per-hero level/xp/downed/busy (any of these changing needs a
  //   rebuild)
  // - secondsLeft bucketed to whole seconds (Math.ceil), not raw ms —
  //   a busy hero's countdown text needs to keep refreshing, but only
  //   needs to visibly tick once per second, not 60x/sec; this is
  //   also what keeps the residual click-race risk on a busy hero's
  //   row negligible (~16ms out of every 1000ms, not every frame)
  // - equipment per slot (equip/unequip changes this)
  // - healAffordable, computed per downed hero rather than including
  //   raw resource amounts — same reasoning as Crafting's
  //   affordable-SET approach, avoids rebuilding on every passive
  //   resource tick that doesn't actually cross the heal-cost
  //   threshold
  // - inventorySig: raw counts of every equipment item + heal potion,
  //   which is what the EXPANDED hero's manage panel's Equip
  //   buttons/potion count actually depend on
  const relevantItemIds = [...Object.keys(EQUIPMENT_ITEMS), HEAL_POTION_ITEM_ID];
  const inventorySig = relevantItemIds.map(id => `${id}:${gameState.inventory[id] || 0}`).join(',');
  const rosterSig = gameState.heroes.roster.map(hero => {
    const busy = isHeroBusy(hero, now);
    const downed = isDowned(hero);
    const secondsLeft = busy ? Math.ceil((hero.busyUntil - now) / 1000) : 0;
    const equipSig = EQUIPMENT_SLOTS.map(slot => hero.equipment[slot] || '-').join(',');
    const healAffordable = downed ? canHealHero(hero, gameState.resources) : false;
    return `${hero.id}:${hero.level}:${hero.xp}:${downed}:${busy}:${secondsLeft}:${equipSig}:${healAffordable}`;
  }).join('|');
  const signature = `${target.id}|${selectedRosterHeroId}|${rosterSig}|${inventorySig}`;

  if (signature !== heroPanelSignature) {
    heroPanelSignature = signature;
    heroRosterListEl.innerHTML = '';
    if (gameState.heroes.roster.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'hero-roster-empty';
      empty.textContent = 'No heroes yet — win one on the Lucky Wheel.';
      heroRosterListEl.appendChild(empty);
    } else {
      for (const hero of gameState.heroes.roster) {
        const downed = isDowned(hero);
        const expanded = selectedRosterHeroId === hero.id;

        const row = document.createElement('button');
        row.className = 'hero-roster-row' + (downed ? ' hero-roster-row-downed' : '') + (expanded ? ' hero-roster-row-expanded' : '');
        row.addEventListener('click', () => {
          selectedRosterHeroId = expanded ? null : hero.id;
          updateHeroPanel(target);
        });

        const power = Math.round(effectivePower(hero));
        const equipIcons = EQUIPMENT_SLOTS.map(slot => hero.equipment[slot] ? iconFor(hero.equipment[slot]) : '').filter(Boolean).join(' ');
        const info = document.createElement('div');
        info.className = 'hero-roster-info';
        info.innerHTML = `<span class="hero-roster-name">${HERO_RARITY_ICON[hero.rarity]} ${HERO_CLASS_ICON[hero.class]} ${hero.name}</span>` +
          `<span class="hero-roster-stats">Lv.${hero.level} · ⚔️${power} power${equipIcons ? ' · ' + equipIcons : ''}</span>`;

        const busy = isHeroBusy(hero, now);
        const status = document.createElement('span');
        if (downed) {
          status.className = 'hero-roster-status hero-status-downed';
          status.textContent = '💀 Downed';
        } else if (busy) {
          status.className = 'hero-roster-status hero-status-busy';
          status.textContent = `${formatDuration(hero.busyUntil - now)} left`;
        } else {
          status.className = 'hero-roster-status hero-status-idle';
          status.textContent = 'Idle';
        }

        row.appendChild(info);
        row.appendChild(status);
        heroRosterListEl.appendChild(row);

        if (expanded) {
          heroRosterListEl.appendChild(buildHeroManagePanel(hero, target));
        }
      }
    }
  }

  heroPanelEl.classList.remove('hidden');
}

let dungeonTierListSignature = null;
let dungeonHeroListSignature = null;

function updateDungeonPanel(target) {
  const showPanel = target && target.id === 'dungeon_gate' && isBuildingUnlocked(gameState.buildingUnlocks, 'dungeon_gate');

  if (!showPanel) {
    dungeonPanelEl.classList.add('hidden');
    dungeonTierListSignature = null;
    dungeonHeroListSignature = null;
    return;
  }

  const now = Date.now();

  // --- Tier picker --- gated (see updateCraftingPanel's comment for
  // the full root-cause/fix explanation): only rebuilds the tier
  // buttons when which tier is selected actually changes, instead of
  // recreating them every frame.
  const tierListSignature = selectedDungeonTierId;
  if (tierListSignature !== dungeonTierListSignature) {
    dungeonTierListSignature = tierListSignature;
    dungeonTierListEl.innerHTML = '';
    for (const tierId of DUNGEON_TIER_IDS) {
      const tier = DUNGEON_TIERS[tierId];
      const btn = document.createElement('button');
      btn.className = 'dungeon-tier-btn' + (tierId === selectedDungeonTierId ? ' selected' : '');
      btn.innerHTML = `${tier.label}<span class="dungeon-tier-meta">⚔️${tier.difficulty} needed</span>`;
      btn.addEventListener('click', () => {
        selectedDungeonTierId = tierId;
        updateDungeonPanel(target);
      });
      dungeonTierListEl.appendChild(btn);
    }
  }

  // --- Everything below is unchanged from before this fix: these all
  // mutate already-existing static elements (dungeonEntryCostEl,
  // dungeonKeyCountEl, etc.) rather than recreating DOM nodes, so
  // they were never affected by the per-frame-rebuild bug and don't
  // need a signature gate — same reasoning as updateBuildingPanel
  // being unaffected. ---
  const selectedTier = getDungeonTier(selectedDungeonTierId);
  dungeonEntryCostEl.innerHTML = formatCostHTML(selectedTier.entryCost);
  const keyCount = gameState.inventory[DUNGEON_KEY_ITEM_ID] || 0;
  dungeonKeyCountEl.innerHTML = `<span class="${keyCount < 1 ? 'cost-insufficient' : ''}">🗝️${keyCount}</span>`;
  dungeonRewardPreviewEl.innerHTML = `Reward: ${formatCostHTML(selectedTier.fullReward)} <span class="dungeon-reward-xp">+${selectedTier.fullXp}XP</span>`;
  buyKeyCostEl.innerHTML = `<span class="${gameState.gems < DUNGEON_KEY_GEM_COST ? 'cost-insufficient' : ''}">${DUNGEON_KEY_GEM_COST}💎</span>`;
  buyKeyBtn.disabled = !canBuyDungeonKeyWithGems(gameState);

  // --- Idle hero picker --- (busy heroes can't be sent, so they're
  // not offered here — the roster panel at the Barracks is where
  // busy/idle status for every hero, not just idle ones, is visible.
  // Downed heroes are excluded too, not just Send-disabled once
  // picked: isHeroIdle alone doesn't account for isDowned (a downed
  // hero's busyUntil is cleared on resolution, so it reads as
  // "idle"), and listing a downed hero here — worse, auto-selecting
  // it as the default pick — would show it as apparently sendable
  // with no visible reason the Send button is disabled. Heal it at
  // the Barracks first; this panel only offers heroes that can
  // actually go.)
  const sendableHeroes = gameState.heroes.roster.filter(h => isHeroIdle(h, now) && !isDowned(h));
  if (selectedHeroId && !sendableHeroes.some(h => h.id === selectedHeroId)) selectedHeroId = null;
  if (!selectedHeroId && sendableHeroes.length > 0) selectedHeroId = sendableHeroes[0].id;

  // --- Hero picker --- gated the same way as the tier picker.
  // Signature captures: total roster size (empty vs nonempty changes
  // which empty-state message shows), each sendable hero's id+power
  // (power can change from leveling while idle — XP grants can chain
  // multiple level-ups), which one is selected, and whether any hero
  // is downed (changes the empty-state message when sendableHeroes is
  // empty but the roster isn't).
  const anyDowned = gameState.heroes.roster.some(isDowned);
  const heroListSignature = [
    gameState.heroes.roster.length,
    sendableHeroes.map(h => `${h.id}:${Math.round(effectivePower(h))}`).join(','),
    selectedHeroId,
    anyDowned
  ].join('|');

  if (heroListSignature !== dungeonHeroListSignature) {
    dungeonHeroListSignature = heroListSignature;
    dungeonHeroListEl.innerHTML = '';
    if (gameState.heroes.roster.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'dungeon-hero-empty';
      empty.textContent = 'No heroes recruited — visit the Barracks first.';
      dungeonHeroListEl.appendChild(empty);
    } else if (sendableHeroes.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'dungeon-hero-empty';
      empty.textContent = anyDowned
        ? 'Every idle hero is downed — heal at the Barracks first.'
        : 'All heroes are on a mission.';
      dungeonHeroListEl.appendChild(empty);
    } else {
      for (const hero of sendableHeroes) {
        const power = Math.round(effectivePower(hero));
        const btn = document.createElement('button');
        btn.className = 'dungeon-hero-btn' + (hero.id === selectedHeroId ? ' selected' : '');
        btn.innerHTML = `${hero.name}<span class="dungeon-hero-power">⚔️${power}</span>`;
        btn.addEventListener('click', () => {
          selectedHeroId = hero.id;
          updateDungeonPanel(target);
        });
        dungeonHeroListEl.appendChild(btn);
      }
    }
  }

  const selectedHero = selectedHeroId ? getHeroById(gameState.heroes, selectedHeroId) : null;
  const canSend = canSendHeroToDungeon(selectedHero, selectedDungeonTierId, gameState.resources, gameState.inventory, now);
  sendHeroBtn.disabled = !canSend;

  // Task 2.2 (add-dungeon-keys): a disabled Send button needs a
  // visible reason, not just a mysterious disabled state — same
  // principle already applied to the downed-hero-exclusion fix
  // above. Checked in the same order canSendHeroToDungeon itself
  // gates on, so the message always matches the actual blocking
  // condition rather than guessing.
  if (canSend || !selectedHero) {
    dungeonSendReasonEl.classList.add('hidden');
  } else if (keyCount < 1) {
    dungeonSendReasonEl.textContent = 'No Dungeon Key — craft one at the Workbench or win one on the Lucky Wheel.';
    dungeonSendReasonEl.classList.remove('hidden');
  } else if (!canAfford(gameState.resources, selectedTier.entryCost)) {
    dungeonSendReasonEl.textContent = "Not enough resources for this tier's entry cost.";
    dungeonSendReasonEl.classList.remove('hidden');
  } else {
    dungeonSendReasonEl.classList.add('hidden');
  }

  dungeonPanelEl.classList.remove('hidden');
}

buyHeroRollBtn.addEventListener('click', () => {
  const hero = buyHeroRollWithGems(gameState, gameState.heroes);
  if (hero) {
    const rarityLabel = hero.rarity.charAt(0).toUpperCase() + hero.rarity.slice(1);
    spawnFloatingPopup(`Bought a roll! ${rarityLabel} ${hero.name} joined the roster! 💎`, barracksObj.x + barracksObj.width / 2, barracksObj.y);
  } else {
    spawnFloatingPopup("Not enough gems", barracksObj.x + barracksObj.width / 2, barracksObj.y);
  }
  updateResourceHud();
});

buyKeyBtn.addEventListener('click', () => {
  const ok = buyDungeonKeyWithGems(gameState, gameState.inventory);
  spawnFloatingPopup(
    ok ? 'Bought a Dungeon Key! 🗝️' : 'Not enough gems',
    dungeonGateObj.x + dungeonGateObj.width / 2, dungeonGateObj.y
  );
  updateResourceHud();
});

sendHeroBtn.addEventListener('click', () => {
  const now = Date.now();
  const hero = selectedHeroId ? getHeroById(gameState.heroes, selectedHeroId) : null;
  const tier = getDungeonTier(selectedDungeonTierId);
  if (!hero || !tier) return;

  const ok = sendHeroToDungeon(hero, selectedDungeonTierId, gameState.resources, gameState.inventory, now);
  spawnFloatingPopup(
    ok ? `${hero.name} sent to ${tier.label}! ⛩️` : "Can't send",
    dungeonGateObj.x + dungeonGateObj.width / 2, dungeonGateObj.y
  );
  if (ok) selectedHeroId = null; // hero is now busy — clear so the next idle hero is auto-picked
  updateResourceHud();
});

// Lazy dungeon resolution — same pattern as Lucky Wheel ticket
// accrual (design.md): checked every frame rather than via a
// background timer, so a mission resolves the moment its busyUntil
// passes, with a floating popup at the Dungeon Gate. Runs regardless
// of where the player currently is, same as ticket accrual.
function resolvePendingDungeons() {
  const now = Date.now();
  const results = resolveReadyDungeons(gameState.heroes, gameState.resources, now);
  if (results.length === 0) return;

  const anchor = dungeonGateObj || barracksObj;
  results.forEach((r, i) => {
    if (r.success) {
      const text = `✅ ${r.hero.name}: ${formatRewardText(r.reward)} +${r.xp}XP`;
      spawnFloatingPopup(text, anchor.x + anchor.width / 2, anchor.y - i * 18);
    } else {
      const text = `💀 ${r.hero.name}: Downed! No reward.`;
      spawnFloatingPopup(text, anchor.x + anchor.width / 2, anchor.y - i * 18, 'floating-popup-failure');
    }
  });
  updateResourceHud();
}

function updateBuildingPanel(target) {
  if (!target) {
    panelEl.classList.add('hidden');
    currentTarget = null;
    return;
  }

  const resourceId = BUILDING_RESOURCE[target.id];
  const isHouseBuilding = isHouse(target.id);
  const isTownHall = target.id === 'town_hall';
  const isWorkbench = target.id === 'workbench';
  const isBarracks = target.id === 'barracks';
  const isDungeonGate = target.id === 'dungeon_gate';

  if (!resourceId && !isHouseBuilding && !isTownHall && !isWorkbench && !isBarracks && !isDungeonGate) {
    panelEl.classList.add('hidden');
    currentTarget = null;
    return;
  }

  const buildingId = target.id;
  panelNameEl.textContent = target.name;

  // --- Locked: show requirements + an Unlock button, same pattern as
  // upgrading. Applies to resource buildings, houses, Workbench,
  // Barracks, and Dungeon Gate — Town Hall has no lock state, it's
  // always available. ---
  if (!isTownHall && !isBuildingUnlocked(gameState.buildingUnlocks, buildingId)) {
    currentTarget = { kind: 'locked', buildingId, buildingObj: target };

    const unlockCfg = UNLOCK_CONFIG[buildingId];
    panelLevelEl.textContent = '🔒 Locked';

    if (gameState.townHall.level < unlockCfg.requiresTownHall) {
      panelRateEl.textContent = `Requires Town Hall level ${unlockCfg.requiresTownHall}`;
      panelRateEl.classList.add('zero-rate');
      upgradeBtn.disabled = true;
      upgradePreviewEl.textContent = '';
    } else {
      panelRateEl.textContent = 'Meets Town Hall requirement';
      panelRateEl.classList.remove('zero-rate');
      upgradeBtn.disabled = !canAffordCost(unlockCfg.cost);
      upgradePreviewEl.innerHTML = formatCostHTML(unlockCfg.cost);
    }

    workerRowEl.classList.add('hidden');
    upgradeBtn.textContent = 'Unlock';
    panelEl.classList.remove('hidden');
    return;
  }

  upgradeBtn.textContent = 'Upgrade';

  if (isTownHall) {
    currentTarget = { kind: 'townhall', buildingId, buildingObj: target };

    const level = gameState.townHall.level;
    panelLevelEl.textContent = `Lv.${level}`;
    panelRateEl.textContent = `⭐ Land popularity: ${gameState.popularity}`;
    panelRateEl.classList.remove('zero-rate');
    workerRowEl.classList.add('hidden');

    if (level >= MAX_TOWN_HALL_LEVEL) {
      upgradeBtn.disabled = true;
      upgradePreviewEl.textContent = 'Max level reached';
    } else {
      const cost = getTownHallUpgradeCost(gameState.townHall);
      upgradeBtn.disabled = !canUpgradeTownHall(gameState.townHall, gameState.resources);
      upgradePreviewEl.innerHTML = `${formatCostHTML(cost)} → Lv.${level + 1}`;
    }

    panelEl.classList.remove('hidden');
    return;
  }

  if (isWorkbench) {
    // Unlocked Workbench doesn't use this panel at all — the crafting
    // panel (updateCraftingPanel) handles it entirely.
    panelEl.classList.add('hidden');
    currentTarget = null;
    return;
  }

  if (isBarracks || isDungeonGate) {
    // Unlocked Barracks/Dungeon Gate don't use this panel at all — the
    // hero roster panel (updateHeroPanel) / dungeon panel
    // (updateDungeonPanel) handle them entirely, same pattern as
    // Workbench + the crafting panel above.
    panelEl.classList.add('hidden');
    currentTarget = null;
    return;
  }

  const level = gameState.buildingLevels[buildingId] || 1;
  panelLevelEl.textContent = `Lv.${level}`;

  if (isHouseBuilding) {
    currentTarget = { kind: 'house', buildingId, buildingObj: target };

    const capacity = getHouseCapacity(buildingId, gameState.buildingLevels);
    panelRateEl.textContent = `👷 Houses ${capacity} workers`;
    panelRateEl.classList.remove('zero-rate');

    workerRowEl.classList.add('hidden');

    const maxed = isHouseMaxed(buildingId, gameState.buildingLevels);
    if (maxed) {
      upgradeBtn.disabled = true;
      upgradePreviewEl.textContent = 'Max capacity reached';
    } else {
      const upgradeCost = getUpgradeCost(buildingId, gameState.buildingLevels);
      const nextCapacity = getHouseCapacity(buildingId, { ...gameState.buildingLevels, [buildingId]: level + 1 });
      upgradeBtn.disabled = !canUpgradeBuilding(buildingId, gameState.buildingLevels, gameState.resources);
      upgradePreviewEl.innerHTML = `${formatCostHTML(upgradeCost)} → ${nextCapacity} workers`;
    }
  } else {
    currentTarget = { kind: 'resource', resourceId, buildingId, buildingObj: target };

    const cfg = RESOURCE_CONFIG[resourceId];
    const assigned = gameState.workers.assignments[resourceId];
    const maxWorkers = getMaxWorkers(buildingId, gameState.buildingLevels);
    const idleWorkers = getIdleWorkers(gameState.workers, gameState.buildingUnlocks, gameState.buildingLevels);
    const currentRate = getEffectiveRatePerSecond(resourceId, assigned, rateMultiplierForLevel(level)) * 60;

    if (assigned <= 0) {
      panelRateEl.textContent = `${cfg.icon} 0/min — assign a worker to start production`;
      panelRateEl.classList.add('zero-rate');
    } else {
      panelRateEl.textContent = `${cfg.icon} ${Math.round(currentRate)}/min`;
      panelRateEl.classList.remove('zero-rate');
    }

    workerRowEl.classList.remove('hidden');
    workerCountEl.textContent = `${assigned}/${maxWorkers}`;
    workerMinusBtn.disabled = assigned <= 0;
    workerPlusBtn.disabled = assigned >= maxWorkers || idleWorkers <= 0;

    const upgradeCost = getUpgradeCost(buildingId, gameState.buildingLevels);
    const nextLevelRate = getEffectiveRatePerSecond(resourceId, assigned, rateMultiplierForLevel(level + 1)) * 60;
    upgradeBtn.disabled = !canUpgradeBuilding(buildingId, gameState.buildingLevels, gameState.resources);
    upgradePreviewEl.innerHTML = assigned > 0
      ? `${formatCostHTML(upgradeCost)} → ${Math.round(nextLevelRate)}/min`
      : `${formatCostHTML(upgradeCost)} → Lv.${level + 1}`;
  }

  panelEl.classList.remove('hidden');
}

function canAffordCost(costDict) {
  return Object.entries(costDict).every(([id, amt]) => gameState.resources.carried[id] >= amt);
}

function updateDialogueUI() {
  if (dialogueState.open) {
    dialogueTitle.textContent = dialogueState.title;
    dialogueText.textContent = dialogueState.text;
    dialogueBox.classList.remove('hidden');
  } else {
    dialogueBox.classList.add('hidden');
  }
}

requestAnimationFrame(loop);
