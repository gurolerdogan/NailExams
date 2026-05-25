import { Share, Platform } from 'react-native';
import type { ViewShotRef } from 'react-native-view-shot';
import { markProgressShared } from '../../services/badges/badgeService';
import { logEvent } from '../../services/logging/logEvent';

/**
 * Captures a ViewShot ref and shares it.
 * Falls back to text-only on Android or if capture fails.
 */
export async function shareCardImage(
  ref: React.RefObject<ViewShotRef>,
  fallbackText: string,
  eventName: string,
  eventProps?: Record<string, unknown>,
): Promise<void> {
  try {
    let uri: string | null = null;
    if (ref.current && 'capture' in ref.current) {
      try { uri = await (ref.current as ViewShotRef).capture(); } catch { /* fall through */ }
    }

    if (uri) {
      await Share.share(Platform.OS === 'ios' ? { url: uri } : { message: uri });
    } else {
      await Share.share({ message: fallbackText });
    }

    await markProgressShared();
    void logEvent(eventName, eventProps ?? {});
  } catch { /* user dismissed */ }
}
