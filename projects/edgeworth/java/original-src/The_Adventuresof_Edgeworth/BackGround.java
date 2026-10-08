package The_Adventuresof_Edgeworth;

import java.awt.image.BufferedImage;
import java.util.ArrayList;
import java.util.List;

public class BackGround {
	//The image to be displayed in the current scene
	private BufferedImage bgImage = null;
	//Record the current scene
	private int sort;
	//Determine if it is the last scene
	private boolean flag;
	
	//Game end
	private boolean isOver = false;
	//Define the end of flag lowering
	private boolean isDown = false;
	
	//Storing Enemies with Collections
	private List<Enemy> allEnemy = new ArrayList<Enemy>();
	//Storing Enemies with Obstruction
	private List<Obstruction> allObstruction = new ArrayList<Obstruction>();
	//Enemies that have been eliminated
	private List<Enemy> removeEnemy = new ArrayList<Enemy>();
	//Obstruction that have been eliminated
	private List<Obstruction> removeObstruction = new ArrayList<Obstruction>();
	//Storing npc with Collections
	private List<NPC> allNPC = new ArrayList<NPC>();
	
	/*At the beginning of the game, all enemies are actually stationary, 
	 * and players cannot control Edgeworth. 
	 * They must wait until the player presses the spacebar to start the game.
	 * A method should be defined here, which will be called when the player's 
	 * spacebar is pressed, and at the same time, the enemies in the game begin
	 * to move, marking the official start of the game.*/
	//Enemy begins to move
	public void enemyStartMove(){
		//ergodic the enemies in the current scene to start moving
		for(int i=0;i<this.allEnemy.size();i++){
			this.allEnemy.get(i).startMove();
		}
	}
	
	
	/*Define the construction method of the background class, 
	 *determine which scene it is by obtaining the order of the scenes, 
	 *that is, the sort of the scenes, and draw the scene well at the same time*/
	public BackGround(int sort,boolean flag){
		this.sort = sort;
		this.flag = flag;
		if(flag){
			bgImage = StaticValue.endImage;
		}else{
			bgImage = StaticValue.bgImage;
		}
		//The first scene
		if(sort==1){
			for(int i=0;i<15;i++){
				this.allObstruction.add(new Obstruction(i*60, 540, 9,this));
			}
			/*!!!The x-axis direction is horizontally to the right, and the y-axis direction is vertically downward*/
			//Draw obstacles by their coordinates
			
			//Phoenix-ob5
			this.allObstruction.add(new Obstruction(180, 360, 4,this));
			this.allObstruction.add(new Obstruction(300, 360, 4,this));
			this.allObstruction.add(new Obstruction(480, 360, 4,this));
			this.allObstruction.add(new Obstruction(600, 360, 4,this));
			this.allObstruction.add(new Obstruction(240, 300, 4,this));
			this.allObstruction.add(new Obstruction(540, 300, 4,this));
			//Blue Badger-ob1
			this.allObstruction.add(new Obstruction(240, 360, 0,this));
			this.allObstruction.add(new Obstruction(540, 360, 0,this));
			//ob6&7
			this.allObstruction.add(new Obstruction(720, 480, 6,this));
			this.allObstruction.add(new Obstruction(780, 480, 5,this));
			
			
			//enemy
			this.allEnemy.add(new Enemy(600, 480, true, 1,this));
			this.allEnemy.add(new Enemy(500, 480, true, 3,this));
			this.allEnemy.add(new Enemy(750, 480, true, 2, 420, 480,this));
			
			
		}
		if(sort==2){
			for(int i=0;i<15;i++){
				if(i != 9 && i != 10 && i != 11 ){
					this.allObstruction.add(new Obstruction(i*60, 540, 9,this));
				}
			}
			
			//Phoenix-ob5
			this.allObstruction.add(new Obstruction(60, 360, 4,this));
			this.allObstruction.add(new Obstruction(120, 360, 4,this));
			this.allObstruction.add(new Obstruction(240, 240, 4,this));
			this.allObstruction.add(new Obstruction(300, 240, 4,this));
			
			//Blue Badger-ob1
			this.allObstruction.add(new Obstruction(420, 360, 0,this));
			this.allObstruction.add(new Obstruction(480, 360, 0,this));
			this.allObstruction.add(new Obstruction(600, 240, 0,this));
			this.allObstruction.add(new Obstruction(660, 240, 0,this));
			this.allObstruction.add(new Obstruction(780, 120, 0,this));
			this.allObstruction.add(new Obstruction(840, 120, 0,this));
			
			//ob6-9
			this.allObstruction.add(new Obstruction(780, 480, 6,this));
			this.allObstruction.add(new Obstruction(840, 480, 5,this));
			this.allObstruction.add(new Obstruction(780, 420, 6,this));
			this.allObstruction.add(new Obstruction(840, 420, 5,this));
			this.allObstruction.add(new Obstruction(780, 360, 8,this));
			this.allObstruction.add(new Obstruction(840, 360, 7,this));
			
			//enemy
			this.allEnemy.add(new Enemy(500, 480, true, 3,this));
			this.allEnemy.add(new Enemy(700, 480, true, 1,this));
			this.allEnemy.add(new Enemy(300, 480, true, 1,this));
   			this.allEnemy.add(new Enemy(810, 360, true, 2, 300, 420,this));
			
		}
		if(sort==3){
			//2 ground
			for(int i=0;i<15;i++){
				if(i == 0 || i == 1 || i == 3){
					this.allObstruction.add(new Obstruction(i*60, 540, 9,this));
				}
			}
			
			//Phoenix-ob5
			this.allObstruction.add(new Obstruction(840, 120, 4,this));
			this.allObstruction.add(new Obstruction(780, 120, 4,this));
			this.allObstruction.add(new Obstruction(60, 120, 4,this));
			this.allObstruction.add(new Obstruction(120, 240, 4,this));
			
			//Blue Badger-ob1
			//mouth
			this.allObstruction.add(new Obstruction(300, 480, 0,this));
			this.allObstruction.add(new Obstruction(360, 480, 0,this));
			this.allObstruction.add(new Obstruction(420, 480, 0,this));
			
			this.allObstruction.add(new Obstruction(360, 420, 0,this));
			this.allObstruction.add(new Obstruction(420, 420, 0,this));
			this.allObstruction.add(new Obstruction(480, 420, 0,this));

			this.allObstruction.add(new Obstruction(420, 360, 0,this));
			this.allObstruction.add(new Obstruction(480, 360, 0,this));
			this.allObstruction.add(new Obstruction(540, 360, 0,this));

			//eyes
			this.allObstruction.add(new Obstruction(240, 120, 0,this));
			this.allObstruction.add(new Obstruction(240, 240, 0,this));
			this.allObstruction.add(new Obstruction(240, 360, 0,this));

			this.allObstruction.add(new Obstruction(600, 180, 0,this));
			this.allObstruction.add(new Obstruction(660, 120, 0,this));
			this.allObstruction.add(new Obstruction(720, 180, 0,this));
			
			//enemy
			this.allEnemy.add(new Enemy(700, 480, true, 2, 480, 700,this));
			this.allEnemy.add(new Enemy(500, 480, true, 2, 480, 700,this));
			this.allEnemy.add(new Enemy(300, 480, true, 2, 480, 700,this));
			this.allEnemy.add(new Enemy(100, 480, true, 2, 480, 700,this));
			
			
		}
		if(sort==4){
			for(int i=0;i<15;i++){
				if(i == 0 || i == 1 || i == 2 || i == 3 || i == 4 || i == 5) {
					this.allObstruction.add(new Obstruction(i*60, 540, 9,this));
				}
			}
			
			//ob2,ob10
			this.allObstruction.add(new Obstruction(420, 540, 1,this));
			this.allObstruction.add(new Obstruction(420, 480, 1,this));
			this.allObstruction.add(new Obstruction(420, 420, 1,this));
			this.allObstruction.add(new Obstruction(420, 360, 1,this));
			this.allObstruction.add(new Obstruction(420, 300, 1,this));
			this.allObstruction.add(new Obstruction(420, 240, 1,this));
			this.allObstruction.add(new Obstruction(420, 180, 9,this));

			this.allObstruction.add(new Obstruction(540, 540, 1,this));
			this.allObstruction.add(new Obstruction(540, 480, 1,this));
			this.allObstruction.add(new Obstruction(540, 420, 1,this));
			this.allObstruction.add(new Obstruction(540, 360, 1,this));
			this.allObstruction.add(new Obstruction(540, 300, 9,this));
			
			this.allObstruction.add(new Obstruction(660, 540, 1,this));
			this.allObstruction.add(new Obstruction(660, 480, 1,this));
			this.allObstruction.add(new Obstruction(660, 420, 1,this));
			this.allObstruction.add(new Obstruction(660, 360, 1,this));
			this.allObstruction.add(new Obstruction(660, 300, 1,this));
			this.allObstruction.add(new Obstruction(660, 240, 1,this));
			this.allObstruction.add(new Obstruction(660, 180, 9,this));

			//hidden ob
			this.allObstruction.add(new Obstruction(300, 360, 3,this));
			
			//npc
			this.allNPC.add(new NPC(300, 475, this));
			
			//Phoenix-ob5
			this.allObstruction.add(new Obstruction(780, 300, 4,this));
			this.allObstruction.add(new Obstruction(840, 300, 4,this));
		}
		
		if(sort==5){
			for(int i=0;i<15;i++){
				if(i<2||i>12){
					this.allObstruction.add(new Obstruction(i*60, 540, 9,this));
				}
			}
			//heart
			this.allObstruction.add(new Obstruction(480, 120, 4,this));
			this.allObstruction.add(new Obstruction(360, 120, 4,this));
			
			this.allObstruction.add(new Obstruction(420, 180, 0,this));

			this.allObstruction.add(new Obstruction(300, 60, 4,this));
			this.allObstruction.add(new Obstruction(540, 60, 4,this));

			this.allObstruction.add(new Obstruction(600, 60, 4,this));
			this.allObstruction.add(new Obstruction(660, 60, 4,this));
			this.allObstruction.add(new Obstruction(720, 60, 0,this));

			this.allObstruction.add(new Obstruction(240, 60, 4,this));
			this.allObstruction.add(new Obstruction(180, 60, 4,this));
			this.allObstruction.add(new Obstruction(120, 60, 0,this));

			this.allObstruction.add(new Obstruction(780, 120, 4,this));
			this.allObstruction.add(new Obstruction(60, 120, 4,this));

			this.allObstruction.add(new Obstruction(60, 180, 4,this));
			this.allObstruction.add(new Obstruction(60, 240, 4,this));
			this.allObstruction.add(new Obstruction(780, 180, 4,this));
			this.allObstruction.add(new Obstruction(780, 240, 4,this));

			this.allObstruction.add(new Obstruction(720, 300, 0,this));
			this.allObstruction.add(new Obstruction(660, 360, 4,this));
			this.allObstruction.add(new Obstruction(600, 420, 4,this));
			this.allObstruction.add(new Obstruction(540, 480, 4,this));
			this.allObstruction.add(new Obstruction(480, 540, 4,this));
			
			this.allObstruction.add(new Obstruction(120, 300, 0,this));
			this.allObstruction.add(new Obstruction(180, 360, 4,this));
			this.allObstruction.add(new Obstruction(240, 420, 4,this));
			this.allObstruction.add(new Obstruction(300, 480, 4,this));
			this.allObstruction.add(new Obstruction(360, 540, 0,this));
			
			//enemy
			this.allEnemy.add(new Enemy(900, 480, true, 2, 480, 700,this));
			this.allEnemy.add(new Enemy(700, 480, true, 2, 480, 700,this));
			this.allEnemy.add(new Enemy(500, 480, true, 2, 480, 700,this));
			this.allEnemy.add(new Enemy(300, 480, true, 2, 480, 700,this));
			this.allEnemy.add(new Enemy(100, 480, true, 2, 480, 700,this));
			
			this.allEnemy.add(new Enemy(600, 480, true, 2, 540, 700,this));
			this.allEnemy.add(new Enemy(400, 480, true, 2, 700, 700,this));
			this.allEnemy.add(new Enemy(200, 480, true, 2, 700, 700,this));
			this.allEnemy.add(new Enemy(100, 480, true, 2, 540, 700,this));
			
			this.allEnemy.add(new Enemy(700, 480, true, 1,this));
			this.allEnemy.add(new Enemy(300, 480, true, 1,this));
		}
		
		if(sort==6){
			for(int i=0;i<15;i++){
				this.allObstruction.add(new Obstruction(i*60, 540, 9,this));
			}
			this.allObstruction.add(new Obstruction(550, 180, 11,this));
			//enemy
			this.allEnemy.add(new Enemy(700, 480, true, 1,this));
			this.allEnemy.add(new Enemy(600, 480, true, 1,this));
			this.allEnemy.add(new Enemy(500, 480, true, 1,this));
			this.allEnemy.add(new Enemy(400, 480, true, 1,this));
			this.allEnemy.add(new Enemy(450, 480, true, 1,this));
			this.allEnemy.add(new Enemy(350, 480, true, 1,this));
			this.allEnemy.add(new Enemy(420, 480, true, 1,this));
			this.allEnemy.add(new Enemy(410, 480, true, 1,this));
			this.allEnemy.add(new Enemy(360, 480, true, 1,this));
			this.allEnemy.add(new Enemy(500, 480, true, 3,this));
		}
	}
	
