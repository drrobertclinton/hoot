import { healthConnectProvider } from './healthconnect';
import type { HealthProvider } from './types';
export const nativeProvider: HealthProvider | null = healthConnectProvider;
