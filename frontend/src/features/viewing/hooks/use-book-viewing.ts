import { type RefObject, useEffect, useRef, useState } from 'react';

import { isApiError } from '@/shared/api/api-error';
import type { ErrorCode } from '@/shared/types';

import type { ViewingSlot } from '../types';
import { useRequestViewing } from './use-viewing-queries';

export const MESSAGE_MAX = 500;
const SLOT_GONE: ReadonlySet<ErrorCode> = new Set(['VIEWING_SLOT_TAKEN', 'BUSINESS_RULE_VIOLATION']);

export interface UseBookViewingResult {
    slot: ViewingSlot | undefined;
    setSlot: (next: ViewingSlot | undefined) => void;
    message: string;
    setMessage: (value: string) => void;
    submit: () => Promise<void>;
    isPending: boolean;
    errorCode: ErrorCode | undefined;
    slotMissing: boolean;
    errorRef: RefObject<HTMLDivElement | null>;
}

interface BookingErrors {
    errorCode: ErrorCode | undefined;
    setErrorCode: (code: ErrorCode | undefined) => void;
    slotMissing: boolean;
    setSlotMissing: (isMissing: boolean) => void;
    errorRef: RefObject<HTMLDivElement | null>;
}

/** The form's error line: the server's code or "pick a time", focused whenever one appears (A11Y-3). */
const useBookingErrors = (): BookingErrors => {
    const [errorCode, setErrorCode] = useState<ErrorCode | undefined>(undefined);
    const [slotMissing, setSlotMissing] = useState(false);
    const errorRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (errorCode || slotMissing) {
            errorRef.current?.focus();
        }
    }, [errorCode, slotMissing]);
    return { errorCode, setErrorCode, slotMissing, setSlotMissing, errorRef };
};

/**
 * The booking form on a listing page: the chosen slot, an optional note, one Idempotency-Key per
 * attempt (QRY-12) — once the server answered, the next try is a new operation, so the key
 * changes; a taken slot is dropped so the tenant picks again. Errors focus the error line (A11Y-3).
 */
export const useBookViewing = (listingId: string, onBooked: () => void): UseBookViewingResult => {
    const request = useRequestViewing();
    const [slot, setSlot] = useState<ViewingSlot | undefined>(undefined);
    const [message, setMessage] = useState('');
    const [key, setKey] = useState(() => crypto.randomUUID());
    const { errorCode, setErrorCode, slotMissing, setSlotMissing, errorRef } = useBookingErrors();

    const submit = async (): Promise<void> => {
        setErrorCode(undefined);
        if (!slot) {
            setSlotMissing(true);
            return;
        }
        setSlotMissing(false);
        try {
            const note = message.trim();
            await request.mutateAsync({
                request: { listingId, startsAt: slot.startsAt, ...(note ? { message: note } : {}) },
                key,
            });
            setSlot(undefined);
            setMessage('');
            onBooked();
        } catch (error) {
            if (!isApiError(error)) {
                throw error;
            }
            setErrorCode(error.code);
            setKey(crypto.randomUUID());
            if (SLOT_GONE.has(error.code)) {
                setSlot(undefined);
            }
        }
    };

    return {
        slot,
        setSlot: (next: ViewingSlot | undefined) => {
            setSlot(next);
            setSlotMissing(false);
            setErrorCode(undefined);
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
