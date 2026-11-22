// Boot, game loop and input for EMBER PACT: one canvas, one loop,
// mouse clicks and keyboard, and the hooks the play-tester drives
// (window.__ember exposes the live game for automated play-testing).
import { createGame, startDuel, playCard, endPlayerTurn, stepAiTurn, restartDuel, checkEnd } from './game.js';
import { renderGame, triggerShake, VIEW_W, VIEW_H } from './render.js';
import { playSound, setMuted, isMuted } from './audio.js';
import { applyShotQuery, seedFromQuery, SHOT_NOW } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = VIEW_W;
canvas.height = VIEW_H;

const query = new URLSearchParams(window.location.search);
const seed = seedFromQuery(query);
const game = createGame(seed);
const shotScene = applyShotQuery(game, query);
const shotMode = shotScene !== null;

let hotspots = [];
let lastAiSoundAt = 0;

function fx(name) {
  playSound(name);
  if (name === 'hit') triggerShake(10);
}

function playCardFx(event) {
  fx(event);
}

function handleAction(action, hotspot) {
  if (action === 'start') {
    playSound('click');
    startDuel(game);
  } else if (action === 'card') {
    if (game.phase !== 'player' || game.screen !== 'play') return;
    const before = game.player.hand.length;
    const ok = playCard(game, 'player', hotspot.uid, playCardFx);
    if (ok && game.player.hand.length < before) {
      // played fine; sound already fired through the fx callback
    } else if (!ok) {
      playSound('click');
    }
  } else if (action === 'end-turn') {
    playSound('turn');
    endPlayerTurn(game);
  } else if (action === 'mute') {
    setMuted(!isMuted());
    game.muted = isMuted();
  } else if (action === 'restart') {
    playSound('click');
    restartDuel(game, seed);
  }
}

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * VIEW_W,
    y: ((event.clientY - rect.top) / rect.height) * VIEW_H,
  };
}

canvas.addEventListener('click', (event) => {
  const p = canvasPoint(event);
  for (let i = hotspots.length - 1; i >= 0; i -= 1) {
    const h = hotspots[i];
    if (p.x >= h.x && p.x <= h.x + h.w && p.y >= h.y && p.y <= h.y + h.h) {
      handleAction(h.action, h);
      return;
    }
  }
});

canvas.addEventListener('mousemove', (event) => {
  const p = canvasPoint(event);
  let hover = 'default';
  for (const h of hotspots) {
    if (p.x >= h.x && p.x <= h.x + h.w && p.y >= h.y && p.y <= h.y + h.h) {
      hover = 'pointer';
      break;
    }
  }
  canvas.style.cursor = hover;
});

window.addEventListener('keydown', (event) => {
  if (game.screen === 'title' && (event.key === 'Enter' || event.key === ' ')) {
    startDuel(game);
    return;
  }
  if ((game.screen === 'win' || game.screen === 'loss') && (event.key === 'r' || event.key === 'R' || event.key === 'Enter')) {
    restartDuel(game, seed);
    return;
  }
  if (game.screen !== 'play') return;
  if (event.key >= '1' && event.key <= '9') {
    const index = Number(event.key) - 1;
    const card = game.player.hand[index];
    if (card) playCard(game, 'player', card.uid, playCardFx);
  } else if (event.key === ' ' || event.key === 'Enter') {
    event.preventDefault();
    if (game.phase === 'player') {
      playSound('turn');
      endPlayerTurn(game);
    }
  } else if (event.key === 'r' || event.key === 'R') {
    restartDuel(game, seed);
  } else if (event.key === 'm' || event.key === 'M') {
    setMuted(!isMuted());
    game.muted = isMuted();
  }
});

// Test hooks: the automated play-tester drives the game through these.
window.__ember = {
  game,
  startDuel: () => startDuel(game),
  playCard: (uid) => playCard(game, 'player', uid, playCardFx),
  endTurn: () => endPlayerTurn(game),
  restart: () => restartDuel(game, seed),
  hotspots: () => hotspots,
  // Test hook: set a fighter's life and run the end-of-duel check, so the
  // play-tester can reach the win/loss screens through the real code path.
  setLife: (side, n) => { game[side].life = n; checkEnd(game); },
};

// Sound for Vex's plays and for turn changes, without spamming.
let lastPhase = game.phase;
let lastPlayedCount = game.played.length;

function loop(now) {
  // Schedule the next frame first: a render error must never kill the loop.
  requestAnimationFrame(loop);
  if (!shotMode && game.screen === 'play' && game.phase === 'ai') {
    const busy = stepAiTurn(game, playCardFx);
    if (!busy && lastPhase === 'ai') playSound('turn');
  }
  lastPhase = game.phase;
  if (game.played.length !== lastPlayedCount) lastPlayedCount = game.played.length;
  if (game.screen === 'win' && game.winner === 'player') {
    if (!loop.winPlayed) { playSound('win'); loop.winPlayed = true; }
  } else if (game.screen === 'loss') {
    if (!loop.losePlayed) { playSound('lose'); loop.losePlayed = true; }
  } else {
    loop.winPlayed = false;
    loop.losePlayed = false;
  }
  // In a screenshot scene the render clock is frozen, so the same seed
  // always renders the same pixels.
  hotspots = renderGame(ctx, game, shotMode ? SHOT_NOW : now);
  window.__ready = true;
}

requestAnimationFrame(loop);
