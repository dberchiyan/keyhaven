import { Injectable } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

import { BusinessRuleException, NotAuthenticatedException } from '@/common/exception/api.exception';
import { IdempotencyKeyStore } from '@/common/persistence/idempotency-key.store';
import type { Principal } from '@/common/security/principal';
import { AuditService } from '@/modules/audit/service/audit.service';
import { AuditAction, AuditTargetType } from '@/modules/audit/service/audit-action';
import { AccountPrivacyService } from '@/modules/auth/service/account-privacy.service';
import { ListingPrivacyService } from '@/modules/listing/service/listing-privacy.service';
import { MessagePrivacyService } from '@/modules/message/service/message-privacy.service';
import { SavedSearchService } from '@/modules/saved-search/service/saved-search.service';
import { UserService } from '@/modules/user/service/user.service';
import { UserRole } from '@/modules/user/service/user-role';
import type { ViewingParties } from '@/modules/viewing/service/viewing.types';
import { ViewingPrivacyService } from '@/modules/viewing/service/viewing-privacy.service';

import type { PersonalData } from './privacy.types';
import { MAX_EXPORTED_SECURITY_EVENTS } from './privacy-limits';

const PASSWORD_FIELD = 'password';
const ERASED_LABEL = 'account';

/**
 * DATA-23: a person's own data — a copy on request, and erasure of the account. The privacy module
 * owns no table: every module exports a service that reads or clears what it holds, and nothing
 * imports this module, so it adds no cycle (CORE-16/17).
 */
@Injectable()
export class PrivacyService {
    constructor(
        private readonly userService: UserService,
        private readonly accountPrivacyService: AccountPrivacyService,
        private readonly auditService: AuditService,
        private readonly savedSearchService: SavedSearchService,
        private readonly listingPrivacyService: ListingPrivacyService,
        private readonly viewingPrivacyService: ViewingPrivacyService,
        private readonly messagePrivacyService: MessagePrivacyService,
        private readonly idempotencyKeyStore: IdempotencyKeyStore,
        @InjectPinoLogger(PrivacyService.name) private readonly logger: PinoLogger,
    ) {}

    /** Independent bounded reads in parallel (API-22: every list carries its own bound). */
    async export(userId: string): Promise<PersonalData> {
        const [account, sessions, securityLog, savedSearches, listingData, viewings, messageData] = await Promise.all([
            this.userService.findExportById(userId),
            this.accountPrivacyService.findSessions(userId),
            this.auditService.findSecurityExport(userId, MAX_EXPORTED_SECURITY_EVENTS),
            this.savedSearchService.list(userId),
            this.listingPrivacyService.exportFor(userId),
            this.viewingPrivacyService.exportFor(userId),
            this.messagePrivacyService.exportFor(userId),
        ]);
        if (!account) {
            throw new NotAuthenticatedException();
        }
        return {
            exportedAt: new Date(),
            account,
            sessions,
            securityLog,
            savedSearches,
            viewings,
            ...listingData,
            ...messageData,
        };
    }

    /**
     * Staff accounts are removed by another admin, never self-service (422). The password is asked again (AUTH-4);
     * the unusable hash is computed before the transaction (DATA-11); the live channel hears of the cancelled
     * viewings only after commit (DATA-12). No email: the other side sees the cancellation in the app.
     */
    async erase(principal: Principal, password: string): Promise<void> {
        if (principal.hasAuthority(UserRole.ADMIN)) {
            throw new BusinessRuleException('errors.personalData.adminCannotErase');
        }
        await this.accountPrivacyService.assertPassword(principal.userId, password, PASSWORD_FIELD);
        const passwordHash = await this.accountPrivacyService.unusablePasswordHash();
        const cancelled = await this.eraseAccount(principal.userId, passwordHash);
        this.viewingPrivacyService.announce(cancelled);
        this.logger.info({ userId: principal.userId, cancelledViewings: cancelled.length }, 'Account erased');
    }

    /**
     * DATA-23: one transaction — the account anonymised, its access and stored answers gone, the person's data in
     * every module cleared, `user.erased` recorded (ids only). The security log stays: append-only (DATA-30).
     */
    @Transactional()
    private async eraseAccount(userId: string, passwordHash: string): Promise<ViewingParties[]> {
        const now = new Date();
        await this.userService.anonymise(userId, passwordHash);
        await this.accountPrivacyService.endAccess(userId);
        await this.idempotencyKeyStore.deleteForUser(userId);
        await this.savedSearchService.deleteAllForUser(userId);
        await this.listingPrivacyService.erase(userId);
        const cancelled = await this.viewingPrivacyService.erase(userId, now);
        await this.messagePrivacyService.erase(userId);
        await this.auditService.record({
            action: AuditAction.USER_ERASED,
            actorUserId: userId,
            target: { type: AuditTargetType.USER, id: userId, label: ERASED_LABEL },
            changes: [],
        });
        return cancelled;
    }
}
