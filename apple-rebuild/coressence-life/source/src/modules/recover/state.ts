import { useSlice, updateSlice } from '@core/store';
import { EMPTY, KEY, type RecoverSlice, type RecoveryLog } from './model';

export const useRecover = () => useSlice<RecoverSlice>(KEY, EMPTY);
export function saveRecovery(l: RecoveryLog) {
  updateSlice<RecoverSlice>(KEY, EMPTY, (s) => ({ ...s, logs: { ...s.logs, [l.date]: l } }));
}
