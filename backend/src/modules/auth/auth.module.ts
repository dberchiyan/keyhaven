import { Module } from '@nestjs/common';
import { SessionAuthenticator } from '../../common/security/session-authenticator';
import { AuditModule } from '../audit/audit.module';
import { EmailModule } from '../email/email.module';
import { UserModule } from '../user/user.module';
import { AccountRecoveryController } from './controller/account-recovery.controller';
import { AuthController } from './controller/auth.controller';
import { RegistrationController } from './controller/registration.controller';
import { AccountTokenRepository } from './repository/account-token.repository';
import { SessionRepository } from './repository/session.repository';
import { AccountService } from './service/account.service';
import { AccountTokenService } from './service/account-token.service';
import { AuthService } from './service/auth.service';
import { PasswordHasher } from './service/password-hasher.service';
import { SessionService } from './service/session.service';

@Module({
  imports: [UserModule, AuditModule, EmailModule],
  controllers: [AuthController, RegistrationController, AccountRecoveryController],
  providers: [
    AuthService,
    AccountService,
    AccountTokenService,
    SessionService,
    PasswordHasher,
    SessionRepository,
    AccountTokenRepository,
    { provide: SessionAuthenticator, useExisting: SessionService },
  ],
  // PasswordHasher: the seed hashes the shared password with the same settings.
  exports: [SessionAuthenticator, PasswordHasher],
})
export class AuthModule {}
