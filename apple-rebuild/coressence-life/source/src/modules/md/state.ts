// MD: placeholder entry point for telehealth visits (a separate clinical service, not part of the course).
import { useSlice, updateSlice } from '@core/store';
export type MdSlice = { interested: string | null };
const KEY = 'md';
const EMPTY: MdSlice = { interested: null };
export const useMd = () => useSlice<MdSlice>(KEY, EMPTY);
export function setInterested(on: boolean) {
  updateSlice<MdSlice>(KEY, EMPTY, () => ({ interested: on ? new Date().toISOString() : null }));
}
