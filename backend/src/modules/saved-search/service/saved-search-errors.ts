import { BusinessRuleException } from '@/common/exception/api.exception';

import { MAX_SAVED_SEARCHES } from './saved-search-limits';

export const SavedSearchError = {
    tooMany: (): BusinessRuleException =>
        new BusinessRuleException('errors.savedSearch.tooMany', { max: MAX_SAVED_SEARCHES }),
} as const;
