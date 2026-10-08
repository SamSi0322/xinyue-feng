package The_Adventuresof_Edgeworth;

import java.io.IOException;
import java.io.InputStream;

import javax.sound.sampled.AudioInputStream;
import javax.sound.sampled.AudioSystem;
import javax.sound.sampled.Clip;
import javax.sound.sampled.LineUnavailableException;
import javax.sound.sampled.UnsupportedAudioFileException;

public class Music2 {
	public void playBGM(String name){
		try {
			Clip bgm=AudioSystem.getClip();
			InputStream is = this.getClass().getClassLoader().getResourceAsStream(name);
			AudioInputStream ais = AudioSystem.getAudioInputStream(is);
			bgm.open(ais);
			bgm.loop(Clip.LOOP_CONTINUOUSLY);
		}catch(LineUnavailableException e){
			e.printStackTrace();
		}catch(UnsupportedAudioFileException e){
			e.printStackTrace();
		}catch(IOException e){
			e.printStackTrace();
		}
	}
}
