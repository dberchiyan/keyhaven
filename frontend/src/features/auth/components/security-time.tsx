import Tooltip from '@mui/material/Tooltip';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { formatAgo } from '@/shared/lib/format-ago';
import { ISO_DAY_LENGTH } from '@/shared/lib/units';

export interface SecurityTimeProps {
    from: string;
    to: string | undefined;
    today: string;
    now: number;
}

const FULL: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'UTC',
    timeZoneName: 'short',
};

/**
 * When it happened, short on screen because the day heading already names the day: "2 minutes
 * ago" today, a time on an earlier day, a range for a group. The full UTC date is the tooltip and
 * the screen-reader text (QRY-22, A11Y-7).
 */
export function SecurityTime({ from, to, today, now }: SecurityTimeProps): ReactElement {
    const { t, i18n } = useTranslation('auth');
    const locale = i18n.language;
    const time = new Intl.DateTimeFormat(locale, { timeStyle: 'short', timeZone: 'UTC' });
    const full = new Intl.DateTimeFormat(locale, FULL);
    const start = new Date(from);

    const shownText = (): string => {
        if (to !== undefined) {
            return time.formatRange(start, new Date(to));
        }
        if (from.slice(0, ISO_DAY_LENGTH) === today) {
            return formatAgo(from, now, locale) ?? t('securityLog.justNow');
        }
        return time.format(start);
    };
    const spoken = to === undefined ? full.format(start) : full.formatRange(start, new Date(to));

    return (
        <Tooltip title={spoken} describeChild>
            <time dateTime={to ?? from} className="whitespace-nowrap">
                <span aria-hidden>{shownText()}</span>
                <span className="sr-only">{spoken}</span>
            </time>
        </Tooltip>
    );
}
