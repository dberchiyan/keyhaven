import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { SCHEDULE_LIMITS } from '../schemas';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export interface UseBlockedDayDraftResult {
    draft: string;
    setDraft: (value: string) => void;
    error: string | undefined;
    add: () => void;
}

/**
 * The day typed into "Days off" before it joins the list: checked on add (a real date, not twice,
 * within the backend's limit) so the list never holds what the server would refuse.
 */
export const useBlockedDayDraft = (
    blockedDays: readonly string[],
    onAdd: (days: string[]) => void,
): UseBlockedDayDraftResult => {
    const { t } = useTranslation('validation');
    const [draft, setDraftValue] = useState('');
    const [error, setError] = useState<string | undefined>(undefined);

    const problemOf = (day: string): string | undefined => {
        if (!ISO_DATE.test(day)) {
            return t('schedule.blockedDays.invalid');
        }
        if (blockedDays.includes(day)) {
            return t('schedule.blockedDays.duplicate');
        }
        if (blockedDays.length >= SCHEDULE_LIMITS.blockedDays) {
            return t('schedule.blockedDays.tooMany', { max: SCHEDULE_LIMITS.blockedDays });
        }
        return undefined;
    };

    return {
        draft,
        setDraft: (value) => {
            setDraftValue(value);
            setError(undefined);
        },
        error,
        add: () => {
            const problem = problemOf(draft);
            setError(problem);
            if (problem !== undefined) {
                return;
            }
            onAdd([...blockedDays, draft].sort());
            setDraftValue('');
        },
    };
};
