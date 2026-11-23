import DevicesOutlined from '@mui/icons-material/DevicesOutlined';
import PersonOutlineOutlined from '@mui/icons-material/PersonOutlineOutlined';
import ShieldOutlined from '@mui/icons-material/ShieldOutlined';
import { useParams } from 'react-router';

import type { SettingsSection } from '../types';

export const SETTINGS_SECTIONS = [
    { key: 'account', icon: PersonOutlineOutlined },
    { key: 'sessions', icon: DevicesOutlined },
    { key: 'security', icon: ShieldOutlined },
] as const satisfies readonly { key: string; icon: unknown }[];

const isSettingsSection = (value: string | undefined): value is SettingsSection =>
    SETTINGS_SECTIONS.some((section) => section.key === value);

/** The section in `/settings/:section`; undefined for an unknown one, which the page redirects. */
export const useSettingsSection = (): SettingsSection | undefined => {
    const { section } = useParams();
    return isSettingsSection(section) ? section : undefined;
};
