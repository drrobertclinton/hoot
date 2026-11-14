import { healthKitProvider } from './healthkit';
import type { HealthProvider } from './types';
export const nativeProvider: HealthProvider | null = healthKitProvider;
