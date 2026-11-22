// The card pool for EMBER PACT: 8 original spells across 4 suits.
// Suits are told apart by colour AND by shape, never by text alone:
//   EMBER (flame, red-orange) — raw damage
//   TIDE  (drop, blue)        — damage plus card draw
//   THORN (leaf, green)       — damage plus shield
//   STAR  (star, gold)        — healing and the big finishers
// The two 30-card decks are dealt from this 60-card pool, so the title's
// "60-Card Duel" is the literal card count on the table.

export const SUITS = {
  ember: { name: 'Ember', color: '#ff5a3c', dark: '#a12708', glyph: 'flame' },
  tide: { name: 'Tide', color: '#3fa9ff', dark: '#0b4d8a', glyph: 'drop' },
  thorn: { name: 'Thorn', color: '#5ec85a', dark: '#1d6b22', glyph: 'leaf' },
  star: { name: 'Star', color: '#ffc93c', dark: '#8a6400', glyph: 'star' },
};

// effect: { damage, heal, shield, draw, energy }
// A card's whole behaviour is one row here; game.js only reads the row.
export const CARD_DEFS = [
  { id: 'ember-bolt', name: 'Ember Bolt', suit: 'ember', cost: 1, damage: 4, heal: 0, shield: 0, draw: 0, energy: 0, copies: 9, text: 'Deal 4 damage.' },
  { id: 'ash-nova', name: 'Ash Nova', suit: 'ember', cost: 3, damage: 9, heal: 0, shield: 0, draw: 0, energy: 0, copies: 6, text: 'Deal 9 damage.' },
  { id: 'tide-surge', name: 'Tide Surge', suit: 'tide', cost: 2, damage: 6, heal: 0, shield: 0, draw: 1, energy: 0, copies: 9, text: 'Deal 6 damage. Draw a card.' },
  { id: 'frost-ward', name: 'Frost Ward', suit: 'tide', cost: 1, damage: 0, heal: 0, shield: 6, draw: 0, energy: 0, copies: 8, text: 'Gain 6 shield.' },
  { id: 'thorn-snare', name: 'Thorn Snare', suit: 'thorn', cost: 1, damage: 2, heal: 0, shield: 3, draw: 0, energy: 0, copies: 8, text: 'Deal 2 damage. Gain 3 shield.' },
  { id: 'briar-drain', name: 'Briar Drain', suit: 'thorn', cost: 2, damage: 3, heal: 3, shield: 0, draw: 0, energy: 0, copies: 8, text: 'Deal 3 damage. Heal 3 life.' },
  { id: 'star-mend', name: 'Star Mend', suit: 'star', cost: 2, damage: 0, heal: 6, shield: 0, draw: 0, energy: 0, copies: 7, text: 'Heal 6 life.' },
  { id: 'meteor-pact', name: 'Meteor Pact', suit: 'star', cost: 4, damage: 12, heal: 0, shield: 0, draw: 0, energy: 0, copies: 5, text: 'Deal 12 damage.' },
];

export const TOTAL_COPIES = CARD_DEFS.reduce((sum, def) => sum + def.copies, 0); // 60

let nextUid = 1;

export function makeCardInstance(def) {
  return {
    uid: nextUid++,
    id: def.id,
    name: def.name,
    suit: def.suit,
    cost: def.cost,
    damage: def.damage,
    heal: def.heal,
    shield: def.shield,
    draw: def.draw,
    energy: def.energy,
    text: def.text,
  };
}

export function buildFullPool() {
  nextUid = 1;
  const pool = [];
  for (const def of CARD_DEFS) {
    for (let i = 0; i < def.copies; i += 1) pool.push(makeCardInstance(def));
  }
  return pool; // 60 cards
}

export function suitOf(card) {
  return SUITS[card.suit];
}
