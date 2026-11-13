import type { UserProfile } from '../../../user/service/user.types';
import type { CurrentUserResponse } from '../dto/current-user.response';

export const toCurrentUserResponse = (
  user: UserProfile,
  idleTimeoutMinutes: number,
  demoRestricted: boolean,
  demoMode: boolean,
): CurrentUserResponse => ({
  id: user.id,
  email: user.email,
  firstName: user.firstName,
  lastName: user.lastName,
  phone: user.phone,
  role: user.role,
  emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
  agency: user.agency ? { id: user.agency.id, name: user.agency.name } : null,
  idleTimeoutMinutes,
  demoRestricted,
  demoMode,
});