	/*If Edgeworth dies but does not lose all health points, 
	 *the game should be reset, and all enemies and obstacles in the current scene, 
	 *including Edgeworth, should return to their initial positions.*/
	//Reset method, reset obstacles and enemies
	public void reset(){
		//Restore removed obstacles and enemies
		this.allEnemy.addAll(this.removeEnemy);
		this.allObstruction.addAll(this.removeObstruction);
		//Traverse the list of obstacles and enemies, 
		//and use a loop to call their reset methods.
		for(int i=0;i<this.allEnemy.size();i++){
			this.allEnemy.get(i).reset();
		}
		for(int i=0;i<this.allObstruction.size();i++){
			this.allObstruction.get(i).reset();
		}
	}

	public BufferedImage getBgImage() {
		return bgImage;
	}

	public List<Obstruction> getAllObstruction() {
		return allObstruction;
	}

	public List<Obstruction> getRemoveObstruction() {
		return removeObstruction;
	}

	public int getSort() {
		return sort;
	}

	public List<Enemy> getAllEnemy() {
		return allEnemy;
	}

	public List<Enemy> getRemoveEnemy() {
		return removeEnemy;
	}
	
	public List<NPC> getAllNPC() {
		return allNPC;
	}

	public boolean isFlag() {
		return flag;
	}

	public boolean isOver() {
		return isOver;
	}

	public void setOver(boolean isOver) {
		this.isOver = isOver;
	}

	public boolean isDown() {
		return isDown;
	}

	public void setDown(boolean isDown) {
		this.isDown = isDown;
	}
	
}
