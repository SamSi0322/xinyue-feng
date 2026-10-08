package The_Adventuresof_Edgeworth;

import java.io.BufferedInputStream;
import java.io.FileNotFoundException;
import java.io.InputStream;

import javax.sound.sampled.AudioInputStream;
import javax.sound.sampled.AudioSystem;
import javax.sound.sampled.Clip;
import javax.sound.sampled.LineEvent;
import javax.sound.sampled.LineListener;

/*Sound effects (cbt.wav, yanei.wav, yuyu.wav in Music/).
 *This class used java.applet.AudioClip, which has been removed from recent JDKs,
 *so it is re-implemented with javax.sound.sampled.Clip; the public methods are
 *the same as before. Every play opens a new Clip, which closes itself when it stops.
 *If a sound cannot be played (missing file, no audio device...), the error is
 *printed and the game continues without that sound.*/
public class Music {
	//the file name in Music/, e.g. "yuyu.wav"
	String name;
	//the clip that is playing now
	Clip clip;
	public Music(String name){
		//The old version started looping the sound here (clip.loop()), so every
		//sound effect kept repeating. Now nothing plays until playMusic()/loopMusic().
		this.name = name;
	}
	public void stopMusic()
	{
		if(clip != null){
			clip.stop();
		}
	}
	//play once from the start
	public void playMusic()
	{
		start(false);
	}
	public void loopMusic()
	{
		start(true);
	}
	private void start(boolean loop)
	{
		//like AudioClip: playing again restarts the sound instead of overlapping it
		stopMusic();
		try (InputStream is = Music.class.getResourceAsStream("/Music/"+name))
		{
			if(is == null){
				throw new FileNotFoundException("sound not found on the classpath: Music/"+name);
			}
			//BufferedInputStream: getAudioInputStream needs mark/reset, which a stream from a JAR does not support
			AudioInputStream ais = AudioSystem.getAudioInputStream(new BufferedInputStream(is));
			Clip c = AudioSystem.getClip();
			//close the clip when it stops (finished, or stopMusic()), so repeated
			//sound effects do not use up the audio lines
			c.addLineListener(new LineListener() {
				public void update(LineEvent event) {
					if(event.getType() == LineEvent.Type.STOP){
						event.getLine().close();
					}
				}
			});
			c.open(ais);
			clip = c;
			if(loop){
				c.loop(Clip.LOOP_CONTINUOUSLY);
			}else{
				c.start();
			}
		}
		catch (Exception e) {
			//no sound, but the game goes on
			e.printStackTrace();
		}
	}
}
