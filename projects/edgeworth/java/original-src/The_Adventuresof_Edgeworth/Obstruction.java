package The_Adventuresof_Edgeworth;

import java.awt.image.BufferedImage;

public class Obstruction implements Runnable{
	private int x;
	private int y;
	
	//Control Flag
	private Thread t = new Thread(this);
	
	//type will change
	private int type;
	//the original type
	private int starttype;
	//type image
	private BufferedImage showImage = null;
	
	//background
	private BackGround bg;
	
	public Obstruction(int x,int y,int type,BackGround bg){
		this.x = x;
		this.y = y;
		this.type = type;
		this.starttype = type;
		this.bg = bg;
		setImage();
		if(this.type == 11){
			t.start();
		}
	}
	/*When Edgeworth dies, call the reset method to reset the obstacles that have
	 *  already been eliminated.*/
	public void reset(){
		this.type = starttype;
		this.setImage();
	}
	
	//Change images based on status
	public void setImage(){
		showImage = StaticValue.allObstructionImage.get(type);
	}
	
	public BufferedImage getShowImage() {
		return showImage;
	}
	public int getX() {
		return x;
	}
	public int getY() {
		return y;
	}
	public int getType() {
		return type;
	}
	public void setType(int type) {
		this.type = type;
	}
	
	/*Control the movement of the flag in the last scene, and set a marker after
	 * the flag is moved, and represent the marker to the Edgeworth class so that 
	 * Edgeworth can start moving autonomously.*/
	public void run() {
		while(true){
			if(this.bg.isOver()){
				if(this.y < 420){
					this.y += 5;
				}else{
					this.bg.setDown(true);
				}
			}
			try {
				Thread.sleep(50);
			} catch (InterruptedException e) {
				e.printStackTrace();
			}
		}
	}
	
}
