// Which lessons this copy of the app can open (the same rule the Course screen uses).
import { PURCHASES_LIVE } from '@core/appConfig';
import { useEntitlements } from '@core/billing/billing';
import { canOpenLesson } from '@core/billing/entitlements';
import type { Lesson } from './lessons';

export function useLessonAccess(): (l: Pick<Lesson, 'id' | 'track'>) => boolean {
  const { ents, preview } = useEntitlements();
  // With purchases off, the short lessons are open as well as the free course parts.
  return (l) => canOpenLesson(l.id, l.track, ents, preview) || (!PURCHASES_LIVE && /^l\d+$/.test(l.id));
}
