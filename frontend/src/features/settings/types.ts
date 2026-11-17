import type { SETTINGS_SECTIONS } from './hooks/use-settings-section';

export type SettingsSection = (typeof SETTINGS_SECTIONS)[number]['key'];
