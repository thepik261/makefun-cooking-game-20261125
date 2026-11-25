// Warung Rush — the kitchen: its stations, the cook who walks it, and what
// happens when the cook uses a station. One file, one job: the play space.

import {
  CHOP_SECONDS,
  COOK_SECONDS,
  COOK_RADIUS,
  COOK_SPEED,
  FLOOR,
  TRAY_SLOTS,
} from './config.js';
import {
  INGREDIENTS,
  isReadyToken,
  matchRecipe,
  plateIsOnTrack,
  prepResult,
} from './recipes.js';
import { serveOrder } from './orders.js';

// Every station: where it is, what it does, and the label above it.
export function createStations() {
  const top = 208;
  const h = 84;
  const bins = ['rice', 'noodles', 'chicken', 'egg', 'chili', 'veg'].map((id, i) => ({
    kind: 'bin',
    id: `bin-${id}`,
    ingredient: id,
    label: INGREDIENTS[id].name,
    x: 56 + i * 96,
    y: top,
    w: 88,
    h,
  }));
  return [
    ...bins,
    { kind: 'chop', id: 'chop', label: 'Chopping Board', x: 648, y: top, w: 150, h },
    { kind: 'stove', id: 'stove', label: 'Wok Stove', x: 824, y: top, w: 210, h },
    { kind: 'plate', id: 'plate', label: 'Plating Counter', x: 56, y: 596, w: 220, h: 84 },
    { kind: 'trash', id: 'trash', label: 'Bin (dump tray)', x: 560, y: 620, w: 160, h: 60 },
    { kind: 'serve', id: 'serve', label: 'Serve Window', x: 1020, y: 596, w: 204, h: 84 },
  ];
}

// The kitchen's live state: stations, the plate on the counter, and any
// timed chop or cook action currently running.
export function createKitchen() {
  return {
    stations: createStations(),
    plateTokens: [],
    plateDish: null, // recipe id once the plate matches a dish
    action: null, // { station, token, duration, elapsed, kind }
  };
}

// The cook: position, click-to-move target, tray and carried dish.
export function createCook() {
  return {
    x: 640,
    y: 480,
    targetX: 640,
    targetY: 480,
    tray: [],
    dish: null, // recipe id of the dish being carried
    facing: 1,
    walking: false,
  };
}

export function stationById(kitchen, id) {
  return kitchen.stations.find((s) => s.id === id) ?? null;
}

function stationCenter(station) {
  return { x: station.x + station.w / 2, y: station.y + station.h / 2 };
}

// The station nearest the cook, when the cook stands close enough to use it.
export function nearestStation(kitchen, cook) {
  let best = null;
  let bestDist = 110;
  for (const station of kitchen.stations) {
    const c = stationCenter(station);
    const d = Math.hypot(c.x - cook.x, c.y - cook.y);
    if (d < bestDist) {
      bestDist = d;
      best = station;
    }
  }
  return best;
}

// Walk the cook toward keys held down, or toward a clicked floor point.
export function moveCook(cook, keys, dt) {
  if (kitchenActionRunning(cook)) return;
  let dx = 0;
  let dy = 0;
  if (keys.has('arrowup') || keys.has('w')) dy -= 1;
  if (keys.has('arrowdown') || keys.has('s')) dy += 1;
  if (keys.has('arrowleft') || keys.has('a')) dx -= 1;
  if (keys.has('arrowright') || keys.has('d')) dx += 1;
  if (dx !== 0 || dy !== 0) {
    const len = Math.hypot(dx, dy);
    cook.x += (dx / len) * COOK_SPEED * dt;
    cook.y += (dy / len) * COOK_SPEED * dt;
    cook.targetX = cook.x;
    cook.targetY = cook.y;
    cook.facing = dx !== 0 ? Math.sign(dx) : cook.facing;
    cook.walking = true;
  } else if (Math.hypot(cook.targetX - cook.x, cook.targetY - cook.y) > 4) {
    const dx2 = cook.targetX - cook.x;
    const dy2 = cook.targetY - cook.y;
    const len = Math.hypot(dx2, dy2);
    const step = Math.min(len, COOK_SPEED * dt);
    cook.x += (dx2 / len) * step;
    cook.y += (dy2 / len) * step;
    cook.facing = dx2 !== 0 ? Math.sign(dx2) : cook.facing;
    cook.walking = true;
  } else {
    cook.walking = false;
  }
  cook.x = Math.min(FLOOR.x + FLOOR.w - COOK_RADIUS, Math.max(FLOOR.x + COOK_RADIUS, cook.x));
  cook.y = Math.min(FLOOR.y + FLOOR.h - COOK_RADIUS, Math.max(FLOOR.y + COOK_RADIUS, cook.y));
}

