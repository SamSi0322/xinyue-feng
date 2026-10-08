import java.awt.GraphicsEnvironment;
import java.awt.image.BufferedImage;
import java.io.BufferedInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.PrintStream;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.ConcurrentModificationException;
import java.util.IdentityHashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import javax.sound.sampled.AudioInputStream;
import javax.sound.sampled.AudioSystem;

import The_Adventuresof_Edgeworth.BackGround;
import The_Adventuresof_Edgeworth.Edgeworth;
import The_Adventuresof_Edgeworth.Enemy;
import The_Adventuresof_Edgeworth.Music;
import The_Adventuresof_Edgeworth.Music2;
import The_Adventuresof_Edgeworth.Obstruction;
import The_Adventuresof_Edgeworth.StaticValue;

/*
 * Headless smoke test for the modernized game. It is not part of the game:
 * it opens no window and plays no sound.
 *
 *     ./build.sh test
 *
 * Prints PASS/FAIL for every check and exits with status 1 if any check failed.
 */
public class SmokeTest {

    // Counts read off the original BackGround constructor, per scene:
    // {obstructions, enemies, NPCs, Winston (type 1), Oldbag (type 2), Karma (type 3)}
    private static final int[][] EXPECTED = {
        {25,  3, 0, 1, 1, 1},   // scene 1
        {28,  4, 0, 2, 1, 1},   // scene 2
        {22,  4, 0, 0, 4, 0},   // scene 3
        {28,  0, 1, 0, 0, 0},   // scene 4
        {31, 11, 0, 2, 9, 0},   // scene 5
        {16, 10, 0, 9, 0, 1},   // scene 6
    };

    private static int passed = 0;
    private static int failed = 0;
    private static final List<String> threadErrors = Collections.synchronizedList(new ArrayList<String>());

    public static void main(String[] args) throws Exception {
        // Records any exception that kills a game thread (enemies, NPC, flag, Edgeworth).
        Thread.setDefaultUncaughtExceptionHandler(new Thread.UncaughtExceptionHandler() {
            public void uncaughtException(Thread t, Throwable e) {
                threadErrors.add(t.getName() + ": " + e);
                e.printStackTrace();
            }
        });
        System.out.println("Java " + System.getProperty("java.version")
                + " (" + System.getProperty("java.vendor") + "), headless=" + GraphicsEnvironment.isHeadless());

        try {
            checkImages();
            List<BackGround> scenes = checkScenes();
            checkEnemiesFrozenUntilStartMove(scenes);
            checkEnemyReset(scenes);
            checkBackGroundReset(scenes.get(1));
            checkEdgeworthThread(scenes.get(3));
            checkAudioResources();
            checkMissingAudioDoesNotThrow();
            check(threadErrors.isEmpty(), "no game thread died with an exception " + threadErrors);
        } catch (Throwable t) {
            // e.g. Thread.suspend() throwing UnsupportedOperationException on JDK 20+
            t.printStackTrace();
            check(false, "unexpected exception: " + t);
        } finally {
            System.out.println();
            System.out.println(passed + " passed, " + failed + " failed");
            // the game's threads loop forever, so end the JVM explicitly
            System.exit(failed == 0 ? 0 : 1);
        }
    }

    private static void check(boolean ok, String what) {
        System.out.println((ok ? "PASS  " : "FAIL  ") + what);
        if (ok) {
            passed++;
        } else {
            failed++;
        }
    }

    private static void checkImages() {
        StaticValue.init();
        checkImageList("allEdgeworthImage (1-10.png, over.png)", StaticValue.allEdgeworthImage, 11);
        checkImageList("allOldbagImage (Oldbag1-2.png)", StaticValue.allOldbagImage, 2);
        checkImageList("allWinstonImage (Winston1-3.png)", StaticValue.allWinstonImage, 3);
        checkImageList("allKarmaImage (Karma4-5.png)", StaticValue.allKarmaImage, 2);
        checkImageList("allNPCImage (npc1-2.png)", StaticValue.allNPCImage, 2);
        checkImageList("allObstructionImage (ob1-12.png)", StaticValue.allObstructionImage, 12);
        check(StaticValue.startImage != null && StaticValue.bgImage != null && StaticValue.endImage != null,
                "start.png, firststage0.png and firststageend.png loaded");
    }

    private static void checkImageList(String what, List<BufferedImage> images, int expected) {
        check(images.size() == expected && !images.contains(null),
                what + ": " + images.size() + " images, expected " + expected + ", no nulls");
    }

