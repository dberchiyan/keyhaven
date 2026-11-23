import { type RefObject, useRef, useState } from 'react';

import type { ErrorCode } from '@/shared/types';

import { MESSAGE_MAX } from '../api/message-api';
import { useSendMessage } from './use-message-queries';

export interface UseComposerResult {
    draft: string;
    setDraft: (value: string) => void;
    submit: () => void;
    isPending: boolean;
    errorCode: ErrorCode | undefined;
    remaining: number;
    errorRef: RefObject<HTMLParagraphElement | null>;
}

/**
 * The composer's state. One Idempotency-Key per attempt (QRY-12): a retry of the same draft reuses
 * it, so a message is never posted twice; a sent one gets a fresh key. A failure moves focus to
 * the error line (A11Y-3).
 */
export const useComposer = (conversationId: string): UseComposerResult => {
    const [draft, setDraft] = useState('');
    const [key, setKey] = useState(() => crypto.randomUUID());
    const send = useSendMessage(conversationId);
    const errorRef = useRef<HTMLParagraphElement>(null);

    const submit = (): void => {
        const body = draft.trim();
        if (body.length === 0 || send.isPending) {
            return;
        }
        send.mutate(
            { body, key },
            {
                onSuccess: () => {
                    setDraft('');
                    setKey(crypto.randomUUID());
                },
                onError: () => {
                    errorRef.current?.focus();
                },
            },
        );
    };

    return {
        draft,
        setDraft,
        submit,
        isPending: send.isPending,
        errorCode: send.isError ? send.error.code : undefined,
        remaining: MESSAGE_MAX - draft.length,
        errorRef,
    };
};
