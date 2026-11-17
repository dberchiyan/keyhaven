import { zodResolver } from '@hookform/resolvers/zod';
import { type BaseSyntheticEvent, type RefObject, useEffect, useRef, useState } from 'react';
import { useForm, type UseFormReturn } from 'react-hook-form';

import { type CurrentUser, useUpdateOwnName } from '@/features/auth';
import { isApiError } from '@/shared/api/api-error';
import type { ErrorCode } from '@/shared/types';

import { editNameSchema, type EditNameValues } from '../schemas';

const FIELDS: ReadonlySet<string> = new Set(['firstName', 'lastName']);
const isField = (field: string): field is keyof EditNameValues => FIELDS.has(field);

export interface UseEditNameFormResult {
    form: UseFormReturn<EditNameValues>;
    onSubmit: (event?: BaseSyntheticEvent) => Promise<void>;
    errorCode: ErrorCode | undefined;
    errorRef: RefObject<HTMLDivElement | null>;
}

/**
 * Rename form state (FORM-1..3). The dialog remounts per opening (ARCH-33), so the defaults are the
 * current name; the first field takes focus a frame after mount, once the dialog has it (A11Y-3).
 */
export const useEditNameForm = (user: CurrentUser, onSaved: () => void): UseEditNameFormResult => {
    const update = useUpdateOwnName();
    const [errorCode, setErrorCode] = useState<ErrorCode | undefined>(undefined);
    const errorRef = useRef<HTMLDivElement>(null);
    const form = useForm<EditNameValues>({
        resolver: zodResolver(editNameSchema),
        mode: 'onSubmit',
        reValidateMode: 'onSubmit',
        defaultValues: { firstName: user.firstName, lastName: user.lastName },
    });

    useEffect(() => {
        requestAnimationFrame(() => {
            form.setFocus('firstName');
        });
    }, [form]);
    useEffect(() => {
        if (errorCode) {
            errorRef.current?.focus();
        }
    }, [errorCode]);

    const onSubmit = form.handleSubmit(async (values) => {
        setErrorCode(undefined);
        try {
            await update.mutateAsync(values);
            onSaved();
        } catch (caught) {
            if (!isApiError(caught)) {
                throw caught;
            }
            const fieldErrors = caught.details.filter((detail) => isField(detail.field));
            for (const detail of fieldErrors) {
                if (isField(detail.field)) {
                    form.setError(detail.field, { type: 'server', message: detail.message }, { shouldFocus: true });
                }
            }
            if (fieldErrors.length === 0) {
                setErrorCode(caught.code);
            }
        }
    });

    return { form, onSubmit, errorCode, errorRef };
};
