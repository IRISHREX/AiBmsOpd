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

  constructor() {
    this.initSounds();
  }

  private async initSounds() {
    try {
      // Load standard UI sounds from remote or local assets
      // We will leave the audio silent if assets aren't present and just use Haptics
    } catch (e) {
      console.warn("Failed to load sound assets", e);
    }
  }

  // Basic haptic feedback for buttons
  async playClick() {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {
      // ignore
    }
  }

  // Success feedback (e.g., booked appointment)
  async playSuccess() {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
