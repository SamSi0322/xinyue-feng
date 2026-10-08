package The_Adventuresof_Edgeworth;

import java.awt.image.BufferedImage;
import java.io.Externalizable;

import javax.swing.JOptionPane;

public class Edgeworth implements Runnable{
	//coordinate
	private int x;
	private int y;
	//Define the scene where Edgeworth is located
	private BackGround bg;
	//Join Thread
	private Thread t = null;
	//move speed
	private int xmove = 0;
	//jump speed
	private int ymove = 0;
	//status
	private String status;
	//show image
	private BufferedImage showImage;
	//score and life
	private int score;
	private int life;
	
	private int moving = 0;
	
	private int upTime = 0;
	
	private boolean isDead = false;
	
	private boolean isClear = false;
	
	public Edgeworth(int x,int y){
		this.x = x;
		this.y = y;
		this.showImage = StaticValue.allEdgeworthImage.get(0);
		this.score = 0;
		this.life = 3;
		
		this.t = new Thread(this);
		t.start();
		
		this.status = "right-standing";
	}
	
	
	public void leftMove(){
		//speed, left is negative
		xmove = -5;
		/*If it is already a jump,
		 *it should remain in its original state and cannot be changed again*/
		if(this.status.indexOf("jumping") != -1){
			this.status = "left-jumping";
		}else{
			this.status = "left-moving";
		}
	}
	
	public void rightMove(){
		xmove = 5;
		if(this.status.indexOf("jumping") != -1){
			this.status = "right-jumping";
		}else{
			this.status = "right-moving";
		}
	}
	
	public void leftStop(){
		this.xmove = 0;
		if(this.status.indexOf("jumping") != -1){
			this.status = "left-jumping";
		}else{
			this.status = "left-standing";
		}
	}
	
	public void rightStop(){
		this.xmove = 0;
		if(this.status.indexOf("jumping") != -1){
			this.status = "right-jumping";
		}else{
			this.status = "right-standing";
		}
	}
	
	/*If Edgeworth is on the ground or above an obstacle, 
	 *then Edgeworth can jump. If Edgeworth is in the air, 
	 *then Edgeworth cannot continue to jump.*/
	public void jump(){
		//Determine if Edgeworth can jump
		if(this.status.indexOf("jumping") == -1){
			if(this.status.indexOf("left") != -1){
				this.status = "left-jumping";
			}else{
				this.status = "right-jumping";
			}
			ymove = -10;
			upTime = 18;
		}
	}
	
	public void down(){
		if(this.status.indexOf("left") != -1){
			this.status = "left-jumping";
		}else{
			this.status = "right-jumping";
		}
		ymove = 10;
	}

