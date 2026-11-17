import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import type { ListedBy } from '../types';

export interface ListedByCardProps {
    listedBy: ListedBy;
}

interface ContactRow {
    label: string;
    value: string;
    href: string;
}

/** Who to contact: the landlord, or the agency with its website. */
export function ListedByCard({ listedBy }: ListedByCardProps) {
    const { t } = useTranslation('listing');
    const rows: ContactRow[] = [{ label: t('detail.email'), value: listedBy.email, href: `mailto:${listedBy.email}` }];
    if (listedBy.phone) {
        rows.push({
            label: t('detail.phone'),
            value: listedBy.phone,
            href: `tel:${listedBy.phone.replace(/\s+/g, '')}`,
        });
    }
    if (listedBy.kind === 'AGENCY' && listedBy.website) {
        rows.push({
            label: t('detail.website'),
            value: listedBy.website.replace(/^https?:\/\//, ''),
            href: listedBy.website,
        });
    }
    return (
        <Card variant="outlined" component="section" aria-labelledby="listed-by-heading">
            <CardContent className="flex flex-col gap-3 p-4">
                <Typography id="listed-by-heading" variant="subtitle2" component="h2" color="textSecondary">
                    {t('detail.listedBy')}
                </Typography>
                <div>
                    <Typography variant="h6" component="p">
                        {listedBy.name}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                        {listedBy.kind === 'AGENCY' ? t('detail.agency') : t('detail.landlord')}
                    </Typography>
                </div>
                <dl className="m-0 flex flex-col gap-1">
                    {rows.map(({ label, value, href }) => (
                        <div key={label} className="flex flex-wrap gap-x-3">
                            <Typography component="dt" variant="body2" color="textSecondary" className="w-16">
                                {label}
                            </Typography>
                            <Typography component="dd" variant="body2" className="m-0 [overflow-wrap:anywhere]">
                                <Link href={href}>{value}</Link>
                            </Typography>
                        </div>
                    ))}
                </dl>
                <Typography variant="caption" color="textSecondary">
                    {t('detail.listedByHint')}
                </Typography>
            </CardContent>
        </Card>
    );
}
