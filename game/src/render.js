// Warung Rush — everything the player sees, drawn on one canvas.
// One file, one job: the kitchen, the cook, the order board and the HUD.

import { COLORS, FLOOR, H, W } from './config.js';
import { INGREDIENTS, RECIPES, recipeById, tokenLabel } from './recipes.js';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, str, x, y, size, color, weight = '700', align = 'left') {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px "Trebuchet MS", Verdana, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

// --- Ingredient icons, drawn with shapes so the game needs no image files ---

export function drawIngredientIcon(ctx, id, cx, cy, r) {
  const base = id.replace(/!$/, '');
  const ing = INGREDIENTS[base];
  if (!ing) return;
  const cooked = id.endsWith('!');
  ctx.save();
  ctx.translate(cx, cy);
  switch (ing.icon) {
    case 'bowl': {
      // A bowl of rice, steaming when cooked.
      ctx.fillStyle = '#e2543e';
      ctx.beginPath();
      ctx.arc(0, 2, r, 0, Math.PI);
      ctx.fill();
      ctx.fillStyle = '#f5f0e1';
      ctx.beginPath();
      ctx.ellipse(0, -2, r * 0.95, r * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      if (cooked) {
        ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-6, -10);
        ctx.quadraticCurveTo(-9, -16, -6, -20);
        ctx.moveTo(4, -10);
        ctx.quadraticCurveTo(7, -16, 4, -20);
        ctx.stroke();
      }
      break;
    }
    case 'swirl': {
      // A nest of noodles.
      ctx.strokeStyle = '#f2c14e';
      ctx.lineWidth = 3;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(0, 0, Math.max(2, r - i * 5), i * 1.2, i * 1.2 + Math.PI * 1.5);
        ctx.stroke();
      }
      ctx.strokeStyle = '#c98f2e';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.45, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case 'drumstick': {
      ctx.fillStyle = '#e8a87c';
      ctx.beginPath();
      ctx.ellipse(2, -2, r * 0.85, r * 0.7, -0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff8e7';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-8, 8);
      ctx.lineTo(-14, 14);
      ctx.stroke();
      ctx.fillStyle = '#fff8e7';
      ctx.beginPath();
      ctx.arc(-15, 15, 3.5, 0, Math.PI * 2);
      ctx.arc(-11, 17, 3.5, 0, Math.PI * 2);
      ctx.fill();
      if (cooked) {
        ctx.fillStyle = '#b4632a';
        ctx.beginPath();
        ctx.arc(6, -6, 3, 0, Math.PI * 2);
        ctx.arc(-2, 2, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'egg': {
      ctx.fillStyle = '#fffdf5';
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.9, r * 0.75, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = cooked ? '#f7d774' : '#f2c14e';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.42, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'chili': {
      ctx.fillStyle = '#d64541';
      ctx.beginPath();
      ctx.ellipse(0, 0, r, r * 0.45, 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#5da24a';
      ctx.beginPath();
      ctx.moveTo(10, -8);
      ctx.lineTo(16, -14);
      ctx.lineTo(18, -6);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'leaf': {
      ctx.fillStyle = '#5da24a';
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.9, r * 0.55, -0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#7cbf6a';
      ctx.beginPath();
      ctx.ellipse(-2, -2, r * 0.55, r * 0.3, -0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#3f7a33';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-r * 0.8, r * 0.4);
      ctx.lineTo(r * 0.8, -r * 0.4);
      ctx.stroke();
      break;
    }
    default:
      break;
  }
  ctx.restore();
}

// --- Background: striped awning, tiled wall, wooden floor ---

function drawBackground(ctx, time) {
  ctx.fillStyle = COLORS.wall;
  ctx.fillRect(0, 0, W, 200);
  // Awning stripes across the top.
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#d64541' : '#fff3d6';
    ctx.fillRect(i * 80, 0, 80, 26);
  }
  ctx.fillStyle = COLORS.wallTrim;
  ctx.fillRect(0, 26, W, 6);
  // Wall tiles.
  ctx.strokeStyle = 'rgba(169,116,63,0.25)';
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 32);
    ctx.lineTo(x, 200);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(0, 116);
  ctx.lineTo(W, 116);
  ctx.stroke();
  // Floor boards.
  ctx.fillStyle = COLORS.floor;
  ctx.fillRect(0, 200, W, H - 200);
  ctx.fillStyle = COLORS.floorDark;
  for (let y = 200; y < H; y += 52) ctx.fillRect(0, y, W, 3);
  for (let x = 0; x < W; x += 130) {
    ctx.fillRect(x, 200, 3, H - 200);
  }
  // A warm rug in the middle of the floor where the cook runs.
  ctx.fillStyle = 'rgba(214,69,65,0.18)';
  roundRect(ctx, FLOOR.x + 220, FLOOR.y + 120, 760, 180, 18);
  ctx.fill();
  // Hanging lamps, gently swaying.
  for (const lx of [200, 640, 1080]) {
    const sway = Math.sin(time * 0.8 + lx) * 4;
    ctx.strokeStyle = '#3a2a18';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(lx, 32);
    ctx.lineTo(lx + sway, 64);
    ctx.stroke();
    ctx.fillStyle = COLORS.gold;
    ctx.beginPath();
    ctx.moveTo(lx + sway - 18, 64);
    ctx.lineTo(lx + sway + 18, 64);
    ctx.lineTo(lx + sway + 10, 84);
    ctx.lineTo(lx + sway - 10, 84);
    ctx.closePath();
    ctx.fill();
  }
}

// --- HUD: title, shift timer, score, coins, hearts, day ---

function drawHud(ctx, state) {
  const { board } = state;
  ctx.fillStyle = 'rgba(58,42,24,0.92)';
  roundRect(ctx, 12, 38, 1256, 56, 12);
  ctx.fill();
  text(ctx, 'WARUNG RUSH', 32, 66, 26, '#ffd97a', '800');
  // Shift timer.
  const shiftLeft = Math.max(0, state.shiftLeft);
  const mm = Math.floor(shiftLeft / 60);
  const ss = Math.floor(shiftLeft % 60).toString().padStart(2, '0');
  const urgent = shiftLeft <= 20;
  text(ctx, `SHIFT ${mm}:${ss}`, 400, 66, 22, urgent ? '#ff8a80' : '#fff3d6', '800');
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  roundRect(ctx, 530, 54, 180, 22, 11);
  ctx.fill();
  ctx.fillStyle = urgent ? '#ff8a80' : '#7cbf6a';
  roundRect(ctx, 530, 54, 180 * (shiftLeft / state.shiftTotal), 22, 11);
  ctx.fill();
  // Score, coins, combo.
  text(ctx, `SCORE ${board.score}`, 740, 66, 20, '#fff3d6', '800');
  text(ctx, `COINS ${board.coins}`, 900, 66, 20, '#ffd97a', '800');
  if (board.combo >= 2) {
    text(ctx, `COMBO x${board.combo}`, 1030, 66, 18, '#ffb74d', '800');
  }
  // Hearts, right side.
  let hx = 1150;
  for (let i = 0; i < state.hearts; i++) {
    ctx.fillStyle = '#ff5a5a';
    ctx.beginPath();
    ctx.arc(hx, 62, 7, 0, Math.PI * 2);
    ctx.arc(hx + 11, 62, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(hx - 6, 64);
    ctx.lineTo(hx + 17, 64);
    ctx.lineTo(hx + 5.5, 78);
    ctx.closePath();
    ctx.fill();
    hx += 26;
  }
}

// --- The order board: one ticket per waiting order ---

function drawOrders(ctx, board, day) {
  text(ctx, `ORDER BOARD — DAY ${day}`, 32, 116, 15, COLORS.inkSoft, '800');
  const tickets = board.orders.slice(0, 4);
  tickets.forEach((order, i) => {
    const x = 32 + i * 312;
    const y = 126;
    const w = 296;
    const h = 66;
    const recipe = recipeById(order.recipeId);
    const frac = order.secondsLeft / order.totalSeconds;
    const low = frac < 0.33;
    ctx.fillStyle = COLORS.board;
    roundRect(ctx, x, y, w, h, 10);
    ctx.fill();
    ctx.strokeStyle = order.state === 'served' ? COLORS.green : COLORS.boardEdge;
    ctx.lineWidth = 2;
    ctx.stroke();
    if (order.state === 'served') {
      text(ctx, 'DONE ✓', x + w - 16, y + 20, 16, COLORS.green, '800', 'right');
    }
    text(ctx, `#${order.id}  ${recipe ? recipe.name : order.recipeId}`, x + 12, y + 18, 16, COLORS.ink, '800');
    text(ctx, recipe ? recipe.blurb : '', x + 12, y + 38, 12, COLORS.inkSoft, '600');
    // Ingredient dots the dish needs.
    let dx = x + 12;
    for (const token of recipe ? recipe.needs : []) {
      drawIngredientIcon(ctx, token, dx + 10, y + 54, 9);
      dx += 26;
    }
    // Countdown bar + seconds.
    ctx.fillStyle = '#e8dcc0';
    roundRect(ctx, x + 150, y + 48, 95, 10, 5);
    ctx.fill();
    ctx.fillStyle = low ? COLORS.red : COLORS.green;
    roundRect(ctx, x + 150, y + 48, 95 * Math.max(0, frac), 10, 5);
    ctx.fill();
    text(ctx, `${Math.ceil(order.secondsLeft)}s`, x + w - 12, y + 53, 14, low ? COLORS.red : COLORS.ink, '800', 'right');
  });
  if (tickets.length === 0) {
    text(ctx, 'No orders yet — the first customer is on their way…', 32, 160, 15, COLORS.inkSoft, '600');
  }
}

// --- Stations: bins, chopping board, stove, plating, serve, trash ---

function drawStation(ctx, station, kitchen, time) {
  const { x, y, w, h } = station;
  const active = kitchen.action && kitchen.action.station.id === station.id;
  ctx.fillStyle = COLORS.counterTop;
  roundRect(ctx, x, y, w, h, 10);
  ctx.fill();
  ctx.fillStyle = COLORS.counterFront;
  roundRect(ctx, x, y + h - 16, w, 16, 8);
  ctx.fill();
  ctx.strokeStyle = active ? COLORS.gold : 'rgba(58,42,24,0.35)';
  ctx.lineWidth = active ? 4 : 2;
  roundRect(ctx, x, y, w, h, 10);
  ctx.stroke();

  if (station.kind === 'bin') {
    drawIngredientIcon(ctx, station.ingredient, x + w / 2, y + 30, 20);
    text(ctx, station.label, x + w / 2, y + 64, 13, '#fff3d6', '700', 'center');
  } else if (station.kind === 'chop') {
    ctx.fillStyle = '#e8cfa8';
    roundRect(ctx, x + 14, y + 14, w - 28, 40, 6);
    ctx.fill();
    ctx.strokeStyle = '#8b98a3';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + 40, y + 34);
    ctx.lineTo(x + 110, y + 34);
    ctx.stroke();
    drawIngredientIcon(ctx, 'veg', x + 34, y + 34, 12);
    drawIngredientIcon(ctx, 'chicken', x + 116, y + 34, 12);
    text(ctx, 'CHOP  2s', x + w / 2, y + 68, 13, '#fff3d6', '700', 'center');
  } else if (station.kind === 'stove') {
    for (const bx of [x + 52, x + w - 52]) {
      ctx.fillStyle = '#3a2a18';
      ctx.beginPath();
      ctx.arc(bx, y + 30, 30, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2c2c2c';
      ctx.beginPath();
      ctx.arc(bx, y + 30, 22, 0, Math.PI * 2);
      ctx.fill();
      // Flame flicker under the wok.
      const flick = 6 + Math.sin(time * 9 + bx) * 3;
      ctx.fillStyle = '#ff9f1c';
      ctx.beginPath();
      ctx.ellipse(bx, y + 52, 14, flick, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#d64541';
      ctx.beginPath();
      ctx.ellipse(bx, y + 50, 8, flick * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
      // The wok.
      ctx.fillStyle = '#4a4a4a';
      ctx.beginPath();
      ctx.arc(bx, y + 28, 20, 0, Math.PI);
      ctx.fill();
    }
    text(ctx, 'WOK  3s', x + w / 2, y + 68, 13, '#fff3d6', '700', 'center');
  } else if (station.kind === 'plate') {
    drawPlate(ctx, kitchen, x + w / 2, y + 34);
    text(ctx, kitchen.plateDish ? 'DISH READY — take it!' : 'PLATE', x + w / 2, y + 68, 13, kitchen.plateDish ? COLORS.gold : '#fff3d6', '800', 'center');
  } else if (station.kind === 'serve') {
    ctx.fillStyle = '#fff8e7';
    roundRect(ctx, x + 12, y + 10, w - 24, 40, 6);
    ctx.fill();
    text(ctx, 'SERVE HERE', x + w / 2, y + 30, 16, COLORS.red, '800', 'center');
    ctx.fillStyle = COLORS.red;
    ctx.beginPath();
    ctx.moveTo(x + w / 2 - 8, y + 52);
    ctx.lineTo(x + w / 2 + 8, y + 52);
    ctx.lineTo(x + w / 2, y + 66);
    ctx.closePath();
    ctx.fill();
  } else if (station.kind === 'trash') {
    ctx.fillStyle = '#5b6b76';
    roundRect(ctx, x + 55, y + 8, 50, 38, 6);
    ctx.fill();
    ctx.fillStyle = '#3f4a52';
    ctx.fillRect(x + 50, y + 4, 60, 8);
    text(ctx, station.label, x + w / 2, y + 56, 11, '#fff3d6', '700', 'center');
  }

  // Timed-action progress ring above the station.
  if (active) {
    const frac = kitchen.action.elapsed / kitchen.action.duration;
    ctx.fillStyle = 'rgba(58,42,24,0.85)';
    roundRect(ctx, x + 8, y - 22, w - 16, 14, 7);
    ctx.fill();
    ctx.fillStyle = COLORS.gold;
    roundRect(ctx, x + 8, y - 22, (w - 16) * frac, 14, 7);
    ctx.fill();
  }
}

// The plate on the plating counter, with its tokens and a glow when done.
function drawPlate(ctx, kitchen, cx, cy) {
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(cx, cy, 42, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = kitchen.plateDish ? COLORS.gold : '#c9b896';
  ctx.lineWidth = kitchen.plateDish ? 4 : 2;
  ctx.stroke();
  kitchen.plateTokens.forEach((token, i) => {
    drawIngredientIcon(ctx, token, cx - 26 + i * 26, cy - 4, 11);
  });
  if (kitchen.plateDish) {
    const recipe = recipeById(kitchen.plateDish);
    text(ctx, recipe ? recipe.name : 'Dish', cx, cy - 26, 13, COLORS.gold, '800', 'center');
  }
}

// --- The cook: a chef with a tall hat, tray tokens and a carried dish ---

function drawCook(ctx, cook, time) {
  const bob = cook.walking ? Math.sin(time * 12) * 3 : Math.sin(time * 2) * 1.5;
  const { x, y } = cook;
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(x, y + 24, 26, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  // Body (white chef coat) and apron.
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(x, y + 2 - bob, 24, 24, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#d64541';
  ctx.beginPath();
  ctx.ellipse(x, y + 12 - bob, 16, 12, 0, 0, Math.PI);
  ctx.fill();
  // Head and tall chef hat.
  ctx.fillStyle = '#f2c9a0';
  ctx.beginPath();
  ctx.arc(x, y - 20 - bob, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(x, y - 34 - bob, 17, 9, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(x - 17, y - 36 - bob, 34, 8);
  // Eyes look where the cook faces.
  ctx.fillStyle = '#3a2a18';
  ctx.beginPath();
  ctx.arc(x + cook.facing * 5 - 4, y - 21 - bob, 2, 0, Math.PI * 2);
  ctx.arc(x + cook.facing * 5 + 4, y - 21 - bob, 2, 0, Math.PI * 2);
  ctx.fill();
  // Tray tokens carried above the cook's head.
  cook.tray.forEach((token, i) => {
    const tx = x - ((cook.tray.length - 1) * 14) + i * 28;
    const ty = y - 58 - bob;
    ctx.fillStyle = 'rgba(255,248,231,0.95)';
    ctx.beginPath();
    ctx.arc(tx, ty, 12, 0, Math.PI * 2);
    ctx.fill();
    drawIngredientIcon(ctx, token, tx, ty, 9);
  });
  // A carried dish rides on a plate in front of the cook.
  if (cook.dish) {
    const recipe = recipeById(cook.dish);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(x + cook.facing * 30, y + 8 - bob, 18, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = COLORS.gold;
    ctx.lineWidth = 2;
    ctx.stroke();
    text(ctx, recipe ? recipe.name : 'Dish', x, y - 52 - bob, 12, COLORS.gold, '800', 'center');
  }
}

// --- Floating messages, hints and overlays ---

function drawMessages(ctx, messages) {
  messages.forEach((msg, i) => {
    const alpha = Math.max(0, Math.min(1, msg.life / 0.6));
    ctx.globalAlpha = alpha;
    text(ctx, msg.text, W / 2, 330 - i * 30, 22, msg.color, '800', 'center');
    ctx.globalAlpha = 1;
  });
}

function drawHint(ctx, kitchen, cook) {
  if (kitchen.action) {
    const label = kitchen.action.kind === 'chop' ? 'Chopping…' : 'Cooking in the wok…';
    text(ctx, label, 640, 700, 16, '#fff3d6', '700', 'center');
    return;
  }
  const station = kitchen.stations.find((s) => {
    const cx = s.x + s.w / 2;
    const cy = s.y + s.h / 2;
    return Math.hypot(cx - cook.x, cy - cook.y) < 110;
  });
  if (station) {
    text(ctx, `Press E or click: ${station.label}`, 640, 700, 16, '#fff3d6', '700', 'center');
  } else {
    text(ctx, 'Move: WASD / arrows / click  •  E or click a station to use it  •  M mute', 640, 700, 15, '#e8cfa8', '600', 'center');
  }
}

function drawTitle(ctx, state) {
  ctx.fillStyle = 'rgba(30,20,10,0.55)';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#fff8e7';
  roundRect(ctx, 290, 150, 700, 400, 20);
  ctx.fill();
  ctx.strokeStyle = COLORS.boardEdge;
  ctx.lineWidth = 3;
  ctx.stroke();
  text(ctx, 'WARUNG RUSH', 640, 210, 54, COLORS.red, '800', 'center');
  text(ctx, 'The street-food stall that never sleeps', 640, 256, 20, COLORS.inkSoft, '600', 'center');
  text(ctx, 'Orders pile up on the board. Grab ingredients,', 640, 310, 18, COLORS.ink, '600', 'center');
  text(ctx, 'chop and cook them, plate the dish, serve it fast.', 640, 336, 18, COLORS.ink, '600', 'center');
  text(ctx, 'Menu', 640, 382, 18, COLORS.red, '800', 'center');
  RECIPES.forEach((recipe, i) => {
    text(ctx, `${recipe.name} — ${recipe.blurb}`, 640, 410 + i * 26, 16, COLORS.ink, '600', 'center');
  });
  const blink = Math.sin(state.time * 4) > 0;
  if (blink) text(ctx, 'Press SPACE or click to open the stall', 640, 512, 20, COLORS.red, '800', 'center');
}

function drawGameOver(ctx, state) {
  ctx.fillStyle = 'rgba(30,20,10,0.6)';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#fff8e7';
  roundRect(ctx, 340, 170, 600, 380, 20);
  ctx.fill();
  ctx.strokeStyle = COLORS.boardEdge;
  ctx.lineWidth = 3;
  ctx.stroke();
  text(ctx, 'SHIFT OVER!', 640, 230, 46, COLORS.red, '800', 'center');
  text(ctx, `Day ${state.day} at the warung`, 640, 280, 18, COLORS.inkSoft, '600', 'center');
  text(ctx, `Score  ${state.board.score}`, 640, 330, 24, COLORS.ink, '800', 'center');
  text(ctx, `Dishes served  ${state.board.served}     Coins earned  ${state.board.coins}`, 640, 372, 18, COLORS.ink, '700', 'center');
  text(ctx, `Best combo  x${state.board.bestCombo}     Orders missed  ${state.board.failed}`, 640, 404, 18, COLORS.ink, '700', 'center');
  const blink = Math.sin(state.time * 4) > 0;
  if (blink) text(ctx, 'Press R for another day — the rush gets faster', 640, 500, 18, COLORS.red, '800', 'center');
}

// --- The whole frame ---

export function drawGame(ctx, state) {
  drawBackground(ctx, state.time);
  if (state.phase === 'title') {
    // Show the kitchen behind the title card.
    for (const station of state.kitchen.stations) drawStation(ctx, station, state.kitchen, state.time);
    drawCook(ctx, state.cook, state.time);
    drawHud(ctx, state);
    drawOrders(ctx, state.board, state.day);
    drawTitle(ctx, state);
    return;
  }
  drawHud(ctx, state);
  drawOrders(ctx, state.board, state.day);
  for (const station of state.kitchen.stations) drawStation(ctx, station, state.kitchen, state.time);
  drawCook(ctx, state.cook, state.time);
  drawMessages(ctx, state.messages);
  drawHint(ctx, state.kitchen, state.cook);
  if (state.phase === 'over') drawGameOver(ctx, state);
}
