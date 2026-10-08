# Changes from the 2024 version

The original source files are kept unchanged in `original-src/`. Every change to them is
listed below. To see the diff:

```sh
diff -ru --strip-trailing-cr original-src/The_Adventuresof_Edgeworth src/The_Adventuresof_Edgeworth
```

No gameplay values (speeds, jump height, positions, timings), level layouts or art were
changed. The `.java` files keep their original CRLF line endings, formatting and comments.

## Source files

### Enemy.java

- Removed `t.suspend()` from both constructors. Added a field
  `private volatile boolean isMoving = false`. `run()` now starts each loop with
  `while(!this.isMoving){ Thread.sleep(50); }`, and `startMove()` sets `isMoving = true`
  instead of calling `t.resume()`.
  Reason: `Thread.suspend()`/`resume()` throw `UnsupportedOperationException` since JDK 20.
  Enemies still stay frozen until `enemyStartMove()` is called. They now start within 50 ms
  of that call, and they can no longer take a step between `t.start()` and `t.suspend()`.
- `reset()`: a type 3 enemy (Karma) now gets `allKarmaImage.get(0)`. Before, the code was
  `type == 2 || type == 3`, which gave it `allOldbagImage.get(0)`.
  Reason: Karma was drawn with the Oldbag sprite after Edgeworth respawned.
- `reset()`: restores the starting direction (`isLeftOrUp`) from a new field
  `startLeftOrUp`, which both constructors set.
  Reason: an Oldbag that was moving down when Edgeworth died restarted at `downMax` still
  moving down. Its `y == downMax` check never matched again, so it sank through the floor
  (scene 1).

### BackGround.java

- `allEnemy`, `allObstruction`, `removeEnemy`, `removeObstruction` and `allNPC` are now
  `CopyOnWriteArrayList` instead of `ArrayList`. The declared types are still `List<...>`.
  The import changed from `java.util.ArrayList` to `java.util.concurrent.CopyOnWriteArrayList`.
  Reason: the Edgeworth thread adds and removes items while `MyFrame.paint()` iterates the
  same lists, which can throw `ConcurrentModificationException`.
- `reset()`: after adding the removed enemies and blocks back, it now empties
  `removeEnemy` and `removeObstruction`.
  Reason: otherwise, from the second death on, enemies and blocks that were already restored
  were added again. The duplicates made a stomped Winston "survive" a stomp, and broken
  blocks needed extra hits.

### Edgeworth.java

- `dead()` returns at once if `isDead` is already true.
  Reason: until the game exits, more collisions after the last life was lost kept
  decreasing `life` below 0 and replaying the death sound.

### Music.java (re-implemented)

- Rewritten with `javax.sound.sampled.Clip` instead of `java.applet.Applet`/`AudioClip`.
  The public API is the same: `Music(String name)`, `playMusic()`, `stopMusic()`,
  `loopMusic()`.
  Reason: the Applet API is deprecated for removal and removed from recent JDKs.
- The constructor no longer starts the sound. It only stores the file name.
  Reason: the old constructor called `clip.loop()`. `AudioClip` ignores a `play()` that comes
  less than 30 ms after `loop()`, so the `playMusic()` that followed did nothing, and every
  sound effect looped until the game was closed.
- `playMusic()` plays the sound once from the start, and `loopMusic()` repeats it until
  `stopMusic()`. Each call opens a new `Clip`. A clip still playing from the same `Music`
  object is stopped first, so the sound restarts, as `AudioClip.play()` did.
- Each clip closes itself when it stops (a `LineListener` on `LineEvent.Type.STOP`).
  Reason: the old clips were never closed, so repeated sound effects kept audio lines open.
- Sounds are read from the classpath (`/Music/<name>`, wrapped in a `BufferedInputStream`)
  instead of `new File("Music/" + name)`.
  Reason: `new File` only worked when the game was started from the project folder.
  `AudioSystem.getAudioInputStream` needs mark/reset, which a stream from a JAR does not
  support.
- Any exception while loading or playing a sound is caught and printed, and the game
  continues without that sound (missing file, no audio device, unsupported format).
