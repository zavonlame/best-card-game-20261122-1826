// All canvas drawing for EMBER PACT: the felt table, both hands, the
// cards themselves, the HUD, the title screen and the win/loss screens.
// The game logic never draws; this file only reads game state.
import { SUITS, suitOf, CARD_DEFS } from './cards.js';

export const VIEW_W = 1280;
export const VIEW_H = 720;

const CARD_W = 132;
const CARD_H = 188;

let shakeUntil = 0;
let shakeMag = 0;

export function triggerShake(mag) {
  shakeMag = mag;
  shakeUntil = performance.now() + 220;
}

function shakeOffset(now) {
  if (now > shakeUntil) return { x: 0, y: 0 };
  const s = shakeMag * (1 - (now - (shakeUntil - 220)) / 220);
  return { x: (Math.random() - 0.5) * s, y: (Math.random() - 0.5) * s };
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, str, x, y, size, color, align = 'left', weight = 'bold', font = 'Georgia, serif') {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px ${font}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

// ---- suit glyphs: colour AND shape, so suits read at thumbnail size ----
export function drawGlyph(ctx, glyph, cx, cy, size, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, size * 0.08);
  ctx.beginPath();
  if (glyph === 'flame') {
    // A licking flame: hooked tip, S-curved side, wide base — plus a
    // bright inner flame, so it never reads as a water drop.
    ctx.moveTo(cx, cy - size * 0.58);
    ctx.bezierCurveTo(cx + size * 0.18, cy - size * 0.3, cx + size * 0.42, cy - size * 0.05, cx + size * 0.38, cy + size * 0.28);
    ctx.bezierCurveTo(cx + size * 0.36, cy + size * 0.48, cx + size * 0.18, cy + size * 0.52, cx, cy + size * 0.52);
    ctx.bezierCurveTo(cx - size * 0.2, cy + size * 0.52, cx - size * 0.38, cy + size * 0.45, cx - size * 0.36, cy + size * 0.22);
    ctx.bezierCurveTo(cx - size * 0.34, cy, cx - size * 0.22, cy - size * 0.12, cx - size * 0.12, cy - size * 0.28);
    ctx.bezierCurveTo(cx - size * 0.06, cy - size * 0.4, cx + size * 0.02, cy - size * 0.46, cx, cy - size * 0.58);
    ctx.closePath();
    ctx.fill();
    // inner flame
    ctx.fillStyle = '#ffe08a';
    ctx.beginPath();
    ctx.moveTo(cx + size * 0.02, cy - size * 0.2);
    ctx.bezierCurveTo(cx + size * 0.2, cy + size * 0.02, cx + size * 0.16, cy + size * 0.32, cx, cy + size * 0.36);
    ctx.bezierCurveTo(cx - size * 0.16, cy + size * 0.32, cx - size * 0.18, cy + size * 0.02, cx + size * 0.02, cy - size * 0.2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    return;
  } else if (glyph === 'drop') {
    ctx.moveTo(cx, cy - size * 0.55);
    ctx.bezierCurveTo(cx + size * 0.42, cy, cx + size * 0.35, cy + size * 0.5, cx, cy + size * 0.5);
    ctx.bezierCurveTo(cx - size * 0.35, cy + size * 0.5, cx - size * 0.42, cy, cx, cy - size * 0.55);
  } else if (glyph === 'leaf') {
    // A pointed leaf with a stem and a centre vein — sharp at both ends,
    // so it never reads as a water drop.
    ctx.moveTo(cx, cy - size * 0.55);
    ctx.bezierCurveTo(cx + size * 0.5, cy - size * 0.28, cx + size * 0.48, cy + size * 0.3, cx, cy + size * 0.5);
    ctx.bezierCurveTo(cx - size * 0.48, cy + size * 0.3, cx - size * 0.5, cy - size * 0.28, cx, cy - size * 0.55);
    ctx.closePath();
    ctx.fill();
    // vein + stem in a darker shade
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = Math.max(2, size * 0.07);
    ctx.beginPath();
    ctx.moveTo(cx, cy - size * 0.48);
    ctx.lineTo(cx, cy + size * 0.48);
    ctx.moveTo(cx, cy + size * 0.48);
    ctx.lineTo(cx + size * 0.08, cy + size * 0.66);
    ctx.stroke();
    ctx.restore();
    return;
  } else {
    // star: 5 points
    for (let i = 0; i < 10; i += 1) {
      const r = i % 2 === 0 ? size * 0.55 : size * 0.24;
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const px = cx + Math.cos(a) * r;
      const py = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawCardFace(ctx, card, x, y, w, h, opts = {}) {
  const suit = suitOf(card);
  const scale = w / CARD_W;
  ctx.save();
  if (opts.glow) {
    ctx.shadowColor = suit.color;
    ctx.shadowBlur = 18;
  }
  roundRect(ctx, x, y, w, h, 12 * scale);
  ctx.fillStyle = '#fdf6e3';
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = suit.dark;
  ctx.lineWidth = 3 * scale;
  ctx.stroke();
  // header band in the suit colour
  roundRect(ctx, x + 3 * scale, y + 3 * scale, w - 6 * scale, 34 * scale, 9 * scale);
  ctx.fillStyle = suit.color;
  ctx.fill();
  // cost gem, top left
  ctx.beginPath();
  ctx.arc(x + 20 * scale, y + 20 * scale, 15 * scale, 0, Math.PI * 2);
  ctx.fillStyle = '#2b1a4d';
  ctx.fill();
  ctx.strokeStyle = '#ffd94d';
  ctx.lineWidth = 2.5 * scale;
  ctx.stroke();
  text(ctx, String(card.cost), x + 20 * scale, y + 21 * scale, 22 * scale, '#ffd94d', 'center', 'bold', 'system-ui, sans-serif');
  // suit glyph, top right
  drawGlyph(ctx, suit.glyph, x + w - 22 * scale, y + 20 * scale, 26 * scale, '#fff');
  // art band: one huge glyph on a tinted field
  ctx.fillStyle = suit.color + '22';
  ctx.fillRect(x + 6 * scale, y + 42 * scale, w - 12 * scale, 62 * scale);
  drawGlyph(ctx, suit.glyph, x + w / 2, y + 73 * scale, 58 * scale, suit.color);
  // name
  text(ctx, card.name, x + w / 2, y + 120 * scale, 17 * scale, '#241a12', 'center', 'bold', 'Georgia, serif');
  // effect text
  ctx.fillStyle = '#4a3b2c';
  ctx.font = `600 ${13 * scale}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  wrapText(ctx, card.text, x + w / 2, y + 148 * scale, w - 18 * scale, 16 * scale);
  // power number, bottom: damage in red, heal/shield in green/blue
  let power = '';
  let powerColor = '#c22';
  if (card.damage > 0) { power = `⚔ ${card.damage}`; powerColor = '#c22'; }
  else if (card.heal > 0) { power = `✚ ${card.heal}`; powerColor = '#1d7a2a'; }
  else if (card.shield > 0) { power = `⛨ ${card.shield}`; powerColor = '#0b5fa5'; }
  if (power) text(ctx, power, x + w / 2, y + h - 16 * scale, 20 * scale, powerColor, 'center', 'bold', 'system-ui, sans-serif');
  ctx.restore();
}

function wrapText(ctx, str, cx, y, maxW, lineH) {
  const words = str.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = word;
    } else line = test;
  }
  lines.push(line);
  const startY = y - ((lines.length - 1) * lineH) / 2;
  lines.forEach((ln, i) => ctx.fillText(ln, cx, startY + i * lineH));
}

function drawCardBack(ctx, x, y, w, h, rot = 0) {
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(rot);
  roundRect(ctx, -w / 2, -h / 2, w, h, 12);
  ctx.fillStyle = '#3a1f5e';
  ctx.fill();
  ctx.strokeStyle = '#ffd94d';
  ctx.lineWidth = 3;
  ctx.stroke();
  roundRect(ctx, -w / 2 + 8, -h / 2 + 8, w - 16, h - 16, 8);
  ctx.strokeStyle = '#ffd94d66';
  ctx.lineWidth = 2;
  ctx.stroke();
  drawGlyph(ctx, 'flame', 0, -18, 52, '#ff5a3c');
  text(ctx, 'EMBER', 0, 34, 15, '#ffd94d', 'center', 'bold', 'Georgia, serif');
  text(ctx, 'PACT', 0, 54, 15, '#ffd94d', 'center', 'bold', 'Georgia, serif');
  ctx.restore();
}

// Fan layout for a hand: returns card rects with rotation.
export function handLayout(count, cx, y, w, h, spread = 46) {
  const rects = [];
  const total = (count - 1) * spread;
  for (let i = 0; i < count; i += 1) {
    const x = cx - total / 2 + i * spread - w / 2;
    const off = i - (count - 1) / 2;
    rects.push({ x, y: y + Math.abs(off) * 3, w, h, rot: off * 0.055 });
  }
  return rects;
}

function drawLifeBar(ctx, x, y, w, life, maxLife, shield, label, align = 'left') {
  text(ctx, label, x, y - 14, 15, '#f3e9c8', align, 'bold', 'system-ui, sans-serif');
  roundRect(ctx, x, y, w, 22, 11);
  ctx.fillStyle = '#1a0f2e';
  ctx.fill();
  const frac = Math.max(0, life / maxLife);
  if (frac > 0) {
    roundRect(ctx, x + 2, y + 2, (w - 4) * frac, 18, 9);
    const grad = ctx.createLinearGradient(x, y, x + w, y);
    grad.addColorStop(0, '#ff7a4d');
    grad.addColorStop(1, '#e5322a');
    ctx.fillStyle = grad;
    ctx.fill();
  }
  text(ctx, `${life} / ${maxLife}`, x + w / 2, y + 11, 14, '#fff', 'center', 'bold', 'system-ui, sans-serif');
  if (shield > 0) {
    text(ctx, `⛨ ${shield} shield`, x + w + 12, y + 11, 15, '#7fd4ff', 'left', 'bold', 'system-ui, sans-serif');
  }
}

function drawEnergyPips(ctx, x, y, energy, maxEnergy) {
  text(ctx, 'ENERGY', x, y, 12, '#cbb98a', 'left', 'bold', 'system-ui, sans-serif');
  for (let i = 0; i < maxEnergy; i += 1) {
    ctx.beginPath();
    ctx.arc(x + 74 + i * 22, y, 8, 0, Math.PI * 2);
    ctx.fillStyle = i < energy ? '#ffd94d' : '#3a2f5e';
    ctx.fill();
    ctx.strokeStyle = '#ffd94d88';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  text(ctx, `${energy}/${maxEnergy}`, x + 74 + maxEnergy * 22 + 6, y, 13, '#ffd94d', 'left', 'bold', 'system-ui, sans-serif');
}

function drawButton(ctx, x, y, w, h, label, enabled, accent = '#ff5a3c', fontSize = 18) {
  roundRect(ctx, x, y, w, h, 10);
  ctx.fillStyle = enabled ? accent : '#4a4266';
  ctx.fill();
  ctx.strokeStyle = enabled ? '#ffd94d' : '#6a6390';
  ctx.lineWidth = 2;
  ctx.stroke();
  text(ctx, label, x + w / 2, y + h / 2 + 1, fontSize, enabled ? '#fff' : '#b9b2d4', 'center', 'bold', 'system-ui, sans-serif');
}

function drawTable(ctx, now) {
  const grad = ctx.createRadialGradient(640, 330, 60, 640, 360, 820);
  grad.addColorStop(0, '#3d2b52');
  grad.addColorStop(0.55, '#241a38');
  grad.addColorStop(1, '#120b1e');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  // ember glow embers drifting up
  ctx.save();
  for (let i = 0; i < 14; i += 1) {
    const ex = (i * 173 + 60) % VIEW_W;
    const ey = VIEW_H - ((now / 40 + i * 97) % (VIEW_H + 40)) + 20;
    ctx.globalAlpha = 0.25 + 0.2 * Math.sin(now / 500 + i);
    ctx.fillStyle = i % 3 === 0 ? '#ff5a3c' : '#ffc93c';
    ctx.beginPath();
    ctx.arc(ex, ey, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  // table oval
  ctx.beginPath();
  ctx.ellipse(640, 360, 560, 250, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#2c6b4f22';
  ctx.fill();
  ctx.strokeStyle = '#ffd94d33';
  ctx.lineWidth = 2;
  ctx.stroke();
}

// ---- main render: returns the clickable hotspots for this frame ----
export function renderGame(ctx, game, now) {
  const hotspots = [];
  const off = shakeOffset(now);
  ctx.save();
  ctx.translate(off.x, off.y);
  drawTable(ctx, now);

  if (game.screen === 'title') {
    renderTitle(ctx, game, now, hotspots);
    ctx.restore();
    return hotspots;
  }
  if (game.screen === 'win' || game.screen === 'loss') {
    renderPlayTable(ctx, game, now, hotspots, true);
    renderEndScreen(ctx, game, now, hotspots);
    ctx.restore();
    return hotspots;
  }
  renderPlayTable(ctx, game, now, hotspots, false);
  ctx.restore();
  return hotspots;
}

function renderTitle(ctx, game, now, hotspots) {
  // title block
  text(ctx, 'EMBER PACT', 640, 128, 84, '#ffd94d', 'center', 'bold', 'Georgia, serif');
  text(ctx, '60-Card Duel  •  8 Spells  •  AI Rival  •  Best of the Table', 640, 186, 24, '#f3e9c8', 'center', 'bold', 'system-ui, sans-serif');
  text(ctx, 'A duel of pact-mages. Outwit Vex, the Ashen Rival — first to 0 life loses.', 640, 220, 17, '#cbb98a', 'center', 'normal', 'system-ui, sans-serif');
  // sample cards, one per suit, from the dealt hand — or the suit's first
  // definition when the opening hand holds none of that suit.
  const suitsShown = ['ember', 'tide', 'thorn', 'star'];
  suitsShown.forEach((suit, i) => {
    const fromHand = game.player.hand.find((c) => c.suit === suit);
    const def = CARD_DEFS.find((d) => d.suit === suit);
    const card = fromHand || { name: def.name, suit, cost: def.cost, damage: def.damage, heal: def.heal, shield: def.shield, draw: def.draw, text: def.text };
    const x = 640 - 4 * 70 + i * 148;
    drawCardFace(ctx, card, x, 258, 132, 188, {});
  });
  text(ctx, 'Ember burns • Tide draws • Thorn shields • Star heals', 640, 478, 16, '#cbb98a', 'center', 'normal', 'system-ui, sans-serif');
  drawButton(ctx, 520, 512, 240, 58, '▶  START THE DUEL', true, '#ff5a3c');
  hotspots.push({ x: 520, y: 512, w: 240, h: 58, action: 'start' });
  text(ctx, 'Click a card to cast it  •  1–5 play a card  •  Space ends your turn  •  R restarts', 640, 606, 15, '#9d8fc0', 'center', 'normal', 'system-ui, sans-serif');
  text(ctx, '30 life each  •  3 energy a turn, growing to 6  •  draw 2 cards a turn', 640, 632, 15, '#9d8fc0', 'center', 'normal', 'system-ui, sans-serif');
}

function renderPlayTable(ctx, game, now, hotspots, dimmed) {
  const { player, ai } = game;
  if (dimmed) ctx.globalAlpha = 0.35;

  // top bar
  ctx.fillStyle = '#120b1ecc';
  ctx.fillRect(0, 0, VIEW_W, 52);
  text(ctx, 'EMBER PACT', 24, 27, 22, '#ffd94d', 'left', 'bold', 'Georgia, serif');
  text(ctx, '60-Card Duel • 8 Spells • AI Rival', 190, 28, 14, '#cbb98a', 'left', 'normal', 'system-ui, sans-serif');
  text(ctx, `TURN ${game.turn}`, 640, 27, 18, '#fff', 'center', 'bold', 'system-ui, sans-serif');
  text(ctx, game.phase === 'player' ? 'YOUR MOVE' : game.phase === 'ai' ? 'VEX IS THINKING…' : '', 760, 27, 14, game.phase === 'player' ? '#7be07b' : '#ffb04d', 'left', 'bold', 'system-ui, sans-serif');
  drawButton(ctx, 1078, 10, 92, 32, game.muted ? 'MUTED' : 'SOUND', true, '#3a2f5e', 15);
  hotspots.push({ x: 1078, y: 10, w: 92, h: 32, action: 'mute' });
  drawButton(ctx, 1178, 10, 92, 32, 'RESTART', true, '#3a2f5e', 15);
  hotspots.push({ x: 1178, y: 10, w: 92, h: 32, action: 'restart' });

  // AI side (top)
  ctx.beginPath();
  ctx.arc(96, 128, 44, 0, Math.PI * 2);
  ctx.fillStyle = '#3a1f5e';
  ctx.fill();
  ctx.strokeStyle = '#ff5a3c';
  ctx.lineWidth = 3;
  ctx.stroke();
  drawGlyph(ctx, 'flame', 96, 124, 52, '#ff5a3c');
  text(ctx, 'VEX', 96, 190, 16, '#ffb04d', 'center', 'bold', 'system-ui, sans-serif');
  drawLifeBar(ctx, 168, 104, 300, ai.life, ai.maxLife, ai.shield, 'VEX, THE ASHEN RIVAL');
  drawEnergyPips(ctx, 168, 152, ai.energy, ai.maxEnergy);
  text(ctx, `deck ${ai.deck ? ai.deck.cards.length : 0} • discard ${ai.deck ? ai.deck.discard.length : 0}`, 480, 152, 13, '#9d8fc0', 'left', 'normal', 'system-ui, sans-serif');
  // AI hand: face-down backs, fanned
  const aiBacks = handLayout(ai.hand.length, 880, 78, 96, 136, 62);
  aiBacks.forEach((r) => drawCardBack(ctx, r.x, r.y, r.w, r.h, r.rot));

  // centre: log + last played card
  ctx.fillStyle = '#120b1e88';
  roundRect(ctx, 24, 252, 330, 150, 10);
  ctx.fill();
  text(ctx, 'DUEL LOG', 40, 272, 13, '#ffd94d', 'left', 'bold', 'system-ui, sans-serif');
  ctx.font = '600 13px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  game.log.slice(0, 5).forEach((line, i) => {
    ctx.fillStyle = i === 0 ? '#f3e9c8' : '#9d8fc0';
    ctx.fillText(line.length > 46 ? line.slice(0, 46) + '…' : line, 40, 296 + i * 19);
  });
  // last played card, centre stage (lifted so its power number clears the
  // "YOU CAST" caption beneath it)
  const last = game.played[0];
  if (last) {
    const age = now - last.born;
    const pop = Math.min(1, age / 220);
    const s = 0.92 + 0.08 * pop;
    const w = 132 * s;
    const h = 188 * s;
    drawCardFace(ctx, last.card, 640 - w / 2, 222 - (h - 188) / 2, w, h, { glow: true });
    text(ctx, last.side === 'player' ? 'YOU CAST' : 'VEX CAST', 640, 424, 13, '#cbb98a', 'center', 'bold', 'system-ui, sans-serif');
  } else {
    text(ctx, '✦', 640, 320, 44, '#ffd94d55', 'center', 'normal', 'Georgia, serif');
    text(ctx, 'No card cast yet — play one!', 640, 372, 14, '#9d8fc0', 'center', 'normal', 'system-ui, sans-serif');
  }
  // score strip: damage dealt
  text(ctx, `Damage dealt — You ${game.stats.playerDamage}  •  Vex ${game.stats.aiDamage}`, 640, 444, 14, '#cbb98a', 'center', 'bold', 'system-ui, sans-serif');

  // floating damage numbers, rising beside each fighter's life bar
  game.floats = game.floats.filter((f) => now - f.born < f.life);
  for (const f of game.floats) {
    const age = (now - f.born) / f.life;
    const fx = f.side === 'player' ? 330 : 520;
    const fy = f.side === 'player' ? 458 - age * 70 : 85 - age * 70;
    ctx.globalAlpha = dimmed ? 0.35 * (1 - age) : 1 - age;
    text(ctx, f.text, fx, fy, 30, f.color, 'center', 'bold', 'system-ui, sans-serif');
    ctx.globalAlpha = dimmed ? 0.35 : 1;
  }

  // player side (bottom): life bar, energy, hand — the hand ends at 718,
  // inside the 720 canvas, so no card is ever clipped at the bottom.
  drawLifeBar(ctx, 168, 478, 300, player.life, player.maxLife, player.shield, 'YOU — PACT-MAGE');
  drawEnergyPips(ctx, 168, 522, player.energy, player.maxEnergy);
  text(ctx, `deck ${player.deck ? player.deck.cards.length : 0} • discard ${player.deck ? player.deck.discard.length : 0}`, 480, 522, 13, '#9d8fc0', 'left', 'normal', 'system-ui, sans-serif');
  ctx.beginPath();
  ctx.arc(96, 524, 44, 0, Math.PI * 2);
  ctx.fillStyle = '#1d4d5e';
  ctx.fill();
  ctx.strokeStyle = '#3fa9ff';
  ctx.lineWidth = 3;
  ctx.stroke();
  drawGlyph(ctx, 'star', 96, 520, 52, '#ffd94d');
  text(ctx, 'YOU', 96, 586, 16, '#7fd4ff', 'center', 'bold', 'system-ui, sans-serif');

  // End Turn button
  const canEnd = game.phase === 'player' && game.screen === 'play';
  drawButton(ctx, 1080, 478, 176, 48, canEnd ? 'END TURN ⏎' : 'VEX PLAYS…', canEnd, '#2c7a4f');
  if (canEnd) hotspots.push({ x: 1080, y: 478, w: 176, h: 48, action: 'end-turn' });

  // player hand, fanned along the bottom — slightly smaller cards and a
  // flatter fan, so even the outer cards end inside the 720 canvas.
  const rects = handLayout(player.hand.length, 640, 528, 124, 176, player.hand.length > 5 ? 112 : 132);
  rects.forEach((r, i) => {
    const card = player.hand[i];
    const affordable = card.cost <= player.energy && game.phase === 'player';
    ctx.save();
    ctx.translate(r.x + 124 / 2, r.y + 176 / 2);
    ctx.rotate(r.rot);
    ctx.translate(-124 / 2, -176 / 2);
    drawCardFace(ctx, card, 0, 0, 124, 176, { glow: affordable && game.phase === 'player' });
    ctx.restore();
    if (!affordable && game.phase === 'player') {
      ctx.save();
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = '#120b1e';
      roundRect(ctx, r.x, r.y, 124, 176, 12);
      ctx.fill();
      ctx.restore();
    }
    hotspots.push({ x: r.x, y: r.y, w: 124, h: 176, action: 'card', uid: card.uid, index: i });
  });
  if (dimmed) ctx.globalAlpha = 1;
}

function renderEndScreen(ctx, game, now, hotspots) {
  const won = game.screen === 'win';
  ctx.fillStyle = won ? '#120b1eaa' : '#0b0614cc';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  if (won) {
    // confetti flourish
    for (let i = 0; i < 60; i += 1) {
      const cx = (i * 227 + 40) % VIEW_W;
      const fall = ((now / 9 + i * 53) % (VIEW_H + 60)) - 30;
      ctx.fillStyle = ['#ffd94d', '#ff5a3c', '#3fa9ff', '#5ec85a'][i % 4];
      ctx.fillRect(cx, fall, 7, 11);
    }
  }
  text(ctx, won ? 'VICTORY!' : 'DEFEAT', 640, 220, 88, won ? '#ffd94d' : '#ff6a5a', 'center', 'bold', 'Georgia, serif');
  text(ctx, won ? 'Vex falls. The Ember Pact is yours, duelist.' : 'Your ember gutters out. Vex takes the pact.', 640, 300, 22, '#f3e9c8', 'center', 'normal', 'Georgia, serif');
  text(ctx, `Turns played: ${game.stats.turns}   •   Damage you dealt: ${game.stats.playerDamage}   •   Damage Vex dealt: ${game.stats.aiDamage}`, 640, 348, 18, '#cbb98a', 'center', 'bold', 'system-ui, sans-serif');
  text(ctx, `Cards you played: ${game.player.cardsPlayed}   •   Cards Vex played: ${game.ai.cardsPlayed}`, 640, 380, 18, '#cbb98a', 'center', 'bold', 'system-ui, sans-serif');
  drawButton(ctx, 500, 420, 280, 58, '↻  DUEL AGAIN  (R)', true, won ? '#ff5a3c' : '#3a2f5e');
  hotspots.push({ x: 500, y: 420, w: 280, h: 58, action: 'restart' });
  text(ctx, 'Press R or click to play again', 640, 510, 15, '#9d8fc0', 'center', 'normal', 'system-ui, sans-serif');
}
