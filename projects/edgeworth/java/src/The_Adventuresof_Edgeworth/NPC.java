package The_Adventuresof_Edgeworth;

import java.awt.image.BufferedImage;

public class NPC implements Runnable {
    private int x;
    private int y;
    private BufferedImage showImage;
    private Thread t = null;
    private int imageType = 0;
    private BackGround bg;

    public NPC(int x, int y, BackGround bg) {
        this.x = x;
        this.y = y;
        this.bg = bg;
        this.showImage = StaticValue.allNPCImage.get(0);
        this.t = new Thread(this);
        t.start();
    }

    public void run() {
        while (true) {
            // Update NPC position or perform other actions here
            // Example: Moving NPC based on game logic
            // Example code:
            // Move NPC left or right
            // this.x += 1;
            // Check for collision with obstacles or other game elements
            // Perform any necessary actions based on game logic

            // Update NPC image type
            // Example: Alternating between two images for animation
            imageType = (imageType + 1) % 2;
            this.showImage = StaticValue.allNPCImage.get(imageType);

            // Adjust the delay based on the game's frame rate
            try {
                Thread.sleep(100); // Adjust the delay as needed
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
        }
    }

    // Getters and Setters
    public int getX() {
        return x;
    }

    public int getY() {
        return y;
    }

    public BufferedImage getShowImage() {
        return showImage;
    }

    public void setBg(BackGround bg) {
        this.bg = bg;
    }

    public void startMove() {
        // The NPC thread is never suspended (the NPC animates from the start),
        // so the old t.resume() call here never had any effect. It was removed
        // because Thread.suspend()/resume() no longer work on JDK 20+.
    }
}