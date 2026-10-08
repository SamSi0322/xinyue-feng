package The_Adventuresof_Edgeworth;

import java.awt.image.BufferedImage;

public class Enemy implements Runnable{
	private int x;
	private int y;
	private int startx;
	private int starty;
	private int type;
	private BufferedImage showImage;
	private boolean isLeftOrUp = true;
	//moving range
	private int upMax = 0;
	private int downMax = 0;
	//Add thread
	private Thread t = null;
	
	private int imageType = 0;
	
	private BackGround bg ;
	
	
	//The Construction Method of Winston Monsters
	public Enemy(int x,int y,boolean isLeft,int type,BackGround bg){
		this.x = x;
		this.y = y;
		this.startx = x;
		this.starty = y;
		this.isLeftOrUp = isLeft;
		this.type = type;
		this.bg = bg;
		
		if(type==1){
			this.showImage = StaticValue.allWinstonImage.get(0);
		}
		//00000000000000000000000000
		if(type==3){
			this.showImage = StaticValue.allKarmaImage.get(0);
		}
		this.t = new Thread(this);
		t.start();
		t.suspend();
	}
	
	public Enemy(int x,int y,boolean isUp,int type,int upMax,int downMax,BackGround bg){
		this.x = x;
		this.y = y;
		this.startx = x;
		this.starty = y;
		this.isLeftOrUp = isUp;
		this.type = type;
		this.upMax = upMax;
		this.downMax = downMax;
		this.bg = bg;
		
		if(type==2){
			this.showImage = StaticValue.allOldbagImage.get(0);
		}

		this.t = new Thread(this);
		t.start();
		t.suspend();
	}
	
	
	
	
	public void run() {
		while(true){
			//Judge the type
			//00000000000000000000000
			if(type == 3){
				if(this.isLeftOrUp){
					this.x -= 5;
				}else{
					this.x += 5;
				}
				if(imageType==0){
					imageType = 1;
				}else{
					imageType = 0;
				}
				
				boolean canLeft = true;
				boolean canRight = true;
				
				for(int i=0;i<this.bg.getAllObstruction().size();i++){
					Obstruction ob = this.bg.getAllObstruction().get(i);
					if(ob.getX()==this.x+60 && (ob.getY()+50>this.y && ob.getY()-50<this.y)){
						canRight = false;
					}
					if(ob.getX()==this.x-60 && (ob.getY()+50>this.y && ob.getY()-50<this.y)){
						canLeft = false;
					}
				}
				
				if(!canLeft && this.isLeftOrUp || this.x == 0){
					this.isLeftOrUp = false;
				}else if(!canRight && !this.isLeftOrUp || this.x == 840){
					this.isLeftOrUp = true;
				}
				
				this.showImage = StaticValue.allKarmaImage.get(imageType);
			}
			
			if(type == 1){
				if(this.isLeftOrUp){
					this.x -= 5;
				}else{
					this.x += 5;
				}
				if(imageType==0){
					imageType = 1;
				}else{
					imageType = 0;
				}
				
				boolean canLeft = true;
				boolean canRight = true;
				
				for(int i=0;i<this.bg.getAllObstruction().size();i++){
					Obstruction ob = this.bg.getAllObstruction().get(i);
					if(ob.getX()==this.x+60 && (ob.getY()+50>this.y && ob.getY()-50<this.y)){
						canRight = false;
					}
					if(ob.getX()==this.x-60 && (ob.getY()+50>this.y && ob.getY()-50<this.y)){
						canLeft = false;
					}
				}
				
				if(!canLeft && this.isLeftOrUp || this.x == 0){
					this.isLeftOrUp = false;
				}else if(!canRight && !this.isLeftOrUp || this.x == 840){
					this.isLeftOrUp = true;
				}
				
				this.showImage = StaticValue.allWinstonImage.get(imageType);
			}

			if(type==2){
				if(this.isLeftOrUp){
					this.y -=5;
				}else{
					this.y +=5;
				}
				if(imageType==0){
					imageType = 1;
				}else{
					imageType = 0;
				}
				if(this.isLeftOrUp && this.y == this.upMax){
					this.isLeftOrUp = false;
				}
				if(!this.isLeftOrUp && this.y == this.downMax){
					this.isLeftOrUp = true;
				}
				this.showImage = StaticValue.allOldbagImage.get(imageType);
			}
			try {
				Thread.sleep(100);
			} catch (InterruptedException e) {
				// TODO Auto-generated catch block
				e.printStackTrace();
			}
		}
	}
	
	/*When Edgeworth dies, obstacles in the entire scene will be reset, and enemies 
	 * are no exception. When Edgeworth dies, not only must all eliminated enemies be 
	 * displayed, that is, restored from the eliminated list to the original enemy
	 *  list, but the enemy's state and coordinates must also be reset. And in the 
	 *  reset method, it is also necessary to determine the type of enemy, so that
	 *   the type of enemy corresponds to its displayed image.*/
	public void reset(){
		//Restore coordinates
		this.x = this.startx;
		this.y = this.starty;
		//Restore orinial corresponding image
		if(this.type == 1){
			this.showImage = StaticValue.allWinstonImage.get(0);
			//0000000000000000000000000
		}else if(this.type == 2 || this.type == 3){
			this.showImage = StaticValue.allOldbagImage.get(0);
		}
	}
	
	/*The method called for the elimination of Winston is to remove
	 *  this enemy from the corresponding scene's enemy set and place it in the 
	 *  list set of eliminated enemies*/
	public void dead(){
		//show death image
		this.showImage = StaticValue.allWinstonImage.get(2);
		//Delete from the original List collection and place in the eliminated List collection
		this.bg.getAllEnemy().remove(this);
		this.bg.getRemoveEnemy().add(this);
		
	}
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
	public int getType() {
		return type;
	}
	
	public void startMove(){
		t.resume();
	}
	
}
