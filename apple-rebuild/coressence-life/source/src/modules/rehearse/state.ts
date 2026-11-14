import { useSlice, updateSlice } from '@core/store';
import { EMPTY, KEY, type RehearseSlice, type VoiceLog } from './model';

export const useRehearse = () => useSlice<RehearseSlice>(KEY, EMPTY);
export function saveVoice(v: VoiceLog) {
  updateSlice<RehearseSlice>(KEY, EMPTY, (s) => ({ ...s, voice: { ...s.voice, [v.date]: v } }));
}
