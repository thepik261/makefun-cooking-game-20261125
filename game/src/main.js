// Warung Rush — the game loop and the game state. One file, one job: own
// the phases (title, playing, game over), run the clock, and hand input to
// the kitchen and the order board.

import { COLORS, H, SHIFT_SECONDS, W } from './config.js';
import { createInput, endFrame, takeClick, wasPressed } from './input.js';
import {
  createCook,
  createKitchen,
  moveCook,
  updateKitchen,
  useStation,
} from './kitchen.js';
import {
  createOrderBoard,
  makeOrder,
  missOrder,
  updateOrderBoard,
} from './orders.js';
import { recipeById } from './recipes.js';
import { drawGame } from './render.js';
import { isMuted, playSound, toggleMute, unlockAudio } from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = W;
canvas.height = H;

const input = createInput(canvas);

// The whole game state in one object, so the renderer can read it plainly.
const state = {
  phase: 'title', // title | playing | over
  time: 0,
  day: 1,
  shiftLeft: SHIFT_SECONDS,
  shiftTotal: SHIFT_SECONDS,
  hearts: 3,
  board: createOrderBoard(),
  kitchen: createKitchen(),
  cook: createCook(),
  messages: [], // { text, color, life }
  demo: false, // screenshot mode: timers frozen, a busy mid-game scene
};

function addMessage(text, color = '#fff3d6') {
  state.messages.push({ text, color, life: 1.6 });
  if (state.messages.length > 3) state.messages.shift();
}

// --- Screenshot mode: #shot=cover | assembly | serve ---------------------
// A hash seeds a busy mid-game scene and freezes the timers, purely so the
// screenshots show the game at its best. The game itself is unchanged.

function seedDemo(kind) {
  state.demo = true;
  state.phase = 'playing';
  state.shiftLeft = 72;
  state.day = 2;
  const board = state.board;
  board.score = 1240;
  board.coins = 86;
  board.combo = 3;
  board.served = 9;
  const mk = (recipeId, secondsLeft) => {
    const order = makeOrder(2, secondsLeft);
    order.recipeId = recipeId;
    order.secondsLeft = secondsLeft;
    order.totalSeconds = secondsLeft;
    return order;
  };
  board.orders = [
    mk('nasi-goreng', 41),
    mk('mie-goreng', 27),
    mk('soto-ayam', 52),
  ];
  const kitchen = state.kitchen;
  const cook = state.cook;
  if (kind === 'cover' || kind === 'assembly') {
    // A dish mid-assembly on the plate, the cook carrying fresh ingredients.
    kitchen.plateTokens = ['rice!', 'egg!'];
    cook.tray = ['chili', 'noodles'];
    cook.x = 420;
    cook.y = 480;
    cook.targetX = 420;
    cook.targetY = 480;
  }
  if (kind === 'cover') {
    // One plate already finished and ready to serve.
    kitchen.plateTokens = ['rice!', 'egg!', 'chili'];
    kitchen.plateDish = 'nasi-goreng';
    cook.x = 700;
    cook.y = 520;
    cook.targetX = 700;
    cook.targetY = 520;
    addMessage('Nasi Goreng ready — serve it!', COLORS.gold);
  }
  if (kind === 'serve') {
    // The cook carries a finished dish toward the serve window.
    cook.dish = 'mie-goreng';
    cook.x = 900;
    cook.y = 560;
    cook.targetX = 900;
    cook.targetY = 560;
    addMessage('Mie Goreng ready — serve it!', COLORS.gold);
  }
  if (kind === 'assembly') {
    addMessage('Plating Nasi Goreng…', '#fff3d6');
  }
}

const hash = new URLSearchParams(window.location.hash.slice(1));
const shotKind = hash.get('shot');
if (shotKind) seedDemo(shotKind);

// --- Interaction ----------------------------------------------------------

function handleClick(click) {
  unlockAudio();
  if (state.phase === 'title') {
    startShift();
    return;
  }
  if (state.phase === 'over') return;
  // Clicking a station uses it when the cook stands close; otherwise the
  // cook walks toward the clicked point on the floor.
  const station = state.kitchen.stations.find(
    (s) => click.x >= s.x && click.x <= s.x + s.w && click.y >= s.y && click.y <= s.y + s.h,
  );
  if (station) {
    const cx = station.x + station.w / 2;
    const cy = station.y + station.h / 2;
    const near = Math.hypot(cx - state.cook.x, cy - state.cook.y) < 160;
    if (near) {
      useCurrentStation();
      return;
    }
    // Walk to just in front of the station, then the player presses E.
    state.cook.targetX = cx;
    state.cook.targetY = station.y + station.h + 60;
    return;
  }
  state.cook.targetX = click.x;
  state.cook.targetY = click.y;
}

