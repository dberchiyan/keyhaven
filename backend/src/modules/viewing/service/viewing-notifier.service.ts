import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

import { AppConfigService } from '@/common/config/app-config.service';
import { type EmailMessage, EmailSender } from '@/modules/email/service/email-sender';
import { EventService } from '@/modules/event/service/event.service';
import { LiveEventType } from '@/modules/event/service/live-event';

import type { ViewingRecord } from '../repository/record/viewing.record';
import type { MappedViewing, Viewing, ViewingAudience, ViewingParties, ViewingRecipient } from './viewing.types';
import {
    viewingCancelledEmail,
    viewingConfirmedEmail,
    viewingDeclinedEmail,
    viewingReminderEmail,
    viewingRequestedEmail,
} from './viewing-email';
import type { ViewingTransition } from './viewing-status';

const tenantOf = (viewing: Viewing): ViewingRecipient | undefined =>
    viewing.tenant ? { email: viewing.tenant.email, firstName: viewing.tenant.firstName } : undefined;

/**
 * Tells both sides what happened to a viewing: their open tabs through the live channel and their
 * inbox by email. DATA-12 / DATA-14: called after the change committed, never inside it.
 */
@Injectable()
export class ViewingNotifier {
    constructor(
        private readonly emailSender: EmailSender,
        private readonly events: EventService,
        private readonly config: AppConfigService,
        @InjectPinoLogger(ViewingNotifier.name) private readonly logger: PinoLogger,
    ) {}

    /** A new request: the owner's open tabs and inbox learn of it. */
    async requested(record: ViewingRecord, mapped: MappedViewing): Promise<void> {
        this.events.publishToOwner(record.listing.landlordId, record.listing.agencyId, {
            type: LiveEventType.VIEWING_CHANGED,
            viewingId: record.id,
        });
        const { viewing, owner } = mapped;
        await this.deliver(owner && viewingRequestedEmail(owner, viewing, this.appUrl()), viewing.id);
    }

    /** Both sides' open tabs: the tenant's, and the owner's (landlord / agency). */
    changed(viewing: ViewingParties): void {
        const event = { type: LiveEventType.VIEWING_CHANGED, viewingId: viewing.id } as const;
        this.events.publishToUser(viewing.tenantId, event);
        this.events.publishToOwner(viewing.listing.landlordId, viewing.listing.agencyId, event);
    }

    /** The other side of a decision is emailed: the tenant on an answer, the opposite side on a cancellation. */
    async decided(mapped: MappedViewing, transition: ViewingTransition, audience: ViewingAudience): Promise<void> {
        const { viewing, owner } = mapped;
        const appUrl = this.appUrl();
        const tenant = tenantOf(viewing);
        switch (transition) {
            case 'confirm':
                await this.deliver(tenant && viewingConfirmedEmail(tenant, viewing, appUrl), viewing.id);
                return;
            case 'decline':
                await this.deliver(tenant && viewingDeclinedEmail(tenant, viewing, appUrl), viewing.id);
                return;
            case 'cancel':
                await this.deliver(
                    audience === 'TENANT'
                        ? owner && viewingCancelledEmail(owner, 'OWNER', viewing, appUrl)
                        : tenant && viewingCancelledEmail(tenant, 'TENANT', viewing, appUrl),
                    viewing.id,
                );
        }
    }

    /** The day-before reminder to both sides. */
    async remind(mapped: MappedViewing): Promise<void> {
        const { viewing, owner } = mapped;
        const appUrl = this.appUrl();
        const tenant = tenantOf(viewing);
        await this.deliver(tenant && viewingReminderEmail(tenant, 'TENANT', viewing, appUrl), viewing.id);
        await this.deliver(owner && viewingReminderEmail(owner, 'OWNER', viewing, appUrl), viewing.id);
    }

    /** A failed delivery is logged, never thrown: the viewing is already what the client sees. */
    private async deliver(message: EmailMessage | undefined, viewingId: string): Promise<void> {
        if (!message) {
            return;
        }
        try {
            await this.emailSender.send(message);
        } catch (error: unknown) {
            this.logger.warn({ err: error, viewingId }, 'Viewing email not delivered');
        }
    }

    private appUrl(): string {
        return this.config.get('APP_URL');
    }
}
