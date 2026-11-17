import { isSecurityAction } from '@/common/dto/security-event.response';
import type { PersonalData } from '@/modules/privacy/service/privacy.types';

import type { PersonalDataExportBody } from '../dto/personal-data.response';

const iso = (at: Date | null): string | null => at?.toISOString() ?? null;

/** Only `auth.*` actions belong in the security log (the audit service already filters them; the type narrows). */
const securityLogOf = (data: PersonalData): PersonalDataExportBody['securityLog'] =>
    data.securityLog.flatMap((entry) =>
        isSecurityAction(entry.action)
            ? [
                  {
                      action: entry.action,
                      occurredAt: entry.occurredAt.toISOString(),
                      ip: entry.ipAddress,
                      userAgent: entry.userAgent,
                  },
              ]
            : [],
    );

export const toPersonalDataExportResponse = (data: PersonalData): PersonalDataExportBody => ({
    exportedAt: data.exportedAt.toISOString(),
    account: {
        firstName: data.account.firstName,
        lastName: data.account.lastName,
        email: data.account.email,
        phone: data.account.phone,
        role: data.account.role,
        agencyName: data.account.agencyName,
        emailVerifiedAt: iso(data.account.emailVerifiedAt),
        createdAt: data.account.createdAt.toISOString(),
    },
    sessions: data.sessions.map((session) => ({
        createdAt: session.createdAt.toISOString(),
        lastSeenAt: session.lastSeenAt.toISOString(),
        ip: session.ip,
        userAgent: session.userAgent,
    })),
    securityLog: securityLogOf(data),
    savedHomes: data.savedHomes.map((home) => ({
        listingId: home.listingId,
        title: home.title,
        savedAt: home.savedAt.toISOString(),
    })),
    savedSearches: data.savedSearches.map((search) => ({
        name: search.name,
        criteria: search.criteria,
        hasEmailAlerts: search.hasEmailAlerts,
        createdAt: search.createdAt.toISOString(),
    })),
    viewings: data.viewings.map((viewing) => ({
        listingTitle: viewing.listingTitle,
        startsAt: viewing.startsAt.toISOString(),
        endsAt: viewing.endsAt.toISOString(),
        status: viewing.status,
        message: viewing.message,
    })),
    messagesWritten: data.messagesWritten.map((message) => ({
        conversationId: message.conversationId,
        body: message.body,
        createdAt: message.createdAt.toISOString(),
    })),
    conversationsOpened: data.conversationsOpened.map((conversation) => ({
        subject: conversation.subject,
        createdAt: conversation.createdAt.toISOString(),
    })),
    listings: data.listings.map((listing) => ({
        id: listing.id,
        title: listing.title,
        status: listing.status,
        createdAt: listing.createdAt.toISOString(),
    })),
});
