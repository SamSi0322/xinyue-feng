package The_Adventuresof_Edgeworth;

import java.awt.image.BufferedImage;
import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

import javax.imageio.ImageIO;/*read and write multiple common image formats 
                              *( JPEG、PNG、BMP、GIF)*/

public class StaticValue {
	
	public static List<BufferedImage> allEdgeworthImage = new ArrayList<BufferedImage>();
	
	public static BufferedImage startImage = null;
	
	public static BufferedImage endImage = null;
	//background
	public static BufferedImage bgImage = null;
	//Create a list for multiple images
	public static List<BufferedImage> allOldbagImage = new ArrayList<BufferedImage>();
	
	public static List<BufferedImage> allWinstonImage = new ArrayList<BufferedImage>();
	
	public static List<BufferedImage> allKarmaImage = new ArrayList<BufferedImage>();
	
	public static List<BufferedImage> allObstructionImage = new ArrayList<BufferedImage>();
//npc
	public static List<BufferedImage> allNPCImage = new ArrayList<BufferedImage>();
	
	public static BufferedImage EdgeworthDeadImage = null;
	/*Obtain photos through the path, with the same prefix as the photo name. 
	 * Therefore, it is defined as a variable to facilitate subsequent calls*/
	public static String ImagePath = System.getProperty("user.dir")+"/bin/";
	
	//Initialization method
	public static void init(){
		//Using a loop to initialize Edgeworth images
		for(int i=1;i<=10;i++){
			try {
				allEdgeworthImage.add(ImageIO.read(new File(ImagePath+i+".png")));
			} catch (IOException e) {
				e.printStackTrace();
			}
		}
		
		
		//Import background image
		try {
			startImage = ImageIO.read(new File(ImagePath+"start.png"));
			bgImage = ImageIO.read(new File(ImagePath+"firststage0.png"));
			endImage = ImageIO.read(new File(ImagePath+"firststageend.png"));
		} catch (IOException e) {
			e.printStackTrace();
		}
		
		
		
		
		
		
		//Import enemy image
		for(int i=1;i<=5;i++){
			try {
				if(i<=2){
					allOldbagImage.add(ImageIO.read(new File(ImagePath+"Oldbag"+i+".png")));
				}
				if(i<=3){
					allWinstonImage.add(ImageIO.read(new File(ImagePath+"Winston"+i+".png")));
				}else {
					allKarmaImage.add(ImageIO.read(new File(ImagePath+"Karma"+i+".png")));
				}
			} catch (IOException e) {
				e.printStackTrace();
			}
		}
		//import npc
		for(int i=1;i<=2;i++){
			try {
				allNPCImage.add(ImageIO.read(new File(ImagePath+"npc"+i+".png")));
			} catch (IOException e) {
				e.printStackTrace();
			}
		}
//			try {
//				allNPCImage.add(ImageIO.read(new File(ImagePath+"npc"+".png")));
//			} catch (IOException e) {
//				e.printStackTrace();
//			}
		//Using a loop to initialize all Obstruction's images
		for(int i=1;i<=12;i++){
			try {
				allObstructionImage.add(ImageIO.read(new File(ImagePath+"ob"+i+".png")));
			} catch (IOException e) {
				e.printStackTrace();
			}
		}
		//Import Edgeworth's Death Image
		try {
			allEdgeworthImage.add(ImageIO.read(new File(ImagePath+"over.png")));
		} catch (IOException e) {
			e.printStackTrace();
		}
	}
	
}
