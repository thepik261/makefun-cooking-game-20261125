// Warung Rush — the order board: orders arrive, tick down, and are served
// or lost. One file, one job: everything about customer orders and score.

import {
  MAX_ORDERS,
  ORDER_SECONDS_BASE,
  ORDER_SECONDS_MIN,
  ORDER_INTERVAL_BASE,
  ORDER_INTERVAL_MIN,
  SERVE_BASE_POINTS,
  SERVE_TIME_BONUS,
  COMBO_BONUS_EVERY,
  COMBO_BONUS_POINTS,
} from './config.js';
import { RECIPES, recipeById } from './recipes.js';

let nextOrderId = 1;

// An order: which dish, how long is left, and whether it was served or lost.
export function makeOrder(day, secondsLeft) {
  const recipe = RECIPES[Math.floor(Math.random() * RECIPES.length)];
  return {
    id: nextOrderId++,
    recipeId: recipe.id,
    secondsLeft,
    totalSeconds: secondsLeft,
    state: 'waiting', // waiting | served | failed
    servedAt: 0,
  };
}

// The board's own state: the live orders, the spawn clock, the score.
export function createOrderBoard() {
  return {
    orders: [],
    spawnIn: 4, // seconds until the first order arrives
    score: 0,
    coins: 0,
    combo: 0,
    bestCombo: 0,
    served: 0,
    failed: 0,
  };
}

// How long a fresh order gets on this day.
export function orderSecondsFor(day) {
  return Math.max(ORDER_SECONDS_MIN, ORDER_SECONDS_BASE - (day - 1) * 4);
}

// How often a new order arrives on this day.
function spawnIntervalFor(day) {
  return Math.max(ORDER_INTERVAL_MIN, ORDER_INTERVAL_BASE - (day - 1) * 2);
}

// Advance the board by dt seconds. Returns the orders that just timed out.
export function updateOrderBoard(board, day, dt) {
  const timedOut = [];
  board.spawnIn -= dt;
  if (board.spawnIn <= 0 && board.orders.filter((o) => o.state === 'waiting').length < MAX_ORDERS) {
    board.orders.push(makeOrder(day, orderSecondsFor(day)));
    board.spawnIn = spawnIntervalFor(day);
  }
  for (const order of board.orders) {
    if (order.state === 'served') {
      // A served ticket lingers briefly, stamped DONE, then leaves the board.
      order.servedAt -= dt;
      continue;
    }
    if (order.state !== 'waiting') continue;
    order.secondsLeft -= dt;
    if (order.secondsLeft <= 0) {
      order.secondsLeft = 0;
      order.state = 'failed';
      timedOut.push(order);
    }
  }
  // Drop finished orders once their DONE stamp has been shown briefly.
  board.orders = board.orders.filter((o) => o.state === 'waiting' || o.servedAt > 0);
  return timedOut;
}

// Serve the waiting order whose dish matches recipeId. Returns the served
// order plus the points earned, or null when no order wants that dish.
export function serveOrder(board, recipeId) {
  const order = board.orders.find((o) => o.state === 'waiting' && o.recipeId === recipeId);
  if (!order) return null;
  order.state = 'served';
  order.servedAt = 1.2; // seconds the ticket stays on the board, stamped DONE
  const recipe = recipeById(recipeId);
  const timeBonus = Math.round(order.secondsLeft) * SERVE_TIME_BONUS;
  let points = SERVE_BASE_POINTS + timeBonus;
  board.combo += 1;
  board.bestCombo = Math.max(board.bestCombo, board.combo);
  if (board.combo % COMBO_BONUS_EVERY === 0) points += COMBO_BONUS_POINTS;
  board.score += points;
  board.coins += recipe ? recipe.price : 0;
  board.served += 1;
  return { order, points };
}

// A missed order breaks the combo streak.
export function missOrder(board) {
  board.combo = 0;
  board.failed += 1;
}

// The waiting order with the least time left — the one the cook should rush.
export function urgentOrder(board) {
  const waiting = board.orders.filter((o) => o.state === 'waiting');
  if (waiting.length === 0) return null;
  return waiting.reduce((a, b) => (a.secondsLeft < b.secondsLeft ? a : b));
}
