import { useSlice, updateSlice } from '@core/store';
import { uid } from '@core/id';
import { EMPTY, KEY, type CoachSlice, type WeeklyReview } from './model';
import type { CoachFeedback } from './share';

export const useCoach = () => useSlice<CoachSlice>(KEY, EMPTY);
export function saveReview(r: Omit<WeeklyReview, 'id'>) {
  updateSlice<CoachSlice>(KEY, EMPTY, (s) => ({ ...s, reviews: [{ ...r, id: uid('rv-') }, ...s.reviews] }));
}
/** Store a validated coach feedback file on the device (newest first). */
export function addFeedback(f: CoachFeedback) {
  updateSlice<CoachSlice>(KEY, EMPTY, (s) => ({ ...s, feedback: [{ ...f, id: uid('fb-'), received: new Date().toISOString() }, ...(s.feedback ?? [])] }));
}
export function deleteFeedback(id: string) {
  updateSlice<CoachSlice>(KEY, EMPTY, (s) => ({ ...s, feedback: (s.feedback ?? []).filter((f) => f.id !== id) }));
}
