import MailOutlined from '@mui/icons-material/MailOutlined';
import PhoneOutlined from '@mui/icons-material/PhoneOutlined';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import type { ReactElement } from 'react';

export interface TenantContactsProps {
    email: string;
    phone: string | null;
}

/** The tenant's email and phone as links on one wrapping line; a long address may break anywhere (TYPO-5). */
export function TenantContacts({ email, phone }: TenantContactsProps): ReactElement {
    return (
        <div className="flex min-w-0 flex-wrap gap-x-4 gap-y-2">
            <Link href={`mailto:${email}`} underline="hover" className="inline-flex items-center gap-2">
                <MailOutlined aria-hidden fontSize="inherit" />
                <Typography variant="body2" component="span" className="break-all">
                    {email}
                </Typography>
            </Link>
            {phone && (
                <Link href={`tel:${phone}`} underline="hover" className="inline-flex items-center gap-2">
                    <PhoneOutlined aria-hidden fontSize="inherit" />
                    <Typography variant="body2" component="span" className="app-tabular">
                        {phone}
                    </Typography>
                </Link>
            )}
        </div>
    );
}