    private static List<BackGround> checkScenes() {
        List<BackGround> scenes = new ArrayList<BackGround>();
        for (int i = 1; i <= 6; i++) {
            BackGround bg = new BackGround(i, i == 6);   // the same calls MyFrame makes
            scenes.add(bg);
            int[] byType = new int[4];
            for (Enemy e : bg.getAllEnemy()) {
                byType[e.getType()]++;
            }
            int[] actual = {bg.getAllObstruction().size(), bg.getAllEnemy().size(), bg.getAllNPC().size(),
                    byType[1], byType[2], byType[3]};
            check(Arrays.equals(actual, EXPECTED[i - 1]),
                    "scene " + i + " [obstructions, enemies, NPCs, Winston, Oldbag, Karma] = "
                    + Arrays.toString(actual) + ", expected " + Arrays.toString(EXPECTED[i - 1]));
        }
        boolean images = true;
        for (int i = 0; i < 5; i++) {
            images &= !scenes.get(i).isFlag() && scenes.get(i).getBgImage() == StaticValue.bgImage;
        }
        images &= scenes.get(5).isFlag() && scenes.get(5).getBgImage() == StaticValue.endImage;
        check(images, "scenes 1-5 use firststage0.png; scene 6 is the last scene and uses firststageend.png");
        return scenes;
    }

    // Thread.suspend()/resume() were replaced by a flag: enemies must not move until their scene starts.
    private static void checkEnemiesFrozenUntilStartMove(List<BackGround> scenes) throws InterruptedException {
        Map<Enemy, String> before = positions(scenes);
        Thread.sleep(400);   // four enemy steps
        check(before.equals(positions(scenes)), "all " + before.size() + " enemies stay frozen before enemyStartMove()");

        scenes.get(0).enemyStartMove();   // what pressing Space does
        Thread.sleep(400);
        Map<Enemy, String> after = positions(scenes);
        boolean scene1Moved = true;
        boolean othersFrozen = true;
        for (Enemy e : before.keySet()) {
            boolean moved = !before.get(e).equals(after.get(e));
            if (scenes.get(0).getAllEnemy().contains(e)) {
                scene1Moved &= moved;
            } else {
                othersFrozen &= !moved;
            }
        }
        check(scene1Moved, "after scene 1's enemyStartMove() all 3 scene-1 enemies move");
        check(othersFrozen, "the enemies of scenes 2-6 stay frozen");
    }

    private static Map<Enemy, String> positions(List<BackGround> scenes) {
        Map<Enemy, String> m = new LinkedHashMap<Enemy, String>();   // Enemy has identity equals()
        for (BackGround bg : scenes) {
            for (Enemy e : bg.getAllEnemy()) {
                m.put(e, e.getX() + "," + e.getY());
            }
        }
        return m;
    }

    private static void checkEnemyReset(List<BackGround> scenes) throws InterruptedException {
        // frozen enemies, so no enemy thread changes the image in between
        Enemy winston = firstOfType(scenes.get(1), 1);
        Enemy oldbag = firstOfType(scenes.get(2), 2);
        Enemy karma = firstOfType(scenes.get(5), 3);
        winston.reset();
        oldbag.reset();
        karma.reset();
        check(winston.getShowImage() == StaticValue.allWinstonImage.get(0)
                && oldbag.getShowImage() == StaticValue.allOldbagImage.get(0)
                && karma.getShowImage() == StaticValue.allKarmaImage.get(0),
                "Enemy.reset() restores each type's own first image (Karma no longer gets the Oldbag image)");

        // Scene 1's Oldbag bobs between y=480 and y=420, starting upward. Reset the scene while it
        // is moving down: it must start upward again instead of sinking below y=480 forever.
        BackGround scene1 = scenes.get(0);
        Enemy bob = firstOfType(scene1, 2);
        boolean movingDown = false;
        int prev = bob.getY();
        long deadline = System.currentTimeMillis() + 5000;
        while (!movingDown && System.currentTimeMillis() < deadline) {
            Thread.sleep(20);
            int y = bob.getY();
            movingDown = y > prev;
            prev = y;
        }
        scene1.reset();   // what Edgeworth.dead() calls
        Thread.sleep(350);
        int y = bob.getY();
        check(movingDown && y >= 420 && y < 480,
                "an Oldbag reset while moving down starts upward again (y=" + y + " 0.35 s after reset; expected 420..475)");
    }

