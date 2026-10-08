package The_Adventuresof_Edgeworth;

import java.awt.Graphics;
import java.awt.Toolkit;
import java.awt.event.KeyEvent;
/*an interface to listen for keyboard events,
 *including key presses, releases, and typing*/
import java.awt.event.KeyListener;
                                  
import java.awt.image.BufferedImage;
import java.io.FileNotFoundException;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;

import javax.sound.sampled.AudioSystem;
import javax.swing.JFrame;//creates a window
import javax.swing.JOptionPane;
//Runnable: for implementing multithreading
public class MyFrame extends JFrame implements KeyListener,Runnable{
	
	private List<BackGround> allBG = new ArrayList<BackGround>();
	
	private Edgeworth Edgeworth = null;
	
	private BackGround nowBG = null;
	
	private Thread t = null;
	
	private boolean isStart = false;
	
	public static void main(String[] args){
		new MyFrame();
	}
	
	public MyFrame(){
		//music
//		Music music1 = new Music("BackMusic.wav");
//		music1.loopMusic();
		Music2 music2 = new Music2();
		music2.playBGM("Music/BackMusic.wav");
		//Title
		this.setTitle("The Adventures of Edgeworth");
		//creates a window which size is 900 * 600
		this.setSize(900, 600);
		/*Obtain the overall size of the computer screen 
		 *to determine the position of the form*/
		int width = Toolkit.getDefaultToolkit().getScreenSize().width;
		int height = Toolkit.getDefaultToolkit().getScreenSize().height;
		this.setLocation((width-900)/2, (height-600)/2);
		//the size of the window can't be changed
		this.setResizable(false);
		
		//Initialize image
		StaticValue.init();
		

		
		//Create all scenes using loops
		for(int i=1;i<=6;i++){
			this.allBG.add(new BackGround(i, i==6?true:false));
		}
		
		//Set the first scene as the current scene
		this.nowBG = this.allBG.get(0);
		//Initialize Edgeworth coordinates
		this.Edgeworth = new Edgeworth(0, 480);
		//Put Edgeworth in the scene
		this.Edgeworth.setBg(nowBG);
		this.repaint();
		//Add keyboard listeners to window objects
		this.addKeyListener(this);
		this.t = new Thread(this);
		t.start();
		
		//Click the close button on the window to end the program
		this.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
		//set the visibility of the window
		this.setVisible(true);
	}

	public void paint(Graphics g) {
		
		/*Define an image first, and then use dual caching 
		 * to solve the flashing problem*/
		BufferedImage image = new BufferedImage(900, 600, BufferedImage.TYPE_3BYTE_BGR);
		//Use the brush g2 obtained from the above image to draw the image
		Graphics g2 = image.getGraphics();
		
		if(this.isStart){
			
			//draw the background
			g2.drawImage(this.nowBG.getBgImage(), 0, 0, this);
			
			//draw the life
			g2.drawString("life: "+this.Edgeworth.getLife(), 720, 50);
			
			//draw the score
			g2.drawString("score: "+this.Edgeworth.getScore(), 800, 50);
			
			//draw the enemy
			Iterator<Enemy> iterEnemy = this.nowBG.getAllEnemy().iterator();
			while(iterEnemy.hasNext()){
				Enemy e = iterEnemy.next();
				g2.drawImage(e.getShowImage(), e.getX(), e.getY(), this);
			}
			//draw the NPC
			Iterator<NPC> iterNPC = this.nowBG.getAllNPC().iterator();
			while(iterNPC.hasNext()){
				NPC e = iterNPC.next();
				g2.drawImage(e.getShowImage(), e.getX(), e.getY(), this);
			}
			//draw the Obstruction
			Iterator<Obstruction> iter = this.nowBG.getAllObstruction().iterator();
			while(iter.hasNext()){
				Obstruction ob = iter.next();
				g2.drawImage(ob.getShowImage(), ob.getX(), ob.getY(), this);
			}
			
			g2.drawImage(this.Edgeworth.getShowImage(), this.Edgeworth.getX(), this.Edgeworth.getY(), this);
			
		}else{
			g2.drawImage(StaticValue.startImage, 0, 0, this);
		}
		
		
		//Draw cached images into it
		g.drawImage(image, 0, 0, this);
		
	}

	public void keyTyped(KeyEvent e) {
		
	}
	
	public void keyPressed(KeyEvent e) {
		if(this.isStart){
			//Keyboard controlled movement
			/*In the keyPressed method, the numbers 39, 37, and 38 
			 * represent the key codes of the right arrow, left arrow,
			 *  and up arrow keys, respectively. 
			 *  These key codes are standard integer values defined in 
			 *  the KeyEvent class from the Java AWT 
			 *  (Abstract Window Toolkit) library.*/
			
			if(e.getKeyCode()==39){
				this.Edgeworth.rightMove();
			}
			if(e.getKeyCode()==37){
				this.Edgeworth.leftMove();
			}
			//jump
			if(e.getKeyCode()==38){
				this.Edgeworth.jump();
			}
		}else if(e.getKeyCode()==32){
			this.isStart = true;
			this.nowBG.enemyStartMove();
			this.Edgeworth.setScore(0);
			this.Edgeworth.setLife(3);
		}
	}

	public void keyReleased(KeyEvent e) {
		if(this.isStart){
			//stopֹ
			if(e.getKeyCode()==39){
				this.Edgeworth.rightStop();;
			}
			if(e.getKeyCode()==37){
				this.Edgeworth.leftStop();;
			}
		}
	}

	public void run() {
		while(true){
			this.repaint();
			try {
				Thread.sleep(50);
				if(this.Edgeworth.getX() >= 840){
					this.nowBG = this.allBG.get(this.nowBG.getSort());
					this.Edgeworth.setBg(nowBG);
					this.nowBG.enemyStartMove();
					this.Edgeworth.setX(0);
				}
				if(this.Edgeworth.isDead()){
					Thread.sleep(50);
					JOptionPane.showMessageDialog(this, "Edgeworth's dead");
					System.exit(0);
				}
				if(this.Edgeworth.isClear()){
					JOptionPane.showMessageDialog(this, "In the night, Edgeworth came across Phoenix.");
					System.exit(0);
				}
			} catch (InterruptedException e) {
				e.printStackTrace();
			}
		}
	}
	
}
