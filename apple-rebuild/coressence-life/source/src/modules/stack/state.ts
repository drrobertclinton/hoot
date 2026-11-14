import { useSlice, updateSlice } from '@core/store';
import { EMPTY, KEY, markReviewed, remove, upsert, type StackItem, type StackSlice } from './model';
export const useStack = () => useSlice<StackSlice>(KEY, EMPTY);
export const saveItem = (item: StackItem) => updateSlice<StackSlice>(KEY, EMPTY, (s) => upsert(s, item));
export const deleteItem = (id: string) => updateSlice<StackSlice>(KEY, EMPTY, (s) => remove(s, id));
export const setReviewed = (today: string, by: string) => updateSlice<StackSlice>(KEY, EMPTY, (s) => markReviewed(s, today, by));
