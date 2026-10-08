package The_Adventuresof_Edgeworth;

import java.applet.AudioClip; 
import java.io.*; 
import java.applet.Applet; 
import java.net.MalformedURLException;
import java.net.URI;
import java.net.URL; 

public class Music { 
	URL url; 
	URI uri;
	AudioClip clip; 
	public Music(String name){     
	try
	{  
		File f = new File("Music/"+name);
        uri=f.toURI();
        url = uri.toURL();
        clip = Applet.newAudioClip(url); 
        clip.loop();
        System.out.println("ok");
    }
     catch (MalformedURLException e) { 
            e.printStackTrace(); 
            System.out.println("no");
        }
    }
   public void stopMusic()
   {
       clip.stop();
   }
   public void playMusic()
   {
       clip.play();
   }
   public void loopMusic()
   {
       clip.loop();
   }
} 