import BusinessOutlined from '@mui/icons-material/BusinessOutlined';
import PersonOutlineOutlined from '@mui/icons-material/PersonOutlineOutlined';
import ScheduleOutlined from '@mui/icons-material/ScheduleOutlined';
import Chip from '@mui/material/Chip';
import { type ReactElement, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { formatAgo } from '@/shared/lib/format-ago';

import type { ListingDetail } from '../types';

export interface SummaryChipsProps {
    listing: ListingDetail;
}

/**
 * Who lists the home and how long ago. "Listed 3 days ago" is measured from when the page
 * opened (taken once per mount), so the label never ticks under the reader (I18N-4).
 */
export function SummaryChips({ listing }: SummaryChipsProps): ReactElement {
    const { t, i18n } = useTranslation('listing');
    const [now] = useState(() => Date.now());
    const ago = listing.publishedAt ? formatAgo(listing.publishedAt, now, i18n.language) : undefined;
    const byAgency = listing.listedBy.kind === 'AGENCY';
    return (
        <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
            <li>
                <Chip
                    size="small"
                    icon={byAgency ? <BusinessOutlined /> : <PersonOutlineOutlined />}
                    label={byAgency ? listing.listedBy.name : t('detail.landlord')}
                    className="bg-badge-active-background text-badge-active-text [&_.MuiChip-icon]:text-badge-active-text"
                />
            </li>
            {listing.publishedAt && (
                <li>
                    <Chip
                        size="small"
                        icon={<ScheduleOutlined />}
                        label={ago ? t('detail.listedAgo', { ago }) : t('detail.listedJustNow')}
                        className="bg-badge-neutral-background text-badge-neutral-text [&_.MuiChip-icon]:text-badge-neutral-text"
                    />
                </li>
            )}
        </ul>
    );
}
