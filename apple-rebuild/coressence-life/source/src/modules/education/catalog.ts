// Everything in Learn: the 12-module course for each track (with the performer labs) and the short seed lessons.
import { COURSE_MODULES, PERFORM_LABS, courseSequence, type Course } from './course/modules';
import { LESSONS, seedLessonsForTrack, type Lesson } from './lessons';

export const ALL_LESSONS: Lesson[] = [...COURSE_MODULES.live, ...COURSE_MODULES.perform, ...PERFORM_LABS, ...LESSONS];

export const lesson = (id: string) => ALL_LESSONS.find((l) => l.id === id);

/** The courses a track setting shows. */
export const coursesFor = (track: 'live' | 'perform' | 'both'): Course[] => (track === 'both' ? ['live', 'perform'] : [track]);

/** Course modules and labs for the person's track, then the short lessons. */
export function lessonsForTrack(track: 'live' | 'perform' | 'both'): Lesson[] {
  return [...coursesFor(track).flatMap(courseSequence), ...seedLessonsForTrack(track)];
}

/** The item after this one: next module or lab in the same course, or the next seed lesson. */
export function nextInSequence(id: string): Lesson | undefined {
  const l = lesson(id);
  if (!l) return undefined;
  const seq = l.course ? courseSequence(l.course) : LESSONS;
  const i = seq.findIndex((x) => x.id === id);
  return i >= 0 ? seq[i + 1] : undefined;
}
