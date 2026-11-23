import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import {
    AGENCY_NAME_MAX_LENGTH,
    EMAIL_MAX_LENGTH,
    PERSON_NAME_MAX_LENGTH,
    PHONE_MAX_LENGTH,
} from '@/common/dto/limits';
import { USER_ROLES } from '@/modules/user/service/user-role';

export const UserRoleSchema = z.enum(USER_ROLES).meta({ id: 'UserRole' });

export const CurrentUserResponseSchema = z.object({
    id: z.uuid(),
    email: z.string().max(EMAIL_MAX_LENGTH),
    firstName: z.string().max(PERSON_NAME_MAX_LENGTH),
    lastName: z.string().max(PERSON_NAME_MAX_LENGTH),
    phone: z.string().max(PHONE_MAX_LENGTH).nullable(),
    role: UserRoleSchema,
    emailVerifiedAt: z.iso.datetime().nullable(),
    agency: z.object({ id: z.uuid(), name: z.string().max(AGENCY_NAME_MAX_LENGTH) }).nullable(),
    idleTimeoutMinutes: z.number().int().min(1),
    isDemoRestricted: z.boolean(),
    isDemoMode: z.boolean(),
});

export class CurrentUserResponse extends createZodDto(CurrentUserResponseSchema) {}
