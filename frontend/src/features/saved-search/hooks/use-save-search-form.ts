import { zodResolver } from '@hookform/resolvers/zod';
import { type BaseSyntheticEvent, type RefObject, useEffect, useRef, useState } from 'react';
import { useForm, type UseFormReturn } from 'react-hook-form';

import { isApiError } from '@/shared/api/api-error';
import type { SearchFilters } from '@/shared/lib/listing-search';
import { applyServerFieldErrors } from '@/shared/lib/server-field-errors';
import type { ErrorCode } from '@/shared/types';

import { type SaveSearchOutput, saveSearchSchema, type SaveSearchValues, toCriteria } from '../schemas';
import { useCreateSavedSearch } from './use-saved-search-queries';

const FIELDS: ReadonlySet<string> = new Set(['name', 'hasEmailAlerts']);

export interface UseSaveSearchFormResult {
    form: UseFormReturn<SaveSearchValues, unknown, SaveSearchOutput>;
    onSubmit: (event?: BaseSyntheticEvent) => Promise<void>;
    errorCode: ErrorCode | undefined;
    errorRef: RefObject<HTMLDivElement | null>;
}

/**
 * The "Save this search" form. One Idempotency-Key per opening (QRY-12) — the dialog remounts on
 * each — so a retried submit cannot save the search twice; server field errors land on the
 * fields, the rest on the focused form line (FORM-3, A11Y-3).
 */
export const useSaveSearchForm = (filters: SearchFilters, onSaved: () => void): UseSaveSearchFormResult => {
    const create = useCreateSavedSearch();
    const [idempotencyKey] = useState(() => crypto.randomUUID());
    const [errorCode, setErrorCode] = useState<ErrorCode | undefined>(undefined);
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
        defaultValues: { name: '', hasEmailAlerts: true },
    });

    const onSubmit = form.handleSubmit(async (values) => {
        setErrorCode(undefined);
        try {
            await create.mutateAsync({
                request: {
                    name: values.name,
                    hasEmailAlerts: values.hasEmailAlerts,
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
