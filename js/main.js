import { MAP_COLS, MAP_ROWS, mapGrid, interactables } from './map.js';
import { RENDERED_TILE_SIZE } from './tileConfig.js';
import { createCamera } from './camera.js';
import { createPlayer, updatePlayer, getPlayerCenter, PLAYER_SPRITE_SIZE } from './player.js';
import { findNearestInteractable, createDialogueState, closeDialogue } from './interactions.js';
import { renderFrame } from './render.js';
import { loadGameState, saveGameState } from './gameState.js';
import { HANDLERS, BUILDING_RESOURCE } from './interactionHandlers.js';
import { RESOURCE_CONFIG, isResourceUnlocked, collectFromBuilding, getEffectiveRatePerSecond, getBuildingStored } from './resources.js';
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

const AUTOSAVE_MS = 20000;

const worldWidth = MAP_COLS * RENDERED_TILE_SIZE;
const worldHeight = MAP_ROWS * RENDERED_TILE_SIZE;

function resizeCanvas() {
  canvas.width = Math.min(window.innerWidth - 32, 960);
  canvas.height = Math.min(window.innerHeight - 220, 640);
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

const camera = createCamera(worldWidth, worldHeight, canvas.width, canvas.height);

// Start the player near the crossroads, clear of both building clusters.
const player = createPlayer(14 * RENDERED_TILE_SIZE, 9 * RENDERED_TILE_SIZE);

const dialogueState = createDialogueState();
const gameState = loadGameState();

// Renders a cost dict as HTML, highlighting any resource the player
// can't currently afford in red — makes shortfalls obvious at a glance
// instead of requiring mental math against the HUD.
function formatCostHTML(costDict) {
  return Object.entries(costDict).map(([id, amt]) => {
    const short = gameState.resources.carried[id] < amt;
    const cls = short ? 'cost-insufficient' : '';
    return `<span class="${cls}">${amt}${RESOURCE_CONFIG[id].icon}</span>`;
  }).join(' ');
}

updateResourceHud();

const keys = new Set();
window.addEventListener('keydown', (e) => {
  keys.add(e.code);

  if (e.code === 'KeyE') {
    if (dialogueState.open) {
      closeDialogue(dialogueState);
    } else {
      const center = getPlayerCenter(player);
      const nearest = findNearestInteractable(center, interactables);
      if (nearest) handleInteract(nearest);
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
    ok = upgradeBuilding(buildingId, gameState.buildingLevels, gameState.resources, gameState.townHall.level);
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

function spawnFloatingPopup(text, worldX, worldY) {
  const screenX = worldX - camera.x;
  const screenY = worldY - camera.y;

  const popup = document.createElement('div');
  popup.className = 'floating-popup';
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
    label.innerHTML = `<span class="seg-icon">${RESOURCE_CONFIG[seg.resource].icon}</span>+${seg.amount}`;
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

function formatCountdown(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `Next: ${minutes}m ${seconds.toString().padStart(2, '0')}s`;
}

luckyWheelWidgetEl.addEventListener('click', () => {
  if (!isLuckyWheelUnlocked(gameState.townHall.level)) return;
  openWheelModal();
});

luckyWheelCloseBtn.addEventListener('click', closeWheelModal);
luckyWheelModalEl.addEventListener('click', (e) => {
  if (e.target === luckyWheelModalEl) closeWheelModal();
});

function openWheelModal() {
  wheelResultTextEl.textContent = '';
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
  const reward = spinWheel(gameState.luckyWheel, gameState.resources, now, gameState.townHall.level);

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
    wheelResultTextEl.textContent = `You won ${reward.amount} ${RESOURCE_CONFIG[reward.resource].name}! ${RESOURCE_CONFIG[reward.resource].icon}`;
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

  const center = getPlayerCenter(player);
  camera.follow(center.x, center.y);

  const nearest = findNearestInteractable(center, interactables);
  updatePromptUI(nearest);
  updateDialogueUI();
  updateResourceHud();
  updateLuckyWheelWidget();

  renderFrame(ctx, canvas.width, canvas.height, camera, player, mapGrid, interactables, nearest, gameState.buildingLevels);

  requestAnimationFrame(loop);
}

function updatePromptUI(nearest) {
  if (dialogueState.open) {
    promptEl.classList.add('hidden');
    updateBuildingPanel(null);
    return;
  }
  if (nearest) {
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
            ? `Press E to collect ${stored} ${RESOURCE_CONFIG[resourceId].name.toLowerCase()}`
            : `Press E to interact with ${nearest.name}`;
        }
      }
    } else if (isHouse(nearest.id)) {
      if (!isBuildingUnlocked(gameState.buildingUnlocks, nearest.id)) {
        promptEl.textContent = `${nearest.name} — see requirements below`;
      } else {
        promptEl.textContent = `Press E to interact with ${nearest.name}`;
      }
    } else {
      promptEl.textContent = `Press E to interact with ${nearest.name}`;
    }
    promptEl.classList.remove('hidden');
  } else {
    promptEl.classList.add('hidden');
  }

  updateBuildingPanel(nearest);
  updateCraftingPanel(nearest);
}

function updateCraftingPanel(nearest) {
  const showPanel = nearest && nearest.id === 'workbench' && !dialogueState.open && isBuildingUnlocked(gameState.buildingUnlocks, 'workbench');

  if (!showPanel) {
    craftingPanelEl.classList.add('hidden');
    return;
  }

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
    const affordable = getCraftableRecipes(gameState.resources).some(r => r.id === recipe.id);
    btn.disabled = !affordable;
    btn.addEventListener('click', () => {
      const ok = craftSpecific(gameState.resources, gameState.inventory, recipe.id);
      if (ok) {
        gameState.popularity += 1;
        spawnFloatingPopup(`Crafted ${recipe.name}! 🔨`, player.x + PLAYER_SPRITE_SIZE / 2, player.y);
      }
      updateResourceHud();
      updateCraftingPanel(nearest);
    });

    row.appendChild(info);
    row.appendChild(btn);
    craftingRecipeListEl.appendChild(row);
  }

  craftingPanelEl.classList.remove('hidden');
}

function updateBuildingPanel(nearest) {
  if (!nearest || dialogueState.open) {
    panelEl.classList.add('hidden');
    currentTarget = null;
    return;
  }

  const resourceId = BUILDING_RESOURCE[nearest.id];
  const isHouseBuilding = isHouse(nearest.id);
  const isTownHall = nearest.id === 'town_hall';
  const isWorkbench = nearest.id === 'workbench';

  if (!resourceId && !isHouseBuilding && !isTownHall && !isWorkbench) {
    panelEl.classList.add('hidden');
    currentTarget = null;
    return;
  }

  const buildingId = nearest.id;
  panelNameEl.textContent = nearest.name;

  // --- Locked: show requirements + an Unlock button, same pattern as
  // upgrading. Applies to resource buildings, houses, and Workbench —
  // Town Hall has no lock state, it's always available. ---
  if (!isTownHall && !isBuildingUnlocked(gameState.buildingUnlocks, buildingId)) {
    currentTarget = { kind: 'locked', buildingId, buildingObj: nearest };

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
    currentTarget = { kind: 'townhall', buildingId, buildingObj: nearest };

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

  const level = gameState.buildingLevels[buildingId] || 1;
  panelLevelEl.textContent = `Lv.${level}`;

  if (isHouseBuilding) {
    currentTarget = { kind: 'house', buildingId, buildingObj: nearest };

    const capacity = getHouseCapacity(buildingId, gameState.buildingLevels);
    panelRateEl.textContent = `👷 Houses ${capacity} workers`;
    panelRateEl.classList.remove('zero-rate');

    workerRowEl.classList.add('hidden');

    const maxed = isHouseMaxed(buildingId, gameState.buildingLevels);
    if (maxed) {
      upgradeBtn.disabled = true;
      upgradePreviewEl.textContent = 'Max capacity reached';
    } else {
      const upgradeCost = getUpgradeCost(buildingId, gameState.buildingLevels, gameState.townHall.level);
      const nextCapacity = getHouseCapacity(buildingId, { ...gameState.buildingLevels, [buildingId]: level + 1 });
      upgradeBtn.disabled = !canUpgradeBuilding(buildingId, gameState.buildingLevels, gameState.resources, gameState.townHall.level);
      upgradePreviewEl.innerHTML = `${formatCostHTML(upgradeCost)} → ${nextCapacity} workers`;
    }
  } else {
    currentTarget = { kind: 'resource', resourceId, buildingId, buildingObj: nearest };

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

    const upgradeCost = getUpgradeCost(buildingId, gameState.buildingLevels, gameState.townHall.level);
    const nextLevelRate = getEffectiveRatePerSecond(resourceId, assigned, rateMultiplierForLevel(level + 1)) * 60;
    upgradeBtn.disabled = !canUpgradeBuilding(buildingId, gameState.buildingLevels, gameState.resources, gameState.townHall.level);
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