function useCurrentStation() {
  const result = useStation(state.kitchen, state.cook, state.board);
  if (result === null) return;
  if (typeof result === 'object' && result.event === 'served') {
    const recipe = recipeById(result.recipeId);
    addMessage(`Served ${recipe ? recipe.name : 'dish'}! +${result.points}`, COLORS.gold);
    playSound('served');
    return;
  }
  switch (result) {
    case 'pickup':
      playSound('pickup');
      break;
    case 'chop-start':
      playSound('chop');
      addMessage('Chopping…', '#fff3d6');
      break;
    case 'cook-start':
      playSound('sizzle');
      addMessage('Cooking in the wok…', '#fff3d6');
      break;
    case 'plated':
      playSound('click');
      break;
    case 'dish-ready':
      playSound('ding');
      addMessage('Dish ready — take it to the serve window!', COLORS.gold);
      break;
    case 'take-dish':
      playSound('pickup');
      break;
    case 'trashed':
      playSound('click');
      break;
    case 'tray-full':
      addMessage('Tray is full — plate or dump something first', COLORS.red);
      playSound('error');
      break;
    case 'hands-full':
      addMessage('Hands full — serve the dish first', COLORS.red);
      playSound('error');
      break;
    case 'nothing-to-prep':
      addMessage('Nothing here needs chopping or cooking', COLORS.red);
      playSound('error');
      break;
    case 'needs-prep':
      addMessage('That still needs chopping or cooking first', COLORS.red);
      playSound('error');
      break;
    case 'wrong-combo':
      addMessage('That does not belong in any dish on the menu', COLORS.red);
      playSound('error');
      break;
    case 'tray-empty':
      addMessage('Nothing to plate — grab an ingredient first', COLORS.red);
      playSound('error');
      break;
    case 'no-dish':
      addMessage('Carry a finished dish to the serve window', COLORS.red);
      playSound('error');
      break;
    case 'no-order':
      addMessage('Nobody ordered that dish right now', COLORS.red);
      playSound('error');
      break;
    default:
      break;
  }
}

function startShift() {
  state.phase = 'playing';
  state.shiftLeft = SHIFT_SECONDS;
  state.shiftTotal = SHIFT_SECONDS;
  state.hearts = 3;
  state.day = 1;
  state.board = createOrderBoard();
  state.kitchen = createKitchen();
  state.cook = createCook();
  state.messages = [];
  addMessage('Day 1 — open the stall! Orders are coming.', '#fff3d6');
  playSound('ding');
}

function nextDay() {
  state.day += 1;
  state.shiftLeft = SHIFT_SECONDS;
  state.shiftTotal = SHIFT_SECONDS;
  state.board.spawnIn = 4;
  state.board.orders = [];
  state.kitchen = createKitchen();
  state.cook = createCook();
  state.messages = [];
  state.phase = 'playing';
  addMessage(`Day ${state.day} — faster orders, shorter timers!`, COLORS.gold);
  playSound('ding');
}

// --- The loop -------------------------------------------------------------

// Debug handle for automated play-testing (read-only state inspection).
window.__warung = state;

let last = performance.now();

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  state.time += dt;

  // Floating messages fade.
  for (const msg of state.messages) msg.life -= dt;
  state.messages = state.messages.filter((msg) => msg.life > 0);

  const click = takeClick(input);
  if (click) handleClick(click);

  if (wasPressed(input, 'm')) {
    const muted = toggleMute();
    addMessage(muted ? 'Sound off' : 'Sound on', '#fff3d6');
  }

  if (state.phase === 'title') {
    if (wasPressed(input, 'space') || wasPressed(input, 'enter')) startShift();
  } else if (state.phase === 'playing') {
    if (!state.demo) {
      state.shiftLeft -= dt;
      if (state.shiftLeft <= 0) {
        state.shiftLeft = 0;
        state.phase = 'over';
        playSound('fail');
      }
    }
    if (state.phase === 'playing') {
      moveCook(state.cook, input.keys, dt);
      if (wasPressed(input, 'e') || wasPressed(input, 'space')) useCurrentStation();
      const done = updateKitchen(state.kitchen, state.cook, dt);
      if (done) {
        playSound(done.kind === 'chop' ? 'chop' : 'sizzle');
        addMessage(`${done.token.replace('!', '')} ready!`, '#fff3d6');
      }
      if (!state.demo) {
        const timedOut = updateOrderBoard(state.board, state.day, dt);
        for (const order of timedOut) {
          const recipe = recipeById(order.recipeId);
          missOrder(state.board);
          state.hearts -= 1;
          addMessage(`Too slow — the ${recipe ? recipe.name : 'order'} walked out!`, COLORS.red);
          playSound('fail');
          if (state.hearts <= 0) {
            state.phase = 'over';
          }
        }
      }
      // A station glows when the cook stands close: a hint, not a rule.
    }
  } else if (state.phase === 'over') {
    if (wasPressed(input, 'r')) nextDay();
  }

  drawGame(ctx, state);
  endFrame(input);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
