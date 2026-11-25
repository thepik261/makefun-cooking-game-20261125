// Warung Rush — shared constants for the kitchen, the HUD and the rules.
// One file, one job: every number the other modules agree on lives here.
export const W = 1280;
export const H = 720;

// The shift (one round) lasts this long; the day ends and the score is tallied.
export const SHIFT_SECONDS = 150;
// Orders start with this much time; later days shave seconds off.
export const ORDER_SECONDS_BASE = 55;
export const ORDER_SECONDS_MIN = 32;
// A new order arrives at most this often, faster as the day goes on.
export const ORDER_INTERVAL_BASE = 14;
export const ORDER_INTERVAL_MIN = 7;
// How many orders may sit on the board at once.
export const MAX_ORDERS = 4;
// The cook starts with this many hearts; a timed-out order costs one.
export const START_HEARTS = 3;
// Seconds a chop or a cook action takes on its station.
export const CHOP_SECONDS = 2.0;
export const COOK_SECONDS = 3.0;
// How many ingredient tokens the cook can carry at once.
export const TRAY_SLOTS = 4;
// Points: base per served dish, plus a bonus for time left on the order.
export const SERVE_BASE_POINTS = 100;
export const SERVE_TIME_BONUS = 2;
// Coins paid per served dish (the score the board shows).
export const SERVE_COINS = 10;
// Combo: every 3rd dish in a row without a miss pays this bonus.
export const COMBO_BONUS_EVERY = 3;
export const COMBO_BONUS_POINTS = 50;

// Kitchen floor: the walkable rectangle the cook moves in.
export const FLOOR = { x: 40, y: 250, w: 1200, h: 420 };
// The cook's speed in pixels per second, and the cook's drawn radius.
export const COOK_SPEED = 300;
export const COOK_RADIUS = 26;

// Colours of the warung: warm wood, cream tiles, terracotta awning.
export const COLORS = {
  wall: '#f7e8c8',
  wallTrim: '#d9a05b',
  floor: '#c98f5f',
  floorDark: '#b57e4e',
  counterTop: '#8a5a33',
  counterFront: '#6f4525',
  steel: '#b9c4cc',
  steelDark: '#8b98a3',
  board: '#fff8e7',
  boardEdge: '#a9743f',
  ink: '#3a2a18',
  inkSoft: '#6b543a',
  red: '#d64541',
  green: '#4d9b4d',
  gold: '#f2b234',
  cream: '#fff3d6',
};
