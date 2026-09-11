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

  constructor() {
    this.initSounds();
  }

  private async initSounds() {
    try {
      const { sound: click } = await Audio.Sound.createAsync(
        { uri: 'https://cdn.freesound.org/previews/256/256113_3263906-lq.mp3' }
      );
      this.clickSound = click;

      const { sound: success } = await Audio.Sound.createAsync(
        { uri: 'https://cdn.freesound.org/previews/270/270404_5123851-lq.mp3' }
      );
      this.successSound = success;

      const { sound: woosh } = await Audio.Sound.createAsync(
        { uri: 'https://cdn.freesound.org/previews/608/608645_11861866-lq.mp3' }
      );
      this.wooshSound = woosh;

      const { sound: chime } = await Audio.Sound.createAsync(
        { uri: 'https://cdn.freesound.org/previews/320/320655_5260872-lq.mp3' }
      );
      this.chimeSound = chime;
    } catch (e) {
      console.warn("Failed to load sound assets", e);
    }
  }

  // Basic haptic feedback for buttons
  async playClick() {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (this.clickSound) {
        await this.clickSound.replayAsync();
      }
    } catch (e) {
      // ignore
    }
  }

  // Whoosh sound when dispatching/submitting a referral
  async playWoosh() {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (this.chimeSound) {
        await this.chimeSound.replayAsync();
      }
    } catch (e) {
      // ignore
    }
  }

  // Success feedback (e.g., booked appointment)
  async playSuccess() {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
        trigger: null, // trigger immediately
      });
    } catch (e) {
      console.warn("Notification error:", e);
    }
  }
}

export const interactionUtils = new InteractionUtils();
