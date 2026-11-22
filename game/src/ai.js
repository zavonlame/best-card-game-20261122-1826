// Vex, the Ashen Rival: the AI opponent for EMBER PACT.
// Vex reads the board like a player would — finish the kill when it is
// there, heal when hurt, shield when the player's hand threatens — and
// plays one card at a time so the player can watch its plan unfold.
import { suitOf } from './cards.js';

// Score one card in the current board state; the AI plays its best card.
export function scoreCardForAi(card, me, foe) {
  let score = 0;
  if (card.damage > 0) {
    score += card.damage * 2;
    if (card.damage >= foe.life) score += 100; // lethal: take it
    if (foe.shield > 0) score += Math.min(card.damage, foe.shield) * 0.5;
  }
  if (card.heal > 0) {
    const missing = me.maxLife - me.life;
    score += Math.min(card.heal, missing) * 1.6;
    if (me.life <= 10) score += 6; // hurt: healing matters more
  }
  if (card.shield > 0) {
    score += card.shield * 1.2;
    if (foe.life >= 20) score += 2;
  }
  if (card.draw > 0) score += 3;
  if (card.cost >= 4) score += 1; // big finishers feel good to fire
  score -= card.cost * 0.4;
  return score;
}

// Pick Vex's next card, or null when it should stop. Greedy on score,
// but it will not waste a heal at full life or a shield it does not need.
export function chooseAiCard(hand, energy, me, foe) {
  let best = null;
  let bestScore = 0;
  for (const card of hand) {
    if (card.cost > energy) continue;
    if (card.heal > 0 && me.life >= me.maxLife) continue;
    if (card.shield > 0 && me.shield >= 10 && card.damage === 0) continue;
    const score = scoreCardForAi(card, me, foe);
    if (score > bestScore) {
      bestScore = score;
      best = card;
    }
  }
  return best;
}

// A one-line read of Vex's intent, shown in the log so its choices can be
// countered: "Vex is saving up for a Meteor Pact" is a tell, not noise.
export function aiIntentLine(me, foe) {
  if (foe.life <= 6) return 'Vex smells blood — it is going for the kill.';
  if (me.life <= 10) return 'Vex steadies itself and reaches for a mend.';
  return 'Vex studies your hand, weighing its next pact.';
}

export function describeSuit(card) {
  return suitOf(card).name;
}
