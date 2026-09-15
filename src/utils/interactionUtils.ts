import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';

// Configure Notifications globally
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

class InteractionUtils {
  private clickSound?: Audio.Sound;
  private successSound?: Audio.Sound;
  private wooshSound?: Audio.Sound;
  private chimeSound?: Audio.Sound;
  private loginSound?: Audio.Sound;
  private deleteSound?: Audio.Sound;

  constructor() {
    this.initSounds();
  }

  private async initSounds() {
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });

      // Subtle, crisp click sound
      const { sound: click } = await Audio.Sound.createAsync(
        { uri: 'https://cdn.freesound.org/previews/256/256113_3263906-lq.mp3' },
        { volume: 0.6 }
      );
      this.clickSound = click;

      // Uplifting login sound (distinctive from actions)
      const { sound: login } = await Audio.Sound.createAsync(
        { uri: 'https://cdn.freesound.org/previews/341/341695_5858296-lq.mp3' },
        { volume: 0.85 }
      );
      this.loginSound = login;

      // Soft delete / cancel sound
      const { sound: deleteSnd } = await Audio.Sound.createAsync(
        { uri: 'https://cdn.freesound.org/previews/242/242501_4414128-lq.mp3' },
        { volume: 0.6 }
      );
      this.deleteSound = deleteSnd;

      // Success sound
      const { sound: success } = await Audio.Sound.createAsync(
        { uri: 'https://cdn.freesound.org/previews/270/270404_5123851-lq.mp3' },
        { volume: 0.8 }
      );
      this.successSound = success;

      // Dynamic referral submit whoosh
      const { sound: woosh } = await Audio.Sound.createAsync(
        { uri: 'https://cdn.freesound.org/previews/608/608645_11861866-lq.mp3' },
        { volume: 0.85 }
      );
      this.wooshSound = woosh;

      // Notification chime
      const { sound: chime } = await Audio.Sound.createAsync(
        { uri: 'https://cdn.freesound.org/previews/320/320655_5260872-lq.mp3' },
        { volume: 0.75 }
      );
      this.chimeSound = chime;
    } catch (e) {
      // Graceful fallback to haptics if audio assets cannot load
    }
  }

  // Crisp micro-click with light tactile tap
  async playClick() {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (this.clickSound) {
        await this.clickSound.replayAsync();
      }
    } catch (e) {
      // ignore
    }
  }

  // Distinct login chime for successful authentication
  async playLoginSuccess() {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (this.loginSound) {
        await this.loginSound.replayAsync();
      } else if (this.chimeSound) {
        await this.chimeSound.replayAsync();
      }
    } catch (e) {
      // ignore
    }
  }

  // Subtle delete, dismiss or cancel tone
  async playDelete() {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      if (this.deleteSound) {
        await this.deleteSound.replayAsync();
      }
    } catch (e) {
      // ignore
    }
  }

  // Whoosh sound when dispatching/submitting a referral
  async playWoosh() {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      if (this.wooshSound) {
        await this.wooshSound.replayAsync();
      }
    } catch (e) {
      // ignore
    }
  }

  // Notification chime when viewing or receiving new notifications
  async playNotificationSound() {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (this.chimeSound) {
        await this.chimeSound.replayAsync();
      }
    } catch (e) {
      // ignore
    }
  }

  // General success feedback
  async playSuccess() {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (this.successSound) {
        await this.successSound.replayAsync();
      }
    } catch (e) {
      // ignore
    }
  }

  async triggerNotification(title: string, body: string) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: true,
        },
        trigger: null,
      });
    } catch (e) {
      console.warn("Notification error:", e);
    }
  }
}

export const interactionUtils = new InteractionUtils();
