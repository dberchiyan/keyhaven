import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { SecurityLogView, useOwnSecurityLog } from '@/features/auth';

import { useSecurityLogParams } from '../hooks/use-security-log-params';
import { SettingsCard } from './settings-card';

/** One's own security log, so a person can spot a sign-in that was not theirs. */
export function SecuritySection(): ReactElement {
    const { t } = useTranslation('settings');
    const { category, setCategory } = useSecurityLogParams();
    const log = useOwnSecurityLog(category);
    return (
        <SettingsCard id="settings-security" title={t('security.title')} description={t('security.description')}>
            <SecurityLogView log={log} category={category} onCategory={setCategory} />
        </SettingsCard>
    );
}
