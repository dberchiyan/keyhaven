import type { Prisma } from '../../../../generated/prisma/client';

export const userCredentialsSelect = {
  id: true,
  email: true,
  passwordHash: true,
  role: true,
  firstName: true,
  emailVerifiedAt: true,
} satisfies Prisma.UserSelect;
export type UserCredentialsRecord = Prisma.UserGetPayload<{ select: typeof userCredentialsSelect }>;

export const userProfileSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  role: true,
  emailVerifiedAt: true,
  agency: { select: { id: true, name: true } },
} satisfies Prisma.UserSelect;
export type UserProfileRecord = Prisma.UserGetPayload<{ select: typeof userProfileSelect }>;