- The `ok`/`no` console messages were dropped.

### Music2.java

- The resource stream is wrapped in a `BufferedInputStream`.
  Reason: from a JAR, `getAudioInputStream` failed with
  `IOException: mark/reset not supported`.
- A missing resource now throws `FileNotFoundException`, which the existing
  `catch(IOException e)` handles.
  Reason: before, the `null` stream caused a `NullPointerException` that escaped `playBGM()`
  and stopped the game at startup.
- Added `catch(RuntimeException e)`.
  Reason: with no audio device, `AudioSystem.getClip()` throws `IllegalArgumentException`,
  which also stopped the game at startup.

### StaticValue.java

- `ImagePath` is now `"/"` (it was `System.getProperty("user.dir")+"/bin/"`). The images are
  read with `ImageIO.read(getImageURL(...))` instead of `ImageIO.read(new File(...))`.
  `getImageURL` is a new private method that uses `StaticValue.class.getResource` and throws
  `FileNotFoundException` for a missing image, which the existing `catch (IOException e)`
  blocks print, as before.
  Reason: images were only found when the game was started from the Eclipse project folder.
- Imports: `java.io.File` was replaced by `java.io.FileNotFoundException`, and
  `java.net.URL` was added.

### MyFrame.java

- End message: `In the night, Edeworth come across Phoenix.` →
  `In the night, Edgeworth came across Phoenix.` (typo).

### NPC.java

- `startMove()`: removed `t.resume()` and left a comment in its place.
  Reason: `Thread.resume()` throws on JDK 20+. The NPC thread is never suspended, so the call
  never did anything (and `startMove()` is never called).

### Obstruction.java

- Unchanged.

## Project files

- Images: the two identical copies in `src/` and `bin/` (checked with md5) were replaced by
  one copy in `res/`. Sounds: the three identical copies in `Music/`, `src/Music/` and
  `bin/Music/` were replaced by one copy in `res/Music/`. Only the files the game loads are
  included (35 images, 4 WAV files), with their original names.
  Reason: everything is now loaded from the classpath, and `res/` is its root.
  Not copied, because the code never loads them: `Karma1.png`, `Karma2.png`, `Karma3.png`,
  `Sprite-0020.png`, `firststage.png`, `firststage.gif`.
- `bin/` (Eclipse's build output) is not included.
- `.classpath`: added `res` as a second source folder, so Eclipse puts the images and sounds
  on the classpath. The JavaSE-1.8 container and the `bin` output folder are unchanged.
- `.settings/org.eclipse.core.resources.prefs` (new): sets the project encoding to UTF-8,
  because some comments contain non-ASCII characters. `build.sh` uses `-encoding UTF-8` too.
- `.project` and `.settings/org.eclipse.jdt.core.prefs`: unchanged.
- New files: `build.sh`, `run.sh`, `.gitignore`, `test/SmokeTest.java`, `README.md`,
  `CHANGES.md`, `original-src/`.

## Remaining compiler warnings

With `javac -Xlint:all` (both `--release 8` and `--release 21`), these warnings remain and
were left on purpose:

- `[this-escape]` (8, the same as in the original code): constructors start threads with
  `this` before the object is complete.
  This warning is about subclasses, and the game has none.
- `[serial]` (5) in `MyFrame`: `JFrame` is `Serializable`, but the frame is never serialized.
- With `--release 8` only, `[options]` notes that release 8 is obsolete. `build.sh` hides
  them with `-Xlint:-options`.

## Verification

`./build.sh test` compiles `test/SmokeTest.java` and runs it with
`-Djava.awt.headless=true`. It checks that:

- every image list is complete;
- all six scenes have their original number of blocks, enemies (per type) and NPCs;
- enemies stay frozen until `enemyStartMove()` is called;
- the `reset()` fixes above work;
- the scene lists can be changed while they are being iterated;
- the player thread runs;
- each sound file opens as an `AudioInputStream`;
- a missing sound file does not throw.

It passes on JDK 21, both with `out/classes` + `res/` and with only the JAR on the classpath.
