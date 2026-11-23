import type { ReactElement } from 'react';

import { BrandMark } from '@/shared/components/brand-mark';
import { InitialsAvatar } from '@/shared/components/initials-avatar';

import { splitName } from '../format';

const COVER_PX = 48;

export interface ConversationAvatarProps {
    name: string;
    isKeyhaven: boolean;
    hasListing: boolean;
    coverPhotoUrl: string | null;
}

/** The counterpart's initials (or Keyhaven's mark) with the home's cover in the corner — which home, at a glance. */
export function ConversationAvatar({
    name,
    isKeyhaven,
    hasListing,
    coverPhotoUrl,
}: ConversationAvatarProps): ReactElement {
    const { firstName, lastName } = splitName(name);
    return (
        <div className="relative shrink-0">
            {isKeyhaven ? (
                <BrandMark className="size-12" />
            ) : (
                <InitialsAvatar id={name} firstName={firstName} lastName={lastName} size="lg" className="size-12" />
            )}
            {hasListing && (
                <span className="absolute -right-1 -bottom-1 size-6 overflow-hidden rounded-sm border-2 border-background-paper bg-badge-neutral-background">
                    {coverPhotoUrl && (
                        <img
                            src={coverPhotoUrl}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            width={COVER_PX}
                            height={COVER_PX}
                            className="size-full object-cover"
                        />
                    )}
                </span>
            )}
        </div>
    );
}
