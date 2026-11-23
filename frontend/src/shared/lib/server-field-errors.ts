import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';

import type { ApiError } from '@/shared/api/api-error';

/**
 * Lands the server's `details[{ field, message }]` on the matching form fields (FORM-3); returns
 * whether any matched, because the rest belongs on the form's error line instead.
 */
export const applyServerFieldErrors = <T extends FieldValues>(
    error: ApiError,
    fields: ReadonlySet<string>,
    setError: UseFormSetError<T>,
): boolean => {
    const isFormField = (field: string): field is Path<T> => fields.has(field);
    const matched = error.details.filter((detail) => isFormField(detail.field));
    for (const detail of matched) {
        if (isFormField(detail.field)) {
            setError(detail.field, { type: 'server', message: detail.message });
        }
    }
    return matched.length > 0;
};