// The cook is locked in place while a chop or cook action runs. The flag
// lives on the cook so movement and actions stay in step.
export function kitchenActionRunning(cook) {
  return cook.busy === true;
}

// Use the station the cook stands at. Returns an event name the game uses
// for sounds and floating messages, or null when nothing happened.
export function useStation(kitchen, cook, board) {
  if (kitchen.action) return null; // one timed action at a time
  const station = nearestStation(kitchen, cook);
  if (!station) return null;

  if (station.kind === 'bin') {
    if (cook.dish) return 'hands-full';
    if (cook.tray.length >= TRAY_SLOTS) return 'tray-full';
    cook.tray.push(station.ingredient);
    return 'pickup';
  }

  if (station.kind === 'chop' || station.kind === 'stove') {
    const wantPrep = station.kind === 'chop' ? 'chop' : 'cook';
    const idx = cook.tray.findIndex((t) => {
      const base = t.replace(/!$/, '');
      return !t.endsWith('!') && INGREDIENTS[base] && INGREDIENTS[base].prep === wantPrep;
    });
    if (idx === -1) return 'nothing-to-prep';
    const token = cook.tray[idx];
    cook.tray.splice(idx, 1);
    kitchen.action = {
      station,
      token,
      duration: wantPrep === 'chop' ? CHOP_SECONDS : COOK_SECONDS,
      elapsed: 0,
      kind: wantPrep,
    };
    cook.busy = true;
    return wantPrep === 'chop' ? 'chop-start' : 'cook-start';
  }

  if (station.kind === 'plate') {
    // Pick up a finished dish from the plate.
    if (kitchen.plateDish && !cook.dish) {
      cook.dish = kitchen.plateDish;
      kitchen.plateDish = null;
      kitchen.plateTokens = [];
      return 'take-dish';
    }
    // Put one ready token from the tray onto the plate.
    const idx = cook.tray.findIndex((t) => isReadyToken(t));
    if (idx === -1) return cook.tray.length ? 'needs-prep' : 'tray-empty';
    const token = cook.tray[idx];
    const next = [...kitchen.plateTokens, token];
    if (!plateIsOnTrack(next)) return 'wrong-combo';
    cook.tray.splice(idx, 1);
    kitchen.plateTokens = next;
    const dish = matchRecipe(kitchen.plateTokens);
    if (dish) kitchen.plateDish = dish.id;
    return dish ? 'dish-ready' : 'plated';
  }

  if (station.kind === 'serve') {
    if (!cook.dish) return 'no-dish';
    const result = serveOrder(board, cook.dish);
    if (!result) return 'no-order';
    cook.dish = null;
    return { event: 'served', points: result.points, recipeId: result.order.recipeId };
  }

  if (station.kind === 'trash') {
    if (cook.tray.length === 0 && !cook.dish) return 'tray-empty';
    cook.tray = [];
    cook.dish = null;
    return 'trashed';
  }
  return null;
}

// Advance a running chop or cook action. Returns the finished token, or null.
export function updateKitchen(kitchen, cook, dt) {
  if (!kitchen.action) return null;
  kitchen.action.elapsed += dt;
  if (kitchen.action.elapsed < kitchen.action.duration) return null;
  const done = prepResult(kitchen.action.token);
  const kind = kitchen.action.kind;
  kitchen.action = null;
  cook.busy = false;
  cook.tray.push(done);
  return { event: 'prep-done', kind, token: done };
}