	public void dead(){
		//music
		Music music = new Music("yuyu.wav");
		music.playMusic();
		this.life--;
		if(this.life == 0){
			this.isDead = true;
		}else{
			this.bg.reset();
			this.x = 0;
			this.y = 480;
		}
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

/*Judge whether Edgeworth is in the last scene. If Edgeworth is in the last scene
 * and the coordinates are greater than 520, it indicates that Edgeworth has
 * hit the flagpole. At this time, Edgeworth will not be controlled by the player.*/
	public void run() {
		while(true){
			//Determine if there is a collision with an obstacleײ
			//Criteria for determining the end of definition
			if(this.bg.isFlag() && this.x >= 520){
				this.bg.setOver(true);
				if(this.bg.isDown()){
					//game over
						this.setClear(true);
				}
//				}else{
					if(this.y < 420){
						this.y += 5;
					}
					if(this.y >= 420){
						this.y = 420;
						this.status = "right-standing";
					}
//				}
			}else{
				boolean canLeft = true;
				boolean canRight = true;
				boolean onLand = false;
				/*By judging the relationship between the coordinates of obstacles 
				 * and Edgeworth's coordinates, it is determined whether Edgeworth has collided
				 * with obstacles, and the corresponding changes in the state of Edgeworth
				 * and obstacles are made based on the judgment results.*/
					for(int i=0;i<this.bg.getAllObstruction().size();i++){
					Obstruction ob = this.bg.getAllObstruction().get(i);
					//Cannot move to the right
					if(ob.getX()==this.x+60 && (ob.getY()+50>this.y && ob.getY()-50<this.y)){
						if(ob.getType() != 3){
							canRight = false;
						}
					}
					if(ob.getX()==this.x-60 && (ob.getY()+50>this.y && ob.getY()-50<this.y)){
						if(ob.getType() != 3){
							canLeft = false;
						}
					}
					if(ob.getY()==this.y+60 && (ob.getX()+60>this.x && ob.getX()-60<this.x)){
						if(ob.getType() != 3){
								onLand = true;
							}
						}
						//Judging whether Edgeworth collided with obstacles while jumping
						if(ob.getY()==this.y-60 && (ob.getX()+50>this.x && ob.getX()-50<this.x)){
							//if it's a obstruction
							if(ob.getType()==0){
								//move the obstruction
								this.bg.getAllObstruction().remove(ob);
								//Save to the removed obstacles
								this.bg.getRemoveObstruction().add(ob);
							}
							//If it's a hidden brick
							if((ob.getType()==4 || ob.getType()==3) && upTime > 0){
								score += 10;
								//music
								Music music2 = new Music("cbt.wav");
								music2.playMusic();
								ob.setType(2);
								ob.setImage();
							}
							//Edgeworth begins to fall
							upTime = 0;
						}
					}
				
				//define death
				for(int i=0;i<this.bg.getAllEnemy().size();i++){
					Enemy e = this.bg.getAllEnemy().get(i);
					//Applicable to all enemies, death upon contact
					if(((e.getY()+60>this.y && e.getY()-60<this.y) && e.getX()+50>this.x && e.getX()-50<this.x)){
						this.dead();
					}
					//Distinguish enemy categories and respond differently to different enemies
					if(e.getY()==this.y+60 && (e.getX()+60>this.x && e.getX()-60<this.x)){
						if(e.getType() == 1){
							
							//music
							Music music2 = new Music("yanei.wav");
							music2.playMusic();
							
							e.dead();
							this.upTime = 5;
							this.ymove = -10;
							score += 10;
						}else if(e.getType() == 2){
							this.dead();
							//music
							Music music2 = new Music("yuyu.wav");
							music2.playMusic();
						}
					}
				}
				
				
				
				if(onLand && upTime == 0){
					if(this.status.indexOf("left") != -1){
						if(xmove != 0){
							this.status = "left-moving";
						}else{
							this.status = "left-standing";
						}
					}else{
						if(xmove != 0){
							this.status = "right-moving";
						}else{
							this.status = "right-standing";
						}
					}
				}else{
					if(upTime != 0){
						upTime--;
					}else{
						this.down();
					}
					y += ymove;
				}
				
				if(this.y>600){
					this.dead();
				}
				
				
				if(canLeft && xmove<0 || canRight && xmove>0){
					x += xmove;
					if(x<0){
						x = 0;
					}
				}
			}
			
			int temp = 0;
			if(this.status.indexOf("left") != -1){
				temp += 5;
			} 
			
			if(this.status.indexOf("moving") != -1){
				temp += this.moving;
				moving++;
				if(moving==4){
					this.moving = 0;
				}
			}
			
			if(this.status.indexOf("jumping") != -1){
				temp += 4;
			}
			
			this.showImage = StaticValue.allEdgeworthImage.get(temp);
			
			try {
				Thread.sleep(50);
			} catch (InterruptedException e) {
				e.printStackTrace();
			}
		}
	}

	public void setBg(BackGround bg) {
		this.bg = bg;
	}

	public void setX(int x) {
		this.x = x;
	}

	public void setY(int y) {
		this.y = y;
	}

	public boolean isDead() {
		return isDead;
	}


	public int getScore() {
		return score;
	}


	public void setScore(int score) {
		this.score = score;
	}


	public int getLife() {
		return life;
	}


	public void setLife(int life) {
		this.life = life;
	}

	public boolean isClear() {
		return isClear;
	}

	public void setClear(boolean isClear) {
		this.isClear = isClear;
	}
	
}
