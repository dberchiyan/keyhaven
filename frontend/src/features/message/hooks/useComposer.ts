import { useRef, useState } from 'react';
import type { ErrorCode } from '@/shared/types';
import { MESSAGE_MAX } from '../api/messageApi';
import { useSendMessage } from './useMessageQueries';

/**
 * The composer's state: the draft, one Idempotency-Key per attempt (a retry of the same draft
 * reuses it; a sent message gets a fresh one), the server's answer on the reserved line.
 */
export const useComposer = (
  viewingId: string,
): {
  draft: string;
  setDraft: (value: string) => void;
  submit: () => void;
  isPending: boolean;
  errorCode: ErrorCode | null;
  remaining: number;
  errorRef: React.RefObject<HTMLParagraphElement | null>;
} => {
  const [draft, setDraft] = useState('');
  const [key, setKey] = useState(() => crypto.randomUUID());
  const send = useSendMessage(viewingId);
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
    errorCode: send.isError ? send.error.code : null,
    remaining: MESSAGE_MAX - draft.length,
    errorRef,
  };
};
