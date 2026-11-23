import { useTranslation } from 'react-i18next';

import { previousDay } from '@/shared/lib/utc-day';

const YEAR_LENGTH = 4;

/**
 * A day heading of the security log: "Today", "Yesterday", else the date — with the year only
 * when it is not this one. Days are UTC, like every time in the log (QRY-22).
 */
export const useSecurityDayLabel = (today: string): ((day: string) => string) => {
    const { t, i18n } = useTranslation('auth');
    return (day) => {
        if (day === today) {
            return t('securityLog.today');
        }
        if (day === previousDay(today)) {
            return t('securityLog.yesterday');
        }
        return new Intl.DateTimeFormat(i18n.language, {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            ...(day.slice(0, YEAR_LENGTH) === today.slice(0, YEAR_LENGTH) ? {} : { year: 'numeric' }),
            timeZone: 'UTC',
        }).format(new Date(`${day}T00:00:00Z`));
    };
};
