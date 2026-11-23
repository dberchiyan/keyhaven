import { lazyWithPreload } from '@/shared/lib/lazy-with-preload';

export const SettingsPage = lazyWithPreload(async () => ({
    default: (await import('./pages/settings-page')).SettingsPage,
}));
export { SETTINGS_SECTIONS } from './hooks/use-settings-section';
export type { SettingsSection } from './types';
