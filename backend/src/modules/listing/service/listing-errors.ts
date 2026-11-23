import { BusinessRuleException } from '@/common/exception/api.exception';

import type { ListingStatus, ListingTransition } from './listing-status';
import { MAX_PENDING_PHOTOS, MAX_PHOTOS, PHOTO_MAX_MIB } from './photo-status';

export const ListingError = {
    /** The transition table refuses the move from this status (publishing a suspended listing). */
    transitionNotAllowed: (transition: ListingTransition, status: ListingStatus): BusinessRuleException =>
        new BusinessRuleException(`errors.listing.${transition}NotAllowed`, { status }),
    needsPhoto: (): BusinessRuleException => new BusinessRuleException('errors.listing.publishNeedsPhoto'),
    notEditable: (status: ListingStatus): BusinessRuleException =>
        new BusinessRuleException('errors.listing.notEditable', { status }),
    cityNotFound: (): BusinessRuleException => new BusinessRuleException('errors.listing.cityNotFound', {}, 'cityId'),
    photoTooLarge: (): BusinessRuleException =>
        new BusinessRuleException('errors.listing.photoTooLarge', { maxMb: PHOTO_MAX_MIB }),
    photoNotUploaded: (): BusinessRuleException => new BusinessRuleException('errors.listing.photoNotUploaded'),
    photoRejected: (): BusinessRuleException => new BusinessRuleException('errors.listing.photoRejected'),
    tooManyPhotos: (): BusinessRuleException =>
        new BusinessRuleException('errors.listing.tooManyPhotos', { max: MAX_PHOTOS }),
    tooManyPendingUploads: (): BusinessRuleException =>
        new BusinessRuleException('errors.listing.tooManyPendingUploads', { max: MAX_PENDING_PHOTOS }),
    photoOrderMismatch: (): BusinessRuleException => new BusinessRuleException('errors.listing.photoOrderMismatch'),
} as const;
