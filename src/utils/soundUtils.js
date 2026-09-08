/**
 * Utility functions to play sound effects
 * Uses global settings: window.globalSoundVolume (0-1) and window.globalSoundMuted (boolean)
 */

// Initialize global sound settings from localStorage
if (typeof window !== 'undefined') {
  try {
    const storedVolume = localStorage.getItem('soundVolume');
    const storedMuted = localStorage.getItem('soundMuted');
    const parsedVol = storedVolume ? parseFloat(storedVolume) / 100 : 0.5;
    window.globalSoundVolume = !isNaN(parsedVol) ? Math.max(0, Math.min(1, parsedVol)) : 0.5;
    window.globalSoundMuted = storedMuted ? (storedMuted === 'true' || storedMuted === true) : false;
  } catch (e) {
    window.globalSoundVolume = 0.5;
    window.globalSoundMuted = false;
  }
}

export const playSound = (soundName) => {
  // Check if sound is muted
  if (typeof window === 'undefined' || window.globalSoundMuted) {
    return;
  }

  try {
    const audio = new Audio(`/${soundName}`);
    // Use global volume setting (0-1 scale) clamped safely
    const vol = typeof window.globalSoundVolume === 'number' && !isNaN(window.globalSoundVolume)
      ? Math.max(0, Math.min(1, window.globalSoundVolume))
      : 0.5;
    audio.volume = vol;
    audio.play().catch(() => {
      // Ignore audio playback or user gesture restrictions
    });
  } catch (error) {
    // Ignore audio initialization error
  }
};

export const playSaveSound = () => {
  playSound('save.mp3');
};

export const playLoadSound = () => {
  playSound('mech_reload.mp3');
};

export const playLoadSound2 = () => {
  playSound('mech_reload2.mp3');
};

export const playDeleteSound = () => {
  playSound('delete.mp3');
};
