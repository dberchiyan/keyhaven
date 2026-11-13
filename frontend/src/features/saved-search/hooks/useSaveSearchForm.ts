import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { applyServerFieldErrors } from '@/features/auth';
import { isApiError } from '@/shared/api/apiError';
import type { SearchFilters } from '@/shared/lib/listingSearch';
import type { ErrorCode } from '@/shared/types';
import { toCriteria } from '../criteria';
import { type SaveSearchOutput, type SaveSearchValues, saveSearchSchema } from '../schemas';
import { useCreateSavedSearch } from './useSavedSearchQueries';

const FIELDS: ReadonlySet<string> = new Set(['name', 'emailAlerts']);

/** The "Save this search" dialog: a name and the alerts switch; one Idempotency-Key per opening. */
export const useSaveSearchForm = (filters: SearchFilters, onSaved: () => void) => {
  const create = useCreateSavedSearch();
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [errorCode, setErrorCode] = useState<ErrorCode | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (errorCode) {
      errorRef.current?.focus();
    }
  }, [errorCode]);

  const form = useForm<SaveSearchValues, unknown, SaveSearchOutput>({
    resolver: zodResolver(saveSearchSchema),
    mode: 'onSubmit',
    reValidateMode: 'onSubmit',
    defaultValues: { name: '', emailAlerts: true },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setErrorCode(null);
    try {
      await create.mutateAsync({
        request: {
          name: values.name,
          emailAlerts: values.emailAlerts,
          criteria: toCriteria(filters),
        },
        key: idempotencyKey,
      });
      onSaved();
    } catch (error) {
      if (!isApiError(error)) {
        throw error;
      }
      if (!applyServerFieldErrors(error, FIELDS, form.setError)) {
        setErrorCode(error.code);
      }
    }
  });

  return { form, onSubmit, errorCode, errorRef };
};
