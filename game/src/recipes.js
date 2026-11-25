// Warung Rush — the ingredients and the three recipes of the stall.
// One file, one job: what food exists, what each dish needs, and how a
// plate of tokens is recognised as a finished dish.

// Every ingredient token has an id, a display name, a colour and a stage.
// stage "raw" means it must be chopped or cooked before it can be plated.
export const INGREDIENTS = {
  rice:    { name: 'Rice',     color: '#f5f0e1', stage: 'raw',  prep: 'cook',  icon: 'bowl' },
  noodles: { name: 'Noodles',  color: '#f2c14e', stage: 'raw',  prep: 'cook',  icon: 'swirl' },
  chicken: { name: 'Chicken',  color: '#e8a87c', stage: 'raw',  prep: 'chop',  icon: 'drumstick' },
  egg:     { name: 'Egg',      color: '#f7d774', stage: 'raw',  prep: 'cook',  icon: 'egg' },
  chili:   { name: 'Chili',    color: '#d64541', stage: 'ready', prep: 'none', icon: 'chili' },
  veg:     { name: 'Veggies',  color: '#5da24a', stage: 'raw',  prep: 'chop',  icon: 'leaf' },
};

// A prepared token is the same ingredient after its prep step finished.
export function preparedId(id) {
  return `${id}!`;
}

// The token a station hands back once its prep step is done.
export function prepResult(id) {
  const ing = INGREDIENTS[id];
  if (!ing || ing.prep === 'none') return id;
  return preparedId(id);
}

// True when a token is ready to go on a plate (no prep left to do).
export function isReadyToken(id) {
  const base = id.replace(/!$/, '');
  const ing = INGREDIENTS[base];
  if (!ing) return false;
  if (ing.prep === 'none') return true;
  return id.endsWith('!');
}

// The short label drawn under an ingredient token.
export function tokenLabel(id) {
  const base = id.replace(/!$/, '');
  const ing = INGREDIENTS[base];
  if (!ing) return id;
  return ing.prep === 'none' || id.endsWith('!') ? ing.name : `${ing.name} (raw)`;
}

// The three dishes on the warung menu. Each lists the ready tokens a plate
// must hold, in any order, to become that dish.
export const RECIPES = [
  {
    id: 'nasi-goreng',
    name: 'Nasi Goreng',
    needs: ['rice!', 'egg!', 'chili'],
    price: 12,
    blurb: 'Fried rice, egg, chili',
  },
  {
    id: 'mie-goreng',
    name: 'Mie Goreng',
    needs: ['noodles!', 'chicken!', 'veg!'],
    price: 14,
    blurb: 'Fried noodles, chicken, veggies',
  },
  {
    id: 'soto-ayam',
    name: 'Soto Ayam',
    needs: ['chicken!', 'veg!', 'egg!'],
    price: 16,
    blurb: 'Chicken soup, veggies, egg',
  },
];

export function recipeById(id) {
  return RECIPES.find((r) => r.id === id) ?? null;
}

// Match a plate's tokens against the menu. Returns the recipe, or null when
// the plate holds nothing a customer ordered (extra tokens block a match).
export function matchRecipe(tokens) {
  const sorted = [...tokens].sort().join('|');
  for (const recipe of RECIPES) {
    if ([...recipe.needs].sort().join('|') === sorted) return recipe;
  }
  return null;
}

// True when the plate's tokens are a subset of some recipe (still buildable).
export function plateIsOnTrack(tokens) {
  if (tokens.length === 0) return true;
  return RECIPES.some((recipe) =>
    tokens.every((t) => recipe.needs.includes(t)) &&
    new Set(tokens).size === tokens.length,
  );
}