    // BackGround.reset() must not re-add enemies/blocks that were already restored, and the scene
    // lists must be safe to iterate while they change (MyFrame.paint() vs. the Edgeworth thread).
    private static void checkBackGroundReset(BackGround bg) {   // scene 2: its enemies are frozen
        int enemies = bg.getAllEnemy().size();
        int obstructions = bg.getAllObstruction().size();
        boolean cme = false;
        try {
            for (int round = 1; round <= 2; round++) {
                firstOfType(bg, 1).dead();   // a stomped Winston, as in Edgeworth.run()
                for (Obstruction ob : bg.getAllObstruction()) {
                    if (ob.getType() == 0) {   // a broken brick, as in Edgeworth.run()
                        bg.getAllObstruction().remove(ob);
                        bg.getRemoveObstruction().add(ob);
                    }
                }
                bg.reset();   // Edgeworth died
            }
        } catch (ConcurrentModificationException e) {
            cme = true;
        }
        check(!cme, "removing from a scene list while iterating it throws no ConcurrentModificationException");
        check(bg.getAllEnemy().size() == enemies && bg.getAllObstruction().size() == obstructions
                && distinct(bg.getAllEnemy()) && distinct(bg.getAllObstruction())
                && bg.getRemoveEnemy().isEmpty() && bg.getRemoveObstruction().isEmpty(),
                "two kill/break + reset rounds leave no duplicates (" + bg.getAllEnemy().size() + " enemies, expected "
                + enemies + "; " + bg.getAllObstruction().size() + " obstructions, expected " + obstructions + ")");
    }

    // Scene 4 has no enemies and solid ground under x = 0..359, so Edgeworth cannot die here
    // (dying would play a sound).
    private static void checkEdgeworthThread(BackGround scene4) throws InterruptedException {
        Edgeworth player = new Edgeworth(0, 480);   // same order of calls as MyFrame
        player.setBg(scene4);
        Thread.sleep(300);
        boolean standing = player.getX() == 0 && player.getY() == 480;
        player.rightMove();
        Thread.sleep(300);
        player.rightStop();
        int x = player.getX();
        check(standing && x > 0 && x < 360 && player.getY() == 480 && player.getLife() == 3,
                "the Edgeworth thread runs headless: stands at (0,480), then walks right (x=" + x + ")");
    }

    private static void checkAudioResources() {
        for (String name : new String[] {"BackMusic.wav", "cbt.wav", "yanei.wav", "yuyu.wav"}) {
            String path = "/Music/" + name;
            InputStream in = SmokeTest.class.getResourceAsStream(path);
            if (in == null) {
                check(false, path + " is on the classpath");
                continue;
            }
            try {
                AudioInputStream ais = AudioSystem.getAudioInputStream(new BufferedInputStream(in));
                double seconds = ais.getFrameLength() / ais.getFormat().getFrameRate();
                check(ais.getFrameLength() > 0, path + " opens as an AudioInputStream ("
                        + ais.getFormat() + ", " + String.format("%.1f s", seconds) + ")");
                ais.close();
            } catch (Exception e) {
                check(false, path + " opens as an AudioInputStream: " + e);
            }
        }
    }

    private static void checkMissingAudioDoesNotThrow() {
        PrintStream realErr = System.err;
        ByteArrayOutputStream log = new ByteArrayOutputStream();
        Throwable thrown = null;
        System.setErr(new PrintStream(log, true));
        try {
            Music sfx = new Music("no-such-sound.wav");
            sfx.playMusic();
            sfx.loopMusic();
            sfx.stopMusic();
            new Music2().playBGM("Music/no-such-music.wav");
        } catch (Throwable t) {
            thrown = t;
        } finally {
            System.setErr(realErr);
        }
        check(thrown == null && log.toString().contains("no-such-sound.wav"),
                "a missing sound file is reported on stderr and nothing is thrown"
                + (thrown == null ? "" : " (threw " + thrown + ")"));
    }

    private static Enemy firstOfType(BackGround bg, int type) {
        for (Enemy e : bg.getAllEnemy()) {
            if (e.getType() == type) {
                return e;
            }
        }
        throw new IllegalStateException("no enemy of type " + type);
    }

    private static boolean distinct(List<?> list) {
        Set<Object> seen = Collections.newSetFromMap(new IdentityHashMap<Object, Boolean>());
        seen.addAll(list);
        return seen.size() == list.size();
    }
}
