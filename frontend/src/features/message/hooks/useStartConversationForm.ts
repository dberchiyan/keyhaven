import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { applyServerFieldErrors } from '@/features/auth';
import { isApiError } from '@/shared/api/apiError';
import type { ErrorCode } from '@/shared/types';
import {
  type StartConversationOutput,
  type StartConversationValues,
  startConversationSchema,
} from '../schemas';
import { useStartConversation } from './useMessageQueries';

const FIELDS: ReadonlySet<string> = new Set(['subject', 'body']);

/** The "Write to Keyhaven" dialog: a subject and the first message; one Idempotency-Key per opening. */
export const useStartConversationForm = (onStarted: (conversationId: string) => void) => {
  const start = useStartConversation();
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [errorCode, setErrorCode] = useState<ErrorCode | null>(null);
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
    setErrorCode(null);
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
