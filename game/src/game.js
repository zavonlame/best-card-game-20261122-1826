// Game state and rules for EMBER PACT: turns, energy, combat, win/loss.
// The renderer only reads this state; every rule lives here.
import { buildFullPool } from './cards.js';
import { makeDeck, drawCards, discardCard, removeFromHand } from './deck.js';
import { mulberry32, shuffleInPlace } from './rng.js';
import { chooseAiCard, aiIntentLine } from './ai.js';

export const MAX_LIFE = 30;
export const OPENING_HAND = 5;
export const DRAW_PER_TURN = 2;

export function newFighter(name, isAi) {
  return {
    name,
    isAi,
    life: MAX_LIFE,
    maxLife: MAX_LIFE,
    shield: 0,
    energy: 3,
    maxEnergy: 3,
    deck: null,
    hand: [],
    damageDealt: 0,
    cardsPlayed: 0,
  };
}

export function createGame(seed) {
  const random = mulberry32(seed);
  const pool = buildFullPool();
  shuffleInPlace(pool, random);
  const playerCards = pool.slice(0, 30);
  const aiCards = pool.slice(30, 60);
  const game = {
    seed,
    random,
    screen: 'title', // title | play | win | loss
    turn: 1,
    phase: 'player', // player | ai | over
    player: newFighter('You', false),
    ai: newFighter('Vex, the Ashen Rival', true),
    log: [],
    floats: [], // floating damage/heal numbers {x,y,text,color,born,life}
    played: [], // cards shown on the table this turn {card,side,born}
    aiQueue: [], // cards Vex still has to play this turn
    aiNextAt: 0,
    winner: null,
    stats: { turns: 0, playerDamage: 0, aiDamage: 0 },
    muted: false,
    startedAt: performance.now(),
  };
  game.player.deck = makeDeck(playerCards, random);
  game.ai.deck = makeDeck(aiCards, random);
  return game;
}

export function logLine(game, text) {
  game.log.unshift(text);
  if (game.log.length > 6) game.log.length = 6;
}

export function startDuel(game) {
  drawCards(game.player.deck, game.player.hand, OPENING_HAND, game.random);
  drawCards(game.ai.deck, game.ai.hand, OPENING_HAND, game.random);
  game.player.energy = 3;
  game.player.maxEnergy = 3;
  game.screen = 'play';
  game.phase = 'player';
  game.turn = 1;
  logLine(game, 'The pact is sealed — your move, duelist.');
  logLine(game, 'Vex draws 5 cards. You draw 5 cards.');
}

export function maxEnergyForTurn(turn) {
  return Math.min(3 + Math.floor((turn - 1) / 2), 6);
}

// Damage hits shield first, then life. Returns the life actually lost.
export function dealDamage(game, target, amount, sourceName) {
  let left = amount;
  if (target.shield > 0) {
    const absorbed = Math.min(target.shield, left);
    target.shield -= absorbed;
    left -= absorbed;
  }
  target.life = Math.max(0, target.life - left);
  return left;
}

export function healFighter(target, amount) {
  const healed = Math.min(amount, target.maxLife - target.life);
  target.life += healed;
  return healed;
}

export function checkEnd(game) {
  if (game.ai.life <= 0) {
    game.screen = 'win';
    game.phase = 'over';
    game.winner = 'player';
    game.stats.turns = game.turn;
    logLine(game, 'Vex falls — the Ember Pact is yours!');
    return true;
  }
  if (game.player.life <= 0) {
    game.screen = 'loss';
    game.phase = 'over';
    game.winner = 'ai';
    game.stats.turns = game.turn;
    logLine(game, 'Your ember gutters out. Vex takes the pact.');
    return true;
  }
  return false;
}

