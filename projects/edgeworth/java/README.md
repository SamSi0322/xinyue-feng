# The Adventures of Edgeworth

A Mario-style platformer with Ace Attorney fan-art sprites, written in Java (Swing) by
Xinyue (Lily) Feng for CPS 2231 at Wenzhou-Kean University, April–May 2024, in Eclipse
with Java 1.8. Edgeworth runs and jumps through six scenes past Winston Payne, Wendy
Oldbag and Manfred von Karma, and meets Phoenix Wright in the last one.

The code was updated in 2026 so that it builds and runs on current Java versions. The
changes are small and listed in [CHANGES.md](CHANGES.md). The level design, art and game
logic are the original ones.

A playable web edition lives in [`../web/`](../web/).

## Controls

| Key   | Action        |
|-------|---------------|
| Space | start         |
| ← / → | move          |
| ↑     | jump          |

You have 3 lives. Stomping Winston and hitting Phoenix blocks from below give 10 points each.

## Build and run

You need Java 8 or newer (a JDK, to compile). The scripts use `$JAVA_HOME` if it is set,
otherwise `java`/`javac` from the `PATH`.

```sh
./build.sh jar && ./run.sh
```

- `./build.sh` compiles the game into `out/classes`.
- `./build.sh jar` also packages `The_Adventures_of_Edgeworth.jar`, which runs with `java -jar`.
- `./build.sh test` runs a headless smoke test (no window, no sound).
- Without the scripts: `java -cp out/classes:res The_Adventuresof_Edgeworth.MyFrame`
  (use `;` instead of `:` on Windows).
- Eclipse: *File → Import → Existing Projects into Workspace*, then run `MyFrame`.

## Structure

```
src/The_Adventuresof_Edgeworth/
  MyFrame.java      window, keyboard input, game loop, main()
  BackGround.java   the six scenes: blocks, enemies, NPC
  Edgeworth.java    the player
  Enemy.java        Winston, Oldbag and Karma
  Obstruction.java  blocks, and the flag of the last scene
  NPC.java          the NPC in scene 4
  StaticValue.java  loads the images
  Music.java        sound effects
  Music2.java       background music
res/                images and res/Music/ sounds (loaded from the classpath)
test/SmokeTest.java headless smoke test, not part of the game
original-src/       the 2024 source files, unchanged, for comparison
build.sh, run.sh    build and start scripts
```

## Credits

- Game, code and level design: Xinyue (Lily) Feng.
- Sprites: drawn by Xinyue Feng in Aseprite, based on Capcom's Ace Attorney characters.
- Title-screen art: from Ace Attorney (© Capcom).
- Music and sound effects: third-party audio chosen by the author; all rights belong to their owners.
- Forest background animation: pixel artist Anas Abdin (@anasabdin).

This is a non-commercial fan project.
