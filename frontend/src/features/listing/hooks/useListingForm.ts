import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { isApiError } from '@/shared/api/apiError';
import { managedListingPath } from '@/shared/lib/paths';
import type { ErrorCode } from '@/shared/types';
import { applyServerFieldErrors } from '@/features/auth';
import { LISTING_FORM_FIELDS, type ListingFormOutput, type ListingFormValues, listingFormSchema } from '../schemas';
import type { CreateListingRequest, ManagedListing } from '../types';
import { useCreateListing, useUpdateListing } from './useListingQueries';

const FIELDS: ReadonlySet<string> = new Set(LISTING_FORM_FIELDS);

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
    petsAllowed: values.petsAllowed,
    furnished: values.furnished,
    parking: values.parking,
    // A home for sale has no move-in day.
    availableFrom: values.kind === 'RENT' ? values.availableFrom : null,
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
    petsAllowed: false,
    furnished: false,
    parking: false,
    availableFrom: '',
};

const fromListing = (listing: ManagedListing): ListingFormValues => ({
    title: listing.title,
    description: listing.description,
    propertyType: listing.propertyType,
    kind: listing.kind,
    price: trimAmount(listing.price.amount),
    bedrooms: String(listing.bedrooms),
    bathrooms: listing.bathrooms.endsWith('.0') ? listing.bathrooms.slice(0, -2) : listing.bathrooms,
    sizeSqft: String(listing.sizeSqft),
    addressLine1: listing.address.line1,
    addressLine2: listing.address.line2 ?? '',
    cityId: listing.cityId,
    neighborhood: listing.neighborhood ?? '',
    zip: listing.zip,
    petsAllowed: listing.petsAllowed,
    furnished: listing.furnished,
    parking: listing.parking,
    availableFrom: listing.availableFrom ?? '',
});

/** "2150.0000" → "2150", "2200.5000" → "2200.50". */
const trimAmount = (amount: string): string => {
    const [whole = '0', fraction = ''] = amount.split('.');
    const cents = fraction.slice(0, 2).replace(/0+$/, '');
    return cents ? `${whole}.${cents.padEnd(2, '0')}` : whole;
};

/**
 * Create or edit a listing: validation mirrors the backend DTO, server field errors land on
 * their fields, and the Idempotency-Key is made once per form (a retried Create never creates
 * twice). Editing carries the listing's `version` for the optimistic lock.
 */
export const useListingForm = (listing: ManagedListing | null) => {
    const navigate = useNavigate();
    const create = useCreateListing();
    const update = useUpdateListing(listing?.id ?? '');
    const [idempotencyKey] = useState(() => crypto.randomUUID());
    const [errorCode, setErrorCode] = useState<ErrorCode | null>(null);
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
        setErrorCode(null);
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

    return { form, onSubmit, errorCode, errorRef, isEditing: listing !== null };
};
