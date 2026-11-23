import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import {
    AGENCY_NAME_MAX_LENGTH,
    EMAIL_MAX_LENGTH,
    LISTING_TITLE_MAX_LENGTH,
    PERSON_NAME_MAX_LENGTH,
    PHONE_MAX_LENGTH,
} from '@/common/dto/limits';
import { SECURITY_ACTIONS } from '@/common/dto/security-event.response';
import { MAX_SESSIONS_PER_USER } from '@/modules/auth/service/session.service';
import { MAX_EXPORTED_LISTINGS, MAX_EXPORTED_SAVED_HOMES } from '@/modules/listing/service/listing-limits';
import { LISTING_STATUSES } from '@/modules/listing/service/listing-status';
import {
    MAX_EXPORTED_CONVERSATIONS,
    MAX_EXPORTED_MESSAGES,
    MAX_MESSAGE_LENGTH,
    MAX_SUBJECT_LENGTH,
} from '@/modules/message/service/message-limits';
import { MAX_EXPORTED_SECURITY_EVENTS } from '@/modules/privacy/service/privacy-limits';
import { SavedSearchCriteriaSchema } from '@/modules/saved-search/service/saved-search-criteria';
import { MAX_SAVED_SEARCHES } from '@/modules/saved-search/service/saved-search-limits';
import { USER_ROLES } from '@/modules/user/service/user-role';
import { MAX_EXPORTED_VIEWINGS } from '@/modules/viewing/service/viewing-limits';
import { VIEWING_STATUSES } from '@/modules/viewing/service/viewing-status';

const IP_MAX_LENGTH = 64;
const USER_AGENT_MAX_LENGTH = 512;
const SAVED_SEARCH_NAME_MAX_LENGTH = 80;
const VIEWING_MESSAGE_MAX_LENGTH = 500;

export const PersonalDataExportSchema = z
    .object({
        exportedAt: z.iso.datetime(),
        account: z.object({
            firstName: z.string().max(PERSON_NAME_MAX_LENGTH),
            lastName: z.string().max(PERSON_NAME_MAX_LENGTH),
            email: z.string().max(EMAIL_MAX_LENGTH),
            phone: z.string().max(PHONE_MAX_LENGTH).nullable(),
            role: z.enum(USER_ROLES),
            agencyName: z.string().max(AGENCY_NAME_MAX_LENGTH).nullable(),
            emailVerifiedAt: z.iso.datetime().nullable(),
            createdAt: z.iso.datetime(),
        }),
        sessions: z
            .array(
                z.object({
                    createdAt: z.iso.datetime(),
                    lastSeenAt: z.iso.datetime(),
                    ip: z.string().max(IP_MAX_LENGTH).nullable(),
                    userAgent: z.string().max(USER_AGENT_MAX_LENGTH).nullable(),
                }),
            )
            .max(MAX_SESSIONS_PER_USER),
        securityLog: z
            .array(
                z.object({
                    action: z.enum(SECURITY_ACTIONS),
                    occurredAt: z.iso.datetime(),
                    ip: z.string().max(IP_MAX_LENGTH).nullable(),
                    userAgent: z.string().max(USER_AGENT_MAX_LENGTH).nullable(),
                }),
            )
            .max(MAX_EXPORTED_SECURITY_EVENTS),
        savedHomes: z
            .array(
                z.object({
                    listingId: z.uuid(),
                    title: z.string().max(LISTING_TITLE_MAX_LENGTH),
                    savedAt: z.iso.datetime(),
                }),
            )
            .max(MAX_EXPORTED_SAVED_HOMES),
        savedSearches: z
            .array(
                z.object({
                    name: z.string().max(SAVED_SEARCH_NAME_MAX_LENGTH),
                    criteria: SavedSearchCriteriaSchema.meta({ id: 'SavedSearchCriteria' }),
                    hasEmailAlerts: z.boolean(),
                    createdAt: z.iso.datetime(),
                }),
            )
            .max(MAX_SAVED_SEARCHES),
        viewings: z
            .array(
                z.object({
                    listingTitle: z.string().max(LISTING_TITLE_MAX_LENGTH),
                    startsAt: z.iso.datetime(),
                    endsAt: z.iso.datetime(),
                    status: z.enum(VIEWING_STATUSES),
                    message: z.string().max(VIEWING_MESSAGE_MAX_LENGTH).nullable(),
                }),
            )
            .max(MAX_EXPORTED_VIEWINGS),
        messagesWritten: z
            .array(
                z.object({
                    conversationId: z.uuid(),
                    body: z.string().max(MAX_MESSAGE_LENGTH),
                    createdAt: z.iso.datetime(),
                }),
            )
            .max(MAX_EXPORTED_MESSAGES),
        conversationsOpened: z
            .array(z.object({ subject: z.string().max(MAX_SUBJECT_LENGTH), createdAt: z.iso.datetime() }))
            .max(MAX_EXPORTED_CONVERSATIONS),
        listings: z
            .array(
                z.object({
                    id: z.uuid(),
                    title: z.string().max(LISTING_TITLE_MAX_LENGTH),
                    status: z.enum(LISTING_STATUSES),
                    createdAt: z.iso.datetime(),
                }),
            )
            .max(MAX_EXPORTED_LISTINGS),
    })
    .meta({ id: 'PersonalDataExport' });

export type PersonalDataExportBody = z.infer<typeof PersonalDataExportSchema>;

export class PersonalDataExportResponse extends createZodDto(z.object(PersonalDataExportSchema.shape)) {}
