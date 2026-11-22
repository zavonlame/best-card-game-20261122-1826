// Deterministic screenshot scenes for EMBER PACT: ?shot=cover|title|
// win|loss&seed=N sets up the exact same board every time, from a fixed
// seed, so the screenshots are reproducible renders of the game's code.
import { startDuel } from './game.js';
import { CARD_DEFS, makeCardInstance } from './cards.js';
import { drawCards } from './deck.js';

// The frozen clock every screenshot scene renders against. All scene
// timestamps (played cards, floating numbers) are relative to this, so
// re-taking a shot with the same seed renders the same pixels.
export const SHOT_NOW = 100000;

function cardById(id) {
  const def = CARD_DEFS.find((d) => d.id === id);
  return makeCardInstance(def);
}

function seedHand(game, side, ids) {
  const fighter = side === 'player' ? game.player : game.ai;
  fighter.hand = ids.map((id) => cardById(id));
}

// A rich mid-duel board: turn 4, both hands full, shields up, damage
// already dealt, a Meteor Pact just cast — the peak-action cover shot.
export function setupCoverScene(game) {
  startDuel(game);
  game.turn = 4;
  game.player.life = 22;
  game.player.shield = 4;
  game.player.energy = 4;
  game.player.maxEnergy = 4;
  game.ai.life = 18;
  game.ai.shield = 2;
  game.ai.energy = 3;
  game.ai.maxEnergy = 4;
  game.stats.playerDamage = 12;
  game.stats.aiDamage = 8;
  seedHand(game, 'player', ['ember-bolt', 'ash-nova', 'tide-surge', 'thorn-snare', 'meteor-pact']);
  seedHand(game, 'ai', ['ember-bolt', 'frost-ward', 'briar-drain', 'star-mend', 'tide-surge']);
  game.played = [{ card: cardById('meteor-pact'), side: 'player', born: SHOT_NOW - 400 }];
  game.floats = [
    { side: 'ai', text: '-12', color: '#ff6a4d', born: SHOT_NOW - 300, life: 1100 },
    { side: 'player', text: '+4 shield', color: '#7fd4ff', born: SHOT_NOW - 500, life: 1100 },
  ];
  game.log = [
    'You cast Meteor Pact — 12 damage.',
    'Vex cast Briar Drain — 3 damage. Healed 3 life.',
    'Turn 4 — you draw 2, energy 4.',
    'Vex raised 2 shield.',
    'The pact is sealed — your move, duelist.',
  ];
  return game;
}

export function setupWinScene(game) {
  startDuel(game);
  game.turn = 7;
  game.player.life = 14;
  game.ai.life = 0;
  game.stats.playerDamage = 34;
  game.stats.aiDamage = 16;
  game.stats.turns = 7;
  game.player.cardsPlayed = 11;
  game.ai.cardsPlayed = 9;
  seedHand(game, 'player', ['ember-bolt', 'star-mend', 'tide-surge']);
  game.screen = 'win';
  game.phase = 'over';
  game.winner = 'player';
  return game;
}

export function setupLossScene(game) {
  startDuel(game);
  game.turn = 8;
  game.player.life = 0;
  game.ai.life = 9;
  game.stats.playerDamage = 21;
  game.stats.aiDamage = 31;
  game.stats.turns = 8;
  game.player.cardsPlayed = 10;
  game.ai.cardsPlayed = 12;
  seedHand(game, 'player', ['ember-bolt', 'frost-ward']);
  game.screen = 'loss';
  game.phase = 'over';
  game.winner = 'ai';
  return game;
}

// Title scene: the duel has not started; the sample cards on the title
// screen come from a freshly dealt opening hand.
export function setupTitleScene(game) {
  drawCards(game.player.deck, game.player.hand, 5, game.random);
  drawCards(game.ai.deck, game.ai.hand, 5, game.random);
  game.screen = 'title';
  return game;
}

// Apply a ?shot= query to a fresh game. Returns the scene name, or null
// when no shot was requested (normal interactive play).
export function applyShotQuery(game, query) {
  const shot = query.get('shot');
  if (!shot) return null;
  const seed = Number(query.get('seed') || '7');
  if (shot === 'cover') return setupCoverScene(game);
  if (shot === 'title') return setupTitleScene(game);
  if (shot === 'win') return setupWinScene(game);
  if (shot === 'loss') return setupLossScene(game);
  return null;
}

export function seedFromQuery(query) {
  return Number(query.get('seed') || '7');
}
