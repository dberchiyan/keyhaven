import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import type { ApiError } from '@/shared/api/apiError';

/**
 * Lands the server's `details[{ field, message }]` on the matching form fields (data.md →
 * Forms); returns whether any matched — otherwise the caller shows the code on the form line.
 */
export const applyServerFieldErrors = <T extends FieldValues>(
  error: ApiError,
  fields: ReadonlySet<string>,
  setError: UseFormSetError<T>,
): boolean => {
  const matched = error.details.filter((detail) => fields.has(detail.field));
  for (const detail of matched) {
    setError(detail.field as Path<T>, { type: 'server', message: detail.message });
  }
  return matched.length > 0;
};
