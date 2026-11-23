import { zodResolver } from '@hookform/resolvers/zod';
import { type BaseSyntheticEvent, type RefObject, useEffect, useRef, useState } from 'react';
import { useForm, type UseFormReturn } from 'react-hook-form';

import { isApiError } from '@/shared/api/api-error';
import type { ErrorCode } from '@/shared/types';

import {
    defaultScheduleValues,
    type ScheduleOutput,
    scheduleSchema,
    scheduleToValues,
    type ScheduleValues,
    toScheduleRequest,
} from '../schemas';
import type { ViewingSchedule } from '../types';
import { useSaveSchedule } from './use-viewing-queries';

export interface UseScheduleFormResult {
    form: UseFormReturn<ScheduleValues, unknown, ScheduleOutput>;
    onSubmit: (event?: BaseSyntheticEvent) => Promise<void>;
    errorCode: ErrorCode | undefined;
    errorRef: RefObject<HTMLDivElement | null>;
}

/**
 * The hours editor: the stored document as form values, saved back as one PUT. Server field
 * details name window indexes the form cannot map one to one, so every server error lands on the
 * form line (FORM-3), which takes focus (A11Y-3).
 */
export const useScheduleForm = (
    listingId: string,
    schedule: ViewingSchedule | undefined,
    onSaved: () => void,
): UseScheduleFormResult => {
    const save = useSaveSchedule();
    const [errorCode, setErrorCode] = useState<ErrorCode | undefined>(undefined);
    const errorRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (errorCode) {
            errorRef.current?.focus();
        }
    }, [errorCode]);

    const form = useForm<ScheduleValues, unknown, ScheduleOutput>({
        resolver: zodResolver(scheduleSchema),
        mode: 'onSubmit',
        reValidateMode: 'onSubmit',
        defaultValues: schedule ? scheduleToValues(schedule) : defaultScheduleValues(),
    });

    const onSubmit = form.handleSubmit(async (values) => {
        setErrorCode(undefined);
        try {
            await save.mutateAsync({
                listingId,
                request: toScheduleRequest(values, schedule?.version ?? null),
            });
            onSaved();
        } catch (error) {
            if (!isApiError(error)) {
                throw error;
            }
            setErrorCode(error.code);
        }
    });

    return { form, onSubmit, errorCode, errorRef };
};
