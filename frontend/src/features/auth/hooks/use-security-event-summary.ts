import DevicesOtherOutlined from '@mui/icons-material/DevicesOtherOutlined';
import ErrorOutlineOutlined from '@mui/icons-material/ErrorOutlineOutlined';
import KeyOutlined from '@mui/icons-material/KeyOutlined';
import LockClockOutlined from '@mui/icons-material/LockClockOutlined';
import LockResetOutlined from '@mui/icons-material/LockResetOutlined';
import LoginOutlined from '@mui/icons-material/LoginOutlined';
import LogoutOutlined from '@mui/icons-material/LogoutOutlined';
import MarkEmailReadOutlined from '@mui/icons-material/MarkEmailReadOutlined';
import type { SvgIconProps } from '@mui/material/SvgIcon';
import type { ComponentType } from 'react';
import { useTranslation } from 'react-i18next';

import { describeUserAgent, SECURITY_TONES, type SecurityEventGroup, type SecurityTone } from '../format';
import type { SecurityEvent } from '../types';

type Action = SecurityEvent['action'];

const ICONS: Record<Action, ComponentType<SvgIconProps>> = {
    'auth.signed_in': LoginOutlined,
    'auth.sign_in_failed': ErrorOutlineOutlined,
    'auth.signed_out': LogoutOutlined,
    'auth.email_verified': MarkEmailReadOutlined,
    'auth.password_changed': KeyOutlined,
    'auth.password_reset': LockResetOutlined,
    'auth.session_ended': DevicesOtherOutlined,
    'auth.other_sessions_ended': DevicesOtherOutlined,
    'auth.session_evicted': DevicesOtherOutlined,
    'auth.sign_in_locked': LockClockOutlined,
};

const REPEATED_FAILURES = 2;

export interface SecurityEventSummary {
    newest: SecurityEvent;
    oldest: SecurityEvent;
    count: number;
    tone: SecurityTone;
    icon: ComponentType<SvgIconProps>;
    title: string;
    deviceName: string;
    hasNewDevice: boolean;
    hasRepeatedFailures: boolean;
}

/**
 * What a security-log row says about its group: a folded group is titled by what it holds
 * ("Signed in / out ×4"), and two or more failed sign-ins in a row are called out as a warning.
 */
export const useSecurityEventSummary = (group: SecurityEventGroup): SecurityEventSummary => {
    const { t } = useTranslation('auth');
    const { events } = group;
    const [newest] = events;
    const oldest = events[events.length - 1] ?? newest;
    const count = events.length;
    const actions = new Set(events.map((event) => event.action));
    const groupTitle =
        actions.size > 1
            ? t('securityLog.group.signedInOut', { count })
            : t('securityLog.group.repeated', { action: t(`securityLog.short.${newest.action}`), count });
    const device = describeUserAgent(newest.userAgent);
    const deviceName =
        device.browser && device.os
            ? t('securityLog.device', { browser: device.browser, os: device.os })
            : (device.browser ?? device.os ?? t('securityLog.unknownDevice'));
    return {
        newest,
        oldest,
        count,
        tone: SECURITY_TONES[newest.action],
        icon: ICONS[newest.action],
        title: count === 1 ? t(`securityLog.actions.${newest.action}`) : groupTitle,
        deviceName,
        hasNewDevice: events.some((event) => event.isNewDevice),
        hasRepeatedFailures: newest.action === 'auth.sign_in_failed' && count >= REPEATED_FAILURES,
    };
};
