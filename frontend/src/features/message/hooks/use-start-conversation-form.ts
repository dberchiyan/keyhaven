import { zodResolver } from '@hookform/resolvers/zod';
import { type BaseSyntheticEvent, type RefObject, useEffect, useRef, useState } from 'react';
import { useForm, type UseFormReturn } from 'react-hook-form';

import { isApiError } from '@/shared/api/api-error';
import { applyServerFieldErrors } from '@/shared/lib/server-field-errors';
import type { ErrorCode } from '@/shared/types';

import { type StartConversationOutput, startConversationSchema, type StartConversationValues } from '../schemas';
import { useStartConversation } from './use-message-queries';

const FIELDS: ReadonlySet<string> = new Set(['subject', 'body']);

export interface UseStartConversationFormResult {
    form: UseFormReturn<StartConversationValues, unknown, StartConversationOutput>;
    onSubmit: (event?: BaseSyntheticEvent) => Promise<void>;
    errorCode: ErrorCode | undefined;
    errorRef: RefObject<HTMLDivElement | null>;
    isPending: boolean;
}

/**
 * The "Write to Keyhaven" form. One Idempotency-Key per opening (QRY-12) — the dialog remounts on
 * each — so a retried submit cannot open two requests; server field errors land on the fields,
 * the rest on the focused form line (FORM-3, A11Y-3).
 */
export const useStartConversationForm = (
    onStarted: (conversationId: string) => void,
): UseStartConversationFormResult => {
    const start = useStartConversation();
    const [idempotencyKey] = useState(() => crypto.randomUUID());
    const [errorCode, setErrorCode] = useState<ErrorCode | undefined>(undefined);
    const errorRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (errorCode) {
            errorRef.current?.focus();
        }
    }, [errorCode]);

    const form = useForm<StartConversationValues, unknown, StartConversationOutput>({
        resolver: zodResolver(startConversationSchema),
        mode: 'onSubmit',
        reValidateMode: 'onSubmit',
        defaultValues: { subject: '', body: '' },
    });

    const onSubmit = form.handleSubmit(async (values) => {
        setErrorCode(undefined);
        try {
            const conversation = await start.mutateAsync({
                request: { subject: values.subject, body: values.body },
                key: idempotencyKey,
            });
            onStarted(conversation.id);
        } catch (error) {
            if (!isApiError(error)) {
                throw error;
            }
            if (!applyServerFieldErrors(error, FIELDS, form.setError)) {
                setErrorCode(error.code);
            }
        }
    });

    return { form, onSubmit, errorCode, errorRef, isPending: start.isPending };
};
