import { useEffect, useRef, useState } from 'react';
import { isApiError } from '@/shared/api/apiError';
import type { ErrorCode } from '@/shared/types';
import type { ViewingSlot } from '../types';
import { useRequestViewing } from './useViewingQueries';

export const MESSAGE_MAX = 500;

/**
 * The booking form on a listing page: the chosen slot, an optional note, one Idempotency-Key
 * per attempt (a taken slot is a new operation, so the key changes after an answer).
 */
export const useBookViewing = (listingId: string, onBooked: () => void) => {
    const request = useRequestViewing();
    const [slot, setSlot] = useState<ViewingSlot | null>(null);
    const [message, setMessage] = useState('');
    const [key, setKey] = useState(() => crypto.randomUUID());
    const [errorCode, setErrorCode] = useState<ErrorCode | null>(null);
    const [slotMissing, setSlotMissing] = useState(false);
    const errorRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (errorCode || slotMissing) {
            errorRef.current?.focus();
        }
    }, [errorCode, slotMissing]);

    const submit = async (): Promise<void> => {
        setErrorCode(null);
        if (!slot) {
            setSlotMissing(true);
            return;
        }
        setSlotMissing(false);
        try {
            await request.mutateAsync({
                request: {
                    listingId,
                    startsAt: slot.startsAt,
                    ...(message.trim() ? { message: message.trim() } : {}),
                },
                key,
            });
            setSlot(null);
            setMessage('');
            onBooked();
        } catch (error) {
            if (!isApiError(error)) {
                throw error;
            }
            setErrorCode(error.code);
            // The server answered: the next attempt is a new operation.
            setKey(crypto.randomUUID());
            if (error.code === 'VIEWING_SLOT_TAKEN' || error.code === 'BUSINESS_RULE_VIOLATION') {
                setSlot(null);
            }
        }
    };

    return {
        slot,
        setSlot: (next: ViewingSlot | null) => {
            setSlot(next);
            setSlotMissing(false);
            setErrorCode(null);
        },
        message,
        setMessage: (value: string) => {
            setMessage(value.slice(0, MESSAGE_MAX));
        },
        submit,
        isPending: request.isPending,
        errorCode,
        slotMissing,
        errorRef,
    };
};
