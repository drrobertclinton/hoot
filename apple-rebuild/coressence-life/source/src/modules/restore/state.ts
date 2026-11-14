import { useSlice, updateSlice } from '@core/store';
import { uid } from '@core/id';
import { EMPTY, KEY, type RestoreSession, type RestoreSlice } from './model';

export const useRestore = () => useSlice<RestoreSlice>(KEY, EMPTY);
export function logRestore(x: Omit<RestoreSession, 'id'>) {
  updateSlice<RestoreSlice>(KEY, EMPTY, (s) => ({ ...s, sessions: [{ ...x, id: uid('r-') }, ...s.sessions] }));
}
export function deleteRestore(id: string) {
  updateSlice<RestoreSlice>(KEY, EMPTY, (s) => ({ ...s, sessions: s.sessions.filter((x) => x.id !== id) }));
}