// Apply one card's effect. side is 'player' or 'ai'. Returns false if the
// card cannot be played (not enough energy, wrong phase).
export function playCard(game, side, uid, fx) {
  const me = side === 'player' ? game.player : game.ai;
  const foe = side === 'player' ? game.ai : game.player;
  if (game.screen !== 'play') return false;
  if (side === 'player' && game.phase !== 'player') return false;
  const card = me.hand.find((c) => c.uid === uid);
  if (!card) return false;
  if (card.cost > me.energy) return false;

  removeFromHand(me.hand, uid);
  me.energy -= card.cost;
  me.cardsPlayed += 1;
  discardCard(me.deck, card);
  game.played.unshift({ card, side, born: performance.now() });
  if (game.played.length > 4) game.played.length = 4;

  if (fx) fx('play');
  if (card.damage > 0) {
    const lost = dealDamage(game, foe, card.damage, me.name);
    me.damageDealt += card.damage;
    if (side === 'player') game.stats.playerDamage += card.damage;
    else game.stats.aiDamage += card.damage;
    game.floats.push({ side: side === 'player' ? 'ai' : 'player', text: `-${card.damage}`, color: '#ff6a4d', born: performance.now(), life: 1100 });
    logLine(game, `${me.name} cast ${card.name} — ${card.damage} damage.`);
    if (fx) fx('hit');
  }
  if (card.shield > 0) {
    me.shield += card.shield;
    game.floats.push({ side, text: `+${card.shield} shield`, color: '#7fd4ff', born: performance.now(), life: 1100 });
    logLine(game, `${me.name} raised ${card.shield} shield.`);
  }
  if (card.heal > 0) {
    const healed = healFighter(me, card.heal);
    game.floats.push({ side, text: `+${healed} life`, color: '#7be07b', born: performance.now(), life: 1100 });
    logLine(game, `${me.name} mended ${healed} life.`);
  }
  if (card.draw > 0) {
    const drawn = drawCards(me.deck, me.hand, card.draw, game.random);
    if (drawn.length > 0) logLine(game, `${me.name} drew ${drawn.length} card${drawn.length > 1 ? 's' : ''}.`);
  }
  if (fx && card.damage === 0 && card.heal === 0 && card.shield === 0) fx('soft');
  return !checkEnd(game);
}

export function endPlayerTurn(game) {
  if (game.screen !== 'play' || game.phase !== 'player') return;
  game.phase = 'ai';
  logLine(game, aiIntentLine(game.ai, game.player));
  // Vex plans its whole turn now, then plays one card at a time.
  const plan = [];
  let energy = game.ai.energy;
  const handCopy = game.ai.hand.slice();
  for (;;) {
    const pick = chooseAiCard(handCopy, energy, game.ai, game.player);
    if (!pick) break;
    plan.push(pick);
    energy -= pick.cost;
    handCopy.splice(handCopy.indexOf(pick), 1);
  }
  game.aiQueue = plan;
  game.aiNextAt = performance.now() + 650;
}

// One AI step per call from the main loop; returns true while Vex is busy.
export function stepAiTurn(game, fx) {
  if (game.phase !== 'ai') return false;
  if (game.aiQueue.length > 0) {
    if (performance.now() < game.aiNextAt) return true;
    const card = game.aiQueue.shift();
    playCard(game, 'ai', card.uid, fx);
    game.aiNextAt = performance.now() + 750;
    if (game.screen !== 'play') return false;
    return true;
  }
  // Vex is done: new turn for the player.
  game.turn += 1;
  game.phase = 'player';
  const energy = maxEnergyForTurn(game.turn);
  game.player.maxEnergy = energy;
  game.player.energy = energy;
  game.ai.maxEnergy = energy;
  game.ai.energy = energy;
  drawCards(game.player.deck, game.player.hand, DRAW_PER_TURN, game.random);
  drawCards(game.ai.deck, game.ai.hand, DRAW_PER_TURN, game.random);
  logLine(game, `Turn ${game.turn} — you draw ${DRAW_PER_TURN}, energy ${energy}.`);
  return false;
}

export function restartDuel(game, seed) {
  const fresh = createGame(seed ?? game.seed);
  Object.keys(game).forEach((key) => delete game[key]);
  Object.assign(game, fresh);
  startDuel(game);
}
