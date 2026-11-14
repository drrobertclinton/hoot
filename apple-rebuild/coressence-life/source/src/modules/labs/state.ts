import { useSlice, updateSlice } from '@core/store';
import { uid } from '@core/id';
import { EMPTY, KEY, type LabResult, type LabsSlice } from './model';

export const useLabs = () => useSlice<LabsSlice>(KEY, EMPTY);
export function addResult(r: Omit<LabResult, 'id'>) {
  updateSlice<LabsSlice>(KEY, EMPTY, (s) => ({ ...s, results: [...s.results, { ...r, id: uid('lab-') }] }));
}
export function deleteResult(id: string) {
  updateSlice<LabsSlice>(KEY, EMPTY, (s) => ({ ...s, results: s.results.filter((r) => r.id !== id) }));
}
