# The Adventures of Edgeworth

An *Ace Attorney* fan platformer by **Xinyue (Lily) Feng**, written in Java Swing for CPS 2231 at Wenzhou-Kean University (April 26 – May 12, 2024). Guide Miles Edgeworth through six scenes: stomp Winston Payne, jump over Manfred von Karma, dodge Wendy Oldbag, hit Phoenix blocks for points, and find the invisible block Detective Gumshoe is hinting at.

**Play it in the browser:** https://samsi0322.github.io/xinyue-feng/play/edgeworth/

| Folder | What it is |
| --- | --- |
| [`java/`](java/) | The original Java/Swing game, updated to compile and run on current Java (8–21+). See [`java/CHANGES.md`](java/CHANGES.md) for every change and [`java/original-src/`](java/original-src/) for the untouched 2024 classes. |
| [`web/`](web/) | The web edition: the same game logic ported to JavaScript and the HTML canvas. No build step. |
| [`docs/`](docs/) | Process images from the 2024 project report: the level layouts planned in Excel and screenshots of the original build. |

## Web edition

```bash
cd web
npm start        # serves the folder (any static server works; ES modules need http://)
npm test         # engine tests, Node 18+
```

- `levels.js`: the six scenes, transcribed one-to-one from `BackGround.java`.
- `engine.js`: the rules (Edgeworth, Enemy, Obstruction, NPC, BackGround, and the MyFrame loop). No DOM.
- `game.js`: drawing, input, sound, screens.
- `tests/engine.test.js`: scene contents, movement, stomping, blocks, deaths and resets, the ending, and a breadth-first search over all inputs (enemies left out) that proves every scene can still be completed.

Useful URL parameters: `?scene=4` starts at a given scene, `?embed=1` hides the page around the game, `?debug` exposes `window.__game`.

### What the web edition changes

The logic runs at the original 20 ticks per second (enemies at 10), with the original speeds, jump timing and collision checks. On top of that:

- Movement is drawn smoothly between ticks.
- The forest background is animated. The 2024 Java version kept a still image because `ImageIO.read()` returns only a GIF's first frame.
- Sound effects play once each. In the Java version every effect kept looping until the game closed (fixed there too).
- Game over and the ending are screens with the score, not a dialog followed by `System.exit`. After a game over you can retry the same scene (R) or start over.
- The input supports arrows or WASD, touch buttons on phones, pause (P/Esc) and mute (M).
- The death sprite (`over.png`) and the stomped-Winston sprite (`Winston3.png`) are now shown. Both were drawn for the original but never displayed.
- After a death Edgeworth respawns standing still; the Java version let a jump that was in progress carry on after the respawn.
- The death sound plays once when landing on an Oldbag (the Java version played it twice).

Bugs found while porting, fixed in both editions:

1. `BackGround.reset()` restored defeated enemies and broken blocks but never cleared the "removed" lists, so each later death added duplicates.
2. `Enemy.reset()` kept the enemy's last direction, so an Oldbag moving down when Edgeworth died sank through the floor for good.
3. `Enemy.reset()` briefly gave Manfred von Karma Oldbag's sprite (until his next animation step).

## Credits

- Game design, level design, sprites and original code: Xinyue (Lily) Feng
- Characters: Capcom's *Ace Attorney* series (non-commercial fan work)
- Title-screen art: *Ace Attorney* © Capcom
- Forest animation: pixel art by Anas Abdin (@anasabdin)
- Music and sound effects: third-party audio chosen by the author; all rights belong to their owners
- 2026 web port and Java update: made with AI coding tools
