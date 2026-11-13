import DevicesOutlined from '@mui/icons-material/DevicesOutlined';
import PersonOutlineOutlined from '@mui/icons-material/PersonOutlineOutlined';
import ShieldOutlined from '@mui/icons-material/ShieldOutlined';

/** Settings sections, in menu order; each has its own URL (/settings/<section>). Open to every role. */
export const SETTINGS_SECTIONS = [
  { key: 'account', icon: PersonOutlineOutlined },
  { key: 'sessions', icon: DevicesOutlined },
  { key: 'security', icon: ShieldOutlined },
] as const satisfies readonly { key: string; icon: unknown }[];

export type SettingsSection = (typeof SETTINGS_SECTIONS)[number]['key'];

export const isSettingsSection = (value: string | undefined): value is SettingsSection =>
  SETTINGS_SECTIONS.some((section) => section.key === value);
