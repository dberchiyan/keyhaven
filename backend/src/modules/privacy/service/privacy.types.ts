import type { SecurityLogEntry } from '@/modules/audit/service/audit.types';
import type { AccountSession } from '@/modules/auth/service/account.types';
import type { ListingDataExport } from '@/modules/listing/service/listing-privacy.types';
import type { MessageDataExport } from '@/modules/message/service/message.types';
import type { SavedSearch } from '@/modules/saved-search/service/saved-search.types';
import type { UserExport } from '@/modules/user/service/user.types';
import type { TenantViewingExport } from '@/modules/viewing/service/viewing.types';

export interface PersonalData extends ListingDataExport, MessageDataExport {
    exportedAt: Date;
    account: UserExport;
    sessions: AccountSession[];
    securityLog: SecurityLogEntry[];
    savedSearches: SavedSearch[];
    viewings: TenantViewingExport[];
}
