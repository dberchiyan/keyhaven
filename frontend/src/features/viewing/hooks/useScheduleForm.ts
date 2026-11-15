import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { isApiError } from '@/shared/api/apiError';
import type { ErrorCode } from '@/shared/types';
import {
  defaultScheduleValues,
  type ScheduleOutput,
  type ScheduleValues,
  scheduleSchema,
  scheduleToValues,
  toScheduleRequest,
} from '../schemas';
import type { ViewingSchedule } from '../types';
import { useSaveSchedule } from './useViewingQueries';

/** The hours editor: the stored document as form values, saved back as one PUT. */
export const useScheduleForm = (
  listingId: string,
  schedule: ViewingSchedule | null,
  onSaved: () => void,
) => {
  const save = useSaveSchedule();
  const [errorCode, setErrorCode] = useState<ErrorCode | null>(null);
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
    setErrorCode(null);
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
      // Field details name window indexes the form cannot map one to one: the form line says it.
      setErrorCode(error.code);
    }
  });

  return { form, onSubmit, errorCode, errorRef };
};
