// Deck, hand and discard handling for EMBER PACT: draw, reshuffle and
// the opening deal. The deck is a plain array; the top card is the end.
import { shuffleInPlace } from './rng.js';

export function makeDeck(cardList, random) {
  return { cards: shuffleInPlace(cardList.slice(), random), discard: [] };
}

export function deckCount(deck) {
  return deck.cards.length;
}

export function drawCards(deck, hand, count, random) {
  const drawn = [];
  for (let i = 0; i < count; i += 1) {
    if (deck.cards.length === 0) {
      if (deck.discard.length === 0) break;
      deck.cards = shuffleInPlace(deck.discard, random);
      deck.discard = [];
    }
    const card = deck.cards.pop();
    hand.push(card);
    drawn.push(card);
  }
  return drawn;
}

export function discardCard(deck, card) {
  deck.discard.push(card);
}

export function removeFromHand(hand, uid) {
  const index = hand.findIndex((card) => card.uid === uid);
  if (index === -1) return null;
  return hand.splice(index, 1)[0];
}
