import PlaceOutlined from '@mui/icons-material/PlaceOutlined';
import Typography from '@mui/material/Typography';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { InitialsAvatar } from '@/shared/components/initials-avatar';

import type { ViewingAudience } from '../hooks/use-viewing-card';
import type { Viewing } from '../types';
import { TenantContacts } from './tenant-contacts';

export interface ViewingCardDetailsProps {
    viewing: Viewing;
    audience: ViewingAudience;
    hideListing: boolean;
    address: string | undefined;
    upcoming: boolean;
}

/**
 * The row's body: who asked (the owner's side; under the home's own page their name is already
 * the heading, so only the contacts follow), the address once the tenant may know it, both
 * sides' notes in one tinted block, and "waiting for an answer" for the tenant.
 */
export function ViewingCardDetails({
    viewing,
    audience,
    hideListing,
    address,
    upcoming,
}: ViewingCardDetailsProps): ReactElement {
    const { t } = useTranslation('viewing');
    const tenant = audience === 'owner' ? viewing.tenant : undefined;
    return (
        <>
            {tenant && !hideListing && (
                <div className="flex items-center gap-2.5">
                    <InitialsAvatar id={tenant.id} firstName={tenant.firstName} lastName={tenant.lastName} size="sm" />
                    <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-0.5">
                        <Typography variant="subtitle2" component="p">
                            {`${tenant.firstName} ${tenant.lastName}`}
                        </Typography>
                        <TenantContacts email={tenant.email} phone={tenant.phone} />
                    </div>
                </div>
            )}
            {tenant && hideListing && <TenantContacts email={tenant.email} phone={tenant.phone} />}
            {address && (
                <Typography variant="body2" component="p" className="inline-flex items-center gap-1.5 text-primary">
                    <PlaceOutlined aria-hidden fontSize="small" />
                    <span className="sr-only">{t('card.address')} </span>
                    <span className="text-text-primary">{address}</span>
                </Typography>
            )}
            {(viewing.message || viewing.note) && (
                <div className="flex flex-col gap-1 rounded-md bg-background px-3 py-2">
                    {viewing.message && (
                        <Typography variant="body2" color="textSecondary" className="whitespace-pre-line">
                            {t(audience === 'owner' ? 'card.theirNote' : 'card.yourNote', { note: viewing.message })}
                        </Typography>
                    )}
                    {viewing.note && (
                        <Typography variant="body2" className="whitespace-pre-line">
                            {t('card.answerNote', { note: viewing.note })}
                        </Typography>
                    )}
                </div>
            )}
            {audience === 'tenant' && viewing.status === 'REQUESTED' && upcoming && (
                <Typography variant="caption" color="textSecondary">
                    {t('card.waiting')}
                </Typography>
            )}
        </>
    );
}
