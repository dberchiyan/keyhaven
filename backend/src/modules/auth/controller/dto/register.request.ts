import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { NewPasswordSchema } from '../../../../common/dto/password';
import { personName } from '../../../../common/dto/person-name';
import { SIGNUP_ROLES } from '../../../user/service/user-role';
import { EMAIL_MAX_LENGTH } from './login.request';

export const SignupRoleSchema = z.enum(SIGNUP_ROLES, { error: 'validation.role.invalid' }).meta({ id: 'SignupRole' });

export const RegisterRequestSchema = z.object({
    firstName: personName('firstName'),
    lastName: personName('lastName'),
    email: z
        .email({
            error: (issue) => (issue.input === undefined ? 'validation.email.required' : 'validation.email.invalid'),
        })
        .max(EMAIL_MAX_LENGTH, 'validation.email.tooLong'),
    password: NewPasswordSchema,
    /** Looking for a home, or listing one. Agents and admins are not created here. */
    role: SignupRoleSchema,
});

export class RegisterRequest extends createZodDto(RegisterRequestSchema) {}
