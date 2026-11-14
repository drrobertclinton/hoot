// Every Coressence module, in one list. Each one is self-contained (model, state, screens) so it can later
// ship as its own app. The toolkit files each one under the step of the method it serves.
import type { IconName } from '@core/ui';

export type ModuleId = 'life' | 'devices' | 'monitor' | 'measure' | 'track' | 'move' | 'fuel' | 'sleep' | 'recover' | 'restore' | 'rehearse' | 'coach' | 'plan' | 'labs' | 'md' | 'shop' | 'education' | 'plus' | 'stack' | 'resources';
export type ModuleInfo = { id: ModuleId; name: string; tagline: string; icon: IconName; route: string; tier: 'free' | 'premium' | 'storefront'; step: 'assess' | 'plan' | 'do' | 'measure' | 'review' | 'more' };

const ALL_MODULES: ModuleInfo[] = [
  { id: 'measure', name: 'Measure', tagline: 'Device data: steps, heart, sleep, weight', icon: 'bar-chart-2', route: '/measure', tier: 'premium', step: 'measure' },
  { id: 'monitor', name: 'Monitor', tagline: 'Readiness, sleep stages, load, glucose, blood pressure', icon: 'activity', route: '/monitor', tier: 'premium', step: 'measure' },
  { id: 'devices', name: 'Devices', tagline: 'Apple Watch, Oura, Garmin, WHOOP and more', icon: 'watch', route: '/devices', tier: 'free', step: 'assess' },
  { id: 'track', name: 'Track', tagline: 'Daily check-in and habits', icon: 'check-square', route: '/track', tier: 'free', step: 'assess' },
  { id: 'move', name: 'Move', tagline: 'Exercise: Pilates, yoga, stretching, strength', icon: 'activity', route: '/move', tier: 'premium', step: 'do' },
  { id: 'fuel', name: 'Fuel', tagline: 'Nutrition: meals, water and eating windows', icon: 'coffee', route: '/fuel', tier: 'premium', step: 'do' },
  { id: 'sleep', name: 'Sleep', tagline: 'Sleep log and sleep sound check', icon: 'moon', route: '/sleep', tier: 'premium', step: 'do' },
  { id: 'recover', name: 'Recover', tagline: 'Rest, replenish and recovery habits', icon: 'battery-charging', route: '/recover', tier: 'premium', step: 'do' },
  { id: 'restore', name: 'Restore', tagline: 'Breathing, quiet time, reflection', icon: 'feather', route: '/restore', tier: 'premium', step: 'do' },
  { id: 'rehearse', name: 'Rehearse', tagline: 'Warmups and voice health log', icon: 'mic', route: '/rehearse', tier: 'premium', step: 'do' },
  { id: 'coach', name: 'Coach', tagline: 'Your cycle, notes and weekly review', icon: 'compass', route: '/coach', tier: 'free', step: 'review' },
  { id: 'plan', name: 'Plan', tagline: 'Personal plan and calendar', icon: 'calendar', route: '/plan', tier: 'free', step: 'plan' },
  { id: 'education', name: 'Course', tagline: 'Live and Perform at Your Peak', icon: 'book-open', route: '/learn', tier: 'premium', step: 'plan' },
  { id: 'labs', name: 'Labs', tagline: 'Your results, trends and notes', icon: 'droplet', route: '/labs', tier: 'free', step: 'assess' },
  { id: 'stack', name: 'Stack Check', tagline: 'Everything you take, ready for a pharmacist', icon: 'layers', route: '/stack', tier: 'free', step: 'assess' },
  { id: 'resources', name: 'Resources', tagline: 'Books, worksheets and guides', icon: 'bookmark', route: '/resources', tier: 'free', step: 'plan' },
  { id: 'md', name: 'MD', tagline: 'Telehealth visits, a separate medical service', icon: 'video', route: '/md', tier: 'storefront', step: 'more' },
  { id: 'shop', name: 'Shop', tagline: 'Coressence Shop: gear guide and books', icon: 'shopping-bag', route: '/shop', tier: 'storefront', step: 'more' },
];

export const MODULES: ModuleInfo[] = ALL_MODULES;

export const moduleInfo = (id: ModuleId) => ALL_MODULES.find((m) => m.id === id);
