import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import {
    AMOUNT_INPUT_MAX_LENGTH,
    CITY_SLUG_MAX_LENGTH,
    MAX_BEDROOMS,
    SEARCH_TEXT_MAX_LENGTH,
} from '@/common/dto/limits';
import { LISTING_KINDS } from '@/modules/listing/service/listing-kind';
import { MAX_CARD_IDS } from '@/modules/listing/service/listing-limits';
import { LISTING_STATUSES } from '@/modules/listing/service/listing-status';
import { PROPERTY_TYPES } from '@/modules/listing/service/property-type';

const booleanParam = z.enum(['true', 'false'], { error: 'validation.invalid' }).transform((value) => value === 'true');

const amountParam = z
    .string()
    .trim()
    .max(AMOUNT_INPUT_MAX_LENGTH, 'validation.amount.invalid')
    .regex(/^\d{1,9}(\.\d{1,2})?$/, 'validation.amount.invalid');

const UUID_LIST_ENTRY_LENGTH = '00000000-0000-0000-0000-000000000000,'.length;

export const ListingFilterQuerySchema = z
    .object({
        kind: z.enum(LISTING_KINDS, { error: 'validation.invalid' }).default('RENT'),
        city: z
            .string()
            .trim()
            .max(CITY_SLUG_MAX_LENGTH, 'validation.city.invalid')
            .regex(/^[a-z0-9-]+$/, 'validation.city.invalid')
            .optional(),
        type: z.enum(PROPERTY_TYPES, { error: 'validation.invalid' }).optional(),
        priceMin: amountParam.optional(),
        priceMax: amountParam.optional(),
        beds: z.coerce.number({ error: 'validation.invalid' }).int().min(0).max(MAX_BEDROOMS).optional(),
        baths: z
            .string()
            .regex(/^\d{1,2}(\.5)?$/, 'validation.invalid')
            .optional(),
        isPetFriendly: booleanParam.optional(),
        isFurnished: booleanParam.optional(),
        hasParking: booleanParam.optional(),
        moveInAt: z.iso.date({ error: 'validation.moveInAt.invalid' }).optional(),
        q: z.string().trim().max(SEARCH_TEXT_MAX_LENGTH, 'validation.search.tooLong').optional(),
    })
    .superRefine((query, context) => {
        if (
            query.priceMin !== undefined &&
            query.priceMax !== undefined &&
            Number(query.priceMin) > Number(query.priceMax)
        ) {
            context.addIssue({
                code: 'custom',
                path: ['priceMax'],
                message: 'validation.price.maxBelowMin',
            });
        }
    });

export class ListingFilterQuery extends createZodDto(ListingFilterQuerySchema) {}

export const ListingIdsQuerySchema = z.object({
    ids: z
        .string()
        .trim()
        .max(MAX_CARD_IDS * UUID_LIST_ENTRY_LENGTH, 'validation.invalid')
        .transform((value) =>
            value
                .split(',')
                .map((id) => id.trim())
                .filter((id) => id.length > 0),
        )
        .pipe(
            z
                .array(z.uuid({ error: 'validation.invalid' }))
                .min(1)
                .max(MAX_CARD_IDS),
        ),
});

export class ListingIdsQuery extends createZodDto(ListingIdsQuerySchema) {}

export const ManagedListingFilterQuerySchema = z.object({
    status: z.enum(LISTING_STATUSES, { error: 'validation.invalid' }).optional(),
    search: z.string().trim().max(SEARCH_TEXT_MAX_LENGTH, 'validation.search.tooLong').optional(),
});

export class ManagedListingFilterQuery extends createZodDto(ManagedListingFilterQuerySchema) {}
