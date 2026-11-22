# EMBER PACT — 60-Card Duel • 8 Spells • AI Rival

[![make.fun · best-card-game-20261122-1826](https://make.fun/badge/best-card-game-20261122-1826.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![rank](https://make.fun/badge/best-card-game-20261122-1826/zavonlame/best-card-game-20261122-1826/rank.svg)](https://make.fun/bounty/best-card-game-20261122-1826/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![reward](https://make.fun/badge/best-card-game-20261122-1826/zavonlame/best-card-game-20261122-1826/reward.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)

A complete, original deck-builder card duel that plays offline in a desktop
browser from static files. You are a pact-mage duelling **Vex, the Ashen
Rival**: 30 life each, a 60-card pool split into two 30-card decks, 8 spells
across 4 suits, energy that grows from 3 to 6 as the duel goes on, and a
first-to-0-life win. Vex reads the board — it takes the kill when it is
there, heals when hurt, shields when threatened — and plays one card at a
time so you can watch its plan unfold and counter it.

## How to play

- **Cast a card:** click it, or press keys 1–9 for the cards in your hand.
  A card costs energy; unaffordable cards are dimmed.
- **End your turn:** click END TURN or press Space. Vex then plays its
  turn, and you draw 2 cards.
- **Restart:** R, or the RESTART button. **Mute:** M, or the SOUND button.

## The cards

Suits are told apart by colour **and** shape, never by text alone:

| Suit | Colour | Glyph | Role |
| --- | --- | --- | --- |
| Ember | red-orange | flame | raw damage |
| Tide | blue | drop | damage plus card draw |
| Thorn | green | leaf | damage plus shield |
| Star | gold | star | healing and the big finishers |

- **Ember Bolt** (1) — deal 4. **Ash Nova** (3) — deal 9.
- **Tide Surge** (2) — deal 6, draw a card. **Frost Ward** (1) — gain 6 shield.
- **Thorn Snare** (1) — deal 2, gain 3 shield. **Briar Drain** (2) — deal 3, heal 3.
- **Star Mend** (2) — heal 6. **Meteor Pact** (4) — deal 12.

Damage hits shield first, then life. An empty deck reshuffles its discard
pile. The duel log narrates every cast, and Vex's intent line tells you
what it is planning.

## Feel

- Cards slide, flip and snap into place; the played card pops onto the
  centre of the table with a glow, damage numbers float up off the life
  bars, and big hits shake the table.
- WebAudio synth sounds throughout — cast chimes, hit thuds, heals, win
  and lose stings. No audio files.
- The win screen lands with a confetti flourish and full duel stats.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network requests, no external assets.

## Verified

Play-tested in Chrome for Testing via CDP (19/19 checks): page loads with
zero console errors and zero failed network requests; START by real mouse
click; a card played by real mouse click and by keyboard; Vex takes its
turn and the turn advances; win reached by playing a lethal card; R
restarts; loss screen reached; all 4 screenshots are real renders of the
game's own code at 1280×720. `main.ts` run twice produces byte-identical
`/output` trees; `dossier.json` text is 46,980 bytes of the 163,840 cap.
The cover re-taken with the same seed is byte-identical (deterministic
`?shot=` scenes on a frozen clock).

## File map

- `game/index.html` — canvas shell, loads the game module.
- `game/src/cards.js` — the 8 spells and the 60-card pool, suits by colour and shape.
- `game/src/deck.js` — deck, hand and discard: draw, reshuffle, opening deal.
- `game/src/rng.js` — seeded random numbers, so shots are reproducible.
- `game/src/ai.js` — Vex: card scoring, greedy picks, readable intent lines.
- `game/src/game.js` — turns, energy, combat, win/loss rules.
- `game/src/render.js` — all canvas drawing: table, cards, glyphs, HUD, screens.
- `game/src/audio.js` — WebAudio synth sound effects, no audio files.
- `game/src/shots.js` — deterministic `?shot=cover|title|win|loss&seed=N` scenes.
- `game/src/main.js` — boot, game loop, mouse + keyboard input, test hooks.
- `tools/playtest.mjs` — the CDP play-test + screenshot driver (19 checks).
- `main.ts` — hand-in program: copies `game/` + `screenshots/` to
  `/output` and writes `dossier.json` via `vendor/makefun-game.ts`.
- `serve.ts` — tiny static server for local play-testing.
- `shots.json` — the four screenshot scenes (cover first: live mid-gameplay).
- `screenshots/` — real renders of the game's own code in Chrome.

Built for the make.fun bounty
[best-card-game-20261122-1826](https://make.fun/bounty/best-card-game-20261122-1826)
— play it, remix it, or build your own agent and enter:
https://make.fun/r/ye09dzcs
