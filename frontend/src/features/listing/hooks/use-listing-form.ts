import { zodResolver } from '@hookform/resolvers/zod';
import { type BaseSyntheticEvent, type RefObject, useEffect, useRef, useState } from 'react';
import { useForm, type UseFormReturn } from 'react-hook-form';
import { useNavigate } from 'react-router';

import { isApiError } from '@/shared/api/api-error';
import { useFieldMessage } from '@/shared/hooks/use-field-message';
import { managedListingPath } from '@/shared/lib/paths';
import { applyServerFieldErrors } from '@/shared/lib/server-field-errors';
import type { ErrorCode } from '@/shared/types';

import {
    LISTING_FORM_FIELDS,
    LISTING_LIMITS,
    type ListingFormOutput,
    listingFormSchema,
    type ListingFormValues,
} from '../schemas';
import type { CreateListingRequest, ManagedListing } from '../types';
import { useCreateListing, useUpdateListing } from './use-listing-mutations';

const FIELDS: ReadonlySet<string> = new Set(LISTING_FORM_FIELDS);

const LIMIT_OF: Partial<Record<keyof ListingFormValues, number>> = {
    title: LISTING_LIMITS.title,
    description: LISTING_LIMITS.description,
    addressLine1: LISTING_LIMITS.addressLine1,
    addressLine2: LISTING_LIMITS.addressLine2,
    neighborhood: LISTING_LIMITS.neighborhood,
};

const toRequest = (values: ListingFormOutput): CreateListingRequest => ({
    title: values.title,
    description: values.description,
    propertyType: values.propertyType,
    kind: values.kind,
    price: values.price,
    bedrooms: values.bedrooms,
    bathrooms: values.bathrooms,
    sizeSqft: values.sizeSqft,
    addressLine1: values.addressLine1,
    addressLine2: values.addressLine2,
    cityId: values.cityId,
    neighborhood: values.neighborhood,
    zip: values.zip,
    isPetFriendly: values.isPetFriendly,
    isFurnished: values.isFurnished,
    hasParking: values.hasParking,
    availableAt: values.kind === 'RENT' ? values.availableAt : null,
});

const EMPTY: ListingFormValues = {
    title: '',
    description: '',
    propertyType: 'APARTMENT',
    kind: 'RENT',
    price: '',
    bedrooms: '1',
    bathrooms: '1',
    sizeSqft: '',
    addressLine1: '',
    addressLine2: '',
    cityId: '',
    neighborhood: '',
    zip: '',
    isPetFriendly: false,
    isFurnished: false,
    hasParking: false,
    availableAt: '',
};

const fromListing = (listing: ManagedListing): ListingFormValues => ({
    title: listing.title,
    description: listing.description,
    propertyType: listing.propertyType,
    kind: listing.kind,
    price: trimAmount(listing.price.amount),
    bedrooms: String(listing.bedrooms),
    bathrooms: listing.bathrooms.replace(/\.0$/, ''),
    sizeSqft: String(listing.sizeSqft),
    addressLine1: listing.address.line1,
    addressLine2: listing.address.line2 ?? '',
    cityId: listing.cityId,
    neighborhood: listing.neighborhood ?? '',
    zip: listing.zip,
    isPetFriendly: listing.isPetFriendly,
    isFurnished: listing.isFurnished,
    hasParking: listing.hasParking,
    availableAt: listing.availableAt ?? '',
});

/** The form edits whole dollars or two places (FORM-4): "2150.0000" → "2150", "2200.5000" → "2200.50". */
const trimAmount = (amount: string): string => {
    const [whole = '0', fraction = ''] = amount.split('.');
    const cents = fraction.slice(0, 2).replace(/0+$/, '');
    return cents ? `${whole}.${cents.padEnd(2, '0')}` : whole;
};

export type ListingFormApi = UseFormReturn<ListingFormValues, unknown, ListingFormOutput>;

export interface UseListingFormResult {
    form: ListingFormApi;
    onSubmit: (event?: BaseSyntheticEvent) => Promise<void>;
    errorCode: ErrorCode | undefined;
    errorRef: RefObject<HTMLDivElement | null>;
    isEditing: boolean;
}

/**
 * Create (no listing) or edit a listing: validation mirrors the backend DTO (FORM-1), server
 * field errors land on their fields (FORM-3), the form line takes focus on an error (A11Y-3), and
 * the Idempotency-Key is made once per form, so a retried Create never creates twice (QRY-12).
 * Editing carries the listing's `version` for the optimistic lock; a home for sale sends no
 * move-in day.
 */
export const useListingForm = (listing: ManagedListing | undefined): UseListingFormResult => {
    const navigate = useNavigate();
    const create = useCreateListing();
    const update = useUpdateListing(listing?.id ?? '');
    const [idempotencyKey] = useState(() => crypto.randomUUID());
    const [errorCode, setErrorCode] = useState<ErrorCode | undefined>(undefined);
    const errorRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (errorCode) {
            errorRef.current?.focus();
        }
    }, [errorCode]);

    const form = useForm<ListingFormValues, unknown, ListingFormOutput>({
        resolver: zodResolver(listingFormSchema),
        mode: 'onSubmit',
        reValidateMode: 'onSubmit',
        defaultValues: listing ? fromListing(listing) : EMPTY,
    });

    const onSubmit = form.handleSubmit(async (values) => {
        setErrorCode(undefined);
        try {
            const saved = listing
                ? await update.mutateAsync({ ...toRequest(values), version: listing.version })
                : await create.mutateAsync({ request: toRequest(values), key: idempotencyKey });
            await navigate(managedListingPath(saved.id), { replace: true });
        } catch (error) {
            if (!isApiError(error)) {
                throw error;
            }
            if (!applyServerFieldErrors(error, FIELDS, form.setError)) {
                setErrorCode(error.code);
            }
        }
    });

    return { form, onSubmit, errorCode, errorRef, isEditing: listing !== undefined };
};

/** A listing field's helper text: its error worded with the field's own limit, or the reserved line (FORM-2). */
export const useListingFieldMessage = (form: ListingFormApi): ((field: keyof ListingFormValues) => string) => {
    const fieldMessage = useFieldMessage();
    return (field) => fieldMessage(form.formState.errors[field], { max: LIMIT_OF[field] ?? 0 });
};
