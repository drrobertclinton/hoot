import { useSlice, updateSlice } from '@core/store';
import { dayKey } from '@core/dates';
import { uid } from '@core/id';
import { EMPTY, KEY, reopenSheet, removeSheet, saveSheet, submitHomework, type EduSlice, type LessonProgress } from './model';

export const useEdu = () => useSlice<EduSlice>(KEY, EMPTY);
const blank: LessonProgress = { checkPassed: false, answers: {}, completed: null };
const nowIso = () => new Date().toISOString();

export function passCheck(id: string) {
  updateSlice<EduSlice>(KEY, EMPTY, (s) => ({ ...s, progress: { ...s.progress, [id]: { ...(s.progress[id] || blank), checkPassed: true } } }));
}
export function completeLesson(id: string, answers: Record<string, string>) {
  updateSlice<EduSlice>(KEY, EMPTY, (s) => ({ ...s, progress: { ...s.progress, [id]: { ...(s.progress[id] || blank), answers, completed: dayKey() } } }));
}

/** Save a worksheet copy as a draft, or submit it (dated receipt). Returns the copy id. */
export function saveWorksheet(sheet: string, id: string | null, values: Record<string, string>, submit: boolean): string {
  const entryId = id || uid('ws-');
  updateSlice<EduSlice>(KEY, EMPTY, (s) => saveSheet(s, { id: entryId, sheet, values }, nowIso(), submit));
  return entryId;
}
export const reopenWorksheet = (id: string) => updateSlice<EduSlice>(KEY, EMPTY, (s) => reopenSheet(s, id, nowIso()));
export const deleteWorksheet = (id: string) => updateSlice<EduSlice>(KEY, EMPTY, (s) => removeSheet(s, id));

export function saveHomework(key: string, values: Record<string, string>, brief: string, submit: boolean) {
  updateSlice<EduSlice>(KEY, EMPTY, (s) => submitHomework(s, key, values, brief, nowIso(), submit));
}
export function reopenHomework(key: string) {
  updateSlice<EduSlice>(KEY, EMPTY, (s) => (s.homework?.[key] ? { ...s, homework: { ...s.homework, [key]: { ...s.homework[key], status: 'draft' } } } : s));
}
